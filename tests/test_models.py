"""Tests for message parsing and geometry helpers."""

from __future__ import annotations

from custom_components.aisstream.models import (
    TrackPoint,
    Vessel,
    apply_message,
    circle_to_box,
    clean_cog,
    clean_heading,
    clean_lat_lon,
    clean_sog,
    clean_text,
    in_boxes,
    parse_time_utc,
)
from custom_components.aisstream.registry import should_keep


def _pos(mmsi=367164250, lat=42.38, lon=-71.04, sog=5.2, cog=90.0, hdg=91, status=0):
    return {
        "MessageType": "PositionReport",
        "MetaData": {"MMSI": mmsi, "ShipName": "FREEDOM     ", "latitude": lat, "longitude": lon,
                     "time_utc": "2026-11-22 23:41:12.123456789 +0000 UTC"},
        "Message": {"PositionReport": {"UserID": mmsi, "Valid": True, "Latitude": lat,
                                       "Longitude": lon, "Sog": sog, "Cog": cog,
                                       "TrueHeading": hdg, "NavigationalStatus": status}},
    }


def test_sentinels() -> None:
    assert clean_lat_lon(91, 181) is None
    assert clean_lat_lon(0, 0) is None
    assert clean_lat_lon(42.3, -71.0) == (42.3, -71.0)
    assert clean_sog(102.3) is None
    assert clean_sog(12.44) == 12.4
    assert clean_cog(360) is None
    assert clean_heading(511) is None
    assert clean_heading(87) == 87
    assert clean_text("SUGAR PLUM@@@@  ") == "SUGAR PLUM"
    assert clean_text("@@@@") is None


def test_parse_time_utc() -> None:
    ts = parse_time_utc("2026-11-22 23:41:12.123456789 +0000 UTC")
    assert ts is not None
    assert abs(ts - 1795390872.123456) < 1e-3
    assert parse_time_utc("garbage") is None


def test_apply_position() -> None:
    v = Vessel(367164250)
    result = apply_message(v, _pos(), 1000.0)
    assert result is not None and result.position is not None
    assert (v.lat, v.lon, v.sog, v.heading, v.ais_class) == (42.38, -71.04, 5.2, 91, "A")
    assert v.name == "FREEDOM"  # from metadata
    assert v.underway


def test_apply_position_out_of_order_ignored() -> None:
    v = Vessel(1)
    apply_message(v, _pos(mmsi=1, lat=42.30), 2000.0)
    result = apply_message(v, _pos(mmsi=1, lat=42.31), 1000.0)
    assert result is not None and result.position is None
    assert v.lat == 42.30


def test_apply_static() -> None:
    v = Vessel(209550000)
    msg = {
        "MessageType": "ShipStaticData",
        "MetaData": {"MMSI": 209550000, "ShipName": "AMERICA"},
        "Message": {"ShipStaticData": {
            "UserID": 209550000, "Valid": True, "Name": "AMERICA@@@", "CallSign": "5BXX2",
            "ImoNumber": 9314569, "Type": 71, "Dimension": {"A": 150, "B": 30, "C": 15, "D": 13},
            "Destination": "BOSTON@@", "Eta": {"Month": 11, "Day": 23, "Hour": 6, "Minute": 0},
            "MaximumStaticDraught": 8.4,
        }},
    }
    result = apply_message(v, msg, 1000.0)
    assert result is not None and result.static_changed
    assert v.category == "cargo"
    assert (v.length, v.beam, v.destination, v.eta, v.imo) == (180, 28, "BOSTON", "11-23 06:00", 9314569)
    # Same message again: no change
    assert not apply_message(v, msg, 1001.0).static_changed


def test_apply_class_b_static_parts() -> None:
    v = Vessel(338429624)
    part_a = {"MessageType": "StaticDataReport", "MetaData": {"MMSI": 338429624},
              "Message": {"StaticDataReport": {"UserID": 338429624, "PartNumber": False,
                                               "ReportA": {"Valid": True, "Name": "SEA BREEZE"},
                                               "ReportB": {"Valid": False}}}}
    part_b = {"MessageType": "StaticDataReport", "MetaData": {"MMSI": 338429624},
              "Message": {"StaticDataReport": {"UserID": 338429624, "PartNumber": True,
                                               "ReportA": {"Valid": False},
                                               "ReportB": {"Valid": True, "ShipType": 37,
                                                           "CallSign": "WDA1234",
                                                           "Dimension": {"A": 8, "B": 4, "C": 2, "D": 2}}}}}
    apply_message(v, part_a, 1.0)
    apply_message(v, part_b, 2.0)
    assert (v.name, v.category, v.callsign, v.length, v.ais_class) == ("SEA BREEZE", "pleasure", "WDA1234", 12, "B")


def test_thinning_underway() -> None:
    a = TrackPoint(0, 42.0, -71.0, 10.0, 90.0, 90)
    assert should_keep(None, a)
    assert not should_keep(a, TrackPoint(10, 42.0, -70.9995, 10.0, 91.0, 90))  # 10 s, ~40 m
    assert should_keep(a, TrackPoint(10, 42.0, -70.9985, 10.0, 90.0, 90))  # ~124 m
    assert should_keep(a, TrackPoint(10, 42.0, -70.9999, 10.0, 120.0, 90))  # course change
    assert should_keep(a, TrackPoint(61, 42.0, -71.0, 10.0, 90.0, 90))  # time
    assert not should_keep(a, TrackPoint(0, 42.1, -71.0, 10.0, 90.0, 90))  # duplicate ts


def test_thinning_stationary() -> None:
    a = TrackPoint(0, 42.0, -71.0, 0.0, None, None)
    assert not should_keep(a, TrackPoint(300, 42.0, -71.0001, 0.1, None, None))
    assert should_keep(a, TrackPoint(601, 42.0, -71.0, 0.0, None, None))
    assert should_keep(a, TrackPoint(30, 42.0006, -71.0, 0.2, None, None))  # ~67 m drift


def test_circle_to_box() -> None:
    box = circle_to_box(42.33, -70.97, 10_000)
    assert in_boxes(42.33, -70.97, [box])
    (north, west), (south, east) = box
    assert north > 42.33 > south and west < -70.97 < east
    assert abs((north - south) * 111.32 - 20) < 0.1
    assert not in_boxes(42.6, -70.97, [box])


def test_status_from_ais_report() -> None:
    v = Vessel(1)
    apply_message(v, _pos(mmsi=1, sog=0.0, status=5), 1000.0)
    assert (v.status(1010.0, 1800), v.status_source()) == ("moored", "ais")
    apply_message(v, _pos(mmsi=1, sog=8.0, status=0), 1020.0)
    assert (v.status(1030.0, 1800), v.status_source()) == ("underway", "ais")
    apply_message(v, _pos(mmsi=1, sog=0.0, status=1), 1040.0)
    assert v.status(1050.0, 1800) == "at_anchor"


def test_status_inferred_and_out_of_range() -> None:
    v = Vessel(2)
    assert v.status(0.0, 1800) is None
    class_b = {
        "MessageType": "StandardClassBPositionReport",
        "MetaData": {"MMSI": 2},
        "Message": {"StandardClassBPositionReport": {"UserID": 2, "Valid": True, "Latitude": 42.3,
                                                      "Longitude": -71.0, "Sog": 6.0, "Cog": 10.0,
                                                      "TrueHeading": 511}},
    }
    apply_message(v, class_b, 1000.0)
    assert (v.status(1001.0, 1800), v.status_source()) == ("underway", "inferred")
    class_b["Message"]["StandardClassBPositionReport"]["Sog"] = 0.1
    apply_message(v, class_b, 1100.0)
    assert v.status(1101.0, 1800) == "stopped"
    assert v.status(1100.0 + 1801, 1800) == "out_of_range"
    # Undefined AIS status (15) falls back to inference
    v2 = Vessel(3)
    apply_message(v2, _pos(mmsi=3, sog=0.0, status=15), 1000.0)
    assert (v2.status(1000.0, 1800), v2.status_source()) == ("stopped", "inferred")


def test_nav_status_persisted_in_static() -> None:
    v = Vessel(4)
    apply_message(v, _pos(mmsi=4, sog=0.0, status=5), 1000.0)
    restored = Vessel(4)
    restored.load_static(v.static_dict())
    restored.sog, restored.last_seen = 0.0, 1000.0
    assert restored.status(1000.0, 1800) == "moored"


def test_reported_underway_but_slow_is_stopped() -> None:
    """Crews often leave 'under way' set while alongside: below 0.5 kn it's 'stopped'."""
    v = Vessel(5)
    apply_message(v, _pos(mmsi=5, sog=0.0, status=0), 1000.0)
    assert (v.status(1000.0, 1800), v.status_source()) == ("stopped", "inferred")
    apply_message(v, _pos(mmsi=5, sog=0.4, status=8), 1010.0)  # sailing, drifting
    assert v.status(1010.0, 1800) == "stopped"
    apply_message(v, _pos(mmsi=5, sog=0.5, status=0), 1020.0)
    assert (v.status(1020.0, 1800), v.status_source()) == ("underway", "ais")
    # Other AIS statuses are not overridden by speed
    apply_message(v, _pos(mmsi=5, sog=0.0, status=7), 1030.0)
    assert v.status(1030.0, 1800) == "fishing"
    # No speed reported: keep the AIS status
    v.sog = None
    v.nav_status = 0
    assert v.status(1040.0, 1800) == "underway"


def _motion(v: Vessel, *reports: tuple[float, float | None]) -> None:
    for ts, sog in reports:
        apply_message(v, _pos(sog=sog if sog is not None else 102.3), ts)


def test_moving_needs_two_slow_reports_to_stop() -> None:
    v = Vessel(367164250)
    _motion(v, (0, 8.0))
    assert v.moving
    _motion(v, (10, 0.4))  # one slow report (docking, GPS noise): still moving
    assert v.moving and v.slow_since == 10 and v.slow_reports == 1
    _motion(v, (20, 0.3))
    assert not v.moving and v.slow_since is None


def test_moving_counter_resets_when_fast_again() -> None:
    v = Vessel(367164250)
    _motion(v, (0, 8.0), (10, 0.5), (20, 6.0), (30, 0.5))
    assert v.moving and v.slow_reports == 1 and v.slow_since == 30


def test_never_fast_is_not_moving() -> None:
    v = Vessel(367164250)
    _motion(v, (0, 0.7), (10, 0.9))
    assert not v.moving and v.underway  # status rule (0.5 kn) is unchanged


def test_missing_speed_leaves_moving_state() -> None:
    v = Vessel(367164250)
    _motion(v, (0, 8.0), (10, 0.2), (20, None))  # 102.3 = not available
    assert v.moving and v.slow_reports == 1
    summary = v.summary()
    assert summary["moving"] is True and summary["slow_since"] == 10


def test_static_with_null_or_malformed_fields() -> None:
    """aisstream sometimes sends nulls; they must not raise."""
    v = Vessel(1)
    msg = {
        "MessageType": "ShipStaticData",
        "MetaData": {"MMSI": 1},
        "Message": {"ShipStaticData": {
            "UserID": 1, "Valid": True, "Name": "X", "Type": 71,
            "Dimension": {"A": None, "B": "30", "C": 5, "D": 5},
            "Eta": {"Month": 5, "Day": 3, "Hour": None, "Minute": None},
        }},
    }
    apply_message(v, msg, 1.0)
    assert v.eta == "05-03"
