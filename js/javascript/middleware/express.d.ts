import type { RequestHandler } from "express";
import { PbxCore } from "./core.js";
export declare function pbxMiddleware(core: PbxCore): RequestHandler;
export declare function createPbxExpress(core: PbxCore): {
    middleware: () => RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
};
