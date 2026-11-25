"""Tests for the config, options and favorite subentry flows."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from homeassistant import config_entries
from homeassistant.config_entries import ConfigSubentryData
from homeassistant.const import CONF_API_KEY, CONF_LOCATION
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.aisstream.client import CannotConnect, InvalidSubscription
from custom_components.aisstream.const import (
    CONF_ALIAS,
    CONF_BOXES,
    CONF_MMSI,
    CONF_REGION_NAME,
    CONF_RETENTION_DAYS,
    CONF_RETENTION_HOURS,
    CONF_STALE_MINUTES,
    CONF_UNLIMITED,
    DOMAIN,
    SUBENTRY_FAVORITE,
)

from .conftest import API_KEY, BOSTON_BOX

USER_INPUT = {
    CONF_API_KEY: API_KEY,
    CONF_REGION_NAME: "Boston Harbor",
    CONF_LOCATION: {"latitude": 42.335, "longitude": -70.975, "radius": 10000},
}
VALIDATE = "custom_components.aisstream.config_flow.validate_subscription"


def _entry(**kwargs) -> MockConfigEntry:
    return MockConfigEntry(
        domain=DOMAIN,
        title="Boston Harbor",
        data={CONF_API_KEY: API_KEY, CONF_REGION_NAME: "Boston Harbor", CONF_BOXES: [BOSTON_BOX],
              CONF_LOCATION: USER_INPUT[CONF_LOCATION]},
        options={CONF_RETENTION_HOURS: 24, CONF_STALE_MINUTES: 30},
        **kwargs,
    )


async def test_user_flow(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert result["type"] is FlowResultType.FORM
    with (
        patch(VALIDATE, AsyncMock()) as validate,
        patch("custom_components.aisstream.async_setup_entry", return_value=True),
    ):
        result = await hass.config_entries.flow.async_configure(result["flow_id"], USER_INPUT)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Boston Harbor"
    box = result["data"][CONF_BOXES][0]
    assert box[0][0] > 42.335 > box[1][0]
    sub = validate.call_args.args[1]
    assert sub["APIKey"] == API_KEY and sub["BoundingBoxes"] == result["data"][CONF_BOXES]


@pytest.mark.parametrize(
    ("exc", "error"),
    [(InvalidSubscription("x"), "invalid_auth"), (CannotConnect("x"), "cannot_connect"), (ValueError, "unknown")],
)
async def test_user_flow_errors(hass: HomeAssistant, exc: Exception, error: str) -> None:
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    with patch(VALIDATE, AsyncMock(side_effect=exc)):
        result = await hass.config_entries.flow.async_configure(result["flow_id"], USER_INPUT)
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": error}


async def test_options_flow(hass: HomeAssistant) -> None:
    entry = _entry()
    entry.add_to_hass(hass)
    result = await hass.config_entries.options.async_init(entry.entry_id)
    assert result["type"] is FlowResultType.FORM
    result = await hass.config_entries.options.async_configure(
        result["flow_id"],
        {CONF_RETENTION_HOURS: 720, CONF_STALE_MINUTES: 45},
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert entry.options == {CONF_RETENTION_HOURS: 720, CONF_STALE_MINUTES: 45}


async def test_favorite_subentry_flow(hass: HomeAssistant) -> None:
    entry = _entry(
        subentries_data=[
            ConfigSubentryData(
                data={CONF_MMSI: "367164250", CONF_ALIAS: None, CONF_RETENTION_DAYS: None},
                subentry_type=SUBENTRY_FAVORITE, title="FREEDOM", unique_id="367164250",
            )
        ]
    )
    entry.add_to_hass(hass)
    flow = hass.config_entries.subentries
    result = await flow.async_init((entry.entry_id, SUBENTRY_FAVORITE), context={"source": "user"})
    assert result["type"] is FlowResultType.FORM

    result = await flow.async_configure(result["flow_id"], {CONF_MMSI: "12345", CONF_UNLIMITED: False})
    assert result["errors"] == {CONF_MMSI: "invalid_mmsi"}
    result = await flow.async_configure(result["flow_id"], {CONF_MMSI: "367164250", CONF_UNLIMITED: True})
    assert result["errors"] == {CONF_MMSI: "already_favorite"}
    result = await flow.async_configure(
        result["flow_id"],
        {CONF_MMSI: "338902000", CONF_ALIAS: "Charlton", CONF_UNLIMITED: False, CONF_RETENTION_DAYS: 30},
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    sub = next(s for s in entry.subentries.values() if s.data[CONF_MMSI] == "338902000")
    assert sub.title == "Charlton"
    assert sub.data == {CONF_MMSI: "338902000", CONF_ALIAS: "Charlton", CONF_RETENTION_DAYS: 30.0}

    # Reconfigure to unlimited
    result = await entry.start_subentry_reconfigure_flow(hass, sub.subentry_id)
    assert result["type"] is FlowResultType.FORM
    result = await flow.async_configure(
        result["flow_id"], {CONF_ALIAS: "Charlton", CONF_UNLIMITED: True, CONF_RETENTION_DAYS: 30}
    )
    assert result["type"] is FlowResultType.ABORT
    assert entry.subentries[sub.subentry_id].data[CONF_RETENTION_DAYS] is None


async def test_duplicate_region_aborts(hass: HomeAssistant) -> None:
    from custom_components.aisstream.models import circle_to_box

    loc = USER_INPUT[CONF_LOCATION]
    entry = _entry()
    entry.add_to_hass(hass)
    hass.config_entries.async_update_entry(
        entry, data={**entry.data, CONF_BOXES: [circle_to_box(loc["latitude"], loc["longitude"], loc["radius"])]}
    )
    result = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    with patch(VALIDATE, AsyncMock()) as validate:
        result = await hass.config_entries.flow.async_configure(result["flow_id"], USER_INPUT)
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"
    validate.assert_not_called()


async def test_reauth_flow(hass: HomeAssistant) -> None:
    entry = _entry()
    entry.add_to_hass(hass)
    result = await entry.start_reauth_flow(hass)
    assert result["step_id"] == "reauth_confirm"
    with patch(VALIDATE, AsyncMock(side_effect=InvalidSubscription("closed"))):
        result = await hass.config_entries.flow.async_configure(result["flow_id"], {CONF_API_KEY: "bad"})
    assert result["errors"] == {"base": "invalid_auth"}
    with (
        patch(VALIDATE, AsyncMock()),
        patch("custom_components.aisstream.async_setup_entry", return_value=True),
    ):
        result = await hass.config_entries.flow.async_configure(result["flow_id"], {CONF_API_KEY: " newkey "})
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    assert entry.data[CONF_API_KEY] == "newkey"


async def test_reconfigure_onto_other_region_aborts(hass: HomeAssistant) -> None:
    from custom_components.aisstream.models import circle_to_box

    loc = USER_INPUT[CONF_LOCATION]
    box = circle_to_box(loc["latitude"], loc["longitude"], loc["radius"])
    other = _entry()
    other.add_to_hass(hass)
    hass.config_entries.async_update_entry(other, data={**other.data, CONF_BOXES: [box]})
    entry = _entry()
    entry.add_to_hass(hass)
    result = await entry.start_reconfigure_flow(hass)
    with patch(VALIDATE, AsyncMock()) as validate:
        result = await hass.config_entries.flow.async_configure(result["flow_id"], USER_INPUT)
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"
    validate.assert_not_called()


async def test_reconfigure_same_region_is_not_a_duplicate(hass: HomeAssistant) -> None:
    from custom_components.aisstream.models import circle_to_box

    loc = USER_INPUT[CONF_LOCATION]
    entry = _entry()
    entry.add_to_hass(hass)
    hass.config_entries.async_update_entry(
        entry, data={**entry.data, CONF_BOXES: [circle_to_box(loc["latitude"], loc["longitude"], loc["radius"])]}
    )
    result = await entry.start_reconfigure_flow(hass)
    with (
        patch(VALIDATE, AsyncMock()),
        patch("custom_components.aisstream.async_setup_entry", return_value=True),
    ):
        result = await hass.config_entries.flow.async_configure(
            result["flow_id"], {**USER_INPUT, CONF_REGION_NAME: "Harbor"}
        )
    assert result["reason"] == "reconfigure_successful"
    assert entry.title == "Harbor"
