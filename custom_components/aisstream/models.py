"""Vessel data model and AIS message parsing (no Home Assistant imports)."""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, NamedTuple

from .const import (
    AIS_STATUS_MAP,
    MOVING_SOG,
    MOVING_STOP_REPORTS,
    NAV_STATUS,
    NAV_STATUS_STATIONARY,
    NAV_STATUS_UNDERWAY,
    POSITION_TYPES,
    UNDERWAY_SOG,
    ship_category,
)


class TrackPoint(NamedTuple):
    """A single (thinned) position."""

    ts: float
    lat: float
    lon: float
    sog: float | None
    cog: float | None
    heading: int | None


@dataclass(slots=True)
class Vessel:
    """State for one MMSI."""

    mmsi: int
    name: str | None = None
    callsign: str | None = None
    imo: int | None = None
    ship_type: int | None = None
    dim_a: int | None = None
    dim_b: int | None = None
    dim_c: int | None = None
    dim_d: int | None = None
    destination: str | None = None
    eta: str | None = None
    draught: float | None = None
    ais_class: str | None = None
    # Latest position (always updated, unthinned)
    lat: float | None = None
    lon: float | None = None
    sog: float | None = None
    cog: float | None = None
    heading: int | None = None
    nav_status: int | None = None
    position_ts: float | None = None
    last_seen: float = 0.0
    # Map "moving" state with a delayed stop (see update_motion)
    moving: bool = False
    slow_reports: int = 0
    slow_since: float | None = None
    # Thinned track for the in-memory window
    track: deque[TrackPoint] = field(default_factory=deque)

    def update_motion(self, sog: float | None, ts: float) -> None:
        """Track the map's moving state for one position report.

        Moving starts at MOVING_SOG and only ends after MOVING_STOP_REPORTS
        consecutive slower reports, so a brief slowdown or a single noisy
        report doesn't hide the vessel. Vessels that never reached MOVING_SOG
        stay "not moving".
        """
        if sog is None:
            return
        if sog >= MOVING_SOG:
            self.moving = True
            self.slow_reports = 0
            self.slow_since = None
        elif self.moving:
            self.slow_reports += 1
            if self.slow_since is None:
                self.slow_since = ts
            if self.slow_reports >= MOVING_STOP_REPORTS:
                self.moving = False
                self.slow_reports = 0
                self.slow_since = None

    @property
    def category(self) -> str:
        """Display category derived from the ship type."""
        return ship_category(self.ship_type)

    @property
    def length(self) -> int | None:
        """Overall length in metres, if known."""
        if self.dim_a is None or self.dim_b is None:
            return None
        return (self.dim_a + self.dim_b) or None

    @property
    def beam(self) -> int | None:
        """Beam in metres, if known."""
        if self.dim_c is None or self.dim_d is None:
            return None
        return (self.dim_c + self.dim_d) or None

    @property
    def underway(self) -> bool:
        """Whether the vessel is moving."""
        if self.sog is not None:
            return self.sog >= UNDERWAY_SOG
        return self.nav_status not in NAV_STATUS_STATIONARY

    @property
    def nav_status_name(self) -> str | None:
        """Human-readable navigational status key."""
        if self.nav_status is None:
            return None
        return NAV_STATUS.get(self.nav_status, "undefined")

    def status(self, now: float, stale_s: float) -> str | None:
        """Status for automations: AIS nav status if reported, else inferred.

        An "under way" AIS status (engine or sailing) is overridden to "stopped"
        when the vessel is slower than UNDERWAY_SOG: crews often leave it set
        while alongside. Returns None while nothing usable has been received.
        """
        if not self.last_seen:
            return None
        if now - self.last_seen > stale_s:
            return "out_of_range"
        if self._underway_overridden():
            return "stopped"
        if (ais := AIS_STATUS_MAP.get(self.nav_status)) is not None:  # type: ignore[arg-type]
            return ais
        if self.sog is None:
            return None
        return "underway" if self.sog >= UNDERWAY_SOG else "stopped"

    def _underway_overridden(self) -> bool:
        return (
            self.nav_status in NAV_STATUS_UNDERWAY
            and self.sog is not None
            and self.sog < UNDERWAY_SOG
        )

    def status_source(self) -> str | None:
        """Whether status() comes from the AIS report or is inferred from speed."""
        if self.nav_status in AIS_STATUS_MAP and not self._underway_overridden():
            return "ais"
        return "inferred" if self.sog is not None else None

    def static_dict(self) -> dict[str, Any]:
        """Static (voyage/identity) data, used for storage and the frontend."""
        return {
            "name": self.name,
            "callsign": self.callsign,
            "imo": self.imo,
            "ship_type": self.ship_type,
            "dim": [self.dim_a, self.dim_b, self.dim_c, self.dim_d],
            "destination": self.destination,
            "eta": self.eta,
            "draught": self.draught,
            "ais_class": self.ais_class,
            # Persisted so a restart doesn't flip the status to an inferred value.
            "nav_status": self.nav_status,
        }

    def load_static(self, data: dict[str, Any]) -> None:
        """Restore static data from storage."""
        self.name = data.get("name")
        self.callsign = data.get("callsign")
        self.imo = data.get("imo")
        self.ship_type = data.get("ship_type")
        dim = data.get("dim") or [None] * 4
        self.dim_a, self.dim_b, self.dim_c, self.dim_d = (list(dim) + [None] * 4)[:4]
        self.destination = data.get("destination")
        self.eta = data.get("eta")
        self.draught = data.get("draught")
        self.ais_class = data.get("ais_class")
        self.nav_status = data.get("nav_status")

    def summary(self) -> dict[str, Any]:
        """Compact representation for the frontend."""
        return {
            "mmsi": self.mmsi,
            "name": self.name,
            "callsign": self.callsign,
            "imo": self.imo,
            "ship_type": self.ship_type,
            "category": self.category,
            "length": self.length,
            "beam": self.beam,
            "destination": self.destination,
            "eta": self.eta,
            "draught": self.draught,
            "ais_class": self.ais_class,
            "lat": _r(self.lat),
            "lon": _r(self.lon),
            "sog": self.sog,
            "cog": self.cog,
            "heading": self.heading,
            "nav_status": self.nav_status,
            "underway": self.underway,
            "moving": self.moving,
            "slow_since": _ts(self.slow_since),
            "position_ts": _ts(self.position_ts),
            "last_seen": _ts(self.last_seen),
        }


def _r(value: float | None) -> float | None:
    return None if value is None else round(value, 5)


def _ts(value: float | None) -> int | None:
    return None if value is None else int(value)


# --- sanitising -----------------------------------------------------------


def clean_text(value: Any) -> str | None:
    """Strip AIS padding ('@' and spaces)."""
    if not isinstance(value, str):
        return None
    text = value.replace("@", " ").strip()
    return text or None


def clean_lat_lon(lat: Any, lon: Any) -> tuple[float, float] | None:
    """Return a valid (lat, lon) or None (91/181 mean 'not available')."""
    try:
        lat_f, lon_f = float(lat), float(lon)
    except (TypeError, ValueError):
        return None
    if not (-90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0):
        return None
    if lat_f == 0.0 and lon_f == 0.0:
        return None
    return lat_f, lon_f


def clean_sog(value: Any) -> float | None:
    """Speed over ground in knots; 102.3 means 'not available'."""
    try:
        sog = float(value)
    except (TypeError, ValueError):
        return None
    return None if sog < 0 or sog >= 102.25 else round(sog, 1)


def clean_cog(value: Any) -> float | None:
    """Course over ground in degrees; 360 means 'not available'."""
    try:
        cog = float(value)
    except (TypeError, ValueError):
        return None
    return None if cog < 0 or cog >= 360 else round(cog, 1)


def clean_heading(value: Any) -> int | None:
    """True heading in degrees; 511 means 'not available'."""
    try:
        heading = int(value)
    except (TypeError, ValueError):
        return None
    return None if heading < 0 or heading >= 360 else heading


def _int(value: Any) -> int | None:
    """An int field from a message, or None when missing or malformed."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return int(value)


def _dims(dim: Any) -> tuple[int | None, ...] | None:
    if not isinstance(dim, dict):
        return None
    values = tuple(_int(dim.get(k)) for k in ("A", "B", "C", "D"))
    if not any(values):
        return None
    return values


def parse_time_utc(value: Any) -> float | None:
    """Parse MetaData.time_utc, e.g. '2026-11-22 23:41:12.123456789 +0000 UTC'."""
    if not isinstance(value, str):
        return None
    try:
        date_part, time_part, offset = value.split(" ")[:3]
        if "." in time_part:
            hms, frac = time_part.split(".")
            time_part = f"{hms}.{frac[:6]}"
        return datetime.fromisoformat(f"{date_part}T{time_part}{offset}").timestamp()
    except ValueError:
        return None


def _eta(eta: Any) -> str | None:
    if not isinstance(eta, dict):
        return None
    month, day = _int(eta.get("Month")) or 0, _int(eta.get("Day")) or 0
    hour, minute = _int(eta.get("Hour")), _int(eta.get("Minute"))
    hour = 24 if hour is None else hour
    minute = 60 if minute is None else minute
    if not (1 <= month <= 12 and 1 <= day <= 31):
        return None
    if hour >= 24 or minute >= 60:
        return f"{month:02d}-{day:02d}"
    return f"{month:02d}-{day:02d} {hour:02d}:{minute:02d}"


# --- message application ---------------------------------------------------


class ParsedMessage(NamedTuple):
    """Result of applying an AIS message to a vessel."""

    mmsi: int
    message_type: str
    position: TrackPoint | None
    static_changed: bool


def message_mmsi(msg: dict[str, Any]) -> int | None:
    """Extract the MMSI from an aisstream envelope."""
    meta = msg.get("MetaData") or {}
    mmsi = meta.get("MMSI")
    if mmsi is None:
        body = (msg.get("Message") or {}).get(msg.get("MessageType", ""), {})
        mmsi = body.get("UserID")
    try:
        return int(mmsi)
    except (TypeError, ValueError):
        return None


def message_time(msg: dict[str, Any], received: float) -> float:
    """Best timestamp for a message: metadata time, unless clearly off."""
    ts = parse_time_utc((msg.get("MetaData") or {}).get("time_utc"))
    if ts is None or abs(ts - received) > 600:
        return received
    return min(ts, received)


def apply_message(vessel: Vessel, msg: dict[str, Any], ts: float) -> ParsedMessage | None:
    """Apply an aisstream envelope to a vessel. Returns None if irrelevant."""
    mtype = msg.get("MessageType")
    body = (msg.get("Message") or {}).get(mtype)
    if not mtype or not isinstance(body, dict):
        return None
    meta = msg.get("MetaData") or {}
    vessel.last_seen = max(vessel.last_seen, ts)
    before = vessel.static_dict()
    position: TrackPoint | None = None

    if mtype in POSITION_TYPES:
        if body.get("Valid") is False:
            return ParsedMessage(vessel.mmsi, mtype, None, False)
        vessel.ais_class = "A" if mtype == "PositionReport" else "B"
        coords = clean_lat_lon(body.get("Latitude"), body.get("Longitude"))
        if mtype == "PositionReport":
            vessel.nav_status = body.get("NavigationalStatus")
        if mtype == "ExtendedClassBPositionReport":
            _apply_name(vessel, body.get("Name"))
            _apply_type(vessel, body.get("Type"))
            _apply_dims(vessel, body.get("Dimension"))
        if coords is not None and (vessel.position_ts is None or ts >= vessel.position_ts):
            vessel.lat, vessel.lon = coords
            vessel.sog = clean_sog(body.get("Sog"))
            vessel.cog = clean_cog(body.get("Cog"))
            vessel.heading = clean_heading(body.get("TrueHeading"))
            vessel.position_ts = ts
            vessel.update_motion(vessel.sog, ts)
            position = TrackPoint(ts, *coords, vessel.sog, vessel.cog, vessel.heading)

    elif mtype == "ShipStaticData":
        if body.get("Valid") is False:
            return ParsedMessage(vessel.mmsi, mtype, None, False)
        vessel.ais_class = "A"
        _apply_name(vessel, body.get("Name"))
        vessel.callsign = clean_text(body.get("CallSign")) or vessel.callsign
        imo = body.get("ImoNumber")
        if isinstance(imo, int) and 1_000_000 <= imo <= 9_999_999:
            vessel.imo = imo
        _apply_type(vessel, body.get("Type"))
        _apply_dims(vessel, body.get("Dimension"))
        vessel.destination = clean_text(body.get("Destination")) or vessel.destination
        vessel.eta = _eta(body.get("Eta")) or vessel.eta
        draught = body.get("MaximumStaticDraught")
        if isinstance(draught, (int, float)) and draught > 0:
            vessel.draught = float(draught)

    elif mtype == "StaticDataReport":
        vessel.ais_class = vessel.ais_class or "B"
        report_a = body.get("ReportA") or {}
        report_b = body.get("ReportB") or {}
        if report_a.get("Valid"):
            _apply_name(vessel, report_a.get("Name"))
        if report_b.get("Valid"):
            _apply_type(vessel, report_b.get("ShipType"))
            vessel.callsign = clean_text(report_b.get("CallSign")) or vessel.callsign
            _apply_dims(vessel, report_b.get("Dimension"))
    else:
        return None

    if vessel.name is None:
        _apply_name(vessel, meta.get("ShipName"))
    return ParsedMessage(vessel.mmsi, mtype, position, vessel.static_dict() != before)


def _apply_name(vessel: Vessel, name: Any) -> None:
    if cleaned := clean_text(name):
        vessel.name = cleaned


def _apply_type(vessel: Vessel, ship_type: Any) -> None:
    if isinstance(ship_type, int) and 1 <= ship_type <= 99:
        vessel.ship_type = ship_type


def _apply_dims(vessel: Vessel, dim: Any) -> None:
    if (dims := _dims(dim)) is not None:
        vessel.dim_a, vessel.dim_b, vessel.dim_c, vessel.dim_d = dims


# --- geometry -------------------------------------------------------------


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in metres."""
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def angle_diff(a: float, b: float) -> float:
    """Smallest absolute difference between two bearings."""
    d = abs(a - b) % 360
    return 360 - d if d > 180 else d


def in_boxes(lat: float, lon: float, boxes: list[list[list[float]]]) -> bool:
    """Whether a point lies in any [[lat1, lon1], [lat2, lon2]] box."""
    for (lat1, lon1), (lat2, lon2) in boxes:
        if min(lat1, lat2) <= lat <= max(lat1, lat2) and min(lon1, lon2) <= lon <= max(
            lon1, lon2
        ):
            return True
    return False


def circle_to_box(lat: float, lon: float, radius_m: float) -> list[list[float]]:
    """Bounding box around a circle, as [[north, west], [south, east]]."""
    dlat = radius_m / 111_320.0
    dlon = radius_m / (111_320.0 * max(math.cos(math.radians(lat)), 0.01))
    return [
        [round(min(lat + dlat, 90.0), 5), round(max(lon - dlon, -180.0), 5)],
        [round(max(lat - dlat, -90.0), 5), round(min(lon + dlon, 180.0), 5)],
    ]
