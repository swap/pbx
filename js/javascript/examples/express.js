import express from "express";
import { PbxCore, pbxMiddleware } from "@snowcats/pbx";

const core = new PbxCore({
  key: Buffer.from(process.env.PBX_KEY ?? "", "base64"),
  keyId: process.env.PBX_KEY_ID ?? "dev",
  protectedMode: true,
  replayWindowSec: 300,
  maxBodySize: 1_048_576,
  routes: {
    protected: ["/v2/*"],
    public: ["/health", "/hi"],
  },
});

const app = express();
app.use(express.raw({ type: "*/*" }));
app.use(pbxMiddleware(core));

app.get("/hi", (_req, res) => res.json({ message: "hi" }));
app.post("/v2/users", (req, res) => res.json({ created: true, ...req.body }));

app.listen(3000, () => console.log("http://localhost:3000"));
