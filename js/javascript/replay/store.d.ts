export declare class ReplayStore {
    private readonly seen;
    private readonly windowMs;
    constructor(windowSec: number);
    check(requestId: string, timestampMs: number): void;
    private prune;
}
