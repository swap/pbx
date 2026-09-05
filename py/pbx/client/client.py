import json
import uuid
from urllib.parse import urljoin

import urllib.request

from pbx.errors import PBX_CONTENT_TYPE, PbxError, PbxErrorCode
from pbx.middleware.core import PbxCore


class PbxClient:
    def __init__(self, base_url: str, core: PbxCore):
        self.base_url = base_url.rstrip("/")
        self.core = core

    def post(self, path: str, data: object) -> object:
        return self._request("POST", path, data)

    def _request(self, method: str, path: str, data: object | None) -> object:
        url = urljoin(self.base_url + "/", path.lstrip("/"))
        headers = {"Content-Type": "application/json"}
        body = None
        if data is not None:
            if self.core.requires_protection(path):
                body = self.core.seal_json(path, data, str(uuid.uuid4()))
                headers["Content-Type"] = PBX_CONTENT_TYPE
            else:
                body = json.dumps(data).encode()

        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
        if self.core.requires_protection(path):
            return self.core.open_json(raw)
        return json.loads(raw.decode())
