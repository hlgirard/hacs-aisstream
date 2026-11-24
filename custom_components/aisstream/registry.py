"""In-memory vessel registry with track thinning (no Home Assistant imports)."""

from __future__ import annotations

from collections import Counter, deque
from typing import Any

from .const import (
    HOT_WINDOW_S,
    THIN_COURSE_DEG,
    THIN_STATIONARY_M,
    THIN_STATIONARY_S,
    THIN_UNDERWAY_M,
    THIN_UNDERWAY_S,
    UNDERWAY_SOG,
)
from .models import (
    TrackPoint,
    Vessel,
    angle_diff,
    apply_message,
    haversine_m,
    in_boxes,
    message_mmsi,
    message_time,
)


def should_keep(last: TrackPoint | None, new: TrackPoint) -> bool:
    """Decide whether a new position is stored in the thinned track."""
    if last is None:
        return True
    dt = new.ts - last.ts
    if dt <= 0:
        return False
    dist = haversine_m(last.lat, last.lon, new.lat, new.lon)
    if new.sog is not None and new.sog >= UNDERWAY_SOG:
        if dt >= THIN_UNDERWAY_S or dist >= THIN_UNDERWAY_M:
            return True
        if new.cog is not None and last.cog is not None:
            return angle_diff(new.cog, last.cog) >= THIN_COURSE_DEG
        return False
    return dt >= THIN_STATIONARY_S or dist >= THIN_STATIONARY_M


class VesselRegistry:
    """Holds vessel state, the in-memory track window and pending changes."""

    def __init__(
        self,
        boxes: list[list[list[float]]],
        stale_s: float,
        favorites: set[int] | None = None,
    ) -> None:
        """Initialise."""
        self.boxes = boxes
        self.stale_s = stale_s
        self.favorites: set[int] = set(favorites or ())
        self.vessels: dict[int, Vessel] = {}
        # Pending for storage
        self.pending_points: list[tuple[int, TrackPoint]] = []
        self.pending_static: set[int] = set()
        # Pending for broadcast (entities / websocket subscribers)
        self.dirty: set[int] = set()
        self.new_points: dict[int, list[TrackPoint]] = {}
        # Message rate (timestamps of the last minute)
        self._recent: deque[float] = deque()
        self.message_types: Counter[str] = Counter()

    # -- ingestion -----------------------------------------------------------

    def handle(self, msg: dict[str, Any], received: float) -> int | None:
        """Apply an aisstream message. Returns the MMSI if anything changed."""
        mtype = msg.get("MessageType")
        if mtype == "SubscriptionConfirmation" or not mtype:
            return None
        self._recent.append(received)
        self.message_types[mtype] += 1
        mmsi = message_mmsi(msg)
        if mmsi is None:
            return None
        vessel = self.vessels.get(mmsi)
        if vessel is None:
            vessel = self.vessels[mmsi] = Vessel(mmsi)
        result = apply_message(vessel, msg, message_time(msg, received))
        if result is None:
            if not vessel.last_seen:
                del self.vessels[mmsi]
            return None
        # Always re-persist the vessel row so last_seen (and nav status) in
        # storage stay current even when only unchanged static data arrives.
        self.pending_static.add(mmsi)
        if result.position is not None:
            last = vessel.track[-1] if vessel.track else None
            if should_keep(last, result.position):
                vessel.track.append(result.position)
                self.pending_points.append((mmsi, result.position))
                self.new_points.setdefault(mmsi, []).append(result.position)
        self.dirty.add(mmsi)
        return mmsi

    # -- restore -------------------------------------------------------------

    def restore(
        self,
        statics: dict[int, tuple[dict[str, Any], float]],
        points: list[tuple[int, TrackPoint]],
    ) -> None:
        """Restore state from storage (points must be sorted by time)."""
        for mmsi, (static, last_seen) in statics.items():
            vessel = self.vessels.setdefault(mmsi, Vessel(mmsi))
            vessel.load_static(static)
            vessel.last_seen = max(vessel.last_seen, last_seen)
        for mmsi, point in points:
            vessel = self.vessels.setdefault(mmsi, Vessel(mmsi))
            vessel.track.append(point)
            vessel.lat, vessel.lon = point.lat, point.lon
            vessel.sog, vessel.cog, vessel.heading = point.sog, point.cog, point.heading
            vessel.position_ts = point.ts
            vessel.update_motion(point.sog, point.ts)
            vessel.last_seen = max(vessel.last_seen, point.ts)

    # -- housekeeping --------------------------------------------------------

    def prune(self, now: float) -> None:
        """Drop track points and vessels outside the in-memory window."""
        cutoff = now - HOT_WINDOW_S
        for mmsi in list(self.vessels):
            vessel = self.vessels[mmsi]
            while vessel.track and vessel.track[0].ts < cutoff:
                vessel.track.popleft()
            if vessel.last_seen < cutoff and mmsi not in self.favorites:
                del self.vessels[mmsi]

    def take_pending(self) -> tuple[list[tuple[int, TrackPoint]], dict[int, tuple[dict[str, Any], float]]]:
        """Return and clear pending storage writes."""
        points, self.pending_points = self.pending_points, []
        statics = {
            mmsi: (self.vessels[mmsi].static_dict(), self.vessels[mmsi].last_seen)
            for mmsi in self.pending_static
            if mmsi in self.vessels
        }
        self.pending_static = set()
        return points, statics

    def take_delta(self) -> tuple[set[int], dict[int, list[TrackPoint]]]:
        """Return and clear changes since the last broadcast."""
        dirty, self.dirty = self.dirty, set()
        points, self.new_points = self.new_points, {}
        return dirty, points

    # -- queries -------------------------------------------------------------

    def messages_per_minute(self, now: float) -> int:
        """Messages received over the last 60 s."""
        while self._recent and self._recent[0] < now - 60:
            self._recent.popleft()
        return len(self._recent)

    def in_region(self, vessel: Vessel) -> bool:
        """Whether the vessel's last position is inside the region."""
        return vessel.lat is not None and in_boxes(vessel.lat, vessel.lon, self.boxes)

    def active(self, now: float) -> list[Vessel]:
        """Vessels in the region seen within the stale threshold."""
        cutoff = now - self.stale_s
        return [
            v for v in self.vessels.values() if v.last_seen >= cutoff and self.in_region(v)
        ]

    def stats(self, now: float) -> dict[str, Any]:
        """Aggregate counts for sensors."""
        active = self.active(now)
        by_category = Counter(v.category for v in active)
        underway = sum(1 for v in active if v.underway)
        return {
            "active": len(active),
            "underway": underway,
            "stationary": len(active) - underway,
            "by_category": dict(sorted(by_category.items())),
        }

    def snapshot(self, now: float, hours: float) -> list[dict[str, Any]]:
        """Vessels seen within `hours` (plus all favorites) with their tracks."""
        cutoff = now - hours * 3600
        out = []
        for vessel in self.vessels.values():
            favorite = vessel.mmsi in self.favorites
            if vessel.last_seen < cutoff and not favorite:
                continue
            data = vessel.summary()
            data["favorite"] = favorite
            data["status"] = vessel.status(now, self.stale_s)
            data["track"] = encode_track(p for p in vessel.track if p.ts >= cutoff)
            out.append(data)
        return out


def encode_track(points: Any) -> list[list[float]]:
    """Compact [ts, lat, lon] triples for the frontend."""
    return [[int(p.ts), round(p.lat, 5), round(p.lon, 5)] for p in points]
