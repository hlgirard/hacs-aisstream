"""Purge-history buttons for favorite vessels."""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .entity import FavoriteEntity
from .hub import AisStreamConfigEntry, AisStreamHub, Favorite

PARALLEL_UPDATES = 1


async def async_setup_entry(
    hass: HomeAssistant,
    entry: AisStreamConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up one purge button per favorite."""
    hub = entry.runtime_data
    for favorite in hub.favorites.values():
        async_add_entities(
            [PurgeHistoryButton(hub, favorite)], config_subentry_id=favorite.subentry_id
        )


class PurgeHistoryButton(FavoriteEntity, ButtonEntity):
    """Delete the stored track history of a favorite vessel."""

    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, hub: AisStreamHub, favorite: Favorite) -> None:
        """Initialise."""
        super().__init__(hub, favorite, "purge_history")

    def _refresh(self) -> bool:
        return False

    async def async_press(self) -> None:
        """Purge."""
        await self.hub.async_purge(self.favorite.mmsi)
