# PBX TypeScript SDK

TypeScript source for PBX. Builds into `../javascript/` for plain JS users.

## Install

```bash
cd js/typescript
npm install
npm run build
```

Built output lands in `../javascript/`. JavaScript-only projects should use that package — see `../javascript/README.md`.

## Configure

Create a `.env` file:

```env
PBX_KEY=your-base64-key-here
PBX_KEY_ID=primary
PBX_PROTECTED=true
```

Generate `PBX_KEY` with `openssl rand -base64 32`.

## Express

```typescript
import express from "express";
import { PbxCore, loadConfigFromEnv, pbxMiddleware } from "@pbx/sdk";

const core = new PbxCore(loadConfigFromEnv());
const app = express();

app.use(express.raw({ type: "*/*" }));
app.use(pbxMiddleware(core));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.post("/v2/users", (req, res) => res.json({ created: true, ...req.body }));

app.listen(3000);
```

## Next.js (App Router)

```typescript
import { PbxCore, loadConfigFromEnv, withPbx } from "@pbx/sdk";

const core = new PbxCore(loadConfigFromEnv());

export const POST = withPbx(core, async (_req, body) => {
  return Response.json({ created: true, ...(body as object) });
});
```

## Fastify

```typescript
import Fastify from "fastify";
import { PbxCore, loadConfigFromEnv, registerPbxFastify } from "@pbx/sdk";

const core = new PbxCore(loadConfigFromEnv());
const app = Fastify();
registerPbxFastify(app, core);

app.post("/v2/users", async (req) => ({ created: true, ...req.body }));
app.listen({ port: 3000 });
```

## Protect routes

```typescript
const core = new PbxCore({
  ...loadConfigFromEnv(),
  routes: {
    protected: ["/v2/*"],
    public: ["/health", "/hi"],
  },
});
```

## Client

```typescript
import { PbxClient, PbxCore, loadConfigFromEnv } from "@pbx/sdk";

const core = new PbxCore(loadConfigFromEnv());
const pbx = new PbxClient({ baseUrl: "https://api.example.com", core });

const user = await pbx.post("/v2/users", { name: "alice" });
```

## Tests

```bash
npm test
```
