import json
from typing import Callable

from pbx.errors import PbxError, public_message, public_status
from pbx.middleware.core import PbxCore


class WSGIMiddleware:
    def __init__(self, app: Callable, core: PbxCore):
        self.app = app
        self.core = core

    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO", "/")
        try:
            length = int(environ.get("CONTENT_LENGTH") or 0)
        except ValueError:
            length = 0
        raw = environ["wsgi.input"].read(length) if length else b""

        try:
            processed = self.core.process_request(path, raw)
        except PbxError as err:
            body = json.dumps({"error": public_message(err.code)}).encode()
            start_response(f"{public_status(err.code)} Error", [("Content-Type", "application/json")])
            return [body]

        if processed.protected:
            environ["pbx.body"] = json.loads(processed.body.decode())

        captured: list[bytes] = []

        def inner_start_response(status, headers, exc_info=None):
            captured.append(b"__status__" + status.encode())
            captured.append(b"__headers__" + json.dumps(headers).encode())
            return lambda data: captured.append(data)

        self.app(environ, inner_start_response)
        payload = b"".join(part for part in captured if not part.startswith(b"__"))
        encoded = self.core.process_response(path, payload or b"{}", processed.protected)
        start_response("200 OK", [("Content-Type", encoded.content_type)])
        return [encoded.body]
