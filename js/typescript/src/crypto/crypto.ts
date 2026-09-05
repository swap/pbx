import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { PbxError } from "../errors.js";
import { PBX_VERSION, type EnvelopeData } from "../protocol/types.js";

const GCM_TAG_LEN = 16;
const GCM_NONCE_LEN = 12;
const DEK_LEN = 32;

function deriveKey(key: Uint8Array, keyId: string, info: string): Uint8Array {
  return new Uint8Array(hkdfSync("sha256", key, keyId, info, DEK_LEN));
}

function encryptSync(key: Uint8Array, nonce: Buffer, plaintext: Uint8Array): Uint8Array {
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return new Uint8Array(Buffer.concat([nonce, encrypted, tag]));
}

function decryptSync(key: Uint8Array, blob: Uint8Array): Uint8Array {
  const buf = Buffer.from(blob);
  const nonce = buf.subarray(0, GCM_NONCE_LEN);
  const tag = buf.subarray(buf.length - GCM_TAG_LEN);
  const ciphertext = buf.subarray(GCM_NONCE_LEN, buf.length - GCM_TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  return new Uint8Array(Buffer.concat([decipher.update(ciphertext), decipher.final()]));
}

function canonicalMacInput(envelope: Omit<EnvelopeData, "mac">): Buffer {
  const ts = Buffer.alloc(8);
  ts.writeBigInt64BE(BigInt(envelope.timestampMs));
  const parts = [
    Buffer.from([envelope.version]),
    Buffer.from(envelope.keyId, "utf8"),
    ts,
    Buffer.from(envelope.requestId, "utf8"),
    Buffer.from(envelope.nonce),
    Buffer.from(envelope.wrappedDek),
    Buffer.from(envelope.ciphertext),
  ];
  return Buffer.concat(
    parts.map((part) => {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(part.length);
      return Buffer.concat([len, part]);
    }),
  );
}

export function computeMac(key: Uint8Array, keyId: string, envelope: Omit<EnvelopeData, "mac">): Uint8Array {
  const macKey = deriveKey(key, keyId, "pbx-mac");
  const hmac = createHmac("sha256", macKey);
  hmac.update(canonicalMacInput(envelope));
  return new Uint8Array(hmac.digest());
}

export function verifyMac(key: Uint8Array, envelope: EnvelopeData): void {
  const expected = computeMac(key, envelope.keyId, envelope);
  if (expected.length !== envelope.mac.length || !timingSafeEqual(expected, envelope.mac)) {
    throw new PbxError("InvalidSignature");
  }
}

export function wrapDek(key: Uint8Array, keyId: string, dek: Uint8Array): Uint8Array {
  const wrapKey = deriveKey(key, keyId, "pbx-wrap");
  const nonce = randomBytes(GCM_NONCE_LEN);
  return encryptSync(wrapKey, nonce, dek);
}

export function unwrapDek(key: Uint8Array, keyId: string, wrapped: Uint8Array): Uint8Array {
  try {
    const wrapKey = deriveKey(key, keyId, "pbx-wrap");
    return decryptSync(wrapKey, wrapped);
  } catch {
    throw new PbxError("KeyUnwrapFailed");
  }
}

export function encryptPayload(dek: Uint8Array, plaintext: Uint8Array): Uint8Array {
  const nonce = randomBytes(GCM_NONCE_LEN);
  return encryptSync(dek, nonce, plaintext);
}

export function decryptPayload(dek: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  try {
    return decryptSync(dek, ciphertext);
  } catch {
    throw new PbxError("DecryptionFailed");
  }
}

export function generateDek(): Uint8Array {
  return new Uint8Array(randomBytes(DEK_LEN));
}

export function sealPayload(
  key: Uint8Array,
  keyId: string,
  requestId: string,
  plaintext: Uint8Array,
  timestampMs: number = Date.now(),
): EnvelopeData {
  const dek = generateDek();
  const wrappedDek = wrapDek(key, keyId, dek);
  const ciphertext = encryptPayload(dek, plaintext);
  const nonce = randomBytes(GCM_NONCE_LEN);
  const partial: Omit<EnvelopeData, "mac"> = {
    version: PBX_VERSION,
    keyId,
    timestampMs,
    requestId,
    nonce: new Uint8Array(nonce),
    wrappedDek,
    ciphertext,
  };
  const mac = computeMac(key, keyId, partial);
  return { ...partial, mac };
}

export function openPayload(key: Uint8Array, envelope: EnvelopeData): Uint8Array {
  if (envelope.version !== PBX_VERSION) {
    throw new PbxError("InvalidEnvelope");
  }
  if (envelope.keyId.length === 0) {
    throw new PbxError("InvalidAuthentication");
  }
  verifyMac(key, envelope);
  const dek = unwrapDek(key, envelope.keyId, envelope.wrappedDek);
  return decryptPayload(dek, envelope.ciphertext);
}
