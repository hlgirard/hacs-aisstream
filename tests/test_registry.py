"""Replay a recorded 15-minute Boston Harbor capture through the registry."""

from __future__ import annotations

from custom_components.aisstream.models import TrackPoint, parse_time_utc
from custom_components.aisstream.registry import VesselRegistry

from .conftest import BOSTON_BOX, load_messages


def _replay(registry: VesselRegistry) -> float:
    messages = load_messages()
    last = 0.0
    for msg in messages:
        ts = parse_time_utc((msg.get("MetaData") or {}).get("time_utc")) or last
        last = max(last, ts)
        registry.handle(msg, ts)
    return last


def test_replay_fixture() -> None:
    registry = VesselRegistry([BOSTON_BOX], stale_s=1800, favorites={338902000})
    now = _replay(registry)
    messages = load_messages()
    position_msgs = sum(1 for m in messages if "Position" in m["MessageType"])

    assert len(registry.vessels) >= 30
    stats = registry.stats(now)
    assert stats["active"] > 0
    assert stats["active"] == stats["underway"] + stats["stationary"]

    # Names are cleaned of AIS padding
    for vessel in registry.vessels.values():
        assert vessel.name is None or vessel.name == vessel.name.strip()
        if vessel.lat is not None:
            assert 42.0 < vessel.lat < 42.7 and -71.3 < vessel.lon < -70.6

    # Static data from real messages
    dean = registry.vessels[367563930]
    assert (dean.name, dean.callsign, dean.length, dean.destination) == (
        "DEAN REINAUER", "WDG7107", 177, "US BOS"
    )
    class_b = registry.vessels[338429624]
    assert class_b.category == "pleasure" and class_b.length == 13

    # Thinning stores fewer points than position reports received
    stored = len(registry.pending_points)
    assert 0 < stored <= position_msgs

    # Snapshot always includes favorites and serialises tracks compactly
    snap = {v["mmsi"]: v for v in registry.snapshot(now, 24)}
    assert snap[338902000]["favorite"] is True
    for v in snap.values():
        for point in v["track"]:
            assert len(point) == 3 and isinstance(point[0], int)


def test_take_pending_and_delta_reset() -> None:
    registry = VesselRegistry([BOSTON_BOX], stale_s=1800)
    _replay(registry)
    points, statics = registry.take_pending()
    assert points and statics
    assert registry.take_pending() == ([], {})
    dirty, new_points = registry.take_delta()
    assert dirty and new_points
    assert registry.take_delta() == (set(), {})


def test_prune_hot_window() -> None:
    registry = VesselRegistry([BOSTON_BOX], stale_s=1800, favorites={338902000})
    now = _replay(registry)
    registry.prune(now + 2 * 86400)
    # Only favorites survive once everything is older than the in-memory window
    assert set(registry.vessels) <= {338902000}


def test_last_seen_persisted_for_unchanged_static() -> None:
    """A vessel heard only via repeated, unchanged static data stays fresh in storage."""
    registry = VesselRegistry([BOSTON_BOX], stale_s=1800)
    static = next(m for m in load_messages() if m["MessageType"] == "ShipStaticData")
    registry.handle(static, 1000.0)
    registry.take_pending()
    registry.handle(static, 2000.0)  # identical content
    _, statics = registry.take_pending()
    mmsi = next(iter(statics))
    assert statics[mmsi][1] == 2000.0


def test_restore_rebuilds_moving_state() -> None:
    registry = VesselRegistry([BOSTON_BOX], stale_s=1800)
    registry.restore(
        {},
        [
            (1, TrackPoint(100.0, 42.3, -71.0, 6.0, 90.0, 90)),
            (2, TrackPoint(100.0, 42.3, -71.0, 6.0, 90.0, 90)),
            (2, TrackPoint(200.0, 42.3, -71.0, 0.2, 90.0, 90)),
            (2, TrackPoint(300.0, 42.3, -71.0, 0.1, 90.0, 90)),
        ],
    )
    assert registry.vessels[1].moving
    assert not registry.vessels[2].moving
