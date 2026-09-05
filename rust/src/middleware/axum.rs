#[cfg(feature = "axum")]
use std::sync::Arc;

#[cfg(feature = "axum")]
use axum::{
    body::{to_bytes, Body},
    extract::State,
    http::{Request, Response, StatusCode},
    middleware::Next,
    response::IntoResponse,
    Json,
};
#[cfg(feature = "axum")]
use serde_json::json;

#[cfg(feature = "axum")]
use crate::errors::{public_message, public_status};
#[cfg(feature = "axum")]
use crate::middleware::core::PbxCore;

#[cfg(feature = "axum")]
pub async fn pbx_layer(
    State(core): State<Arc<PbxCore>>,
    mut req: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    let path = req.uri().path().to_string();
    let raw = match to_bytes(req.body_mut(), usize::MAX).await {
        Ok(b) => b.to_vec(),
        Err(_) => return (StatusCode::BAD_REQUEST, Json(json!({"error":"bad request"}))).into_response(),
    };

    let processed = match core.process_request(&path, &raw) {
        Ok(p) => p,
        Err(code) => {
            return (
                StatusCode::from_u16(public_status(code)).unwrap(),
                Json(json!({"error": public_message(code)})),
            )
                .into_response();
        }
    };

    *req.body_mut() = Body::from(processed.body.clone());
  let response = next.run(req).await;
    let (parts, body) = response.into_parts();
    let payload = to_bytes(body, usize::MAX).await.unwrap_or_default();
    let encoded = core
        .process_response(&path, &payload, processed.protected)
        .unwrap_or(ProcessedResponse {
            body: payload.to_vec(),
            content_type: "application/json".into(),
        });

    let mut response = Response::from_parts(parts, Body::from(encoded.body));
    response
        .headers_mut()
        .insert("content-type", encoded.content_type.parse().unwrap());
    response
}

#[cfg(feature = "axum")]
use crate::middleware::core::ProcessedResponse;
