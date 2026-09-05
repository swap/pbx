import { PbxError, publicErrorMessage, publicStatusCode } from "../errors.js";
import { decodeJsonPayload } from "../protocol/envelope.js";
import { PBX_CONTEXT_KEY } from "../protocol/types.js";
async function readRawBody(request) {
    if (request.body instanceof Buffer) {
        return new Uint8Array(request.body);
    }
    if (typeof request.body === "string") {
        return new TextEncoder().encode(request.body);
    }
    if (request.body && typeof request.body === "object") {
        return new TextEncoder().encode(JSON.stringify(request.body));
    }
    return new Uint8Array();
}
export function registerPbxFastify(app, core) {
    app.addHook("preHandler", async (request, reply) => {
        try {
            const raw = await readRawBody(request);
            const processed = core.processRequest(request.url.split("?")[0] ?? request.url, raw);
            request.pbxProtected = processed.protected;
            request[PBX_CONTEXT_KEY] = {
                protected: processed.protected,
            };
            if (processed.protected) {
                request.body = decodeJsonPayload(processed.body);
            }
            else if (processed.body.length > 0) {
                try {
                    request.body = decodeJsonPayload(processed.body);
                }
                catch {
                    request.body = processed.body;
                }
            }
        }
        catch (error) {
            if (error instanceof PbxError) {
                return reply
                    .code(publicStatusCode(error.code))
                    .send({ error: publicErrorMessage(error.code) });
            }
            throw error;
        }
    });
    app.addHook("onSend", async (request, reply, payload) => {
        if (!request.pbxProtected) {
            return payload;
        }
        try {
            const bytes = typeof payload === "string"
                ? new TextEncoder().encode(payload)
                : payload instanceof Buffer
                    ? new Uint8Array(payload)
                    : new Uint8Array();
            const path = request.url.split("?")[0] ?? request.url;
            const encoded = core.processResponse(path, bytes, true);
            reply.header("Content-Type", encoded.contentType);
            return Buffer.from(encoded.body);
        }
        catch (error) {
            if (error instanceof PbxError) {
                reply.code(publicStatusCode(error.code));
                return JSON.stringify({ error: publicErrorMessage(error.code) });
            }
            throw error;
        }
    });
}
