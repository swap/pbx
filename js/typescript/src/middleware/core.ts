import { openPayload, sealPayload } from "../crypto/crypto.js";
import { PbxError } from "../errors.js";
import {
  decodeEnvelope,
  decodeJsonPayload,
  encodeEnvelope,
  encodeJsonPayload,
  validatePayload,
} from "../protocol/envelope.js";
import { PBX_CONTENT_TYPE, type EnvelopeData, type PbxConfig, type ProcessedRequest, type ProcessedResponse } from "../protocol/types.js";
import { ReplayStore } from "../replay/store.js";
import { isProtectedRoute } from "../validation/routes.js";

export class PbxCore {
  readonly config: PbxConfig;
  private readonly replay: ReplayStore;

  constructor(config: PbxConfig) {
    this.config = config;
    this.replay = new ReplayStore(config.replayWindowSec);
  }

  requiresProtection(path: string): boolean {
    return isProtectedRoute(path, this.config.routes, this.config.protectedMode);
  }

  processRequest(path: string, rawBody: Uint8Array): ProcessedRequest {
    if (!this.requiresProtection(path)) {
      return { body: rawBody, protected: false };
    }

    if (rawBody.length === 0) {
      throw new PbxError("InvalidEnvelope");
    }
    if (rawBody.length > this.config.maxBodySize) {
      throw new PbxError("InvalidPayload");
    }

    const envelope = decodeEnvelope(rawBody);
    this.replay.check(envelope.requestId, envelope.timestampMs);
    const body = openPayload(this.config.key, envelope);
    validatePayload(body);
    return { body, protected: true };
  }

  processResponse(path: string, payload: Uint8Array, wasProtected: boolean): ProcessedResponse {
    if (!wasProtected) {
      return { body: payload, contentType: "application/json" };
    }

    const envelope = sealPayload(
      this.config.key,
      this.config.keyId,
      crypto.randomUUID(),
      payload,
    );
    return {
      body: encodeEnvelope(envelope),
      contentType: PBX_CONTENT_TYPE,
    };
  }

  sealJson(path: string, data: unknown, requestId: string = crypto.randomUUID()): Uint8Array {
    const envelope = sealPayload(
      this.config.key,
      this.config.keyId,
      requestId,
      encodeJsonPayload(data),
    );
    return encodeEnvelope(envelope);
  }

  openJson<T = unknown>(rawBody: Uint8Array): T {
    const envelope = decodeEnvelope(rawBody);
    this.replay.check(envelope.requestId, envelope.timestampMs);
    const body = openPayload(this.config.key, envelope);
    return decodeJsonPayload<T>(body);
  }

}

export function loadConfigFromEnv(overrides: Partial<PbxConfig> = {}): PbxConfig {
  const keyB64 = process.env.PBX_KEY;
  if (!keyB64 && !overrides.key) {
    throw new Error("PBX_KEY is required");
  }
  const key = overrides.key ?? Buffer.from(keyB64!, "base64");
  if (key.length < 32) {
    throw new Error("PBX_KEY must be at least 32 bytes");
  }

  return {
    key: new Uint8Array(key),
    keyId: overrides.keyId ?? process.env.PBX_KEY_ID ?? "default",
    protectedMode: overrides.protectedMode ?? process.env.PBX_PROTECTED === "true",
    replayWindowSec: overrides.replayWindowSec ?? Number(process.env.PBX_REPLAY_WINDOW ?? 300),
    maxBodySize: overrides.maxBodySize ?? Number(process.env.PBX_MAX_BODY_SIZE ?? 1_048_576),
    routes: overrides.routes ?? {
      protected: ["/v2/*"],
      public: ["/health", "/version", "/public/*"],
    },
  };
}
