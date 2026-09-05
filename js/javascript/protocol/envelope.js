import protobuf from "protobufjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PbxError } from "../errors.js";
import { PBX_VERSION } from "./types.js";
const protoPath = join(dirname(fileURLToPath(import.meta.url)), "pbx.proto");
const root = protobuf.parse(readFileSync(protoPath, "utf8")).root;
const EnvelopeType = root.lookupType("pbx.Envelope");
export function encodeEnvelope(envelope) {
    const message = EnvelopeType.create({
        version: envelope.version,
        keyId: envelope.keyId,
        timestampMs: envelope.timestampMs,
        requestId: envelope.requestId,
        nonce: envelope.nonce,
        wrappedDek: envelope.wrappedDek,
        ciphertext: envelope.ciphertext,
        mac: envelope.mac,
    });
    const err = EnvelopeType.verify(message);
    if (err) {
        throw new PbxError("InvalidEnvelope", err);
    }
    return new Uint8Array(EnvelopeType.encode(message).finish());
}
export function decodeEnvelope(bytes) {
    try {
        const decoded = EnvelopeType.decode(bytes);
        const err = EnvelopeType.verify(decoded);
        if (err) {
            throw new PbxError("InvalidProtobuf", err);
        }
        return {
            version: decoded.version ?? 0,
            keyId: decoded.keyId ?? "",
            timestampMs: Number(decoded.timestampMs ?? 0),
            requestId: decoded.requestId ?? "",
            nonce: decoded.nonce ?? new Uint8Array(),
            wrappedDek: decoded.wrappedDek ?? new Uint8Array(),
            ciphertext: decoded.ciphertext ?? new Uint8Array(),
            mac: decoded.mac ?? new Uint8Array(),
        };
    }
    catch (error) {
        if (error instanceof PbxError) {
            throw error;
        }
        throw new PbxError("InvalidProtobuf");
    }
}
export function validatePayload(bytes) {
    if (bytes.length === 0) {
        throw new PbxError("InvalidPayload");
    }
}
export function encodeJsonPayload(data) {
    return new TextEncoder().encode(JSON.stringify(data));
}
export function decodeJsonPayload(bytes) {
    try {
        return JSON.parse(new TextDecoder().decode(bytes));
    }
    catch {
        throw new PbxError("InvalidPayload");
    }
}
export { PBX_VERSION };
