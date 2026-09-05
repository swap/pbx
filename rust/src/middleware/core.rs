use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::Value;
use uuid::Uuid;

use crate::config::PbxConfig;
use crate::crypto::{open_payload, seal_payload};
use crate::errors::{PbxErrorCode, PBX_CONTENT_TYPE};
use crate::protocol::{decode_envelope, encode_envelope};
use crate::replay::ReplayStore;
use crate::validation::is_protected_route;

pub struct ProcessedRequest {
    pub body: Vec<u8>,
    pub protected: bool,
}

pub struct ProcessedResponse {
    pub body: Vec<u8>,
    pub content_type: String,
}

pub struct PbxCore {
    pub config: PbxConfig,
    replay: ReplayStore,
}

impl PbxCore {
    pub fn new(config: PbxConfig) -> Arc<Self> {
        let replay = ReplayStore::new(config.replay_window_sec);
        Arc::new(Self { config, replay })
    }

    pub fn requires_protection(&self, path: &str) -> bool {
        is_protected_route(path, &self.config.routes, self.config.protected_mode)
    }

    pub fn process_request(&self, path: &str, raw: &[u8]) -> Result<ProcessedRequest, PbxErrorCode> {
        if !self.requires_protection(path) {
            return Ok(ProcessedRequest {
                body: raw.to_vec(),
                protected: false,
            });
        }
        if raw.is_empty() {
            return Err(PbxErrorCode::InvalidEnvelope);
        }
        if raw.len() > self.config.max_body_size {
            return Err(PbxErrorCode::InvalidPayload);
        }
        let env = decode_envelope(raw)?;
        self.replay.check(&env.request_id, env.timestamp_ms)?;
        let body = open_payload(&self.config.key, &env)?;
        if body.is_empty() {
            return Err(PbxErrorCode::InvalidPayload);
        }
        Ok(ProcessedRequest {
            body,
            protected: true,
        })
    }

    pub fn process_response(
        &self,
        _path: &str,
        payload: &[u8],
        was_protected: bool,
    ) -> Result<ProcessedResponse, PbxErrorCode> {
        if !was_protected {
            return Ok(ProcessedResponse {
                body: payload.to_vec(),
                content_type: "application/json".into(),
            });
        }
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;
        let env = seal_payload(
            &self.config.key,
            &self.config.key_id,
            &Uuid::new_v4().to_string(),
            payload,
            ts,
        )?;
        Ok(ProcessedResponse {
            body: encode_envelope(&env)?,
            content_type: PBX_CONTENT_TYPE.into(),
        })
    }

    pub fn seal_json(&self, data: &Value, request_id: &str) -> Result<Vec<u8>, PbxErrorCode> {
        let payload = serde_json::to_vec(data).map_err(|_| PbxErrorCode::InvalidPayload)?;
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;
        let env = seal_payload(
            &self.config.key,
            &self.config.key_id,
            request_id,
            &payload,
            ts,
        )?;
        encode_envelope(&env)
    }

    pub fn open_json(&self, raw: &[u8]) -> Result<Value, PbxErrorCode> {
        let env = decode_envelope(raw)?;
        self.replay.check(&env.request_id, env.timestamp_ms)?;
        let body = open_payload(&self.config.key, &env)?;
        serde_json::from_slice(&body).map_err(|_| PbxErrorCode::InvalidPayload)
    }
}
