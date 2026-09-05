import { openPayload } from "../crypto/crypto.js";
import { decodeEnvelope } from "../protocol/envelope.js";
import { PBX_CONTENT_TYPE } from "../protocol/types.js";
export class PbxClient {
    baseUrl;
    core;
    fetchImpl;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, "");
        this.core = options.core;
        this.fetchImpl = options.fetchImpl ?? fetch;
    }
    async request(method, path, data) {
        const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
        const protectedRoute = this.core.requiresProtection(path);
        let body;
        const headers = {};
        if (data !== undefined) {
            if (protectedRoute) {
                body = Buffer.from(this.core.sealJson(path, data));
                headers["Content-Type"] = PBX_CONTENT_TYPE;
            }
            else {
                body = JSON.stringify(data);
                headers["Content-Type"] = "application/json";
            }
        }
        const response = await this.fetchImpl(url, { method, headers, body });
        const raw = new Uint8Array(await response.arrayBuffer());
        if (!response.ok) {
            throw new Error(`PBX request failed: ${response.status}`);
        }
        if (protectedRoute) {
            const envelope = decodeEnvelope(raw);
            const decrypted = openPayload(this.core.config.key, envelope);
            return JSON.parse(new TextDecoder().decode(decrypted));
        }
        return JSON.parse(new TextDecoder().decode(raw));
    }
    get(path) {
        return this.request("GET", path);
    }
    post(path, data) {
        return this.request("POST", path, data);
    }
    put(path, data) {
        return this.request("PUT", path, data);
    }
    delete(path) {
        return this.request("DELETE", path);
    }
    requiresProtection(path) {
        return this.core.requiresProtection(path);
    }
    sealForPath(path, data, requestId) {
        return this.core.sealJson(path, data, requestId);
    }
}
export function createFetchInterceptor(client) {
    return async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const path = new URL(url, "http://localhost").pathname;
        const method = init?.method ?? "GET";
        let body = init?.body;
        const protectedRoute = client.requiresProtection(path);
        if (body && typeof body === "string" && protectedRoute) {
            body = Buffer.from(client.sealForPath(path, JSON.parse(body)));
        }
        return fetch(input, {
            ...init,
            method,
            body,
            headers: {
                ...init?.headers,
                ...(protectedRoute ? { "Content-Type": PBX_CONTENT_TYPE } : {}),
            },
        });
    };
}
