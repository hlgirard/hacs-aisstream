"""Connection status for AISStream."""

from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .entity import RegionEntity
from .hub import AisStreamConfigEntry, AisStreamHub

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: AisStreamConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the connectivity sensor."""
    async_add_entities([ConnectedSensor(entry.runtime_data)])


class ConnectedSensor(RegionEntity, BinarySensorEntity):
    """Whether the region subscription is live."""

    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, hub: AisStreamHub) -> None:
        """Initialise."""
        super().__init__(hub, "connected")

    @property
    def available(self) -> bool:
        """Always available: it reports the outage itself."""
        return True

    @callback
    def _refresh(self) -> bool:
        value = self.hub.connected
        attrs = {"last_error": self.hub.client.last_error}
        changed = value != self._attr_is_on or attrs != getattr(
            self, "_attr_extra_state_attributes", None
        )
        self._attr_is_on = value
        self._attr_extra_state_attributes = attrs
        return changed
