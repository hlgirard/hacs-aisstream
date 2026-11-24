"""End-to-end tests: setup, entities, websocket API, persistence."""

from __future__ import annotations

import time
from typing import Any

import pytest
from homeassistant.config_entries import ConfigEntryState, ConfigSubentryData
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from custom_components.aisstream.const import (
    CONF_ALIAS,
    CONF_MMSI,
    CONF_RETENTION_DAYS,
    SUBENTRY_FAVORITE,
)
from custom_components.aisstream.hub import AisStreamHub

from .test_config_flow import _entry

pytestmark = pytest.mark.usefixtures("no_network")

FAV = 367164250


def _pos(mmsi: int, lat: float, lon: float, sog: float = 5.0) -> dict[str, Any]:
    return {
        "MessageType": "PositionReport",
        "MetaData": {"MMSI": mmsi, "ShipName": f"SHIP {mmsi}"},
        "Message": {"PositionReport": {"UserID": mmsi, "Valid": True, "Latitude": lat,
                                       "Longitude": lon, "Sog": sog, "Cog": 45.0,
                                       "TrueHeading": 44, "NavigationalStatus": 0}},
    }


async def _setup(hass: HomeAssistant, favorites: bool = True):
    subs = (
        [ConfigSubentryData(data={CONF_MMSI: str(FAV), CONF_ALIAS: "Freedom", CONF_RETENTION_DAYS: None},
                            subentry_type=SUBENTRY_FAVORITE, title="Freedom", unique_id=str(FAV))]
        if favorites else []
    )
    entry = _entry(subentries_data=subs)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.LOADED
    return entry


def _feed(hub: AisStreamHub, msgs: list[dict[str, Any]], t0: float | None = None) -> None:
    t = t0 or time.time()
    for i, m in enumerate(msgs):
        hub._on_message(m, t + i * 120)


async def test_entities(hass: HomeAssistant, entity_registry: er.EntityRegistry) -> None:
    entry = await _setup(hass)
    hub: AisStreamHub = entry.runtime_data
    now = time.time()
    _feed(hub, [_pos(FAV, 42.38, -71.04), _pos(111111111, 42.35, -71.03, sog=0.0),
                _pos(222222222, 43.5, -70.0)], now - 10)  # last one outside region
    hub._on_status(True)
    hub.client.connected = True
    hub._broadcast()
    await hass.async_block_till_done()

    entities = {e.translation_key or e.original_name or "tracker": e.entity_id
                for e in er.async_entries_for_config_entry(entity_registry, entry.entry_id)}
    assert hass.states.get(entities["vessels"]).state == "2"
    assert hass.states.get(entities["vessels_underway"]).state == "1"
    assert hass.states.get(entities["connected"]).state == "on"

    tracker = hass.states.get("device_tracker.freedom")
    assert tracker is not None
    assert tracker.attributes["latitude"] == 42.38
    assert tracker.attributes["in_region"] is True
    assert hass.states.get(entities["speed"]).state == "5.0"

    # Favorite entities are attached to the subentry
    fav_entities = [e for e in er.async_entries_for_config_entry(entity_registry, entry.entry_id)
                    if e.config_subentry_id]
    assert len(fav_entities) == 5  # tracker, status, last seen, speed, purge


async def test_websocket_api(hass: HomeAssistant, hass_ws_client) -> None:
    entry = await _setup(hass)
    hub: AisStreamHub = entry.runtime_data
    now = time.time()
    _feed(hub, [_pos(FAV, 42.38 + i * 0.002, -71.04) for i in range(5)], now - 1000)

    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "aisstream/entries"})
    res = await ws.receive_json()
    assert res["success"] and res["result"]["entries"][0]["favorites"][0]["mmsi"] == FAV

    await ws.send_json({"id": 2, "type": "aisstream/snapshot", "hours": 24})
    res = await ws.receive_json()
    vessels = {v["mmsi"]: v for v in res["result"]["vessels"]}
    assert vessels[FAV]["favorite"] is True
    assert vessels[FAV]["moving"] is True  # 5 kn reports
    assert len(vessels[FAV]["track"]) == 5

    await ws.send_json({"id": 3, "type": "aisstream/subscribe"})
    assert (await ws.receive_json())["success"]
    _feed(hub, [_pos(333333333, 42.36, -71.0)], now)
    hub._broadcast()
    event = (await ws.receive_json())["event"]
    assert event["type"] == "delta"
    assert 333333333 in {v["mmsi"] for v in event["vessels"]}
    assert "333333333" in event["points"]
    assert all("moving" in v for v in event["vessels"])

    await ws.send_json({"id": 4, "type": "aisstream/track", "mmsi": FAV, "start": now - 86400})
    res = await ws.receive_json()
    assert res["success"] and len(res["result"]["track"]) == 5

    await ws.send_json({"id": 5, "type": "aisstream/snapshot", "entry_id": "nope"})
    res = await ws.receive_json()
    assert not res["success"] and res["error"]["code"] == "not_found"


async def test_persistence_across_reload(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    hub: AisStreamHub = entry.runtime_data
    now = time.time()
    _feed(hub, [_pos(444444444, 42.35 + i * 0.002, -71.0) for i in range(4)], now - 2000)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    hub2: AisStreamHub = entry.runtime_data
    assert hub2 is not hub
    vessel = hub2.registry.vessels[444444444]
    assert len(vessel.track) == 4
    assert vessel.name == "SHIP 444444444"


async def test_purge_button(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    hub: AisStreamHub = entry.runtime_data
    _feed(hub, [_pos(FAV, 42.35 + i * 0.002, -71.0) for i in range(4)], time.time() - 2000)
    await hass.services.async_call("button", "press", {"entity_id": "button.freedom_purge_track_history"}, blocking=True)
    assert len(hub.registry.vessels[FAV].track) == 1
    res = await hub.async_track(FAV, 0, None)
    assert len(res["track"]) == 1


async def test_purge_resets_card_track_without_duplicates(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    hub: AisStreamHub = entry.runtime_data
    _feed(hub, [_pos(FAV, 42.35 + i * 0.002, -71.0) for i in range(4)], time.time() - 2000)
    hub._broadcast()
    deltas: list[dict[str, Any]] = []
    hub.async_subscribe(deltas.append)

    real_purge = hub.store.purge

    def purge_while_receiving(mmsi: int) -> int:
        # A position arrives while the purge runs in the executor.
        hass.loop.call_soon_threadsafe(
            hub._on_message, _pos(FAV, 42.5, -71.0), time.time()
        )
        return real_purge(mmsi)

    hub.store.purge = purge_while_receiving
    await hub.async_purge(FAV)
    await hass.async_block_till_done()
    pending = [p for m, p in hub.registry.pending_points if m == FAV]
    assert len(pending) == len(set(pending))

    hub._broadcast()
    reset = deltas[-1]["reset"][str(FAV)]
    assert len(reset) == 1


async def test_diagnostics_redacts_location(hass: HomeAssistant) -> None:
    from custom_components.aisstream.diagnostics import (
        async_get_config_entry_diagnostics,
    )

    entry = await _setup(hass)
    diag = await async_get_config_entry_diagnostics(hass, entry)
    data = diag["entry"]["data"]
    assert data["api_key"] == "**REDACTED**"
    assert data["boxes"] == "**REDACTED**"
    assert data.get("location", "**REDACTED**") == "**REDACTED**"


async def test_adding_favorite_reloads(hass: HomeAssistant) -> None:
    entry = await _setup(hass, favorites=False)
    hub = entry.runtime_data
    result = await hass.config_entries.subentries.async_init((entry.entry_id, SUBENTRY_FAVORITE), context={"source": "user"})
    await hass.config_entries.subentries.async_configure(
        result["flow_id"], {CONF_MMSI: str(FAV), "unlimited": True}
    )
    await hass.async_block_till_done()
    assert entry.runtime_data is not hub
    assert FAV in entry.runtime_data.favorites
    assert hass.states.get("sensor.mmsi_367164250_last_seen") is not None


async def test_unload_and_remove_deletes_db(hass: HomeAssistant) -> None:
    import os

    entry = await _setup(hass)
    path = entry.runtime_data.store.path
    assert os.path.exists(path)
    assert await hass.config_entries.async_remove(entry.entry_id)
    await hass.async_block_till_done()
    assert not os.path.exists(path)


async def test_flush_on_homeassistant_stop(hass: HomeAssistant) -> None:
    """HA does not unload entries on shutdown; pending points must still be written."""
    import sqlite3

    from homeassistant.const import EVENT_HOMEASSISTANT_STOP

    entry = await _setup(hass)
    hub: AisStreamHub = entry.runtime_data
    _feed(hub, [_pos(555555555, 42.35 + i * 0.002, -71.0) for i in range(3)], time.time() - 1000)
    hass.bus.async_fire(EVENT_HOMEASSISTANT_STOP)
    await hass.async_block_till_done()
    assert hub.store._conn is None  # closed
    conn = sqlite3.connect(hub.store.path)
    assert conn.execute("SELECT COUNT(*) FROM positions WHERE mmsi=555555555").fetchone()[0] == 3
    conn.close()
    # A later unload must not fail on the already-closed store
    assert await hass.config_entries.async_unload(entry.entry_id)


async def test_subscribers_told_on_reload(hass: HomeAssistant, hass_ws_client) -> None:
    """The card resubscribes after a reload; it needs a 'closed' event to know."""
    entry = await _setup(hass)
    ws = await hass_ws_client(hass)
    await ws.send_json({"id": 1, "type": "aisstream/subscribe"})
    assert (await ws.receive_json())["success"]
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert (await ws.receive_json())["event"] == {"type": "closed"}
    # Re-subscribing reaches the new hub
    await ws.send_json({"id": 2, "type": "aisstream/subscribe"})
    assert (await ws.receive_json())["success"]
    assert len(entry.runtime_data._subscribers) == 1


async def test_unnamed_favorite_device_gets_vessel_name(hass: HomeAssistant) -> None:
    from homeassistant.helpers import device_registry as dr

    entry = _entry(subentries_data=[
        ConfigSubentryData(data={CONF_MMSI: "338902000", CONF_ALIAS: None, CONF_RETENTION_DAYS: 30.0},
                           subentry_type=SUBENTRY_FAVORITE, title="MMSI 338902000", unique_id="338902000")
    ])
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    hub: AisStreamHub = entry.runtime_data
    device_registry = dr.async_get(hass)
    device = next(d for d in dr.async_entries_for_config_entry(device_registry, entry.entry_id)
                  if d.serial_number == "338902000")
    assert device.name == "MMSI 338902000"

    msg = _pos(338902000, 42.345, -71.03, sog=0.0)
    msg["MetaData"]["ShipName"] = "CORNELIUS H CHARLTON"
    _feed(hub, [msg])
    hub._broadcast()
    await hass.async_block_till_done()
    assert device_registry.async_get(device.id).name == "CORNELIUS H CHARLTON"


def _status_pos(mmsi: int, sog: float, status: int) -> dict[str, Any]:
    msg = _pos(mmsi, 42.38, -71.04, sog=sog)
    msg["Message"]["PositionReport"]["NavigationalStatus"] = status
    return msg


async def test_favorite_status_sensor(hass: HomeAssistant) -> None:
    entry = await _setup(hass)
    hub: AisStreamHub = entry.runtime_data
    entity_id = "sensor.freedom_status"
    assert hass.states.get(entity_id).state == "unknown"
    assert "moored" in hass.states.get(entity_id).attributes["options"]

    now = time.time()
    hub._on_message(_status_pos(FAV, 0.0, 5), now)
    hub._broadcast()
    await hass.async_block_till_done()
    state = hass.states.get(entity_id)
    assert (state.state, state.attributes["source"]) == ("moored", "ais")
    assert hass.states.get("device_tracker.freedom").attributes["status"] == "moored"

    hub._on_message(_status_pos(FAV, 9.5, 0), now + 5)
    hub._broadcast()
    await hass.async_block_till_done()
    assert hass.states.get(entity_id).state == "underway"

    # Survives a reload (nav status restored from storage, not re-inferred)
    hub._on_message(_status_pos(FAV, 0.0, 1), now + 10)
    assert await hass.config_entries.async_reload(entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(entity_id).state == "at_anchor"

    # Not heard for longer than the stale threshold -> out_of_range
    hub2: AisStreamHub = entry.runtime_data
    hub2.registry.vessels[FAV].last_seen = now - 3600
    hub2._status_changed = True
    hub2._broadcast()
    await hass.async_block_till_done()
    assert hass.states.get(entity_id).state == "out_of_range"
    assert hass.states.get("device_tracker.freedom").attributes["status"] == "out_of_range"


async def test_failed_setup_closes_db_and_retries(hass: HomeAssistant) -> None:
    from unittest.mock import patch

    from custom_components.aisstream.storage import TrackStore

    closed: list[bool] = []
    real_close = TrackStore.close

    def close(self: TrackStore) -> None:
        closed.append(True)
        real_close(self)

    entry = _entry()
    entry.add_to_hass(hass)
    with (
        patch.object(TrackStore, "load_recent", side_effect=ValueError("bad row")),
        patch.object(TrackStore, "close", close),
    ):
        assert not await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.SETUP_RETRY
    assert closed


async def test_purge_waits_for_running_flush(hass: HomeAssistant) -> None:
    """A flush already in progress cannot write old points after the purge."""
    import asyncio

    entry = await _setup(hass)
    hub: AisStreamHub = entry.runtime_data
    _feed(hub, [_pos(FAV, 42.35 + i * 0.002, -71.0) for i in range(4)], time.time() - 2000)
    await asyncio.gather(hub._async_flush(object()), hub.async_purge(FAV))
    res = await hub.async_track(FAV, 0, None)
    assert len(res["track"]) == 1


async def test_store_calls_after_stop(hass: HomeAssistant) -> None:
    from homeassistant.exceptions import HomeAssistantError

    entry = await _setup(hass)
    hub: AisStreamHub = entry.runtime_data
    await hub.async_stop()
    await hub._async_prune()  # no error once the store is closed
    with pytest.raises(HomeAssistantError):
        await hub.async_track(FAV, 0, None)
