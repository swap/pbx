import type { Request, Response, NextFunction, RequestHandler } from "express";
import { PbxError, publicErrorMessage, publicStatusCode } from "../errors.js";
import { decodeJsonPayload } from "../protocol/envelope.js";
import { PBX_CONTEXT_KEY, PBX_CONTENT_TYPE } from "../protocol/types.js";
import { PbxCore } from "./core.js";

function readBody(req: Request): Uint8Array {
  if (Buffer.isBuffer(req.body)) {
    return new Uint8Array(req.body);
  }
  if (typeof req.body === "string") {
    return new TextEncoder().encode(req.body);
  }
  if (req.body && typeof req.body === "object") {
    return new TextEncoder().encode(JSON.stringify(req.body));
  }
  return new Uint8Array();
}

export function pbxMiddleware(core: PbxCore): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;
    let wasProtected = false;

    try {
      const processed = core.processRequest(path, readBody(req));
      wasProtected = processed.protected;
      (req as Request & { [PBX_CONTEXT_KEY]: { protected: boolean } })[PBX_CONTEXT_KEY] = {
        protected: wasProtected,
      };

      if (wasProtected) {
        req.body = decodeJsonPayload(processed.body);
      } else if (processed.body.length > 0) {
        try {
          req.body = decodeJsonPayload(processed.body);
        } catch {
          req.body = processed.body;
        }
      }
    } catch (error) {
      if (error instanceof PbxError) {
        return res.status(publicStatusCode(error.code)).json({ error: publicErrorMessage(error.code) });
      }
      return next(error);
    }

    const originalJson = res.json.bind(res);
    res.json = (data: unknown) => {
      try {
        const payload = new TextEncoder().encode(JSON.stringify(data));
        const encoded = core.processResponse(path, payload, wasProtected);
        res.setHeader("Content-Type", encoded.contentType);
        return res.send(Buffer.from(encoded.body));
      } catch (error) {
        if (error instanceof PbxError) {
          return res.status(publicStatusCode(error.code)).json({ error: publicErrorMessage(error.code) });
        }
        throw error;
      }
    };

    const originalSend = res.send.bind(res);
    res.send = (body: unknown) => {
      if (!wasProtected || typeof body !== "string" && !Buffer.isBuffer(body)) {
        return originalSend(body);
      }
      try {
        const payload = Buffer.isBuffer(body) ? new Uint8Array(body) : new TextEncoder().encode(String(body));
        const encoded = core.processResponse(path, payload, wasProtected);
        res.setHeader("Content-Type", encoded.contentType);
        return originalSend(Buffer.from(encoded.body));
      } catch (error) {
        if (error instanceof PbxError) {
          return res.status(publicStatusCode(error.code)).json({ error: publicErrorMessage(error.code) });
        }
        throw error;
      }
    };

    next();
  };
}

export function createPbxExpress(core: PbxCore) {
  return { middleware: () => pbxMiddleware(core) };
}
