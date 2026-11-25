"""Device trackers for favorite vessels."""

from __future__ import annotations

import time
from typing import Any

from homeassistant.components.device_tracker import SourceType, TrackerEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .entity import FavoriteEntity
from .hub import AisStreamConfigEntry, AisStreamHub, Favorite

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: AisStreamConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up one tracker per favorite."""
    hub = entry.runtime_data
    for favorite in hub.favorites.values():
        async_add_entities(
            [FavoriteTracker(hub, favorite)], config_subentry_id=favorite.subentry_id
        )


class FavoriteTracker(FavoriteEntity, TrackerEntity):
    """Position of a favorite vessel."""

    _attr_name = None  # use the device name
    _attr_source_type = SourceType.GPS
    _attr_translation_key = "vessel"
    # Static details: keep them out of every recorded position.
    _unrecorded_attributes = frozenset(
        {"mmsi", "vessel_name", "callsign", "imo", "category", "length_m"}
    )

    def __init__(self, hub: AisStreamHub, favorite: Favorite) -> None:
        """Initialise."""
        super().__init__(hub, favorite, None)
        self._last: tuple[Any, ...] | None = None

    @callback
    def _maybe_name_device(self, vessel_name: str | None) -> None:
        """Replace the 'MMSI …' placeholder device name once the name is known.

        Only the device name changes (not the subentry title, which would reload
        the entry), and never if the user renamed the device.
        """
        if self.favorite.alias or not vessel_name or self.device_entry is None:
            return
        device = self.device_entry
        if device.name_by_user is None and device.name == f"MMSI {self.favorite.mmsi}":
            dr.async_get(self.hass).async_update_device(device.id, name=vessel_name)

    @callback
    def _refresh(self) -> bool:
        vessel = self.vessel
        if vessel is None or vessel.lat is None:
            return False
        status = vessel.status(time.time(), self.hub.registry.stale_s)
        attrs = {
            "mmsi": vessel.mmsi,
            "vessel_name": vessel.name,
            "callsign": vessel.callsign,
            "imo": vessel.imo,
            "category": vessel.category,
            "speed_kn": vessel.sog,
            "course": vessel.cog,
            "heading": vessel.heading,
            "status": status,
            "nav_status": vessel.nav_status_name,
            "destination": vessel.destination,
            "eta": vessel.eta,
            "length_m": vessel.length,
            "in_region": self.hub.registry.in_region(vessel),
        }
        key = (vessel.lat, vessel.lon, attrs)
        if key == self._last:
            return False
        self._last = key
        self._maybe_name_device(vessel.name)
        self._attr_latitude = vessel.lat
        self._attr_longitude = vessel.lon
        self._attr_extra_state_attributes = attrs
        return True
