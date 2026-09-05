export type PbxErrorCode = "InvalidEnvelope" | "InvalidAuthentication" | "InvalidSignature" | "ExpiredRequest" | "ReplayDetected" | "KeyUnwrapFailed" | "DecryptionFailed" | "InvalidProtobuf" | "InvalidPayload";
export declare class PbxError extends Error {
    readonly code: PbxErrorCode;
    constructor(code: PbxErrorCode, message?: string);
}
export declare function publicErrorMessage(code: PbxErrorCode): string;
export declare function publicStatusCode(code: PbxErrorCode): number;
