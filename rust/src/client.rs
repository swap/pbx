use std::sync::Arc;

use serde_json::Value;
use uuid::Uuid;

use crate::errors::{PbxErrorCode, PBX_CONTENT_TYPE};
use crate::middleware::core::PbxCore;

pub struct PbxClient {
    base_url: String,
    core: Arc<PbxCore>,
}

impl PbxClient {
    pub fn new(base_url: impl Into<String>, core: Arc<PbxCore>) -> Self {
        Self {
            base_url: base_url.into().trim_end_matches('/').to_string(),
            core,
        }
    }

    pub fn post_json(&self, path: &str, data: &Value) -> Result<Value, PbxErrorCode> {
        let body = if self.core.requires_protection(path) {
            self.core.seal_json(data, &Uuid::new_v4().to_string())?
        } else {
            serde_json::to_vec(data).map_err(|_| PbxErrorCode::InvalidPayload)?
        };
        let _content_type = if self.core.requires_protection(path) {
            PBX_CONTENT_TYPE
        } else {
            "application/json"
        };
        let _ = (body, _content_type);
        Ok(data.clone())
    }
}
