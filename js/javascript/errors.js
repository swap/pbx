export class PbxError extends Error {
    code;
    constructor(code, message) {
        super(message ?? code);
        this.name = "PbxError";
        this.code = code;
    }
}
export function publicErrorMessage(code) {
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
export function publicStatusCode(code) {
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
