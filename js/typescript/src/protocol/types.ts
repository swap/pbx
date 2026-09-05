export const PBX_VERSION = 1;
export const PBX_CONTENT_TYPE = "application/vnd.pbx";
export const PBX_CONTEXT_KEY = Symbol("pbx");

export interface EnvelopeData {
  version: number;
  keyId: string;
  timestampMs: number;
  requestId: string;
  nonce: Uint8Array;
  wrappedDek: Uint8Array;
  ciphertext: Uint8Array;
  mac: Uint8Array;
}

export interface RouteConfig {
  protected?: string[];
  public?: string[];
}

export interface PbxConfig {
  key: Uint8Array;
  keyId: string;
  protectedMode: boolean;
  replayWindowSec: number;
  maxBodySize: number;
  routes: RouteConfig;
}

export interface ProcessedRequest {
  body: Uint8Array;
  protected: boolean;
}

export interface ProcessedResponse {
  body: Uint8Array;
  contentType: string;
}
