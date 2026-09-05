import { PbxError } from "../errors.js";

export class ReplayStore {
  private readonly seen = new Map<string, number>();
  private readonly windowMs: number;

  constructor(windowSec: number) {
    this.windowMs = windowSec * 1000;
  }

  check(requestId: string, timestampMs: number): void {
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

  private prune(now: number): void {
    for (const [id, ts] of this.seen) {
      if (now - ts > this.windowMs) {
        this.seen.delete(id);
      }
    }
  }
}
