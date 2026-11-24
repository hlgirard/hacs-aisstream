"""Base entities for AISStream."""

from __future__ import annotations

from homeassistant.core import callback
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity import Entity

from .const import DOMAIN
from .hub import AisStreamHub, Favorite, signal_update
from .models import Vessel


def region_device_info(hub: AisStreamHub) -> DeviceInfo:
    """Device info for the region (service) device."""
    return DeviceInfo(
        identifiers={(DOMAIN, hub.entry.entry_id)},
        name=hub.region_name,
        manufacturer="aisstream.io",
        model="AIS region",
        entry_type=DeviceEntryType.SERVICE,
        configuration_url="https://aisstream.io",
    )


class AisStreamEntity(Entity):
    """Entity updated from the hub's throttled dispatcher signal."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, hub: AisStreamHub) -> None:
        """Initialise."""
        self.hub = hub

    async def async_added_to_hass(self) -> None:
        """Subscribe to hub updates."""
        self._refresh()
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass, signal_update(self.hub.entry.entry_id), self._handle_update
            )
        )

    @callback
    def _handle_update(self) -> None:
        if self._refresh():
            self.async_write_ha_state()

    @callback
    def _refresh(self) -> bool:
        """Recompute cached values; return True if the state should be written."""
        return True


class RegionEntity(AisStreamEntity):
    """Entity belonging to the region (service) device."""

    def __init__(self, hub: AisStreamHub, key: str) -> None:
        """Initialise."""
        super().__init__(hub)
        entry_id = hub.entry.entry_id
        self._attr_unique_id = f"{entry_id}_{key}"
        self._attr_translation_key = key
        self._attr_device_info = region_device_info(hub)


class FavoriteEntity(AisStreamEntity):
    """Entity belonging to a favorite vessel device."""

    def __init__(self, hub: AisStreamHub, favorite: Favorite, key: str | None) -> None:
        """Initialise."""
        super().__init__(hub)
        self.favorite = favorite
        entry_id = hub.entry.entry_id
        self._attr_unique_id = f"{entry_id}_{favorite.mmsi}" + (f"_{key}" if key else "")
        if key:
            self._attr_translation_key = key
        vessel = self.vessel
        info = DeviceInfo(
            identifiers={(DOMAIN, f"{entry_id}_{favorite.mmsi}")},
            name=favorite.alias or (vessel and vessel.name) or f"MMSI {favorite.mmsi}",
            manufacturer="AIS vessel",
            model=f"MMSI {favorite.mmsi}",
            serial_number=str(favorite.mmsi),
        )
        if hub.region_device_id:
            info["via_device_id"] = hub.region_device_id
        self._attr_device_info = info

    @property
    def vessel(self) -> Vessel | None:
        """Current vessel state, if any message has been received."""
        return self.hub.registry.vessels.get(self.favorite.mmsi)
