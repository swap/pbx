# Contributing to PBX

Thanks for contributing. PBX is multi-language — you can work on an existing SDK or add a new one. Read this before opening a PR.

## Table of contents

- [Before you start](#before-you-start)
- [Pick your language](#pick-your-language)
- [Adding a new language](#adding-a-new-language)
- [Development setup](#development-setup)
- [Code standards](#code-standards)
- [Testing](#testing)
- [Pull request process](#pull-request-process)
- [What to contribute](#what-to-contribute)
- [Security issues](#security-issues)
- [Questions](#questions)

---

## Before you start

1. Check existing [issues](https://github.com/your-org/security/issues) — someone may already be working on it.
2. For large changes (new language, protocol changes, new crypto), **open an issue first** and wait for feedback before writing a lot of code.
3. Fork the repo and work on a branch — not `main`.

```bash
git checkout -b feat/your-change
```

---

## Pick your language

Work in whichever package you know. You do **not** need to touch every language for most PRs.

| Language   | Path              | When to edit here |
|-----------|-------------------|-------------------|
| Python    | `py/`             | FastAPI/WSGI, pip package, Python client |
| Go        | `go/`             | net/http, Gin, Go client |
| TypeScript| `js/typescript/`  | Source for JS/TS SDK, Express, Fastify, Next.js |
| JavaScript| `js/javascript/`  | Built output only — edit `js/typescript/` and run `npm run build` |
| Rust      | `rust/`           | Axum, Actix, Rust client |

Shared protocol: `proto/pbx.proto` — changes here affect **all** languages. Coordinate in an issue first.

---

## Adding a new language

dd a top level folder (e.g. `cpp/`, `java/`).

Requirements for a new language package:

1. **Same folder layout** as existing packages:
   ```text
   your-lang/
   ├── pbx/ or src/
   │   ├── protocol/
   │   ├── crypto/
   │   ├── middleware/
   │   ├── client/
   │   ├── validation/
   │   └── replay/
   ├── tests/
   └── README.md
   ```

2. **Implement the shared protocol** from `proto/pbx.proto` — wire-compatible with other SDKs.

3. **Same env config**: `PBX_KEY`, `PBX_KEY_ID`, `PBX_PROTECTED` (loaded from `.env` in docs/examples).

4. **At least one framework adapter** (e.g. HTTP middleware for that ecosystem).

5. **Tests** covering:
   - round-trip encrypt/decrypt
   - protected route rejects plain JSON
   - public route works without envelope
   - replay rejected

6. **README** in your language folder — install, configure, usage, how to run tests.

7. **Add your language to the root `README.md`** packages table.

Crypto stays in the core. Adapters only wire request/response lifecycle — no duplicated crypto in adapters.

---

## Development setup

### Python (`py/`)

```bash
cd py
pip install -e ".[dev]"
```

### Go (`go/`)

```bash
cd go
go mod tidy
```

### TypeScript / JavaScript (`js/`)

```bash
cd js/typescript
npm install
npm run build    # outputs to ../javascript/
```

### Rust (`rust/`)

```bash
cd rust
cargo build
```

Copy env vars from the root `.env.example` into your own `.env`. Never commit `.env`.

---

## Code standards

### All languages

- **No secrets in code** — keys, tokens, `.env` files stay out of git.
- **Minimal scope** — one PR = one fix or feature. Don't refactor unrelated code.
- **Match existing style** in the package you're editing.
- **Comments** only when something is non-obvious or security-critical. Prefer clear names over comments.
- **Generic errors externally** — don't leak crypto internals in API responses.
- **Update docs** if you change config, APIs, or integration steps.

### Python

```bash
cd py
pytest
```

- Follow existing module layout under `pbx/`.
- Use type hints where the rest of the package does.

### Go

```bash
cd go
gofmt -w .
go vet ./...
go test ./...
```

- Run `gofmt` before committing. CI will reject unformatted code.
- Keep adapters thin — logic belongs in `pbx/middleware`, `pbx/crypto`, etc.

### TypeScript

```bash
cd js/typescript
npm run build
npm test
```

- Source lives in `js/typescript/src/`. Do not hand-edit `js/javascript/` — it's build output.
- Strict TypeScript. Fix all compiler errors before pushing.

### Rust

```bash
cd rust
cargo fmt
cargo clippy -- -D warnings
cargo test
```

- Run `cargo fmt` and `cargo clippy` before committing.

---

## Testing

Run tests for **every package you changed**. If you touch `proto/pbx.proto`, run tests in all languages that implement the protocol (or note in the PR which ones you verified).

| Package      | Command |
|-------------|---------|
| Python      | `cd py && pytest` |
| Go          | `cd go && go test ./...` |
| TypeScript  | `cd js/typescript && npm test` |
| JavaScript  | `cd js/typescript && npm run build && cd ../javascript && npm test` |
| Rust        | `cd rust && cargo test` |

PRs without passing tests will not be merged.

---

## Pull request process

1. **Branch** from latest `main`.
2. **Implement** your change with tests.
3. **Lint & test** locally (see above).
4. **Update docs** — root README and/or language README if behavior changed.
5. **Open a PR** with:
   - What changed and why
   - Which packages/languages are affected
   - How you tested it
   - Screenshots or curl examples if it's a visible integration change

### Review requirements

- **2 approving reviews** required before merge.
- **All CI checks must pass** (tests, lint/format where configured).
- Address review feedback or explain why you're not making a suggested change.
- Maintainers may request changes — PR stays open until requirements are met.

### PR checklist

Copy into your PR description:

```markdown
- [ ] Tests pass locally for packages I changed
- [ ] Lint/format run (gofmt, cargo fmt, npm run build, etc.)
- [ ] Docs updated if needed
- [ ] No secrets committed
- [ ] Protocol change? Cross-language impact noted
```

### After merge

Maintainers squash or merge per repo settings. Delete your branch after merge if you like.

---

## What to contribute

**Great fits for PRs:**

- Bug fixes
- Framework adapters (new HTTP framework for an existing language)
- Tests and documentation
- Cross-language compatibility fixes
- New language SDKs (see [Adding a new language](#adding-a-new-language))

**Please open an issue first:**

- Changes to `proto/pbx.proto`
- New crypto algorithms or envelope fields
- Breaking API changes

**Not accepted:**

- Drive-by refactors unrelated to the PR
- Committed secrets or real keys
- Copy-pasted crypto in framework adapters

---

## Security issues

**Do not open public issues for unpatched vulnerabilities.**

Email or contact maintainers privately with:

- What the issue is
- Steps to reproduce
- Impact assessment if you can

We'll respond and coordinate a fix before disclosure.

---

## Questions

- **Bug or small fix** — open a PR with a short description.
- **Feature or design question** — open an issue first.
- **New language** — open an issue describing the language, target frameworks, and your plan.

Thanks for helping make PBX better.
- tess