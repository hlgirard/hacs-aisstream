"""Diagnostics for AISStream."""

from __future__ import annotations

from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.const import CONF_API_KEY, CONF_LOCATION
from homeassistant.core import HomeAssistant

from .const import CONF_BOXES
from .hub import AisStreamConfigEntry

# The region defaults to the home location; reports often end up public.
TO_REDACT = {CONF_API_KEY, CONF_LOCATION, CONF_BOXES}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: AisStreamConfigEntry
) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    hub = entry.runtime_data
    return {
        "entry": {
            "data": async_redact_data(dict(entry.data), TO_REDACT),
            "options": dict(entry.options),
            "favorites": [dict(s.data) for s in entry.subentries.values()],
        },
        "runtime": hub.diagnostics(),
        "storage": await hass.async_add_executor_job(hub.store.stats),
    }
