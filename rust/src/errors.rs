use thiserror::Error;

pub const PBX_VERSION: u32 = 1;
pub const PBX_CONTENT_TYPE: &str = "application/vnd.pbx";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum PbxErrorCode {
    #[error("InvalidEnvelope")]
    InvalidEnvelope,
    #[error("InvalidAuthentication")]
    InvalidAuthentication,
    #[error("InvalidSignature")]
    InvalidSignature,
    #[error("ExpiredRequest")]
    ExpiredRequest,
    #[error("ReplayDetected")]
    ReplayDetected,
    #[error("KeyUnwrapFailed")]
    KeyUnwrapFailed,
    #[error("DecryptionFailed")]
    DecryptionFailed,
    #[error("InvalidProtobuf")]
    InvalidProtobuf,
    #[error("InvalidPayload")]
    InvalidPayload,
}

pub type PbxError = PbxErrorCode;

pub fn public_message(code: PbxErrorCode) -> &'static str {
    match code {
        PbxErrorCode::ExpiredRequest | PbxErrorCode::ReplayDetected => "request rejected",
        PbxErrorCode::InvalidAuthentication
        | PbxErrorCode::InvalidSignature
        | PbxErrorCode::KeyUnwrapFailed
        | PbxErrorCode::DecryptionFailed => "unauthorized",
        _ => "bad request",
    }
}

pub fn public_status(code: PbxErrorCode) -> u16 {
    match code {
        PbxErrorCode::ExpiredRequest
        | PbxErrorCode::ReplayDetected
        | PbxErrorCode::InvalidAuthentication
        | PbxErrorCode::InvalidSignature
        | PbxErrorCode::KeyUnwrapFailed
        | PbxErrorCode::DecryptionFailed => 401,
        _ => 400,
    }
}
