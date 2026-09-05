import { PBX_VERSION, type EnvelopeData } from "./types.js";
export declare function encodeEnvelope(envelope: EnvelopeData): Uint8Array;
export declare function decodeEnvelope(bytes: Uint8Array): EnvelopeData;
export declare function validatePayload(bytes: Uint8Array): void;
export declare function encodeJsonPayload(data: unknown): Uint8Array;
export declare function decodeJsonPayload<T = unknown>(bytes: Uint8Array): T;
export { PBX_VERSION };
