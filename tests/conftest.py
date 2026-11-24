"""Shared fixtures."""

from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest

FIXTURES = Path(__file__).parent / "fixtures"
API_KEY = "0123456789abcdef0123456789abcdef01234567"
BOSTON_BOX = [[42.42, -71.10], [42.25, -70.85]]


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations: Any) -> None:
    """Enable custom integrations in all tests."""


@pytest.fixture(autouse=True)
def stub_frontend() -> Iterator[list[str]]:
    """The frontend component needs hass_frontend, which tests don't install."""
    urls: list[str] = []
    with (
        patch("homeassistant.components.frontend.async_setup", return_value=True),
        patch("custom_components.aisstream.add_extra_js_url", lambda hass, url: urls.append(url)),
    ):
        yield urls


def load_messages(name: str = "boston_sample.jsonl") -> list[dict[str, Any]]:
    """Load a recorded aisstream fixture."""
    with open(FIXTURES / name) as f:
        return [json.loads(line) for line in f if line.strip()]


@pytest.fixture
def no_network() -> Iterator[None]:
    """Prevent the websocket client from connecting."""

    async def idle(self: Any) -> None:
        import asyncio

        await asyncio.Event().wait()

    with patch("custom_components.aisstream.client.AisStreamClient.run", idle):
        yield
