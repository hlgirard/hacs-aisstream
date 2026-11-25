"""Constants for the AISStream integration."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "aisstream"

WS_URL: Final = "wss://stream.aisstream.io/v0/stream"

# Observed handshakes take 7-16 s, so be generous.
CONNECT_TIMEOUT: Final = 45
# The server must receive the subscription within 3 s of the handshake; we send it
# immediately. This is how long we wait for the SubscriptionConfirmation.
CONFIRM_TIMEOUT: Final = 15
HEARTBEAT: Final = 30
# Dead links are caught by the websocket heartbeat (aiohttp consumes pongs, so
# they never reach receive()). This only guards against a live socket whose
# stream has stalled; such reconnects are silent (no "disconnected" blip).
IDLE_TIMEOUT: Final = 900
BACKOFF_INITIAL: Final = 2.0
BACKOFF_MAX: Final = 300.0
STABLE_CONNECTION: Final = 60.0
# aisstream.io rejects a bad API key by closing the socket before confirming.
# After this many rejections in a row, ask the user to re-enter the key.
AUTH_FAIL_THRESHOLD: Final = 5
# Region entities become unavailable after this long without a connection
# (reconnect handshakes take 7-16 s, so short blips don't count).
UNAVAILABLE_AFTER_S: Final = 300

POSITION_TYPES: Final = (
    "PositionReport",
    "StandardClassBPositionReport",
    "ExtendedClassBPositionReport",
)
STATIC_TYPES: Final = ("ShipStaticData", "StaticDataReport")
SUBSCRIBED_TYPES: Final = [*POSITION_TYPES, *STATIC_TYPES]

# Config entry data / options
CONF_REGION_NAME: Final = "region_name"
CONF_BOXES: Final = "boxes"
CONF_RETENTION_HOURS: Final = "retention_hours"
CONF_STALE_MINUTES: Final = "stale_minutes"

DEFAULT_RETENTION_HOURS: Final = 24
DEFAULT_STALE_MINUTES: Final = 30
DEFAULT_RADIUS_M: Final = 10_000

# Favorite subentries
SUBENTRY_FAVORITE: Final = "favorite"
CONF_MMSI: Final = "mmsi"
CONF_ALIAS: Final = "alias"
CONF_UNLIMITED: Final = "unlimited"
CONF_RETENTION_DAYS: Final = "retention_days"
DEFAULT_FAVORITE_RETENTION_DAYS: Final = 365

# In-memory ("hot") window, independent of on-disk retention.
HOT_WINDOW_S: Final = 24 * 3600

# Track thinning
UNDERWAY_SOG: Final = 0.5  # knots

# Map "moving" state (card only): set at >= MOVING_SOG, cleared after
# MOVING_STOP_REPORTS consecutive slower reports. The card also ends it after
# 10 minutes slow, for vessels that go quiet after one slow report.
MOVING_SOG: Final = 1.0  # knots
MOVING_STOP_REPORTS: Final = 2
THIN_UNDERWAY_S: Final = 60
THIN_UNDERWAY_M: Final = 100
THIN_COURSE_DEG: Final = 15
THIN_STATIONARY_S: Final = 600
THIN_STATIONARY_M: Final = 50

# Timers
BROADCAST_INTERVAL_S: Final = 2
FLUSH_INTERVAL_S: Final = 30
PRUNE_INTERVAL_S: Final = 3600

TRACK_MAX_POINTS: Final = 5000

FRONTEND_URL_BASE: Final = "/aisstream_static"
CARD_FILENAME: Final = "aisstream-map-card.js"

# Navigation status values that mean "not going anywhere"
NAV_STATUS_STATIONARY: Final = frozenset({1, 5, 6})  # at anchor, moored, aground
# "Under way" statuses (engine, sailing): overridden to "stopped" below UNDERWAY_SOG
NAV_STATUS_UNDERWAY: Final = frozenset({0, 8})

NAV_STATUS: Final = {
    0: "under_way_engine",
    1: "at_anchor",
    2: "not_under_command",
    3: "restricted_manoeuvrability",
    4: "constrained_by_draught",
    5: "moored",
    6: "aground",
    7: "fishing",
    8: "under_way_sailing",
    14: "ais_sart",
    15: "undefined",
}

# Favorite status sensor: AIS navigational status when reported, else inferred.
AIS_STATUS_MAP: Final = {
    0: "underway",
    1: "at_anchor",
    2: "not_under_command",
    3: "restricted_manoeuvrability",
    4: "constrained_by_draught",
    5: "moored",
    6: "aground",
    7: "fishing",
    8: "sailing",
    14: "emergency",  # AIS-SART active
}
VESSEL_STATUSES: Final = [
    *dict.fromkeys(AIS_STATUS_MAP.values()),
    "stopped",  # inferred: not moving, no AIS status
    "out_of_range",  # not heard within the stale threshold
]


def ship_category(ship_type: int | None) -> str:
    """Map an AIS ship type code to a display category."""
    if not ship_type:
        return "unknown"
    if 70 <= ship_type <= 79:
        return "cargo"
    if 80 <= ship_type <= 89:
        return "tanker"
    if 60 <= ship_type <= 69:
        return "passenger"
    if 40 <= ship_type <= 49:
        return "high_speed"
    if ship_type in (31, 32, 50, 51, 52, 53, 54, 55, 58):
        return "special"
    if ship_type == 30:
        return "fishing"
    if ship_type == 36:
        return "sailing"
    if ship_type == 37:
        return "pleasure"
    return "other"
