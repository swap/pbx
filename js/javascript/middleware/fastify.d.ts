import type { FastifyInstance } from "fastify";
import { PbxCore } from "./core.js";
declare module "fastify" {
    interface FastifyRequest {
        pbxProtected?: boolean;
    }
}
export declare function registerPbxFastify(app: FastifyInstance, core: PbxCore): void;
