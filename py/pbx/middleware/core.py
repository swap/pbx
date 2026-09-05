import json
import uuid
from dataclasses import dataclass

from pbx.config import PbxConfig
from pbx.crypto import crypto
from pbx.errors import PbxError, PbxErrorCode, PBX_CONTENT_TYPE
from pbx.protocol import envelope
from pbx.replay.store import ReplayStore
from pbx.validation.routes import is_protected_route


@dataclass
class ProcessedRequest:
    body: bytes
    protected: bool


@dataclass
class ProcessedResponse:
    body: bytes
    content_type: str


class PbxCore:
    def __init__(self, config: PbxConfig):
        self.config = config
        self._replay = ReplayStore(config.replay_window_sec)

    def requires_protection(self, path: str) -> bool:
        return is_protected_route(path, self.config.routes, self.config.protected_mode)

    def process_request(self, path: str, raw: bytes) -> ProcessedRequest:
        if not self.requires_protection(path):
            return ProcessedRequest(body=raw, protected=False)
        if not raw:
            raise PbxError(PbxErrorCode.INVALID_ENVELOPE)
        if len(raw) > self.config.max_body_size:
            raise PbxError(PbxErrorCode.INVALID_PAYLOAD)
        env = envelope.decode_envelope(raw)
        self._replay.check(env.request_id, env.timestamp_ms)
        body = crypto.open_payload(self.config.key, env)
        if not body:
            raise PbxError(PbxErrorCode.INVALID_PAYLOAD)
        return ProcessedRequest(body=body, protected=True)

    def process_response(self, path: str, payload: bytes, was_protected: bool) -> ProcessedResponse:
        if not was_protected:
            return ProcessedResponse(body=payload, content_type="application/json")
        env = crypto.seal_payload(self.config.key, self.config.key_id, str(uuid.uuid4()), payload)
        return ProcessedResponse(body=envelope.encode_envelope(env), content_type=PBX_CONTENT_TYPE)

    def seal_json(self, path: str, data: object, request_id: str | None = None) -> bytes:
        rid = request_id or str(uuid.uuid4())
        env = crypto.seal_payload(
            self.config.key,
            self.config.key_id,
            rid,
            json.dumps(data).encode(),
        )
        return envelope.encode_envelope(env)

    def open_json(self, raw: bytes) -> object:
        env = envelope.decode_envelope(raw)
        self._replay.check(env.request_id, env.timestamp_ms)
        body = crypto.open_payload(self.config.key, env)
        return json.loads(body.decode())
