use prost::Message;

use crate::crypto::Envelope;
use crate::errors::PbxErrorCode;

#[derive(Clone, PartialEq, Message)]
pub struct EnvelopeProto {
    #[prost(uint32, tag = "1")]
    pub version: u32,
    #[prost(string, tag = "2")]
    pub key_id: String,
    #[prost(int64, tag = "3")]
    pub timestamp_ms: i64,
    #[prost(string, tag = "4")]
    pub request_id: String,
    #[prost(bytes, tag = "5")]
    pub nonce: Vec<u8>,
    #[prost(bytes, tag = "6")]
    pub wrapped_dek: Vec<u8>,
    #[prost(bytes, tag = "7")]
    pub ciphertext: Vec<u8>,
    #[prost(bytes, tag = "8")]
    pub mac: Vec<u8>,
}

pub fn encode_envelope(env: &Envelope) -> Result<Vec<u8>, PbxErrorCode> {
    EnvelopeProto::from(env.clone())
        .encode_to_vec()
        .map_err(|_| PbxErrorCode::InvalidProtobuf)
}

pub fn decode_envelope(data: &[u8]) -> Result<Envelope, PbxErrorCode> {
    let proto = EnvelopeProto::decode(data).map_err(|_| PbxErrorCode::InvalidProtobuf)?;
    Ok(Envelope {
        version: proto.version,
        key_id: proto.key_id,
        timestamp_ms: proto.timestamp_ms,
        request_id: proto.request_id,
        nonce: proto.nonce,
        wrapped_dek: proto.wrapped_dek,
        ciphertext: proto.ciphertext,
        mac: proto.mac,
    })
}

impl From<Envelope> for EnvelopeProto {
    fn from(env: Envelope) -> Self {
        Self {
            version: env.version,
            key_id: env.key_id,
            timestamp_ms: env.timestamp_ms,
            request_id: env.request_id,
            nonce: env.nonce,
            wrapped_dek: env.wrapped_dek,
            ciphertext: env.ciphertext,
            mac: env.mac,
        }
    }
}
