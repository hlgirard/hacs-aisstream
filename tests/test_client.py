"""Tests for the websocket client against a fake aisstream server."""

from __future__ import annotations

import asyncio
import json
from typing import Any
from unittest.mock import patch

import pytest
from aiohttp import WSMsgType, web
from aiohttp.test_utils import TestServer

from custom_components.aisstream import client as client_mod
from custom_components.aisstream.client import (
    AisStreamClient,
    CannotConnect,
    InvalidSubscription,
    build_subscription,
    validate_subscription,
)

from .conftest import API_KEY, BOSTON_BOX


def _server(mode: str, received: list[dict[str, Any]]) -> web.Application:
    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        msg = await ws.receive()
        assert msg.type in (WSMsgType.TEXT, WSMsgType.BINARY)
        sub = json.loads(msg.data)
        received.append(sub)
        if mode == "silent":
            async for _ in ws:  # never confirm
                pass
            return ws
        if mode == "reject" or sub["APIKey"] != API_KEY:
            await ws.close()
            return ws
        await ws.send_bytes(
            json.dumps({"MessageType": "SubscriptionConfirmation",
                        "Message": {"CompressionEnabled": True}}).encode()
        )
        for i in range(3):
            await ws.send_bytes(json.dumps({
                "MessageType": "PositionReport",
                "MetaData": {"MMSI": 100 + i},
                "Message": {"PositionReport": {"UserID": 100 + i, "Latitude": 42.3,
                                               "Longitude": -71.0, "Valid": True}},
            }).encode())
        if mode == "drop":
            await ws.close()
            return ws
        # Stay open until the client disconnects (no stray task after the test).
        async for _ in ws:
            pass
        return ws

    app = web.Application()
    app.router.add_get("/v0/stream", handler)
    return app


async def _start(mode: str, received: list) -> TestServer:
    server = TestServer(_server(mode, received))
    await server.start_server()
    return server


async def test_build_subscription() -> None:
    sub = build_subscription(API_KEY, [BOSTON_BOX])
    assert sub["BoundingBoxes"] == [BOSTON_BOX]
    assert "FiltersShipMMSI" not in sub
    assert "PositionReport" in sub["FilterMessageTypes"]


@pytest.mark.usefixtures("socket_enabled")
async def test_validate_ok_and_rejected() -> None:
    import aiohttp

    received: list = []
    server = await _start("ok", received)
    url = str(server.make_url("/v0/stream")).replace("http", "ws")
    async with aiohttp.ClientSession() as session:
        with patch.object(client_mod, "WS_URL", url):
            await validate_subscription(session, build_subscription(API_KEY, [BOSTON_BOX]))
            with pytest.raises(InvalidSubscription):
                await validate_subscription(session, build_subscription("bad", [BOSTON_BOX]))
    assert received[0]["APIKey"] == API_KEY
    await server.close()


@pytest.mark.usefixtures("socket_enabled")
async def test_client_reconnects_and_delivers() -> None:
    import aiohttp

    received: list = []
    server = await _start("drop", received)
    url = str(server.make_url("/v0/stream")).replace("http", "ws")
    messages: list[int] = []
    statuses: list[bool] = []
    async with aiohttp.ClientSession() as session:
        with (
            patch.object(client_mod, "WS_URL", url),
            patch.object(client_mod, "BACKOFF_INITIAL", 0.01),
        ):
            c = AisStreamClient(
                session,
                lambda: build_subscription(API_KEY, [BOSTON_BOX]),
                lambda m, ts: messages.append(m["MetaData"]["MMSI"]),
                statuses.append,
            )
            c._backoff = 0.01
            task = asyncio.create_task(c.run())
            for _ in range(200):
                if len(received) >= 2 and len(messages) >= 6:
                    break
                await asyncio.sleep(0.02)
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task
    assert len(received) >= 2  # reconnected after the server dropped us
    assert messages[:3] == [100, 101, 102]
    assert True in statuses and False in statuses
    assert c.compression is True
    await server.close()


@pytest.mark.usefixtures("socket_enabled")
async def test_idle_reconnect_keeps_connected() -> None:
    """A quiet region reconnects silently instead of flapping 'connected'."""
    import aiohttp

    received: list = []
    server = await _start("hold", received)
    url = str(server.make_url("/v0/stream")).replace("http", "ws")
    statuses: list[bool] = []
    async with aiohttp.ClientSession() as session:
        with (
            patch.object(client_mod, "WS_URL", url),
            patch.object(client_mod, "IDLE_TIMEOUT", 0.2),
        ):
            c = AisStreamClient(
                session,
                lambda: build_subscription(API_KEY, [BOSTON_BOX]),
                lambda m, ts: None,
                statuses.append,
            )
            task = asyncio.create_task(c.run())
            for _ in range(200):
                if len(received) >= 2:
                    break
                await asyncio.sleep(0.02)
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task
    assert len(received) >= 2  # reconnected after going idle
    assert statuses[:1] == [True] and False not in statuses[:-1]
    await server.close()


@pytest.mark.usefixtures("socket_enabled")
async def test_bad_message_keeps_connection() -> None:
    """An exception while handling one message is logged, not a reconnect."""
    import aiohttp

    received: list = []
    server = await _start("hold", received)
    url = str(server.make_url("/v0/stream")).replace("http", "ws")
    handled: list[int] = []

    def on_message(m: dict[str, Any], ts: float) -> None:
        mmsi = m["MetaData"]["MMSI"]
        if mmsi == 100:
            raise TypeError("bad message")
        handled.append(mmsi)

    async with aiohttp.ClientSession() as session:
        with patch.object(client_mod, "WS_URL", url):
            c = AisStreamClient(
                session, lambda: build_subscription(API_KEY, [BOSTON_BOX]), on_message, None
            )
            task = asyncio.create_task(c.run())
            for _ in range(200):
                if len(handled) >= 2:
                    break
                await asyncio.sleep(0.02)
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task
    assert handled == [101, 102]
    assert len(received) == 1 and c.connect_count == 1
    await server.close()


@pytest.mark.usefixtures("socket_enabled")
async def test_repeated_rejection_requests_reauth() -> None:
    import aiohttp

    received: list = []
    server = await _start("reject", received)
    url = str(server.make_url("/v0/stream")).replace("http", "ws")
    failed: list[bool] = []
    async with aiohttp.ClientSession() as session:
        with (
            patch.object(client_mod, "WS_URL", url),
            patch.object(client_mod, "BACKOFF_MAX", 0.01),
        ):
            c = AisStreamClient(
                session, lambda: build_subscription(API_KEY, [BOSTON_BOX]),
                lambda m, ts: None, None, on_auth_failed=lambda: failed.append(True),
            )
            c._backoff = 0.01
            task = asyncio.create_task(c.run())
            for _ in range(300):
                if len(received) >= 7:
                    break
                await asyncio.sleep(0.02)
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task
    assert failed == [True]  # once, at the threshold, while it keeps retrying
    await server.close()


@pytest.mark.usefixtures("socket_enabled")
async def test_confirmation_timeout_is_not_a_rejection() -> None:
    """A slow server must not look like a bad key."""
    import aiohttp

    received: list = []
    server = await _start("silent", received)
    url = str(server.make_url("/v0/stream")).replace("http", "ws")
    failed: list[bool] = []
    async with aiohttp.ClientSession() as session:
        with (
            patch.object(client_mod, "WS_URL", url),
            patch.object(client_mod, "CONFIRM_TIMEOUT", 0.05),
            patch.object(client_mod, "BACKOFF_MAX", 0.01),
        ):
            with pytest.raises(CannotConnect):
                await validate_subscription(session, build_subscription(API_KEY, [BOSTON_BOX]))
            c = AisStreamClient(
                session, lambda: build_subscription(API_KEY, [BOSTON_BOX]),
                lambda m, ts: None, None, on_auth_failed=lambda: failed.append(True),
            )
            c._backoff = 0.01
            task = asyncio.create_task(c.run())
            for _ in range(300):
                if len(received) >= 8:
                    break
                await asyncio.sleep(0.02)
            task.cancel()
            with pytest.raises(asyncio.CancelledError):
                await task
    assert len(received) >= 8
    assert failed == [] and c.rejections == 0
    assert c.last_error == "no subscription confirmation received"
    await server.close()
