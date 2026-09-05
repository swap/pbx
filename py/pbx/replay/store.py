import time

from pbx.errors import PbxError, PbxErrorCode


class ReplayStore:
    def __init__(self, window_sec: int):
        self._seen: dict[str, int] = {}
        self._window_ms = window_sec * 1000

    def check(self, request_id: str, timestamp_ms: int) -> None:
        now = int(time.time() * 1000)
        if abs(now - timestamp_ms) > self._window_ms:
            raise PbxError(PbxErrorCode.EXPIRED_REQUEST)
        self._prune(now)
        if request_id in self._seen:
            raise PbxError(PbxErrorCode.REPLAY_DETECTED)
        self._seen[request_id] = timestamp_ms

    def _prune(self, now: int) -> None:
        expired = [rid for rid, ts in self._seen.items() if now - ts > self._window_ms]
        for rid in expired:
            del self._seen[rid]
