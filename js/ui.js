/**
 * UI MODULE
 * ─────────
 * All DOM rendering lives here. Zero business logic.
 * Claude Code instruction: to add a new tab (e.g. "Curriculum roadmap"),
 * add a render function here and wire it up in app.js.
 */

import { RESEARCH_AREAS } from "./prompt.js";
import { assignmentToMarkdown, renderMarkdownHtml } from "./markdown.js";

let _workspaceEditor = null;
let _workspaceTitle = null;
let _workspaceGetCode = null;
let _workspaceSaveCode = null;
let _workspaceClearCode = null;
let _workspaceGetAssignment = null;

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
export function renderAssignments(assignments, filter = "all", getStatus = () => "todo") {
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

  container.innerHTML = sorted.map((a) => assignmentCard(a, getStatus(a.title))).join("");
}

function assignmentCard(a, status = "todo") {
  const color = AREA_COLOR[a.area] || "blue";
  const diffClass = { hard: "diff-hard", medium: "diff-medium", starter: "diff-starter" }[a.difficulty] || "diff-medium";
  const concepts = (a.key_pytorch_concepts || []).slice(0, 3);
  const tasks = (a.tasks || []).map((t) => `<li>${esc(t)}</li>`).join("");
  const prerequisites = renderCompactList(a.prerequisite_concepts || []);
  const conceptLadder = renderCompactList(a.concept_ladder || []);
  const milestones = renderMilestones(a.milestones || []);

  const statusBadgeHtml = status === "done"
    ? `<span class="status-badge status-done">Done</span>`
    : `<span class="status-badge" style="display:none"></span>`;

  const actionBtnHtml = status === "done"
    ? `<button class="btn-ghost mark-reset-btn">Reset</button>`
    : `<button class="btn-ghost mark-done-btn">Mark done</button>`;

  return `
<div class="assignment-card${status === "done" ? " ac-done" : ""}" data-area="${esc(a.area)}" data-title="${esc(a.title)}">
  <div class="ac-body">
    <div class="assignment-main">
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

      ${a.why_now
        ? `<div class="learning-callout">
             <span>Why this next</span>
             <p>${esc(a.why_now)}</p>
           </div>`
        : ""}

      ${a.next_30_minutes
        ? `<div class="next-step">
             <span>First 30 minutes</span>
             <p>${esc(a.next_30_minutes)}</p>
           </div>`
        : ""}

      ${prerequisites ? `<p class="ac-label">Prerequisites</p>${prerequisites}` : ""}
      ${conceptLadder ? `<p class="ac-label">Concept ladder</p>${conceptLadder}` : ""}

      <p class="ac-label">Objective</p>
      <p class="ac-desc ac-objective">${esc(a.learning_objective || "")}</p>

      <p class="ac-label">Setup</p>
      <p class="ac-desc">${esc(a.setup || "")}</p>

      <p class="ac-label">Tasks</p>
      <ul class="task-list">${tasks}</ul>

      ${milestones ? `<p class="ac-label">Milestones</p>${milestones}` : ""}

      <div class="ac-action-bar">
        <button class="btn-ghost code-toggle-btn"><i class="ti ti-code" style="vertical-align:-2px;margin-right:4px;"></i><span>Code</span></button>
        ${statusBadgeHtml}
        ${actionBtnHtml}
      </div>
    </div>
  </div>
</div>`;
}

// ─── Code workspace (full-screen, brief | editor) ───────────────────────────
export function attachEditorPanels(getCode, saveCode, setStatus, clearCode, getHarness, getAssignment) {
  _workspaceGetCode = getCode;
  _workspaceSaveCode = saveCode;
  _workspaceClearCode = clearCode;
  _workspaceGetAssignment = getAssignment;

  const container = document.getElementById("assignments-container");
  container.addEventListener("click", (e) => {
    const card = e.target.closest(".assignment-card");
    if (!card) return;
    const title = card.dataset.title;

    if (e.target.closest(".code-toggle-btn")) {
      const assignment = getAssignment?.(title);
      if (assignment) openCodeWorkspace(assignment);
      return;
    }

    if (e.target.closest(".mark-done-btn")) {
      setStatus(title, "done");
      _applyStatus(card, "done");
    }

    if (e.target.closest(".mark-reset-btn")) {
      setStatus(title, "todo");
      _applyStatus(card, "todo");
    }
  });

  document.getElementById("workspace-close")?.addEventListener("click", closeCodeWorkspace);
  document.getElementById("code-workspace-backdrop")?.addEventListener("click", closeCodeWorkspace);
  document.getElementById("workspace-reset-guide")?.addEventListener("click", _resetWorkspaceGuide);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && _isWorkspaceOpen()) closeCodeWorkspace();
  });
}

export function openCodeWorkspace(assignment) {
  const ws = document.getElementById("code-workspace");
  const backdrop = document.getElementById("code-workspace-backdrop");
  const briefEl = document.getElementById("workspace-brief");
  const titleEl = document.getElementById("workspace-title");
  if (!ws || !briefEl) return;

  _workspaceTitle = assignment.title;
  titleEl.textContent = assignment.title;
  briefEl.innerHTML = renderMarkdownHtml(assignmentToMarkdown(assignment));

  ws.hidden = false;
  backdrop.hidden = false;
  document.body.classList.add("workspace-open");

  _ensureWorkspaceEditor(() => {
    _workspaceEditor.setValue(_workspaceGetCode(_workspaceTitle));
    _workspaceEditor.layout();
    _workspaceEditor.focus();
  });
}

export function closeCodeWorkspace() {
  const ws = document.getElementById("code-workspace");
  const backdrop = document.getElementById("code-workspace-backdrop");
  if (!ws) return;
  ws.hidden = true;
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove("workspace-open");
  _workspaceTitle = null;
}

function _isWorkspaceOpen() {
  const ws = document.getElementById("code-workspace");
  return ws && !ws.hidden;
}

function _resetWorkspaceGuide() {
  if (!_workspaceTitle || !_workspaceClearCode) return;
  _workspaceClearCode(_workspaceTitle);
  if (_workspaceEditor && _workspaceGetCode) {
    _workspaceEditor.setValue(_workspaceGetCode(_workspaceTitle));
  }
}

function _ensureWorkspaceEditor(onReady) {
  const mountEl = document.getElementById("workspace-monaco");
  if (!mountEl) return;

  if (_workspaceEditor) {
    onReady?.();
    return;
  }

  const themeFor = () =>
    document.documentElement.getAttribute("data-theme") === "dark" ? "vs-dark" : "vs";

  window.monacoReady.then(() => {
    _workspaceEditor = monaco.editor.create(mountEl, {
      value: "",
      language: "python",
      theme: themeFor(),
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: "on",
      scrollBeyondLastLine: false,
      automaticLayout: true,
      padding: { top: 12, bottom: 12 },
    });

    let t;
    _workspaceEditor.onDidChangeModelContent(() => {
      if (!_workspaceTitle) return;
      clearTimeout(t);
      t = setTimeout(() => _workspaceSaveCode(_workspaceTitle, _workspaceEditor.getValue()), 500);
    });

    if (!window._workspaceThemeObserver) {
      window._workspaceThemeObserver = new MutationObserver(() => {
        monaco.editor.setTheme(themeFor());
      });
      window._workspaceThemeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }

    onReady?.();
  });
}

function _applyStatus(card, status) {
  card.classList.toggle("ac-done", status === "done");
  const badge = card.querySelector(".status-badge");
  if (badge) {
    badge.className = `status-badge${status === "done" ? " status-done" : ""}`;
    badge.textContent = status === "done" ? "Done" : "";
    badge.style.display = status === "done" ? "inline-block" : "none";
  }
  const doneBtn  = card.querySelector(".mark-done-btn");
  const resetBtn = card.querySelector(".mark-reset-btn");
  if (doneBtn)  doneBtn.style.display  = status === "done" ? "none"         : "inline-block";
  if (resetBtn) resetBtn.style.display = status === "done" ? "inline-block" : "none";
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

function renderCompactList(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return `<ul class="compact-list">${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
}

function renderMilestones(milestones) {
  if (!Array.isArray(milestones) || !milestones.length) return "";
  return `<div class="milestone-list">${milestones
    .map((m, idx) => {
      if (typeof m === "string") {
        return `<div class="milestone-card"><strong>${idx + 1}. ${esc(m)}</strong></div>`;
      }
      return `<div class="milestone-card">
        <strong>${idx + 1}. ${esc(m.title || "Milestone")}</strong>
        ${m.goal ? `<p>${esc(m.goal)}</p>` : ""}
        ${m.checkpoint ? `<span>${esc(m.checkpoint)}</span>` : ""}
      </div>`;
    })
    .join("")}</div>`;
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
