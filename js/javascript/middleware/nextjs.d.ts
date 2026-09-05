import { PBX_CONTENT_TYPE } from "../protocol/types.js";
import { PbxCore } from "./core.js";
export type NextHandler = (request: Request, body: unknown) => Response | Promise<Response>;
export declare function withPbx(core: PbxCore, handler: NextHandler): (request: Request) => Promise<Response>;
export { PBX_CONTENT_TYPE };
