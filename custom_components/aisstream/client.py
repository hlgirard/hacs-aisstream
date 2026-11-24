"""Websocket client for aisstream.io (no Home Assistant imports)."""

from __future__ import annotations

import asyncio
import json
import logging
import random
import time
from collections.abc import Callable
from typing import Any

import aiohttp

from .const import (
    BACKOFF_INITIAL,
    BACKOFF_MAX,
    CONFIRM_TIMEOUT,
    CONNECT_TIMEOUT,
    HEARTBEAT,
    IDLE_TIMEOUT,
    STABLE_CONNECTION,
    SUBSCRIBED_TYPES,
    WS_URL,
)

_LOGGER = logging.getLogger(__name__)

_CLOSED = (aiohttp.WSMsgType.CLOSE, aiohttp.WSMsgType.CLOSING, aiohttp.WSMsgType.CLOSED)


class AisStreamError(Exception):
    """Base error."""


class CannotConnect(AisStreamError):
    """The websocket could not be established."""


class InvalidSubscription(AisStreamError):
    """The server closed the connection without confirming the subscription.

    aisstream.io does not send error messages: a bad API key or malformed
    subscription results in the connection being closed without a
    SubscriptionConfirmation.
    """


def build_subscription(
    api_key: str,
    boxes: list[list[list[float]]],
    message_types: list[str] | None = None,
) -> dict[str, Any]:
    """Build a subscription message. Boxes are [[lat1, lon1], [lat2, lon2]]."""
    sub: dict[str, Any] = {
        "APIKey": api_key,
        "BoundingBoxes": boxes,
        "FilterMessageTypes": message_types or SUBSCRIBED_TYPES,
    }
    return sub


def _decode(msg: aiohttp.WSMessage) -> dict[str, Any] | None:
    data = msg.data
    if isinstance(data, bytes):
        data = data.decode("utf-8", errors="replace")
    try:
        parsed = json.loads(data)
    except ValueError:
        _LOGGER.debug("Ignoring non-JSON frame: %.200s", data)
        return None
    return parsed if isinstance(parsed, dict) else None


async def _connect(
    session: aiohttp.ClientSession, heartbeat: float | None = HEARTBEAT
) -> aiohttp.ClientWebSocketResponse:
    try:
        async with asyncio.timeout(CONNECT_TIMEOUT):
            return await session.ws_connect(
                WS_URL,
                compress=15,
                heartbeat=heartbeat,
                max_msg_size=0,
            )
    except (TimeoutError, aiohttp.ClientError, OSError) as err:
        raise CannotConnect(f"{type(err).__name__}: {err}") from err


async def _await_confirmation(ws: aiohttp.ClientWebSocketResponse) -> dict[str, Any]:
    """Wait for SubscriptionConfirmation; returns the confirmation message."""
    try:
        async with asyncio.timeout(CONFIRM_TIMEOUT):
            while True:
                msg = await ws.receive()
                if msg.type in _CLOSED or msg.type == aiohttp.WSMsgType.ERROR:
                    raise InvalidSubscription(
                        f"connection closed before confirmation ({ws.close_code})"
                    )
                if msg.type not in (aiohttp.WSMsgType.TEXT, aiohttp.WSMsgType.BINARY):
                    continue
                parsed = _decode(msg)
                if parsed is None:
                    continue
                if "error" in parsed:
                    raise InvalidSubscription(str(parsed["error"]))
                if parsed.get("MessageType") == "SubscriptionConfirmation":
                    return parsed
                # Data before the confirmation would be unexpected; tolerate it.
    except TimeoutError as err:
        raise InvalidSubscription("no subscription confirmation received") from err


async def validate_subscription(
    session: aiohttp.ClientSession, subscription: dict[str, Any]
) -> None:
    """Open a connection, subscribe and wait for the confirmation."""
    # Short-lived: no heartbeat (aiohttp can leave its timer scheduled after close).
    ws = await _connect(session, heartbeat=None)
    try:
        await ws.send_str(json.dumps(subscription))
        await _await_confirmation(ws)
    finally:
        await ws.close()


class AisStreamClient:
    """Keeps a subscription alive and hands decoded messages to a callback."""

    def __init__(
        self,
        session: aiohttp.ClientSession,
        subscription_factory: Callable[[], dict[str, Any]],
        on_message: Callable[[dict[str, Any], float], None],
        on_status: Callable[[bool], None] | None = None,
        name: str = "aisstream",
    ) -> None:
        """Initialise. subscription_factory is re-evaluated on every connect."""
        self._session = session
        self._subscription_factory = subscription_factory
        self._on_message = on_message
        self._on_status = on_status
        self.name = name
        self.connected = False
        self.last_message: float | None = None
        self.last_error: str | None = None
        self.connect_count = 0
        self.message_count = 0
        self.compression: bool | None = None
        self._backoff = BACKOFF_INITIAL

    def _set_connected(self, value: bool) -> None:
        if value != self.connected:
            self.connected = value
            if self._on_status:
                self._on_status(value)

    async def run(self) -> None:
        """Run forever, reconnecting with exponential backoff and jitter."""
        while True:
            started = time.monotonic()
            try:
                if await self._run_once():
                    # Idle stream: reconnect straight away, keep "connected" on.
                    continue
            except asyncio.CancelledError:
                self._set_connected(False)
                raise
            except InvalidSubscription as err:
                self.last_error = str(err)
                _LOGGER.warning(
                    "%s: subscription rejected (%s). Check the API key", self.name, err
                )
            except CannotConnect as err:
                self.last_error = str(err)
                _LOGGER.debug("%s: cannot connect: %s", self.name, err)
            except Exception as err:
                self.last_error = f"{type(err).__name__}: {err}"
                _LOGGER.exception("%s: unexpected error", self.name)
            self._set_connected(False)
            if time.monotonic() - started > STABLE_CONNECTION:
                self._backoff = BACKOFF_INITIAL
            delay = self._backoff * random.uniform(0.75, 1.25)
            self._backoff = min(self._backoff * 2, BACKOFF_MAX)
            _LOGGER.debug("%s: reconnecting in %.1fs", self.name, delay)
            await asyncio.sleep(delay)

    async def _run_once(self) -> bool:
        """Connect and stream. Returns True if the stream went idle."""
        ws = await _connect(self._session)
        try:
            await ws.send_str(json.dumps(self._subscription_factory()))
            confirmation = await _await_confirmation(ws)
            self.compression = (confirmation.get("Message") or {}).get(
                "CompressionEnabled"
            )
            self.connect_count += 1
            self.last_error = None
            self._set_connected(True)
            _LOGGER.debug("%s: subscribed (compression=%s)", self.name, self.compression)
            while True:
                try:
                    async with asyncio.timeout(IDLE_TIMEOUT):
                        msg = await ws.receive()
                except TimeoutError:
                    _LOGGER.debug("%s: idle for %ss, reconnecting", self.name, IDLE_TIMEOUT)
                    return True
                if msg.type in _CLOSED:
                    _LOGGER.debug(
                        "%s: closed by server (code=%s)", self.name, ws.close_code
                    )
                    return False
                if msg.type == aiohttp.WSMsgType.ERROR:
                    raise CannotConnect(f"websocket error: {ws.exception()}")
                if msg.type not in (aiohttp.WSMsgType.TEXT, aiohttp.WSMsgType.BINARY):
                    continue
                parsed = _decode(msg)
                if parsed is None:
                    continue
                if "error" in parsed:
                    raise InvalidSubscription(str(parsed["error"]))
                now = time.time()
                self.last_message = now
                self.message_count += 1
                try:
                    self._on_message(parsed, now)
                except Exception:
                    # One bad message must not cost the connection.
                    _LOGGER.exception("%s: failed to handle message: %.500s", self.name, msg.data)
        finally:
            await ws.close()
