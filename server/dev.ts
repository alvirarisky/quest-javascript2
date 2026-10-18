import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer as createViteServer } from "vite";
import { handle } from "./handler.js";
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = /^(RUN_SIGNING_SECRET)=(.+)$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
if (!process.env.RUN_SIGNING_SECRET) {
  process.env.RUN_SIGNING_SECRET = randomBytes(32).toString("hex");
  console.log("Dev: ephemeral signing key; restart invalidates tokens.");
}
const port = Number(process.env.PORT || 5173);
const vite = await createViteServer({
  server: { middlewareMode: true, hmr: { port: port + 20000 } },
  appType: "spa",
});
createServer(async (req, res) => {
  if (req.url?.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    try {
      if (req.method !== "POST") {
        res.statusCode = 405;
        throw Error("Gunakan POST.");
      }
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 12000) {
          res.statusCode = 413;
          throw Error("Request terlalu besar.");
        }
      }
      const out = handle(req.url.split("/").pop()!, JSON.parse(raw));
      res.end(JSON.stringify(out));
    } catch (e) {
      if (res.statusCode === 200) res.statusCode = 400;
      res.end(JSON.stringify({ error: (e as Error).message }));
    }
  } else vite.middlewares(req, res);
}).listen(port, "127.0.0.1", () =>
  console.log(`Dead Signal → http://127.0.0.1:${port}`),
);
