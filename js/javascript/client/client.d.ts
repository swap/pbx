import { PbxCore } from "../middleware/core.js";
export interface PbxClientOptions {
    baseUrl: string;
    core: PbxCore;
    fetchImpl?: typeof fetch;
}
export declare class PbxClient {
    private readonly baseUrl;
    private readonly core;
    private readonly fetchImpl;
    constructor(options: PbxClientOptions);
    request<T = unknown>(method: string, path: string, data?: unknown): Promise<T>;
    get<T = unknown>(path: string): Promise<T>;
    post<T = unknown>(path: string, data: unknown): Promise<T>;
    put<T = unknown>(path: string, data: unknown): Promise<T>;
    delete<T = unknown>(path: string): Promise<T>;
    requiresProtection(path: string): boolean;
    sealForPath(path: string, data: unknown, requestId?: string): Uint8Array;
}
export declare function createFetchInterceptor(client: PbxClient): typeof fetch;
