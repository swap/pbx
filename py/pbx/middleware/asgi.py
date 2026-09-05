import json
from typing import Awaitable, Callable

from pbx.errors import PbxError, public_message, public_status
from pbx.middleware.core import PbxCore

Send = Callable[[dict], Awaitable[None]]
Receive = Callable[[], Awaitable[dict]]


class ASGIMiddleware:
    def __init__(self, app: Callable, core: PbxCore):
        self.app = app
        self.core = core

    async def __call__(self, scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "/")
        body = b""
        more = True
        while more:
            message = await receive()
            body += message.get("body", b"")
            more = message.get("more_body", False)

        try:
            processed = self.core.process_request(path, body)
        except PbxError as err:
            await send(
                {
                    "type": "http.response.start",
                    "status": public_status(err.code),
                    "headers": [(b"content-type", b"application/json")],
                }
            )
            await send(
                {
                    "type": "http.response.body",
                    "body": json.dumps({"error": public_message(err.code)}).encode(),
                }
            )
            return

        was_protected = processed.protected
        sent_request = False

        async def new_receive() -> dict:
            nonlocal sent_request
            if sent_request:
                return {"type": "http.request", "body": b"", "more_body": False}
            sent_request = True
            return {"type": "http.request", "body": processed.body, "more_body": False}

        status = 200
        headers: list[tuple[bytes, bytes]] = []
        body_parts: list[bytes] = []
        started = False

        async def wrapped_send(message: dict) -> None:
            nonlocal status, headers, started
            if message["type"] == "http.response.start":
                started = True
                status = message["status"]
                headers = list(message.get("headers", []))
                return
            if message["type"] == "http.response.body":
                body_parts.append(message.get("body", b""))
                if message.get("more_body"):
                    return
                payload = b"".join(body_parts)
                encoded = self.core.process_response(path, payload, was_protected)
                out_headers = [
                    (b"content-type", encoded.content_type.encode()),
                    *[(k, v) for k, v in headers if k.lower() != b"content-type"],
                ]
                await send({"type": "http.response.start", "status": status, "headers": out_headers})
                await send({"type": "http.response.body", "body": encoded.body})

        await self.app(scope, new_receive, wrapped_send)
