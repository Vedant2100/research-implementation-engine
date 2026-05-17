/**
 * APP.JS — Main orchestrator
 * ──────────────────────────
 * Wires storage ↔ agent ↔ UI. No rendering logic here — that's in ui.js.
 * No API logic here — that's in agent.js.
 *
 * Claude Code instruction: to add a new feature (e.g. "export to markdown",
 * "schedule auto-runs", "filter by difficulty"), add it here and call
 * the appropriate ui.js render function.
 */

import { loadDB, saveDB, clearDB, getApiKey, saveApiKey, consumeSeedNotice } from "./storage.js";
import { runResearchAgent } from "./agent.js";
import {
  renderStats,
  renderAssignments,
  renderPapers,
  appendLog,
  initLog,
  setProgress,
  setRunning,
  switchTab,
  setActiveFilter,
  toggleSettings,
  attachEditorPanels,
} from "./ui.js";
import { RESEARCH_AREAS, RUN_AREAS, getAreaById } from "./prompt.js";
import { getCode, saveCode, getStatus, setStatus, clearCode } from "./code-store.js";
import { getHarness } from "./harnesses.js";

// ─── State ─────────────────────────────────────────────────────────────────
let db = loadDB();
let currentFilter = "all";

// ─── Boot ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  db = loadDB(); // pick up starter seed on first visit
  initLog();
  buildFilterBar();
  buildRunAreaSelect();
  buildAreaBadges();
  wireEvents();
  refreshUI();
  prefillApiKey();
  const seeded = consumeSeedNotice();
  if (seeded > 0) {
    log(`Loaded ${seeded} starter items (transformers + RL, medium).`, "ok");
  }
});

// ─── Events ────────────────────────────────────────────────────────────────
function wireEvents() {
  document.getElementById("run-btn").addEventListener("click", onRun);
  document.getElementById("clear-btn").addEventListener("click", onClear);
  document.getElementById("settings-btn").addEventListener("click", () => toggleSettings(true));
  document.getElementById("settings-close").addEventListener("click", () => toggleSettings(false));
  document.getElementById("save-key-btn").addEventListener("click", onSaveKey);
  document.getElementById("export-btn").addEventListener("click", onExport);

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  attachEditorPanels(
    (title) => getCode(title, db.assignments.find((a) => a.title === title)),
    saveCode,
    setStatus,
    clearCode,
    getHarness
  );
}

// ─── Run cycle ─────────────────────────────────────────────────────────────
async function onRun() {
  const areaId = document.getElementById("run-area-select").value;
  const area = getAreaById(areaId);
  if (!area) {
    alert("Pick a research area first (dropdown to the left of Run).");
    document.getElementById("run-area-select").focus();
    return;
  }

  setRunning(true);
  setProgress(10);
  log(`Starting research cycle #${db.runCount + 1}`, "search");
  log(`Area: ${area.label} · 1 assignment max · harness auto-generated`, "search");
  setProgress(30);

  try {
    const existingTitles = db.papers.map((p) => p.title);
    const existingAssignmentTitles = db.assignments.map((a) => a.title);
    const { papers, assignments, searchCount } = await runResearchAgent(
      existingTitles,
      (msg, type) => log(msg, type),
      {
        areaId: area.id,
        areaLabel: area.label,
        existingAssignmentTitles,
      }
    );

    setProgress(80);

    const newPapers = dedupe(papers, db.papers);
    const newAssigns = dedupe(assignments, db.assignments);

    for (const a of newAssigns) {
      if (a.code_harness && String(a.code_harness).trim()) {
        saveCode(a.title, a.code_harness);
      }
    }

    db.papers.push(...newPapers);
    db.assignments.push(...newAssigns);
    db.runCount++;
    db.lastRun = new Date().toISOString();
    [...newPapers, ...newAssigns].forEach((x) => x.area && db.areas.add(x.area));

    // Prune if over limit
    if (db.papers.length > 200) db.papers = db.papers.slice(-200);
    if (db.assignments.length > 100) db.assignments = db.assignments.slice(-100);

    saveDB(db);

    log(`✓ Added ${newPapers.length} new papers, ${newAssigns.length} new assignments`, "ok");
    log(`Database: ${db.papers.length} papers · ${db.assignments.length} assignments`, "ok");
    if (searchCount > 0) log(`Agent performed ${searchCount} live web searches`, "search");

    setProgress(100);
    setTimeout(() => setProgress(0), 800);
    refreshUI();
  } catch (e) {
    log("Error: " + e.message, "err");
    setProgress(0);
    if (e.message.includes("API key")) toggleSettings(true);
  }

  setRunning(false);
}

// ─── Clear ─────────────────────────────────────────────────────────────────
function onClear() {
  if (!confirm("Clear all papers, assignments, and logs?")) return;
  db = clearDB();
  document.getElementById("log-container").innerHTML = "";
  log("Database cleared. Ready for a fresh run.", "ok");
  refreshUI();
}

// ─── API key ───────────────────────────────────────────────────────────────
function onSaveKey() {
  const key = document.getElementById("api-key-input").value.trim();
  if (!key.startsWith("sk-ant-")) {
    alert("That doesn't look like an Anthropic key (should start with sk-ant-)");
    return;
  }
  saveApiKey(key);
  toggleSettings(false);
  log("API key saved.", "ok");
}

function prefillApiKey() {
  const key = getApiKey();
  if (key) document.getElementById("api-key-input").value = key;
}

// ─── Export ────────────────────────────────────────────────────────────────
function onExport() {
  const md = buildMarkdownExport(db);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `research-export-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildMarkdownExport(db) {
  const lines = ["# PyTorch Research Engine Export", `_${new Date().toLocaleString()}_`, ""];

  lines.push("## Assignments", "");
  for (const a of db.assignments) {
    lines.push(`### ${a.title}`);
    lines.push(`**Area:** ${a.area}  |  **Difficulty:** ${a.difficulty}  |  **~${a.estimated_hours}h**`);
    lines.push(`**Paper:** ${a.paper_ref}`, "");
    lines.push(a.context, "");
    lines.push("**Objective:** " + a.learning_objective, "");
    lines.push("**Tasks:**");
    (a.tasks || []).forEach((t) => lines.push("- " + t));
    if ((a.verification || []).length) {
      lines.push("", "**How to verify:**");
      a.verification.forEach((v) => lines.push("- " + v));
    }
    if (a.stretch_goal) lines.push("", "**Stretch:** " + a.stretch_goal);
    if (a.debug_hints) lines.push("", "**Debug hint:** " + a.debug_hints);
    lines.push("", "---", "");
  }

  lines.push("## Papers", "");
  for (const p of db.papers) {
    lines.push(`### ${p.title}`);
    lines.push(`${p.authors || ""} · ${p.venue || ""} ${p.year || ""}`, "");
    lines.push(p.core_idea || "", "");
    if (p.why_important) lines.push("_" + p.why_important + "_", "");
    lines.push("---", "");
  }

  return lines.join("\n");
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function refreshUI() {
  renderStats(db);
  renderAssignments(db.assignments, currentFilter, getStatus);
  renderPapers(db.papers);
}

function buildRunAreaSelect() {
  const sel = document.getElementById("run-area-select");
  RUN_AREAS.forEach((area) => {
    const opt = document.createElement("option");
    opt.value = area.id;
    opt.textContent = area.label;
    sel.appendChild(opt);
  });
}

function buildFilterBar() {
  const bar = document.getElementById("filter-bar");
  const allBtn = document.createElement("button");
  allBtn.className = "filter-btn active";
  allBtn.dataset.area = "all";
  allBtn.textContent = "All";
  allBtn.addEventListener("click", () => onFilter("all"));
  bar.appendChild(allBtn);

  RESEARCH_AREAS.forEach((area) => {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.dataset.area = area.id;
    btn.textContent = area.label;
    btn.addEventListener("click", () => onFilter(area.id));
    bar.appendChild(btn);
  });
}

function buildAreaBadges() {
  const row = document.getElementById("area-badges");
  RESEARCH_AREAS.forEach((area) => {
    const span = document.createElement("span");
    span.className = `badge badge-${area.color}`;
    if (area.priority === "HIGH") span.style.fontWeight = "500";
    span.textContent = area.label;
    row.appendChild(span);
  });
}

function onFilter(area) {
  currentFilter = area;
  setActiveFilter(area);
  renderAssignments(db.assignments, currentFilter, getStatus);
}

function log(msg, type) {
  appendLog(msg, type);
  db.logs.push({ ts: new Date().toISOString(), msg, type });
  if (db.logs.length > 300) db.logs.shift();
}

function dedupe(incoming, existing) {
  const existingTitles = new Set(existing.map((x) => x.title?.toLowerCase()));
  return incoming.filter((x) => x.title && !existingTitles.has(x.title.toLowerCase()));
}
