#[cfg(feature = "actix")]
use std::future::{ready, Ready};

#[cfg(feature = "actix")]
use actix_web::{
    body::{to_bytes, BoxBody, EitherBody, MessageBody},
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    Error, HttpMessage, HttpResponse,
};
#[cfg(feature = "actix")]
use futures_util::future::LocalBoxFuture;

#[cfg(feature = "actix")]
use crate::errors::{public_message, public_status};
#[cfg(feature = "actix")]
use crate::middleware::core::PbxCore;

#[cfg(feature = "actix")]
pub struct PbxMiddleware {
    core: std::sync::Arc<PbxCore>,
}

#[cfg(feature = "actix")]
impl PbxMiddleware {
    pub fn new(core: std::sync::Arc<PbxCore>) -> Self {
        Self { core }
    }
}

#[cfg(feature = "actix")]
impl<S, B> Transform<S, ServiceRequest> for PbxMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<EitherBody<B, BoxBody>>;
    type Error = Error;
    type InitError = ();
    type Transform = PbxMiddlewareService<S>;
    type Future = Ready<Result<Self::Transform, Self::InitError>>;

    fn new_transform(&self, service: S) -> Self::Future {
        ready(Ok(PbxMiddlewareService {
            service,
            core: self.core.clone(),
        }))
    }
}

#[cfg(feature = "actix")]
pub struct PbxMiddlewareService<S> {
    service: S,
    core: std::sync::Arc<PbxCore>,
}

#[cfg(feature = "actix")]
impl<S, B> Service<ServiceRequest> for PbxMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error> + 'static,
    B: MessageBody + 'static,
{
    type Response = ServiceResponse<EitherBody<B, BoxBody>>;
    type Error = Error;
    type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

    forward_ready!(service);

    fn call(&self, mut req: ServiceRequest) -> Self::Future {
        let core = self.core.clone();
        let path = req.path().to_string();
        let raw = req.take_body();

        Box::pin(async move {
            let bytes = to_bytes(raw).await.unwrap_or_default();
            let processed = match core.process_request(&path, &bytes) {
                Ok(p) => p,
                Err(code) => {
                    let resp = HttpResponse::build(
                        actix_web::http::StatusCode::from_u16(public_status(code)).unwrap(),
                    )
                    .json(serde_json::json!({"error": public_message(code)}));
                    return Ok(req.into_response(resp).map_into_right_body());
                }
            };

            req.set_payload(actix_web::dev::Payload::from(bytes::Bytes::from(processed.body)));
            let res = self.service.call(req).await?;
            let (req, res) = res.into_parts();
            let body = to_bytes(res.into_body()).await.unwrap_or_default();
            let encoded = core.process_response(&path, &body, processed.protected).unwrap();
            let mut response = HttpResponse::build(req.status());
            response.insert_header(("content-type", encoded.content_type));
            Ok(ServiceResponse::new(req, response.body(encoded.body)).map_into_right_body())
        })
    }
}

#[cfg(feature = "actix")]
pub fn wrap_pbx(core: std::sync::Arc<PbxCore>) -> PbxMiddleware {
    PbxMiddleware::new(core)
}
