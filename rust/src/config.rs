use base64::{engine::general_purpose::STANDARD, Engine};
use std::env;

use crate::errors::PbxErrorCode;

#[derive(Clone)]
pub struct RouteConfig {
    pub protected: Vec<String>,
    pub public: Vec<String>,
}

impl Default for RouteConfig {
    fn default() -> Self {
        Self {
            protected: vec!["/v2/*".into()],
            public: vec!["/health".into(), "/version".into(), "/public/*".into()],
        }
    }
}

#[derive(Clone)]
pub struct PbxConfig {
    pub key: Vec<u8>,
    pub key_id: String,
    pub protected_mode: bool,
    pub replay_window_sec: u64,
    pub max_body_size: usize,
    pub routes: RouteConfig,
}

pub fn load_config_from_env() -> Result<PbxConfig, PbxErrorCode> {
    use crate::errors::PbxErrorCode;
    let key_b64 = env::var("PBX_KEY").map_err(|_| PbxErrorCode::InvalidAuthentication)?;
    let key = STANDARD
        .decode(key_b64)
        .map_err(|_| PbxErrorCode::InvalidAuthentication)?;
    if key.len() < 32 {
        return Err(PbxErrorCode::InvalidAuthentication);
    }
    Ok(PbxConfig {
        key,
        key_id: env::var("PBX_KEY_ID").unwrap_or_else(|_| "default".into()),
        protected_mode: env::var("PBX_PROTECTED").map(|v| v == "true").unwrap_or(false),
        replay_window_sec: env::var("PBX_REPLAY_WINDOW")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(300),
        max_body_size: env::var("PBX_MAX_BODY_SIZE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1_048_576),
        routes: RouteConfig::default(),
    })
}
