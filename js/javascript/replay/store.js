import { PbxError } from "../errors.js";
export class ReplayStore {
    seen = new Map();
    windowMs;
    constructor(windowSec) {
        this.windowMs = windowSec * 1000;
    }
    check(requestId, timestampMs) {
        const now = Date.now();
        if (Math.abs(now - timestampMs) > this.windowMs) {
            throw new PbxError("ExpiredRequest");
        }
        this.prune(now);
        if (this.seen.has(requestId)) {
            throw new PbxError("ReplayDetected");
        }
        this.seen.set(requestId, timestampMs);
    }
    prune(now) {
        for (const [id, ts] of this.seen) {
            if (now - ts > this.windowMs) {
                this.seen.delete(id);
            }
        }
    }
}
