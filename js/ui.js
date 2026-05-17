/**
 * UI MODULE
 * ─────────
 * All DOM rendering lives here. Zero business logic.
 * Claude Code instruction: to add a new tab (e.g. "Curriculum roadmap"),
 * add a render function here and wire it up in app.js.
 */

import { RESEARCH_AREAS } from "./prompt.js";

const AREA_COLOR = Object.fromEntries(RESEARCH_AREAS.map((a) => [a.id, a.color]));

// ─── Stats bar ─────────────────────────────────────────────────────────────
export function renderStats(db) {
  setText("stat-papers", db.papers.length);
  setText("stat-assign", db.assignments.length);
  setText("stat-runs", db.runCount);
  setText("stat-areas", db.areas.size);
  setText(
    "run-count-pill",
    `${db.runCount} runs · ${db.papers.length} papers · ${db.assignments.length} assignments`
  );
  if (db.lastRun) {
    setText("last-run", "Last run: " + new Date(db.lastRun).toLocaleString());
  }
}

// ─── Assignments ───────────────────────────────────────────────────────────
export function renderAssignments(assignments, filter = "all") {
  const container = document.getElementById("assignments-container");
  const filtered =
    filter === "all" ? assignments : assignments.filter((a) => a.area === filter);
  const sorted = filtered.slice().reverse();

  if (!sorted.length) {
    container.innerHTML = emptyState(
      "ti-books",
      assignments.length
        ? "No assignments in this area yet."
        : 'Hit "Run research cycle" to generate your first assignments.'
    );
    return;
  }

  container.innerHTML = sorted.map(assignmentCard).join("");
}

function assignmentCard(a) {
  const color = AREA_COLOR[a.area] || "blue";
  const diffClass = { hard: "diff-hard", medium: "diff-medium", starter: "diff-starter" }[a.difficulty] || "diff-medium";
  const concepts = (a.key_pytorch_concepts || []).slice(0, 3);
  const tasks = (a.tasks || []).map((t) => `<li>${esc(t)}</li>`).join("");

  return `
<div class="assignment-card" data-area="${esc(a.area)}">
  <div class="ac-header">
    <span class="ac-title">${esc(a.title)}</span>
    <span class="ac-diff ${diffClass}">${esc(a.difficulty)} · ~${a.estimated_hours || "?"}h</span>
  </div>
  <div class="badge-row">
    <span class="badge badge-${color}">${esc((a.area || "").replace("_", " "))}</span>
    ${concepts.map((c) => `<span class="badge badge-${color} badge-dim">${esc(c)}</span>`).join("")}
  </div>
  <p class="ac-paper">Based on: ${esc(a.paper_ref || "")}</p>
  <p class="ac-desc">${esc(a.context || "")}</p>

  <p class="ac-label">Objective</p>
  <p class="ac-desc ac-objective">${esc(a.learning_objective || "")}</p>

  <p class="ac-label">Setup</p>
  <p class="ac-desc">${esc(a.setup || "")}</p>

  <p class="ac-label">Tasks</p>
  <ul class="task-list">${tasks}</ul>

  ${a.debug_hints ? `<p class="ac-label">Debug hint</p><p class="ac-desc">${esc(a.debug_hints)}</p>` : ""}

  ${a.starter_code_hint
    ? `<p class="ac-label">Starter pattern</p>
       <pre class="code-hint">${esc(a.starter_code_hint)}</pre>`
    : ""}

  ${a.stretch_goal
    ? `<div class="stretch-goal">
         <strong>Stretch:</strong> ${esc(a.stretch_goal)}
       </div>`
    : ""}
</div>`;
}

// ─── Papers ────────────────────────────────────────────────────────────────
export function renderPapers(papers) {
  const container = document.getElementById("papers-container");
  if (!papers.length) {
    container.innerHTML = emptyState("ti-file-search", "No papers yet. Run a research cycle.");
    return;
  }

  container.innerHTML = papers
    .slice()
    .reverse()
    .map(paperCard)
    .join("");
}

function paperCard(p) {
  const color = AREA_COLOR[p.area] || "blue";
  return `
<div class="paper-card">
  <p class="paper-title">${esc(p.title || "")}</p>
  <p class="paper-venue">${esc(p.authors || "")} · ${esc(p.venue || "")} ${p.year || ""}</p>
  <p class="paper-body">${esc(p.core_idea || "")}</p>
  ${p.why_important ? `<p class="paper-body paper-italic">${esc(p.why_important)}</p>` : ""}
  <div class="badge-row" style="margin-top:8px;">
    <span class="badge badge-${color}">${esc((p.area || "").replace("_", " "))}</span>
    ${p.pytorch_hook ? `<span class="badge badge-mono">🔧 ${esc(p.pytorch_hook)}</span>` : ""}
  </div>
</div>`;
}

// ─── Log ───────────────────────────────────────────────────────────────────
export function appendLog(message, type = "") {
  const container = document.getElementById("log-container");
  const ts = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const line = document.createElement("div");
  line.className = "log-line";
  line.innerHTML = `<span class="log-ts">${ts}</span><span class="log-${type || "default"}">${esc(message)}</span>`;
  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
}

export function initLog() {
  document.getElementById("log-container").innerHTML =
    `<div class="log-line"><span class="log-ts">--:--:--</span><span class="log-default">Engine ready. Hit run to start a research cycle.</span></div>`;
}

// ─── Progress ──────────────────────────────────────────────────────────────
export function setProgress(pct) {
  const bar = document.getElementById("progress-bar");
  const fill = document.getElementById("progress-fill");
  bar.style.display = pct === 0 ? "none" : "block";
  fill.style.width = pct + "%";
}

export function setRunning(isRunning) {
  const btn = document.getElementById("run-btn");
  btn.disabled = isRunning;
  btn.innerHTML = isRunning
    ? `<span class="spin">⟳</span> Researching...`
    : `Run research cycle →`;
}

// ─── Tab switching ─────────────────────────────────────────────────────────
export function switchTab(tabName) {
  document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = "none"));
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById("panel-" + tabName).style.display = "block";
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add("active");
}

// ─── Filter buttons ────────────────────────────────────────────────────────
export function setActiveFilter(area) {
  document.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.area === area);
  });
}

// ─── Settings panel ────────────────────────────────────────────────────────
export function toggleSettings(show) {
  document.getElementById("settings-panel").style.display = show ? "block" : "none";
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emptyState(icon, msg) {
  return `<div class="empty-state">
    <i class="ti ${icon}"></i>
    <p>${msg}</p>
  </div>`;
}
