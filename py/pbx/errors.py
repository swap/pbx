from enum import Enum


class PbxErrorCode(str, Enum):
    INVALID_ENVELOPE = "InvalidEnvelope"
    INVALID_AUTHENTICATION = "InvalidAuthentication"
    INVALID_SIGNATURE = "InvalidSignature"
    EXPIRED_REQUEST = "ExpiredRequest"
    REPLAY_DETECTED = "ReplayDetected"
    KEY_UNWRAP_FAILED = "KeyUnwrapFailed"
    DECRYPTION_FAILED = "DecryptionFailed"
    INVALID_PROTOBUF = "InvalidProtobuf"
    INVALID_PAYLOAD = "InvalidPayload"


class PbxError(Exception):
    def __init__(self, code: PbxErrorCode):
        super().__init__(code.value)
        self.code = code


def public_message(code: PbxErrorCode) -> str:
    if code in (PbxErrorCode.EXPIRED_REQUEST, PbxErrorCode.REPLAY_DETECTED):
        return "request rejected"
    if code in (
        PbxErrorCode.INVALID_AUTHENTICATION,
        PbxErrorCode.INVALID_SIGNATURE,
        PbxErrorCode.KEY_UNWRAP_FAILED,
        PbxErrorCode.DECRYPTION_FAILED,
    ):
        return "unauthorized"
    return "bad request"


def public_status(code: PbxErrorCode) -> int:
    if code in (
        PbxErrorCode.EXPIRED_REQUEST,
        PbxErrorCode.REPLAY_DETECTED,
        PbxErrorCode.INVALID_AUTHENTICATION,
        PbxErrorCode.INVALID_SIGNATURE,
        PbxErrorCode.KEY_UNWRAP_FAILED,
        PbxErrorCode.DECRYPTION_FAILED,
    ):
        return 401
    return 400


PBX_VERSION = 1
PBX_CONTENT_TYPE = "application/vnd.pbx"
