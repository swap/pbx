import { PbxError, publicErrorMessage, publicStatusCode } from "../errors.js";
import { decodeJsonPayload } from "../protocol/envelope.js";
import { PBX_CONTENT_TYPE } from "../protocol/types.js";
import { PbxCore } from "./core.js";

export type NextHandler = (request: Request, body: unknown) => Response | Promise<Response>;

export function withPbx(core: PbxCore, handler: NextHandler) {
  return async (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname;
    let wasProtected = false;

    try {
      const raw = new Uint8Array(await request.arrayBuffer());
      const processed = core.processRequest(path, raw);
      wasProtected = processed.protected;
      const body =
        wasProtected || processed.body.length > 0
          ? (() => {
              try {
                return decodeJsonPayload(processed.body);
              } catch {
                return processed.body;
              }
            })()
          : undefined;

      const response = await handler(request, body);
      const payload = new TextEncoder().encode(await response.text());
      const encoded = core.processResponse(path, payload, wasProtected);
      return new Response(Buffer.from(encoded.body), {
        status: response.status,
        headers: { "content-type": encoded.contentType },
      });
    } catch (error) {
      if (error instanceof PbxError) {
        return Response.json(
          { error: publicErrorMessage(error.code) },
          { status: publicStatusCode(error.code) },
        );
      }
      throw error;
    }
  };
}

export { PBX_CONTENT_TYPE };
