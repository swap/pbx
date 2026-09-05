# PBX Rust SDK

## Install

```bash
cd rust
cargo build
```

## Configure

Create a `.env` file:

```env
PBX_KEY=your-base64-key-here
PBX_KEY_ID=primary
PBX_PROTECTED=true
```

Generate `PBX_KEY` with `openssl rand -base64 32`.

## Axum

```rust
use std::sync::Arc;
use axum::{routing::post, Router, Json};
use pbx_sdk::{load_config_from_env, middleware::core::PbxCore, pbx_layer};

let core = PbxCore::new(load_config_from_env().unwrap());

let app = Router::new()
    .route("/v2/users", post(|Json(body): Json<serde_json::Value>| async move {
        Json(serde_json::json!({"created": true, "data": body}))
    }))
    .layer(axum::middleware::from_fn_with_state(core.clone(), pbx_layer));

axum::serve(listener, app).await.unwrap();
```

Enable the axum feature in `Cargo.toml`:

```toml
pbx-sdk = { path = ".", features = ["axum"] }
```

## Actix

```rust
use actix_web::{App, HttpServer, web::Json};
use pbx_sdk::{load_config_from_env, middleware::core::PbxCore, wrap_pbx};

let core = PbxCore::new(load_config_from_env().unwrap());

HttpServer::new(move || {
    App::new()
        .wrap(wrap_pbx(core.clone()))
        .route("/v2/users", web::post().to(users_handler))
})
.bind("127.0.0.1:8080")?
.run()
.await?;
```

## Protect routes

```rust
config.routes = RouteConfig {
    protected: vec!["/v2/*".into()],
    public: vec!["/health".into(), "/hi".into()],
};
```

## Tests

```bash
cargo test
```
