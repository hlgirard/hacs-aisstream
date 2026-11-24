"""Runtime hub: owns the websocket client, registry and track store."""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_API_KEY
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_track_time_interval

from .client import AisStreamClient, build_subscription
from .const import (
    BROADCAST_INTERVAL_S,
    CONF_ALIAS,
    CONF_BOXES,
    CONF_MMSI,
    CONF_REGION_NAME,
    CONF_RETENTION_DAYS,
    CONF_RETENTION_HOURS,
    CONF_STALE_MINUTES,
    DEFAULT_RETENTION_HOURS,
    DEFAULT_STALE_MINUTES,
    DOMAIN,
    FLUSH_INTERVAL_S,
    HOT_WINDOW_S,
    PRUNE_INTERVAL_S,
    SUBENTRY_FAVORITE,
    TRACK_MAX_POINTS,
)
from .models import TrackPoint
from .registry import VesselRegistry, encode_track
from .storage import TrackStore

_LOGGER = logging.getLogger(__name__)

type AisStreamConfigEntry = ConfigEntry[AisStreamHub]


@dataclass(frozen=True, slots=True)
class Favorite:
    """A favorite vessel (from a config subentry)."""

    subentry_id: str
    mmsi: int
    alias: str | None
    retention_days: float | None  # None = unlimited


def signal_update(entry_id: str) -> str:
    """Dispatcher signal fired (throttled) when vessel state changes."""
    return f"{DOMAIN}_{entry_id}_update"


def db_path(hass: HomeAssistant, entry_id: str) -> str:
    """Path of the SQLite file for an entry."""
    return hass.config.path(f"{DOMAIN}_{entry_id}.db")


class AisStreamHub:
    """Everything that runs for one config entry."""

    def __init__(self, hass: HomeAssistant, entry: AisStreamConfigEntry) -> None:
        """Initialise from a config entry."""
        self.hass = hass
        self.entry = entry
        self.api_key: str = entry.data[CONF_API_KEY]
        self.region_name: str = entry.data.get(CONF_REGION_NAME) or entry.title
        self.boxes: list[list[list[float]]] = entry.data[CONF_BOXES]
        options = entry.options
        self.retention_s = (
            float(options.get(CONF_RETENTION_HOURS, DEFAULT_RETENTION_HOURS)) * 3600
        )
        self.favorites: dict[int, Favorite] = {}
        for subentry in entry.subentries.values():
            if subentry.subentry_type != SUBENTRY_FAVORITE:
                continue
            mmsi = int(subentry.data[CONF_MMSI])
            self.favorites[mmsi] = Favorite(
                subentry.subentry_id,
                mmsi,
                subentry.data.get(CONF_ALIAS) or None,
                subentry.data.get(CONF_RETENTION_DAYS),
            )
        self.registry = VesselRegistry(
            self.boxes,
            float(options.get(CONF_STALE_MINUTES, DEFAULT_STALE_MINUTES)) * 60,
            set(self.favorites),
        )
        self.store = TrackStore(db_path(hass, entry.entry_id))
        self.region_device_id: str | None = None
        self.client = AisStreamClient(
            async_get_clientsession(hass),
            lambda: build_subscription(self.api_key, self.boxes),
            self._on_message,
            self._on_status,
            name=self.region_name,
        )
        # Serialises database work so a flush, prune, purge or query never
        # interleave (and nothing touches the store once it is closed).
        self._db_lock = asyncio.Lock()
        self._subscribers: set[Callable[[dict[str, Any]], None]] = set()
        self._unsubs: list[CALLBACK_TYPE] = []
        self._status_changed = False
        self._reset_tracks: set[int] = set()
        self._stopped = False

    # -- lifecycle -------------------------------------------------------------

    async def async_start(self) -> None:
        """Open storage, restore state, start the websocket client."""
        await self.hass.async_add_executor_job(self.store.open)
        await self.hass.async_add_executor_job(
            self.store.set_favorites,
            [(f.mmsi, f.alias, f.retention_days) for f in self.favorites.values()],
        )
        now = time.time()
        statics, points = await self.hass.async_add_executor_job(
            self.store.load_recent, now - HOT_WINDOW_S, list(self.favorites)
        )
        self.registry.restore(statics, points)
        _LOGGER.debug(
            "%s: restored %d vessels, %d points", self.region_name, len(statics), len(points)
        )

        self.entry.async_create_background_task(
            self.hass, self.client.run(), f"{DOMAIN} {self.region_name}"
        )

        self._unsubs += [
            async_track_time_interval(
                self.hass, self._broadcast, timedelta(seconds=BROADCAST_INTERVAL_S)
            ),
            async_track_time_interval(
                self.hass, self._async_flush, timedelta(seconds=FLUSH_INTERVAL_S)
            ),
            async_track_time_interval(
                self.hass, self._async_prune, timedelta(seconds=PRUNE_INTERVAL_S)
            ),
        ]
        self.entry.async_create_background_task(
            self.hass, self._async_prune(), f"{DOMAIN} {self.region_name} prune"
        )

    async def async_stop(self) -> None:
        """Stop timers, flush and close storage (tasks are cancelled by HA).

        Called on entry unload and on Home Assistant stop (HA does not unload
        entries when shutting down). Safe to call twice.
        """
        if self._stopped:
            return
        self._stopped = True
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        # Tell the cards so they re-subscribe once the entry is back.
        for subscriber in list(self._subscribers):
            subscriber({"type": "closed"})
        self._subscribers.clear()
        async with self._db_lock:
            await self._write_pending()
            await self.hass.async_add_executor_job(self.store.close)

    # -- message flow ----------------------------------------------------------

    @callback
    def _on_message(self, msg: dict[str, Any], received: float) -> None:
        self.registry.handle(msg, received)

    @callback
    def _on_status(self, connected: bool) -> None:
        self._status_changed = True

    @property
    def connected(self) -> bool:
        """Whether the subscription is live."""
        return self.client.connected

    @property
    def last_message(self) -> float | None:
        """Time of the last message received."""
        return self.client.last_message

    @callback
    def _broadcast(self, _now: Any = None) -> None:
        dirty, points = self.registry.take_delta()
        reset, self._reset_tracks = self._reset_tracks, set()
        if not dirty and not reset and not self._status_changed:
            return
        self._status_changed = False
        async_dispatcher_send(self.hass, signal_update(self.entry.entry_id))
        if not self._subscribers:
            return
        vessels = []
        for mmsi in dirty:
            if (vessel := self.registry.vessels.get(mmsi)) is None:
                continue
            data = vessel.summary()
            data["favorite"] = mmsi in self.favorites
            data["status"] = vessel.status(time.time(), self.registry.stale_s)
            vessels.append(data)
        delta = {
            "type": "delta",
            "now": int(time.time()),
            "connected": self.connected,
            "vessels": vessels,
            "points": {str(m): encode_track(p) for m, p in points.items()},
        }
        if reset:
            # Cards drop their cached track for these before applying points.
            delta["reset"] = {
                str(m): encode_track([v.track[-1]] if v.track else [])
                for m in reset
                if (v := self.registry.vessels.get(m)) is not None
            }
        for subscriber in list(self._subscribers):
            subscriber(delta)

    async def _async_flush(self, _now: Any = None) -> None:
        if _now is not None:
            # Periodic refresh for time-based values (staleness, message rate).
            async_dispatcher_send(self.hass, signal_update(self.entry.entry_id))
        async with self._db_lock:
            if not self._stopped:
                await self._write_pending()

    async def _write_pending(self) -> None:
        """Write pending points to disk. Caller holds the database lock."""
        points, statics = self.registry.take_pending()
        if points or statics:
            try:
                await self.hass.async_add_executor_job(self.store.write, points, statics)
            except Exception:
                _LOGGER.exception("Failed to write tracks to %s", self.store.path)

    async def _async_prune(self, _now: Any = None) -> None:
        async with self._db_lock:
            if self._stopped:
                return
            now = time.time()
            self.registry.prune(now)
            await self._write_pending()
            try:
                deleted = await self.hass.async_add_executor_job(
                    self.store.prune, now, self.retention_s
                )
            except Exception:
                _LOGGER.exception("Failed to prune %s", self.store.path)
                return
        if deleted:
            _LOGGER.debug("%s: pruned %d positions", self.region_name, deleted)

    # -- frontend API ----------------------------------------------------------

    @callback
    def async_subscribe(self, cb: Callable[[dict[str, Any]], None]) -> CALLBACK_TYPE:
        """Subscribe to batched deltas."""
        self._subscribers.add(cb)
        return lambda: self._subscribers.discard(cb)

    def info(self) -> dict[str, Any]:
        """Static description of this entry for the card."""
        return {
            "entry_id": self.entry.entry_id,
            "title": self.entry.title,
            "region_name": self.region_name,
            "boxes": self.boxes,
            "connected": self.connected,
            "retention_hours": self.retention_s / 3600,
            "favorites": [
                {
                    "mmsi": f.mmsi,
                    "alias": f.alias,
                    "retention_days": f.retention_days,
                }
                for f in self.favorites.values()
            ],
        }

    def snapshot(self, hours: float) -> dict[str, Any]:
        """Current vessels and tracks within the window."""
        hours = min(hours, HOT_WINDOW_S / 3600)
        return {
            **self.info(),
            "now": int(time.time()),
            "vessels": self.registry.snapshot(time.time(), hours),
        }

    async def async_track(
        self, mmsi: int, start: float, end: float | None
    ) -> dict[str, Any]:
        """History for one vessel from SQLite (downsampled)."""
        end = end or time.time()
        async with self._db_lock:
            self._check_running()
            await self._write_pending()
            points: list[TrackPoint] = await self.hass.async_add_executor_job(
                self.store.query_track, mmsi, start, end, TRACK_MAX_POINTS
            )
            first = await self.hass.async_add_executor_job(self.store.first_ts, mmsi)
        return {
            "mmsi": mmsi,
            "start": int(start),
            "end": int(end),
            "first_ts": int(first) if first else None,
            "track": encode_track(points),
        }

    async def async_purge(self, mmsi: int) -> None:
        """Delete stored history for one vessel (memory keeps the latest point)."""
        async with self._db_lock:
            self._check_running()
            await self._write_pending()
            await self.hass.async_add_executor_job(self.store.purge, mmsi)
        if (vessel := self.registry.vessels.get(mmsi)) is not None:
            last = vessel.track[-1] if vessel.track else None
            vessel.track.clear()
            if last is not None:
                vessel.track.append(last)
                # Points that arrived during the purge are already pending.
                if (mmsi, last) not in self.registry.pending_points:
                    self.registry.pending_points.append((mmsi, last))
        self._reset_tracks.add(mmsi)
        self.registry.dirty.add(mmsi)

    def _check_running(self) -> None:
        if self._stopped:
            raise HomeAssistantError(f"{self.region_name} is restarting, try again")

    def diagnostics(self) -> dict[str, Any]:
        """Runtime statistics."""
        now = time.time()
        c = self.client
        return {
            "connection": {
                "connected": c.connected,
                "connect_count": c.connect_count,
                "message_count": c.message_count,
                "compression": c.compression,
                "last_message": c.last_message,
                "last_error": c.last_error,
            },
            "vessels_in_memory": len(self.registry.vessels),
            "points_in_memory": sum(len(v.track) for v in self.registry.vessels.values()),
            "message_types": dict(self.registry.message_types),
            "stats": self.registry.stats(now),
        }
