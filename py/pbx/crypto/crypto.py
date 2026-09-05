import hashlib
import hmac as std_hmac
import os
import struct
import time
from dataclasses import dataclass

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from pbx.errors import PbxError, PbxErrorCode, PBX_VERSION

GCM_NONCE_LEN = 12
DEK_LEN = 32


@dataclass
class Envelope:
    version: int
    key_id: str
    timestamp_ms: int
    request_id: str
    nonce: bytes
    wrapped_dek: bytes
    ciphertext: bytes
    mac: bytes


def _derive_key(key: bytes, key_id: str, info: str) -> bytes:
    return HKDF(
        algorithm=hashes.SHA256(),
        length=DEK_LEN,
        salt=key_id.encode(),
        info=info.encode(),
    ).derive(key)


def _encrypt(key: bytes, plaintext: bytes) -> bytes:
    nonce = os.urandom(GCM_NONCE_LEN)
    aesgcm = AESGCM(key)
    return nonce + aesgcm.encrypt(nonce, plaintext, None)


def _decrypt(key: bytes, blob: bytes) -> bytes:
    nonce = blob[:GCM_NONCE_LEN]
    ciphertext = blob[GCM_NONCE_LEN:]
    aesgcm = AESGCM(key)
    try:
        return aesgcm.decrypt(nonce, ciphertext, None)
    except Exception as exc:
        raise PbxError(PbxErrorCode.DECRYPTION_FAILED) from exc


def _canonical_mac_input(env: Envelope) -> bytes:
    parts = [
        bytes([env.version]),
        env.key_id.encode(),
        struct.pack(">q", env.timestamp_ms),
        env.request_id.encode(),
        env.nonce,
        env.wrapped_dek,
        env.ciphertext,
    ]
    out = b""
    for part in parts:
        out += struct.pack(">I", len(part)) + part
    return out


def compute_mac(key: bytes, env: Envelope) -> bytes:
    mac_key = _derive_key(key, env.key_id, "pbx-mac")
    return std_hmac.new(mac_key, _canonical_mac_input(env), hashlib.sha256).digest()


def verify_mac(key: bytes, env: Envelope) -> None:
    expected = compute_mac(key, env)
    if not std_hmac.compare_digest(expected, env.mac):
        raise PbxError(PbxErrorCode.INVALID_SIGNATURE)


def seal_payload(
    key: bytes,
    key_id: str,
    request_id: str,
    plaintext: bytes,
    timestamp_ms: int | None = None,
) -> Envelope:
    ts = int(time.time() * 1000) if timestamp_ms is None else timestamp_ms
    dek = os.urandom(DEK_LEN)
    wrap_key = _derive_key(key, key_id, "pbx-wrap")
    wrapped_dek = _encrypt(wrap_key, dek)
    ciphertext = _encrypt(dek, plaintext)
    nonce = os.urandom(GCM_NONCE_LEN)
    env = Envelope(
        version=PBX_VERSION,
        key_id=key_id,
        timestamp_ms=ts,
        request_id=request_id,
        nonce=nonce,
        wrapped_dek=wrapped_dek,
        ciphertext=ciphertext,
        mac=b"",
    )
    env.mac = compute_mac(key, env)
    return env


def open_payload(key: bytes, env: Envelope) -> bytes:
    if env.version != PBX_VERSION:
        raise PbxError(PbxErrorCode.INVALID_ENVELOPE)
    if not env.key_id:
        raise PbxError(PbxErrorCode.INVALID_AUTHENTICATION)
    verify_mac(key, env)
    wrap_key = _derive_key(key, env.key_id, "pbx-wrap")
    try:
        dek = _decrypt(wrap_key, env.wrapped_dek)
    except PbxError:
        raise PbxError(PbxErrorCode.KEY_UNWRAP_FAILED)
    return _decrypt(dek, env.ciphertext)
