# PBX JavaScript SDK

Plain JavaScript package — no TypeScript required to use it.

Source is written in TypeScript under `../typescript/` and compiled into this folder.

## Install

```bash
# build from source
cd ../typescript
npm install
npm run build

# install JS package deps
cd ../javascript
npm install
```

## Configure

Create a `.env` file:

```env
PBX_KEY=your-base64-key-here
PBX_KEY_ID=primary
PBX_PROTECTED=true
```

Generate `PBX_KEY` with `openssl rand -base64 32`.

## Express

```javascript
import express from "express";
import { PbxCore, pbxMiddleware } from "@snowcats/pbx";

const core = new PbxCore({
  key: Buffer.from(process.env.PBX_KEY, "base64"),
  keyId: "primary",
  protectedMode: true,
  routes: { protected: ["/v2/*"], public: ["/health"] },
});

const app = express();
app.use(express.raw({ type: "*/*" }));
app.use(pbxMiddleware(core));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.post("/v2/users", (req, res) => res.json({ created: true, ...req.body }));

app.listen(3000);
```

See `examples/express.js` for a runnable version.

## Next.js

```javascript
import { PbxCore, withPbx } from "@snowcats/pbx/nextjs";

const core = new PbxCore({ /* config */ });

export const POST = withPbx(core, async (_req, body) => {
  return Response.json({ created: true, ...body });
});
```

## Client

```javascript
import { PbxClient, PbxCore } from "@snowcats/pbx";

const core = new PbxCore({ /* config */ });
const pbx = new PbxClient({ baseUrl: "https://api.example.com", core });

const user = await pbx.post("/v2/users", { name: "alice" });
```

## Subpath imports

```javascript
import { pbxMiddleware } from "@snowcats/pbx/express";
import { registerPbxFastify } from "@snowcats/pbx/fastify";
import { withPbx } from "@snowcats/pbx/nextjs";
```

## Tests

```bash
cd ../typescript && npm run build
cd ../javascript && npm test
```

## TypeScript users

Use `../typescript/` directly if you want types and source. It builds into this folder.
