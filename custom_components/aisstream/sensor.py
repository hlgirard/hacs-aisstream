"""Sensors for AISStream."""

from __future__ import annotations

import time
from datetime import UTC, datetime
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.const import EntityCategory, UnitOfSpeed
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .const import VESSEL_STATUSES
from .entity import FavoriteEntity, RegionEntity
from .hub import AisStreamConfigEntry, AisStreamHub, Favorite

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: AisStreamConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up sensors."""
    hub = entry.runtime_data
    async_add_entities(
        [
            VesselCountSensor(hub),
            UnderwayCountSensor(hub),
            MessageRateSensor(hub),
            LastMessageSensor(hub),
        ]
    )
    for favorite in hub.favorites.values():
        async_add_entities(
            [
                FavoriteStatusSensor(hub, favorite),
                FavoriteLastSeenSensor(hub, favorite),
                FavoriteSpeedSensor(hub, favorite),
            ],
            config_subentry_id=favorite.subentry_id,
        )


def _dt(ts: float | None) -> datetime | None:
    return datetime.fromtimestamp(ts, UTC) if ts else None


class VesselCountSensor(RegionEntity, SensorEntity):
    """Active vessels in the region."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "vessels"

    def __init__(self, hub: AisStreamHub) -> None:
        """Initialise."""
        super().__init__(hub, "vessels")

    @callback
    def _refresh(self) -> bool:
        stats = self.hub.registry.stats(time.time())
        new: tuple[Any, ...] = (stats["active"], stats["stationary"], stats["by_category"])
        changed = new != getattr(self, "_last", None)
        self._last = new
        self._attr_native_value = stats["active"]
        self._attr_extra_state_attributes = {
            "underway": stats["underway"],
            "stationary": stats["stationary"],
            **stats["by_category"],
        }
        return changed


class UnderwayCountSensor(RegionEntity, SensorEntity):
    """Active vessels that are moving."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "vessels"

    def __init__(self, hub: AisStreamHub) -> None:
        """Initialise."""
        super().__init__(hub, "vessels_underway")

    @callback
    def _refresh(self) -> bool:
        value = self.hub.registry.stats(time.time())["underway"]
        changed = value != self._attr_native_value
        self._attr_native_value = value
        return changed


class MessageRateSensor(RegionEntity, SensorEntity):
    """Messages per minute."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "msg/min"
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, hub: AisStreamHub) -> None:
        """Initialise."""
        super().__init__(hub, "message_rate")

    @property
    def available(self) -> bool:
        """Stay available during an outage: it shows how long it has lasted."""
        return True

    @callback
    def _refresh(self) -> bool:
        value = self.hub.registry.messages_per_minute(time.time())
        changed = value != self._attr_native_value
        self._attr_native_value = value
        return changed


class LastMessageSensor(RegionEntity, SensorEntity):
    """Time of the last received message."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, hub: AisStreamHub) -> None:
        """Initialise."""
        super().__init__(hub, "last_message")
        self._last_written = 0.0

    @property
    def available(self) -> bool:
        """Stay available during an outage: it shows how long it has lasted."""
        return True

    @callback
    def _refresh(self) -> bool:
        ts = self.hub.last_message
        # Avoid a state write every 2 s: at most once a minute.
        if ts is None or ts - self._last_written < 60:
            return self._attr_native_value is None and ts is not None
        self._last_written = ts
        self._attr_native_value = _dt(ts)
        return True


class FavoriteLastSeenSensor(FavoriteEntity, SensorEntity):
    """When the favorite vessel was last heard."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, hub: AisStreamHub, favorite: Favorite) -> None:
        """Initialise."""
        super().__init__(hub, favorite, "last_seen")

    @callback
    def _refresh(self) -> bool:
        vessel = self.vessel
        value = _dt(vessel.last_seen) if vessel and vessel.last_seen else None
        changed = value != self._attr_native_value
        self._attr_native_value = value
        return changed


class FavoriteSpeedSensor(FavoriteEntity, SensorEntity):
    """Speed over ground of the favorite vessel."""

    _attr_device_class = SensorDeviceClass.SPEED
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfSpeed.KNOTS
    _attr_suggested_display_precision = 1

    def __init__(self, hub: AisStreamHub, favorite: Favorite) -> None:
        """Initialise."""
        super().__init__(hub, favorite, "speed")

    @callback
    def _refresh(self) -> bool:
        vessel = self.vessel
        value = vessel.sog if vessel else None
        changed = value != self._attr_native_value
        self._attr_native_value = value
        return changed


class FavoriteStatusSensor(FavoriteEntity, SensorEntity):
    """Navigational status: the AIS-reported status if any, otherwise inferred.

    States: underway, sailing, at_anchor, moored, aground, fishing,
    not_under_command, restricted_manoeuvrability, constrained_by_draught,
    emergency, stopped (inferred), out_of_range (not heard recently).
    """

    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = VESSEL_STATUSES

    def __init__(self, hub: AisStreamHub, favorite: Favorite) -> None:
        """Initialise."""
        super().__init__(hub, favorite, "status")

    @callback
    def _refresh(self) -> bool:
        vessel = self.vessel
        value = vessel.status(time.time(), self.hub.registry.stale_s) if vessel else None
        attrs = {
            "source": vessel.status_source() if vessel else None,
            "ais_nav_status": vessel.nav_status if vessel else None,
        }
        changed = value != self._attr_native_value or attrs != getattr(
            self, "_attr_extra_state_attributes", None
        )
        self._attr_native_value = value
        self._attr_extra_state_attributes = attrs
        return changed
