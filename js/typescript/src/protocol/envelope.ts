import protobuf from "protobufjs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PbxError } from "../errors.js";
import { PBX_VERSION, type EnvelopeData } from "./types.js";

const protoPath = join(dirname(fileURLToPath(import.meta.url)), "pbx.proto");
const root = protobuf.parse(readFileSync(protoPath, "utf8")).root;
const EnvelopeType = root.lookupType("pbx.Envelope");

export function encodeEnvelope(envelope: EnvelopeData): Uint8Array {
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

export function decodeEnvelope(bytes: Uint8Array): EnvelopeData {
  try {
    const decoded = EnvelopeType.decode(bytes) as protobuf.Message & {
      version: number;
      keyId: string;
      timestampMs: number;
      requestId: string;
      nonce: Uint8Array;
      wrappedDek: Uint8Array;
      ciphertext: Uint8Array;
      mac: Uint8Array;
    };
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
  } catch (error) {
    if (error instanceof PbxError) {
      throw error;
    }
    throw new PbxError("InvalidProtobuf");
  }
}

export function validatePayload(bytes: Uint8Array): void {
  if (bytes.length === 0) {
    throw new PbxError("InvalidPayload");
  }
}

export function encodeJsonPayload(data: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(data));
}

export function decodeJsonPayload<T = unknown>(bytes: Uint8Array): T {
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    throw new PbxError("InvalidPayload");
  }
}

export { PBX_VERSION };
