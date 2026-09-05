import { type PbxConfig, type ProcessedRequest, type ProcessedResponse } from "../protocol/types.js";
export declare class PbxCore {
    readonly config: PbxConfig;
    private readonly replay;
    constructor(config: PbxConfig);
    requiresProtection(path: string): boolean;
    processRequest(path: string, rawBody: Uint8Array): ProcessedRequest;
    processResponse(path: string, payload: Uint8Array, wasProtected: boolean): ProcessedResponse;
    sealJson(path: string, data: unknown, requestId?: string): Uint8Array;
    openJson<T = unknown>(rawBody: Uint8Array): T;
}
export declare function loadConfigFromEnv(overrides?: Partial<PbxConfig>): PbxConfig;
