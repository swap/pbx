from pbx.crypto.crypto import Envelope
from pbx.errors import PbxError, PbxErrorCode


def _encode_varint(value: int) -> bytes:
    out = bytearray()
    while value > 0x7F:
        out.append((value & 0x7F) | 0x80)
        value >>= 7
    out.append(value & 0x7F)
    return bytes(out)


def _encode_field(field_number: int, wire_type: int, value: bytes) -> bytes:
    tag = (field_number << 3) | wire_type
    return _encode_varint(tag) + value


def encode_envelope(env: Envelope) -> bytes:
    out = b""
    out += _encode_field(1, 0, _encode_varint(env.version))
    out += _encode_field(2, 2, _encode_varint(len(env.key_id)) + env.key_id.encode())
    out += _encode_field(3, 0, _encode_varint(env.timestamp_ms))
    out += _encode_field(4, 2, _encode_varint(len(env.request_id)) + env.request_id.encode())
    out += _encode_field(5, 2, _encode_varint(len(env.nonce)) + env.nonce)
    out += _encode_field(6, 2, _encode_varint(len(env.wrapped_dek)) + env.wrapped_dek)
    out += _encode_field(7, 2, _encode_varint(len(env.ciphertext)) + env.ciphertext)
    out += _encode_field(8, 2, _encode_varint(len(env.mac)) + env.mac)
    return out


def _read_varint(data: bytes, offset: int) -> tuple[int, int]:
    result = 0
    shift = 0
    while offset < len(data):
        b = data[offset]
        offset += 1
        result |= (b & 0x7F) << shift
        if not (b & 0x80):
            return result, offset
        shift += 7
    raise PbxError(PbxErrorCode.INVALID_PROTOBUF)


def decode_envelope(data: bytes) -> Envelope:
    env = Envelope(0, "", 0, "", b"", b"", b"", b"")
    offset = 0
    while offset < len(data):
        tag, offset = _read_varint(data, offset)
        field = tag >> 3
        wire = tag & 0x7
        if wire == 0:
            value, offset = _read_varint(data, offset)
            if field == 1:
                env.version = value
            elif field == 3:
                env.timestamp_ms = value
        elif wire == 2:
            length, offset = _read_varint(data, offset)
            value = data[offset : offset + length]
            offset += length
            if field == 2:
                env.key_id = value.decode()
            elif field == 4:
                env.request_id = value.decode()
            elif field == 5:
                env.nonce = value
            elif field == 6:
                env.wrapped_dek = value
            elif field == 7:
                env.ciphertext = value
            elif field == 8:
                env.mac = value
        else:
            raise PbxError(PbxErrorCode.INVALID_PROTOBUF)
    return env
