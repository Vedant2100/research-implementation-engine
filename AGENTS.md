# AGENTS.md

## Cursor Cloud specific instructions

### What this is
Single product: **PyTorch Research Engine** — a static, framework-less browser SPA (vanilla JS ES modules, no bundler/build step). State lives in the browser's `localStorage`; there is no database and no server-side persistence. See `README.md` for the product overview and `package.json` for scripts.

### Services
- **Web frontend (required):** `npm run dev:web` serves the static files on port `3000` (this is the whole product UI). Ships with pre-generated "seed" assignments/papers (`js/seed.js`) that load on first visit, so the UI is fully browsable offline.
- **Dev proxy (optional):** `npm run dev:proxy` (port `3001`) only forwards LLM API calls upstream and injects a key from `.env`. It is only needed for the "Run research cycle" feature, which calls an external LLM provider (NVIDIA NIM by default).

### Non-obvious caveats
- **Do not run `npm run dev` (or `npm start`) without a real key.** They use `concurrently -k`, and `scripts/dev-proxy.mjs` calls `process.exit(1)` when `NVIDIA_API_KEY` is missing or still equals the `.env.example` placeholder. With `-k`, the proxy exiting kills the web server too. For keyless local dev, run `npm run dev:web` alone.
- **The LLM feature needs a secret.** "Run research cycle" requires either a valid `NVIDIA_API_KEY` in `.env` (copy from `.env.example`) for the proxy path, or a key pasted into the app's Settings UI (stored in `localStorage`). Without a key the rest of the app (browse seeded assignments/papers, open the Monaco code workspace, mark assignments done, export to Markdown) works fully.
- **No lint, no tests, no build pipeline exist.** The only build-like step is `npm run gen-seed`, which regenerates `js/seed.js` from the Python templates in `scripts/assignments/*.py` (requires `python3` on PATH for AST validation).
- The app loads Monaco editor, Tabler icons, and `marked` from CDNs at runtime, so the code workspace and icons require outbound network access in the browser.
