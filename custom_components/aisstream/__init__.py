"""The AISStream integration."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.const import EVENT_HOMEASSISTANT_STOP, Platform
from homeassistant.core import Event, HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from . import websocket_api
from .const import CARD_FILENAME, DOMAIN, FRONTEND_URL_BASE
from .entity import region_device_info
from .hub import AisStreamConfigEntry, AisStreamHub, db_path
from .storage import TrackStore

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.BINARY_SENSOR, Platform.BUTTON, Platform.DEVICE_TRACKER, Platform.SENSOR]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the websocket API and serve the map card."""
    websocket_api.async_register(hass)

    frontend_dir = Path(__file__).parent / "frontend"
    version = (await async_get_integration(hass, DOMAIN)).version
    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL_BASE, str(frontend_dir), cache_headers=True)]
    )
    add_extra_js_url(hass, f"{FRONTEND_URL_BASE}/{CARD_FILENAME}?v={version}")
    return True


async def async_setup_entry(hass: HomeAssistant, entry: AisStreamConfigEntry) -> bool:
    """Set up a region from a config entry."""
    hub = AisStreamHub(hass, entry)
    # Register the region device first so favorite devices can link to it.
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id, **region_device_info(hub)
    )
    hub.region_device_id = device.id
    try:
        await hub.async_start()
    except Exception as err:
        await hub.async_stop()  # closes the database
        raise ConfigEntryNotReady(
            translation_domain=DOMAIN,
            translation_key="database_error",
            translation_placeholders={"error": str(err)},
        ) from err
    entry.runtime_data = hub

    async def _on_stop(_event: Event) -> None:
        await hub.async_stop()

    # Entries are not unloaded on shutdown: flush and close the DB explicitly.
    entry.async_on_unload(hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, _on_stop))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    # Options and favorite subentries both trigger a reload (new subscription).
    entry.async_on_unload(entry.add_update_listener(_async_reload))
    return True


async def _async_reload(hass: HomeAssistant, entry: AisStreamConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: AisStreamConfigEntry) -> bool:
    """Unload a config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        await entry.runtime_data.async_stop()
    return unloaded


async def async_remove_entry(hass: HomeAssistant, entry: AisStreamConfigEntry) -> None:
    """Delete the track database when the entry is removed."""
    await hass.async_add_executor_job(TrackStore.remove, db_path(hass, entry.entry_id))
