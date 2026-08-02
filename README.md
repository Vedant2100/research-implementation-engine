# PyTorch Research Engine

RIE helps you decide what research to pursue, practice the Research Engineer / ML
Engineer interview loop, and preserve the deep PyTorch work you have already
generated. The legacy API cycle remains available, but external Codex/Claude
refresh is the default no-RIE-credit workflow.

## Current workflow

RIE is organized into three sections:

- **Research Ideas** — copy a context-aware refresh prompt into Codex or
  Claude, let that agent browse and research, then paste the JSON response back
  for a previewed, additive import.
- **Interview** — run offline timed practice, refresh the question catalog
  through Codex or Claude, and import only new questions after review.
- **Archive** — the original papers, assignments, code, statuses, and legacy
  API workflow. Archive data is kept separate from current research ideas.

The external refresh workflow intentionally makes no RIE model/API calls. It
uses LocalStorage for research-direction history, imported interview prompts,
and refresh records. Existing API research remains available as an explicitly
optional legacy path.

### External refresh workflow

1. Open Research Ideas or Interview.
2. Click the relevant **Copy ... prompt** button.
3. Paste the prompt into Codex or Claude and ask it to browse the web.
4. Paste the returned JSON into RIE.
5. Preview the additions and import them only after reviewing the diff.

Imports are additive and deduplicated. Existing archive records and interview
history are not overwritten. The prompt includes only a compact recent summary,
not the entire archive or code workspace.

**Priority research areas:**
- 🔴 Agentic security (prompt injection, red-teaming, multi-agent trust)
- 🔴 Self-improving / recursive agents (RLHF, SPIN, self-play, DPO)
- 🟡 LLMs & transformers (architecture, attention, MoE)
- 🟡 RL + optimization (GRPO, Muon, process reward models)
- 🟢 NLP (in-context learning, long-context)

---

## Quick start

```bash
git clone <your-repo>
cd pytorch-research-engine
npm install
npm run dev
# → open http://localhost:3000
```

1. Open **Research Ideas** and click **Copy research prompt**.
2. Paste it into Codex or Claude, let it browse, and paste the returned JSON back.
3. Preview and import only the new directions you approve.
4. Use **Interview** for offline timed practice and **Archive** for existing assignments.

The optional **Run legacy API cycle** still requires the configured provider API
key and can consume credits.

---

## Project structure

```
pytorch-research-engine/
│
├── index.html              ← Entry point, all HTML structure
│
├── js/
│   ├── app.js              ← Main orchestrator — wires everything together
│   ├── agent.js            ← Optional configured-provider API calls
│   ├── prompt.js           ← ⭐ THE BRAIN — edit this to change research focus
│   ├── storage.js          ← All localStorage read/write
│   └── ui.js               ← All DOM rendering, zero business logic
│
├── css/
│   └── style.css           ← All styles, full dark mode support
│
├── config/
│   └── config.js           ← Model, tokens, feature flags
│
├── package.json
└── .gitignore
```

---

## For Claude Code / Codex

When you feed this repo to Claude Code, here are the commands to use:

### Change research focus
> "Shift priority to DeepSeek architecture papers and reduce NLP weight"

→ Claude Code edits `js/prompt.js` — the `RESEARCH_AREAS` array and the
`SYSTEM_PROMPT` sections.

### Add a new research area
> "Add 'mechanistic interpretability' as a new research area"

→ Claude Code adds to `RESEARCH_AREAS` in `prompt.js`, adds a badge color
in `css/style.css`, and updates the system prompt.

### Change assignment style
> "Make assignments harder — assume I already know basic PyTorch, skip setup tasks"

→ Claude Code edits the `ASSIGNMENT PHILOSOPHY` section in `js/prompt.js`.

### Add a new feature
> "Add a difficulty filter — show only 'hard' assignments"

→ Claude Code edits `js/app.js` (logic) and `js/ui.js` (rendering).

### Swap storage backend
> "Switch from localStorage to a SQLite file via a small Express backend"

→ Claude Code replaces `js/storage.js` only — the rest of the app is unchanged.

### Add a new API tool (e.g. arXiv search)
> "Add arXiv API search as a tool so the agent can pull abstracts directly"

→ Claude Code edits `js/agent.js` — add to `TOOLS` array, handle in `parseResponse()`.

---

## How the agent works

Each run:

1. **Reads your existing paper database** — so it never repeats a paper
2. **Calls the configured provider API** with web search enabled — searches arxiv, papers with code,
   AI lab blogs for papers published in the last 6 months
3. **Generates assignments** anchored to specific papers — not toy problems,
   but full end-to-end implementations: data → model → training loop → eval
4. **Saves to localStorage** — your curriculum persists between browser sessions
5. **Returns JSON** — clean structure you can export to markdown anytime

---

## Assignment philosophy

Every assignment you get:
- Is tied to a **real, named, recent paper** — not a generic "implement X"
- Starts from raw data and ends at a working eval metric
- Uses **only PyTorch primitives** — no HuggingFace model loading, no Lightning
- Has a **training loop you write yourself**
- Has a **stretch goal** pointing toward paper-level results
- Has a **debug hint** for the one thing that will definitely go wrong

---

## API key security

Your API key is stored in `localStorage` only. It is sent directly to
the configured provider host from your browser. It never touches any other server.
Do not hardcode it in `config/config.js` if you are pushing to a public repo.

---

## Updating the prompt (most important file)

`js/prompt.js` is the core intelligence. Open it and read it — it's heavily
commented. To change what the engine researches or how assignments are built,
edit this file. Everything else is plumbing.
