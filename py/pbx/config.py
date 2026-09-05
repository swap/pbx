import base64
import os
from dataclasses import dataclass, field


@dataclass
class RouteConfig:
    protected: list[str] = field(default_factory=lambda: ["/v2/*"])
    public: list[str] = field(default_factory=lambda: ["/health", "/version", "/public/*"])


@dataclass
class PbxConfig:
    key: bytes
    key_id: str = "default"
    protected_mode: bool = False
    replay_window_sec: int = 300
    max_body_size: int = 1_048_576
    routes: RouteConfig = field(default_factory=RouteConfig)


def load_config_from_env() -> PbxConfig:
    key_b64 = os.environ.get("PBX_KEY")
    if not key_b64:
        raise ValueError("PBX_KEY is required")
    key = base64.b64decode(key_b64)
    if len(key) < 32:
        raise ValueError("PBX_KEY must be at least 32 bytes")

    return PbxConfig(
        key=key,
        key_id=os.environ.get("PBX_KEY_ID", "default"),
        protected_mode=os.environ.get("PBX_PROTECTED", "false").lower() == "true",
        replay_window_sec=int(os.environ.get("PBX_REPLAY_WINDOW", "300")),
        max_body_size=int(os.environ.get("PBX_MAX_BODY_SIZE", "1048576")),
    )
