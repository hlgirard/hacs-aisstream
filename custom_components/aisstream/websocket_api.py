"""Websocket commands used by the map card."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, HOT_WINDOW_S
from .hub import AisStreamHub


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register commands."""
    websocket_api.async_register_command(hass, ws_entries)
    websocket_api.async_register_command(hass, ws_snapshot)
    websocket_api.async_register_command(hass, ws_track)
    websocket_api.async_register_command(hass, ws_subscribe)


def _hubs(hass: HomeAssistant) -> list[AisStreamHub]:
    return [
        entry.runtime_data
        for entry in hass.config_entries.async_entries(DOMAIN)
        if entry.state is ConfigEntryState.LOADED
    ]


def _get_hub(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> AisStreamHub | None:
    hubs = _hubs(hass)
    entry_id = msg.get("entry_id")
    for hub in hubs:
        if entry_id is None or hub.entry.entry_id == entry_id:
            return hub
    connection.send_error(
        msg["id"],
        websocket_api.ERR_NOT_FOUND,
        "No loaded AISStream entry" + (f" with id {entry_id}" if entry_id else ""),
    )
    return None


@websocket_api.websocket_command({vol.Required("type"): "aisstream/entries"})
@callback
def ws_entries(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """List loaded regions."""
    connection.send_result(msg["id"], {"entries": [hub.info() for hub in _hubs(hass)]})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "aisstream/snapshot",
        vol.Optional("entry_id"): str,
        vol.Optional("hours", default=24): vol.All(
            vol.Coerce(float), vol.Range(min=0.1, max=HOT_WINDOW_S / 3600)
        ),
    }
)
@callback
def ws_snapshot(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return vessels and tracks within the in-memory window."""
    if hub := _get_hub(hass, connection, msg):
        connection.send_result(msg["id"], hub.snapshot(msg["hours"]))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "aisstream/track",
        vol.Optional("entry_id"): str,
        vol.Required("mmsi"): vol.Coerce(int),
        vol.Required("start"): vol.Coerce(float),
        vol.Optional("end"): vol.Coerce(float),
    }
)
@websocket_api.async_response
async def ws_track(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Return stored history for one vessel."""
    if hub := _get_hub(hass, connection, msg):
        connection.send_result(
            msg["id"], await hub.async_track(msg["mmsi"], msg["start"], msg.get("end"))
        )


@websocket_api.websocket_command(
    {vol.Required("type"): "aisstream/subscribe", vol.Optional("entry_id"): str}
)
@callback
def ws_subscribe(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Stream batched vessel updates."""
    if (hub := _get_hub(hass, connection, msg)) is None:
        return

    @callback
    def forward(delta: dict[str, Any]) -> None:
        connection.send_message(websocket_api.event_message(msg["id"], delta))

    connection.subscriptions[msg["id"]] = hub.async_subscribe(forward)
    connection.send_result(msg["id"])
