# PBX a simple protoByte exchange security layer

PBX is a centralized API security layer. Add it once as middleware and your existing routes get encryption, authentication, and replay protection automatically.

Your handlers stay unchanged — they receive plain JSON. PBX handles everything else.

## How it works

```text
Client                         PBX middleware                    Your handler
  │                                   │                               │
  │  encrypted protobuf envelope      │                               │
  ├──────────────────────────────────►│                               │
  │                                   │ check replay window           │
  │                                   │ verify envelope MAC           │
  │                                   │ unwrap DEK, decrypt payload   │
  │                                   ├──────────────────────────────►│
  │                                   │                               │ business logic
  │                                   │◄──────────────────────────────┤
  │                                   │ encrypt response              │
  │◄──────────────────────────────────┤                               │
  │  encrypted response               │                               │
```

Each request is wrapped in a **protobuf envelope** containing:

```text
version
key_id
timestamp_ms
request_id
nonce
wrapped_dek
ciphertext
mac
```

### Cryptography

```text
PBX_KEY
   │
   ├── HKDF → wrap key  ──► AES-256-GCM ──► wrapped_dek
   ├── HKDF → MAC key   ──► HMAC-SHA256  ──► mac
   │
   ▼
per-request DEK (random)
   │
   └── AES-256-GCM ──► ciphertext (+ nonce + auth tag, embedded)
```

## Protected vs public routes

Configure once, centrally:

```text
protected:  /v2/*              → requires PBX envelope
public:     /health, /hi       → plain HTTP OK
```

Protected routes without a valid envelope are rejected.

## Configuration

Create a `.env` file in your project root:

```env
PBX_KEY=your-base64-key-here
PBX_KEY_ID=primary
PBX_PROTECTED=true
```

Generate a key once:

```bash
openssl rand -base64 32
```

This produces 32 random bytes (256 bits of entropy) — the right size for `PBX_KEY`. Use the raw random output directly; do not substitute a hash of a password or passphrase.

Copy the output into `PBX_KEY`. Never commit `.env` — add it to `.gitignore`.

| Variable | Required | What it does |
|----------|----------|--------------|
| `PBX_KEY` | Yes | Your secret. Client and server must use the same value. Without it, PBX cannot encrypt or verify anything. |
| `PBX_KEY_ID` | No | Names which key is in use. Lets you rotate keys later — old clients on `primary`, new ones on `v2`, both valid until you drop the old key. |
| `PBX_PROTECTED` | No | `true` = protected routes need a PBX envelope. `false` = middleware passes everything through (handy for local dev). |

## Packages

| Language   | Path              | Package |
|-----------|-------------------|---------|
| TypeScript | `js/typescript/` | `@pbx/sdk-ts` (source) |
| JavaScript | `js/javascript/` | `@snowcats/pbx` (built) |
| Go         | `go/`            | |
| Python     | `py/`            | |
| Rust       | `rust/`          | |

TypeScript source lives in `js/typescript/` and compiles into `js/javascript/`. JavaScript-only users install from `js/javascript/`.

See each language's README for install and usage.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup per language, code standards, PR checklist, and how to add a new SDK.

## License

MIT, see [LICENSE](LICENSE) here.

## Support

feel free to support me or the project on ko-fi:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E01DZ4X3)