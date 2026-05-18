/**
 * Local dev proxy → NVIDIA NIM (or any OpenAI-compatible upstream).
 *
 *   - Reads NVIDIA_API_KEY from .env (never sent to the browser)
 *   - Adds CORS headers so the frontend on :3000 can call it
 *   - Forwards POST /v1/chat/completions (and friends) upstream
 *
 * Run: npm run dev:proxy   (or: node scripts/dev-proxy.mjs)
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

function loadDotEnv(file = ".env") {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv();

const API_KEY = process.env.NVIDIA_API_KEY;
const UPSTREAM = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
const PORT = Number(process.env.PROXY_PORT || 3001);

if (!API_KEY || API_KEY.includes("REPLACE_ME")) {
  console.error("✗ NVIDIA_API_KEY missing in .env. Copy .env.example → .env and add a real key.");
  process.exit(1);
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, upstream: UPSTREAM }));
    return;
  }

  if (!req.url.startsWith("/v1/")) {
    res.writeHead(404, CORS_HEADERS);
    res.end("Use /v1/... paths (e.g. /v1/chat/completions)");
    return;
  }

  const upstreamPath = req.url.replace(/^\/v1/, "");
  const upstreamUrl = `${UPSTREAM}${upstreamPath}`;
  const body = req.method === "POST" ? await readBody(req) : undefined;

  const headers = {
    "Content-Type": req.headers["content-type"] || "application/json",
    Authorization: `Bearer ${API_KEY}`,
    Accept: req.headers["accept"] || "application/json",
  };

  const startedAt = Date.now();
  console.log(`→ ${req.method} ${upstreamUrl}`);

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body,
    });
    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    res.writeHead(upstreamRes.status, {
      ...CORS_HEADERS,
      "Content-Type": upstreamRes.headers.get("content-type") || "application/json",
    });
    res.end(buf);
    console.log(`← ${upstreamRes.status} (${Date.now() - startedAt}ms, ${buf.length}B)`);
  } catch (err) {
    console.error("✗ Upstream error:", err.message);
    res.writeHead(502, { ...CORS_HEADERS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: err.message } }));
  }
});

server.listen(PORT, () => {
  console.log(`✓ Dev proxy running at http://localhost:${PORT}`);
  console.log(`  Upstream: ${UPSTREAM}`);
  console.log(`  Frontend should set PROXY_URL = "http://localhost:${PORT}/v1"`);
});
