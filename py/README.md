# PBX Python SDK

## Install

```bash
cd py
pip install -e ".[dev]"
```

## Configure

Create a `.env` file:

```env
PBX_KEY=your-base64-key-here
PBX_KEY_ID=primary
PBX_PROTECTED=true
```

Generate `PBX_KEY` with `openssl rand -base64 32`.

## FastAPI

```python
from fastapi import FastAPI, Request
from pbx import PbxCore, ASGIMiddleware, load_config_from_env

core = PbxCore(load_config_from_env())
app = FastAPI()

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/v2/users")
async def users(request: Request):
    body = await request.json()
    return {"created": True, **body}

application = ASGIMiddleware(app, core)
```

Run:

```bash
uvicorn main:application --host 127.0.0.1 --port 8000
```

## WSGI (Flask, Django, etc.)

```python
from pbx import PbxCore, WSGIMiddleware, load_config_from_env

core = PbxCore(load_config_from_env())
application = WSGIMiddleware(existing_wsgi_app, core)
```

## Protect routes

```python
from pbx.config import RouteConfig

config.routes = RouteConfig(
    protected=["/v2/*"],
    public=["/health", "/hi"],
)
```

## Client

```python
from pbx import PbxClient, PbxCore, load_config_from_env

core = PbxCore(load_config_from_env())
client = PbxClient("https://api.example.com", core)
result = client.post("/v2/users", {"name": "alice"})
```

## Tests

```bash
pytest
```
