"""Config flow for AISStream."""

from __future__ import annotations

import logging
import re
from collections.abc import Mapping
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigEntryState,
    ConfigFlow,
    ConfigFlowResult,
    ConfigSubentryFlow,
    OptionsFlow,
    SubentryFlowResult,
)
from homeassistant.const import CONF_API_KEY, CONF_LOCATION
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.selector import (
    BooleanSelector,
    LocationSelector,
    LocationSelectorConfig,
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
)

from .client import CannotConnect, InvalidSubscription, build_subscription, validate_subscription
from .const import (
    CONF_ALIAS,
    CONF_BOXES,
    CONF_MMSI,
    CONF_REGION_NAME,
    CONF_RETENTION_DAYS,
    CONF_RETENTION_HOURS,
    CONF_STALE_MINUTES,
    CONF_UNLIMITED,
    DEFAULT_FAVORITE_RETENTION_DAYS,
    DEFAULT_RADIUS_M,
    DEFAULT_RETENTION_HOURS,
    DEFAULT_STALE_MINUTES,
    DOMAIN,
    SUBENTRY_FAVORITE,
)
from .models import circle_to_box

_LOGGER = logging.getLogger(__name__)

MMSI_RE = re.compile(r"^\d{9}$")


async def _validate(flow: ConfigFlow, api_key: str, boxes: list) -> dict[str, str]:
    errors: dict[str, str] = {}
    try:
        await validate_subscription(
            async_get_clientsession(flow.hass), build_subscription(api_key, boxes)
        )
    except InvalidSubscription:
        errors["base"] = "invalid_auth"
    except CannotConnect:
        errors["base"] = "cannot_connect"
    except Exception:
        _LOGGER.exception("Unexpected error validating aisstream subscription")
        errors["base"] = "unknown"
    return errors


class AisStreamConfigFlow(ConfigFlow, domain=DOMAIN):
    """Set up a monitored region."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Ask for the API key and region."""
        errors: dict[str, str] = {}
        if user_input is not None:
            loc = user_input[CONF_LOCATION]
            radius = float(loc.get("radius") or DEFAULT_RADIUS_M)
            boxes = [circle_to_box(loc["latitude"], loc["longitude"], radius)]
            api_key = user_input[CONF_API_KEY].strip()
            self._async_abort_entries_match({CONF_API_KEY: api_key, CONF_BOXES: boxes})
            errors = await _validate(self, api_key, boxes)
            if not errors:
                name = user_input[CONF_REGION_NAME].strip()
                return self.async_create_entry(
                    title=name,
                    data={
                        CONF_API_KEY: api_key,
                        CONF_REGION_NAME: name,
                        CONF_BOXES: boxes,
                        CONF_LOCATION: {
                            "latitude": loc["latitude"],
                            "longitude": loc["longitude"],
                            "radius": radius,
                        },
                    },
                    options={
                        CONF_RETENTION_HOURS: DEFAULT_RETENTION_HOURS,
                        CONF_STALE_MINUTES: DEFAULT_STALE_MINUTES,
                    },
                )

        # Reuse the API key of an existing entry as a default.
        existing = self._async_current_entries()
        default_key = existing[0].data[CONF_API_KEY] if existing else ""
        schema = vol.Schema(
            {
                vol.Required(CONF_API_KEY, default=default_key): TextSelector(
                    TextSelectorConfig(type=TextSelectorType.PASSWORD)
                ),
                vol.Required(CONF_REGION_NAME, default="Home waters"): TextSelector(),
                vol.Required(
                    CONF_LOCATION,
                    default={
                        "latitude": self.hass.config.latitude,
                        "longitude": self.hass.config.longitude,
                        "radius": DEFAULT_RADIUS_M,
                    },
                ): LocationSelector(LocationSelectorConfig(radius=True, icon="mdi:ferry")),
            }
        )
        return self.async_show_form(
            step_id="user",
            data_schema=self.add_suggested_values_to_schema(schema, user_input),
            errors=errors,
            description_placeholders={"url": "https://aisstream.io"},
        )

    async def async_step_reauth(self, entry_data: Mapping[str, Any]) -> ConfigFlowResult:
        """aisstream.io keeps rejecting the subscription."""
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask for a new API key."""
        entry = self._get_reauth_entry()
        errors: dict[str, str] = {}
        if user_input is not None:
            api_key = user_input[CONF_API_KEY].strip()
            errors = await _validate(self, api_key, entry.data[CONF_BOXES])
            if not errors:
                if api_key == entry.data[CONF_API_KEY]:
                    # Same key (aisstream.io was down): the update listener
                    # won't fire, so reconnect now.
                    self.hass.config_entries.async_schedule_reload(entry.entry_id)
                # Otherwise the update listener reloads the entry.
                return self.async_update_and_abort(
                    entry, data_updates={CONF_API_KEY: api_key}
                )
        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_API_KEY): TextSelector(
                        TextSelectorConfig(type=TextSelectorType.PASSWORD)
                    )
                }
            ),
            errors=errors,
            description_placeholders={"region": entry.title, "url": "https://aisstream.io"},
        )

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Change the API key or region."""
        entry = self._get_reconfigure_entry()
        errors: dict[str, str] = {}
        if user_input is not None:
            loc = user_input[CONF_LOCATION]
            radius = float(loc.get("radius") or DEFAULT_RADIUS_M)
            boxes = [circle_to_box(loc["latitude"], loc["longitude"], radius)]
            api_key = user_input[CONF_API_KEY].strip()
            if any(
                other.entry_id != entry.entry_id
                and other.data.get(CONF_API_KEY) == api_key
                and other.data.get(CONF_BOXES) == boxes
                for other in self._async_current_entries(include_ignore=False)
            ):
                return self.async_abort(reason="already_configured")
            errors = await _validate(self, api_key, boxes)
            if not errors:
                name = user_input[CONF_REGION_NAME].strip()
                # The update listener reloads the entry.
                return self.async_update_and_abort(
                    entry,
                    title=name,
                    data={
                        CONF_API_KEY: api_key,
                        CONF_REGION_NAME: name,
                        CONF_BOXES: boxes,
                        CONF_LOCATION: {
                            "latitude": loc["latitude"],
                            "longitude": loc["longitude"],
                            "radius": radius,
                        },
                    },
                )
        schema = vol.Schema(
            {
                vol.Required(CONF_API_KEY, default=entry.data[CONF_API_KEY]): TextSelector(
                    TextSelectorConfig(type=TextSelectorType.PASSWORD)
                ),
                vol.Required(
                    CONF_REGION_NAME, default=entry.data.get(CONF_REGION_NAME, entry.title)
                ): TextSelector(),
                vol.Required(
                    CONF_LOCATION, default=entry.data.get(CONF_LOCATION)
                ): LocationSelector(LocationSelectorConfig(radius=True, icon="mdi:ferry")),
            }
        )
        return self.async_show_form(step_id="reconfigure", data_schema=schema, errors=errors)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> AisStreamOptionsFlow:
        """Options."""
        return AisStreamOptionsFlow()

    @classmethod
    @callback
    def async_get_supported_subentry_types(
        cls, config_entry: ConfigEntry
    ) -> dict[str, type[ConfigSubentryFlow]]:
        """Favorites are subentries."""
        return {SUBENTRY_FAVORITE: FavoriteSubentryFlow}


class AisStreamOptionsFlow(OptionsFlow):
    """Retention and connection options."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Manage options."""
        if user_input is not None:
            return self.async_create_entry(
                data={
                    CONF_RETENTION_HOURS: int(user_input[CONF_RETENTION_HOURS]),
                    CONF_STALE_MINUTES: int(user_input[CONF_STALE_MINUTES]),
                }
            )
        options = self.config_entry.options
        db_size = "n/a"
        positions = "n/a"
        if self.config_entry.state is ConfigEntryState.LOADED:
            hub = self.config_entry.runtime_data
            stats = await self.hass.async_add_executor_job(hub.store.stats)
            if stats["size_bytes"] is not None:
                db_size = f"{stats['size_bytes'] / 1_048_576:.1f} MB"
            positions = f"{stats['positions']:,}"
        schema = vol.Schema(
            {
                vol.Required(
                    CONF_RETENTION_HOURS,
                    default=options.get(CONF_RETENTION_HOURS, DEFAULT_RETENTION_HOURS),
                ): NumberSelector(
                    NumberSelectorConfig(
                        min=1, step=1, mode=NumberSelectorMode.BOX, unit_of_measurement="h"
                    )
                ),
                vol.Required(
                    CONF_STALE_MINUTES,
                    default=options.get(CONF_STALE_MINUTES, DEFAULT_STALE_MINUTES),
                ): NumberSelector(
                    NumberSelectorConfig(
                        min=5, max=1440, step=1, mode=NumberSelectorMode.BOX,
                        unit_of_measurement="min",
                    )
                ),
            }
        )
        return self.async_show_form(
            step_id="init",
            data_schema=schema,
            description_placeholders={"db_size": db_size, "positions": positions},
        )


class FavoriteSubentryFlow(ConfigSubentryFlow):
    """Add or edit a favorite vessel."""

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> SubentryFlowResult:
        """Add a favorite."""
        errors: dict[str, str] = {}
        if user_input is not None:
            mmsi = user_input[CONF_MMSI].strip()
            entry = self._get_entry()
            if not MMSI_RE.match(mmsi):
                errors[CONF_MMSI] = "invalid_mmsi"
            elif any(
                s.subentry_type == SUBENTRY_FAVORITE and s.data.get(CONF_MMSI) == mmsi
                for s in entry.subentries.values()
            ):
                errors[CONF_MMSI] = "already_favorite"
            else:
                data = _favorite_data(mmsi, user_input)
                return self.async_create_entry(
                    title=data[CONF_ALIAS] or self._vessel_name(int(mmsi)) or f"MMSI {mmsi}",
                    data=data,
                    unique_id=mmsi,
                )
        schema = vol.Schema({vol.Required(CONF_MMSI): TextSelector(), **_favorite_fields({})})
        return self.async_show_form(
            step_id="user",
            data_schema=self.add_suggested_values_to_schema(schema, user_input),
            errors=errors,
        )

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> SubentryFlowResult:
        """Edit alias / retention of a favorite."""
        entry = self._get_entry()
        subentry = self._get_reconfigure_subentry()
        mmsi = subentry.data[CONF_MMSI]
        if user_input is not None:
            data = _favorite_data(mmsi, user_input)
            return self.async_update_and_abort(
                entry,
                subentry,
                title=data[CONF_ALIAS] or self._vessel_name(int(mmsi)) or f"MMSI {mmsi}",
                data=data,
            )
        return self.async_show_form(
            step_id="reconfigure",
            data_schema=vol.Schema(_favorite_fields(subentry.data)),
            description_placeholders={"mmsi": mmsi},
        )

    def _vessel_name(self, mmsi: int) -> str | None:
        entry = self._get_entry()
        if entry.state is not ConfigEntryState.LOADED:
            return None
        vessel = entry.runtime_data.registry.vessels.get(mmsi)
        return vessel.name if vessel else None


def _favorite_fields(current: Any) -> dict[Any, Any]:
    retention = current.get(CONF_RETENTION_DAYS)
    return {
        vol.Optional(
            CONF_ALIAS, description={"suggested_value": current.get(CONF_ALIAS)}
        ): TextSelector(),
        vol.Required(
            CONF_UNLIMITED, default=bool(current) and retention is None
        ): BooleanSelector(),
        vol.Optional(
            CONF_RETENTION_DAYS, default=retention or DEFAULT_FAVORITE_RETENTION_DAYS
        ): NumberSelector(
            NumberSelectorConfig(min=1, step=1, mode=NumberSelectorMode.BOX, unit_of_measurement="d")
        ),
    }


def _favorite_data(mmsi: str, user_input: dict[str, Any]) -> dict[str, Any]:
    unlimited = user_input.get(CONF_UNLIMITED, False)
    days = user_input.get(CONF_RETENTION_DAYS) or DEFAULT_FAVORITE_RETENTION_DAYS
    return {
        CONF_MMSI: mmsi,
        CONF_ALIAS: (user_input.get(CONF_ALIAS) or "").strip() or None,
        CONF_RETENTION_DAYS: None if unlimited else float(days),
    }
