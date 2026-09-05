import { openPayload } from "../crypto/crypto.js";
import { decodeEnvelope } from "../protocol/envelope.js";
import { PBX_CONTENT_TYPE } from "../protocol/types.js";
import { PbxCore } from "../middleware/core.js";

export interface PbxClientOptions {
  baseUrl: string;
  core: PbxCore;
  fetchImpl?: typeof fetch;
}

export class PbxClient {
  private readonly baseUrl: string;
  private readonly core: PbxCore;
  private readonly fetchImpl: typeof fetch;

  constructor(options: PbxClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.core = options.core;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request<T = unknown>(method: string, path: string, data?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const protectedRoute = this.core.requiresProtection(path);

    let body: BodyInit | undefined;
    const headers: Record<string, string> = {};

    if (data !== undefined) {
      if (protectedRoute) {
        body = Buffer.from(this.core.sealJson(path, data));
        headers["Content-Type"] = PBX_CONTENT_TYPE;
      } else {
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
      return JSON.parse(new TextDecoder().decode(decrypted)) as T;
    }

    return JSON.parse(new TextDecoder().decode(raw)) as T;
  }

  get<T = unknown>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  post<T = unknown>(path: string, data: unknown): Promise<T> {
    return this.request<T>("POST", path, data);
  }

  put<T = unknown>(path: string, data: unknown): Promise<T> {
    return this.request<T>("PUT", path, data);
  }

  delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
  requiresProtection(path: string): boolean {
    return this.core.requiresProtection(path);
  }

  sealForPath(path: string, data: unknown, requestId?: string): Uint8Array {
    return this.core.sealJson(path, data, requestId);
  }
}

export function createFetchInterceptor(client: PbxClient): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
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
        ...(init?.headers as Record<string, string>),
        ...(protectedRoute ? { "Content-Type": PBX_CONTENT_TYPE } : {}),
      },
    });
  };
}
