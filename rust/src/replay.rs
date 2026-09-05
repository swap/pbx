use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::errors::PbxErrorCode;

pub struct ReplayStore {
    seen: Mutex<HashMap<String, i64>>,
    window_ms: i64,
}

impl ReplayStore {
    pub fn new(window_sec: u64) -> Self {
        Self {
            seen: Mutex::new(HashMap::new()),
            window_ms: (window_sec * 1000) as i64,
        }
    }

    pub fn check(&self, request_id: &str, timestamp_ms: i64) -> Result<(), PbxErrorCode> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;
        if (now - timestamp_ms).abs() > self.window_ms {
            return Err(PbxErrorCode::ExpiredRequest);
        }
        let mut seen = self.seen.lock().unwrap();
        seen.retain(|_, ts| now - *ts <= self.window_ms);
        if seen.contains_key(request_id) {
            return Err(PbxErrorCode::ReplayDetected);
        }
        seen.insert(request_id.to_string(), timestamp_ms);
        Ok(())
    }
}
