export type PbxErrorCode =
  | "InvalidEnvelope"
  | "InvalidAuthentication"
  | "InvalidSignature"
  | "ExpiredRequest"
  | "ReplayDetected"
  | "KeyUnwrapFailed"
  | "DecryptionFailed"
  | "InvalidProtobuf"
  | "InvalidPayload";

export class PbxError extends Error {
  readonly code: PbxErrorCode;

  constructor(code: PbxErrorCode, message?: string) {
    super(message ?? code);
    this.name = "PbxError";
    this.code = code;
  }
}

export function publicErrorMessage(code: PbxErrorCode): string {
  switch (code) {
    case "ExpiredRequest":
    case "ReplayDetected":
      return "request rejected";
    case "InvalidAuthentication":
    case "InvalidSignature":
    case "KeyUnwrapFailed":
    case "DecryptionFailed":
      return "unauthorized";
    default:
      return "bad request";
  }
}

export function publicStatusCode(code: PbxErrorCode): number {
  switch (code) {
    case "ExpiredRequest":
    case "ReplayDetected":
    case "InvalidAuthentication":
    case "InvalidSignature":
    case "KeyUnwrapFailed":
    case "DecryptionFailed":
      return 401;
    default:
      return 400;
  }
}
