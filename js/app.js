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

import {
  loadDB,
  saveDB,
  clearDB,
  getApiKey,
  saveApiKey,
  consumeSeedNotice,
  getStudentProfile,
  saveStudentProfile,
  loadResearchDirections,
  saveResearchDirections,
  loadRefreshHistory,
  saveRefreshHistory,
  loadInterviewPromptAdditions,
  saveInterviewPromptAdditions,
} from "./storage.js";
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
import { getProvider } from "../config/config.js";
import { getCode, saveCode, getStatus, setStatus, clearCode } from "./code-store.js";
import { getBuildGuide } from "./build-guides.js";
import {
  INTERVIEW_TRACKS,
  INTERVIEW_ROUNDS,
  getInterviewPrompt,
  getAllInterviewPrompts,
  loadInterviewHistory,
  saveInterviewAttempt,
  getInterviewStats,
} from "./interview.js";
import {
  buildResearchRefreshPrompt,
  buildInterviewRefreshPrompt,
  parseResearchRefresh,
  parseInterviewRefresh,
  previewResearchImport,
  previewInterviewImport,
  stampImportedItems,
} from "./external-refresh.js";
import {
  renderInterviewHome,
  renderInterviewSession,
  renderInterviewReview,
  renderInterviewHistory,
  renderInterviewStats,
  renderResearchIdeas,
  renderRefreshPreview,
  setRefreshStatus,
  showMode,
} from "./ui.js";

// ─── State ─────────────────────────────────────────────────────────────────
let db = loadDB();
let currentFilter = "all";
let studentProfile = getStudentProfile();
let interviewHistory = loadInterviewHistory();
let researchDirections = loadResearchDirections();
let refreshHistory = loadRefreshHistory();
let pendingResearchImport = null;
let pendingInterviewImport = null;
let interviewSession = null;
let interviewTimer = null;

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
  prefillStudentProfile();
  applyProviderHints();
  setupInterviewMode();
  setupExternalRefresh();
  refreshResearchIdeasUI();
  showMode("research_ideas");
  const seeded = consumeSeedNotice();
  if (seeded > 0) {
    log(`Loaded ${seeded} starter learning items.`, "ok");
  }
  const provider = getProvider();
  log(`Provider: ${provider.label} · model ${provider.model}`, "search");
});

function applyProviderHints() {
  const provider = getProvider();
  const input = document.getElementById("api-key-input");
  if (input) input.placeholder = provider.keyHint;
  const hint = document.getElementById("settings-hint");
  if (hint) {
    hint.innerHTML =
      `Get your key at <a href="${provider.keyDocsUrl}" target="_blank">${new URL(provider.keyDocsUrl).host}</a>. ` +
      `Stored in localStorage only — sent only to ${new URL(provider.baseUrl).host}.`;
  }
}

// ─── Theme ─────────────────────────────────────────────────────────────────
function toggleTheme() {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("research_engine_theme", next);
  } catch (_) {}
}

// ─── Events ────────────────────────────────────────────────────────────────
function wireEvents() {
  document.getElementById("run-btn").addEventListener("click", onRun);
  document.getElementById("clear-btn").addEventListener("click", onClear);
  document.getElementById("settings-btn").addEventListener("click", () => toggleSettings(true));
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  document.getElementById("settings-close").addEventListener("click", () => toggleSettings(false));
  const altClose = document.getElementById("settings-close-alt");
  if (altClose) altClose.addEventListener("click", () => toggleSettings(false));
  document.querySelector(".settings-backdrop")?.addEventListener("click", () => toggleSettings(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleSettings(false);
  });
  document.getElementById("save-key-btn").addEventListener("click", onSaveKey);
  document.getElementById("export-btn").addEventListener("click", onExport);

  document.getElementById("copy-research-refresh-btn")?.addEventListener("click", copyResearchRefreshPrompt);
  document.getElementById("preview-research-refresh-btn")?.addEventListener("click", previewResearchRefresh);
  document.getElementById("import-research-refresh-btn")?.addEventListener("click", importResearchRefresh);
  document.getElementById("copy-interview-refresh-btn")?.addEventListener("click", copyInterviewRefreshPrompt);
  document.getElementById("preview-interview-refresh-btn")?.addEventListener("click", previewInterviewRefresh);
  document.getElementById("import-interview-refresh-btn")?.addEventListener("click", importInterviewRefresh);

  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => showMode(btn.dataset.mode));
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  attachEditorPanels(
    (title) => getCode(title, db.assignments.find((a) => a.title === title)),
    saveCode,
    setStatus,
    clearCode,
    getBuildGuide,
    (title) => db.assignments.find((a) => a.title === title)
  );

  document.getElementById("start-interview-btn")?.addEventListener("click", startInterview);
  document.getElementById("end-interview-btn")?.addEventListener("click", endInterview);
  document.getElementById("new-interview-btn")?.addEventListener("click", resetInterview);
  document.getElementById("save-interview-btn")?.addEventListener("click", saveInterviewReview);
  document.getElementById("interview-response")?.addEventListener("input", () => {
    if (!interviewSession) return;
    interviewSession.response = document.getElementById("interview-response").value;
    interviewSession.checks = readInterviewChecks();
    document.getElementById("interview-save-state").textContent = "Saved locally";
  });
}

// ─── Interview mode ───────────────────────────────────────────────────────
function setupInterviewMode() {
  const trackSelect = document.getElementById("interview-track-select");
  const roundSelect = document.getElementById("interview-round-select");
  if (!trackSelect || !roundSelect) return;
  INTERVIEW_TRACKS.forEach((track) => {
    const option = document.createElement("option");
    option.value = track.id;
    option.textContent = track.label;
    trackSelect.appendChild(option);
  });
  INTERVIEW_ROUNDS.forEach((round) => {
    const option = document.createElement("option");
    option.value = round.id;
    option.textContent = `${round.label} · ${round.duration} min`;
    roundSelect.appendChild(option);
  });
  trackSelect.value = "research_engineer";
  roundSelect.value = "ml_coding";
  updateRoundExplain();
  roundSelect.addEventListener("change", updateRoundExplain);
  interviewHistory = loadInterviewHistory();
  renderInterviewHome(interviewHistory, getInterviewStats(interviewHistory));
}

function updateRoundExplain() {
  const round = INTERVIEW_ROUNDS.find((r) => r.id === document.getElementById("interview-round-select")?.value);
  const explain = document.getElementById("round-explain");
  if (!round || !explain) return;
  const descriptions = {
    coding_algorithms: "Solve a medium algorithmic problem while clarifying invariants, complexity, and edge cases.",
    ml_fundamentals: "Explain an ML concept precisely, then connect it to measurement and a real decision.",
    ml_coding: "Implement or reason through an ML primitive while narrating shapes, tests, and complexity.",
    pytorch_implementation: "Implement a PyTorch primitive and defend numerical, gradient, and performance behavior.",
    debugging: "Diagnose a training or systems failure using measurements before proposing fixes.",
    systems: "Clarify requirements, design the system, estimate scale, and defend tradeoffs.",
    research_engineering: "Turn a paper claim into a scoped, reproducible experiment under real constraints.",
    paper_defense: "Summarize a claim, challenge the evidence, and propose a falsifiable experiment.",
    agent_governance: "Design runtime enforcement and evaluation for a tool-using enterprise agent.",
    behavioral: "Explain your ownership, tradeoffs, failures, and impact clearly and confidentiality-safely.",
  };
  explain.textContent = descriptions[round.id];
}

function startInterview() {
  const trackId = document.getElementById("interview-track-select").value;
  const roundId = document.getElementById("interview-round-select").value;
  const recentIds = interviewHistory.slice(0, 5).map((a) => a.promptId);
  const prompt = getInterviewPrompt(trackId, roundId, recentIds, db.assignments);
  const round = INTERVIEW_ROUNDS.find((r) => r.id === prompt.round) || INTERVIEW_ROUNDS[0];
  interviewSession = {
    prompt,
    trackId,
    startedAt: Date.now(),
    deadline: Date.now() + round.duration * 60 * 1000,
    response: "",
    checks: { clarify: false, tests: false, tradeoffs: false },
  };
  renderInterviewSession(interviewSession, round);
  clearInterval(interviewTimer);
  interviewTimer = setInterval(updateInterviewTimer, 250);
}

function updateInterviewTimer() {
  if (!interviewSession) return;
  const remaining = Math.max(0, interviewSession.deadline - Date.now());
  const timer = document.getElementById("interview-timer");
  if (timer) {
    const seconds = Math.ceil(remaining / 1000);
    timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    timer.classList.toggle("timer-warning", remaining < 5 * 60 * 1000);
  }
  if (remaining === 0) endInterview(true);
}

function readInterviewChecks() {
  return {
    clarify: !!document.getElementById("check-clarify")?.checked,
    tests: !!document.getElementById("check-tests")?.checked,
    tradeoffs: !!document.getElementById("check-tradeoffs")?.checked,
  };
}

function endInterview(timeExpired = false) {
  if (!interviewSession) return;
  clearInterval(interviewTimer);
  interviewTimer = null;
  interviewSession.response = document.getElementById("interview-response")?.value || interviewSession.response;
  interviewSession.checks = readInterviewChecks();
  interviewSession.timeExpired = timeExpired;
  renderInterviewReview(interviewSession);
}

function resetInterview() {
  clearInterval(interviewTimer);
  interviewTimer = null;
  interviewSession = null;
  renderInterviewHome(interviewHistory, getInterviewStats(interviewHistory));
}

function saveInterviewReview() {
  if (!interviewSession) return;
  const scores = {};
  document.querySelectorAll("[data-review-score]").forEach((select) => {
    scores[select.dataset.reviewScore] = Number(select.value);
  });
  const total = Math.round(Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.keys(scores).length * 20);
  const attempt = {
    id: `${Date.now()}-${interviewSession.prompt.id}`,
    promptId: interviewSession.prompt.id,
    title: interviewSession.prompt.title,
    round: interviewSession.prompt.round,
    track: interviewSession.trackId,
    startedAt: new Date(interviewSession.startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: Math.round((Date.now() - interviewSession.startedAt) / 1000),
    timeExpired: !!interviewSession.timeExpired,
    checks: interviewSession.checks,
    responseLength: (interviewSession.response || "").length,
    scores,
    total,
    notes: document.getElementById("interview-review-notes")?.value || "",
    promptSource: interviewSession.prompt.source || "static",
    competencies: interviewSession.prompt.competencies || [],
  };
  interviewHistory = saveInterviewAttempt(attempt);
  renderInterviewHistory(interviewHistory);
  renderInterviewStats(getInterviewStats(interviewHistory));
  document.getElementById("save-interview-btn").textContent = "Saved";
  document.getElementById("save-interview-btn").disabled = true;
}

// ─── External refresh workflow ────────────────────────────────────────────
function setupExternalRefresh() {
  refreshResearchIdeasUI();
  renderInterviewStats(getInterviewStats(interviewHistory));
}

function refreshResearchIdeasUI() {
  renderResearchIdeas(researchDirections, refreshHistory);
}

function copyResearchRefreshPrompt() {
  const prompt = buildResearchRefreshPrompt({
    db,
    directions: researchDirections,
    studentProfile,
    interviewHistory,
  });
  copyText(prompt, "research-refresh-status", "Research prompt copied. Paste it into Codex or Claude.");
}

function copyInterviewRefreshPrompt() {
  const prompt = buildInterviewRefreshPrompt({
    prompts: getAllInterviewPrompts(),
    interviewHistory,
    studentProfile,
    db,
  });
  copyText(prompt, "interview-refresh-status", "Interview prompt copied. Paste it into Codex or Claude.");
}

function previewResearchRefresh() {
  try {
    const incoming = parseResearchRefresh(document.getElementById("research-refresh-input")?.value || "");
    pendingResearchImport = {
      incoming,
      preview: previewResearchImport(researchDirections, incoming),
    };
    renderRefreshPreview("research-refresh-preview", pendingResearchImport.preview, "research");
    document.getElementById("import-research-refresh-btn").disabled = !pendingResearchImport.preview.fresh.length;
    setRefreshStatus("research-refresh-status", `${incoming.length} directions parsed. Review before importing.`, "ok");
  } catch (error) {
    pendingResearchImport = null;
    document.getElementById("import-research-refresh-btn").disabled = true;
    setRefreshStatus("research-refresh-status", error.message, "err");
  }
}

function importResearchRefresh() {
  if (!pendingResearchImport?.preview.fresh.length) return;
  const source = document.getElementById("research-refresh-source")?.value || "external";
  const fresh = stampImportedItems(pendingResearchImport.preview.fresh, source, "direction");
  researchDirections = [...researchDirections, ...fresh];
  saveResearchDirections(researchDirections);
  refreshHistory = saveRefreshHistory({
    id: `research-${Date.now()}`,
    type: "research",
    source,
    importedAt: new Date().toISOString(),
    importedCount: fresh.length,
    duplicateCount: pendingResearchImport.preview.duplicates,
  });
  pendingResearchImport = null;
  document.getElementById("research-refresh-input").value = "";
  document.getElementById("import-research-refresh-btn").disabled = true;
  renderRefreshPreview("research-refresh-preview", null, "research");
  setRefreshStatus("research-refresh-status", `Imported ${fresh.length} new research direction${fresh.length === 1 ? "" : "s"}.`, "ok");
  refreshResearchIdeasUI();
}

function previewInterviewRefresh() {
  try {
    const validTracks = INTERVIEW_TRACKS.map((track) => track.id);
    const validRounds = INTERVIEW_ROUNDS.map((round) => round.id);
    const incoming = parseInterviewRefresh(
      document.getElementById("interview-refresh-input")?.value || "",
      validTracks,
      validRounds
    );
    pendingInterviewImport = {
      incoming,
      preview: previewInterviewImport(getAllInterviewPrompts(), incoming),
    };
    renderRefreshPreview("interview-refresh-preview", pendingInterviewImport.preview, "interview");
    document.getElementById("import-interview-refresh-btn").disabled = !pendingInterviewImport.preview.fresh.length;
    setRefreshStatus("interview-refresh-status", `${incoming.length} questions parsed. Review before importing.`, "ok");
  } catch (error) {
    pendingInterviewImport = null;
    document.getElementById("import-interview-refresh-btn").disabled = true;
    setRefreshStatus("interview-refresh-status", error.message, "err");
  }
}

function importInterviewRefresh() {
  if (!pendingInterviewImport?.preview.fresh.length) return;
  const source = document.getElementById("interview-refresh-source")?.value || "external";
  const fresh = stampImportedItems(pendingInterviewImport.preview.fresh, source, "prompt");
  const additions = [...loadInterviewPromptAdditions(), ...fresh];
  saveInterviewPromptAdditions(additions);
  refreshHistory = saveRefreshHistory({
    id: `interview-${Date.now()}`,
    type: "interview",
    source,
    importedAt: new Date().toISOString(),
    importedCount: fresh.length,
    duplicateCount: pendingInterviewImport.preview.duplicates,
  });
  pendingInterviewImport = null;
  document.getElementById("interview-refresh-input").value = "";
  document.getElementById("import-interview-refresh-btn").disabled = true;
  renderRefreshPreview("interview-refresh-preview", null, "interview");
  setRefreshStatus("interview-refresh-status", `Imported ${fresh.length} new interview question${fresh.length === 1 ? "" : "s"}.`, "ok");
  renderInterviewHome(interviewHistory, getInterviewStats(interviewHistory));
}

function copyText(text, statusId, successMessage) {
  const fallback = () => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  const copied = navigator.clipboard?.writeText
    ? navigator.clipboard.writeText(text).catch(fallback)
    : Promise.resolve(fallback());
  Promise.resolve(copied).then(() => setRefreshStatus(statusId, successMessage, "ok"));
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
    const existingTitles = db.papers
      .filter((p) => p.area === area.id)
      .map((p) => p.title);
    const existingAssignmentTitles = db.assignments
      .filter((a) => a.area === area.id)
      .map((a) => a.title);
    const completedAssignmentTitles = db.assignments
      .filter((a) => a.area === area.id && getStatus(a.title) === "done")
      .map((a) => a.title);
    const { papers, assignments, searchCount } = await runResearchAgent(
      existingTitles,
      (msg, type) => log(msg, type),
      {
        areaId: area.id,
        areaLabel: area.label,
        existingAssignmentTitles,
        completedAssignmentTitles,
        studentProfile,
      }
    );

    setProgress(80);

    const newPapers = dedupe(papers, db.papers);
    const newAssigns = dedupe(assignments, db.assignments);

    for (const a of newAssigns) {
      const guide = a.code_build_guide || a.code_harness;
      if (guide && String(guide).trim()) {
        saveCode(a.title, guide);
        a.code_build_guide = guide;
        delete a.code_harness;
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
  const confirmation = prompt("This clears the legacy Research Archive only. Type CLEAR ARCHIVE to continue.");
  if (confirmation !== "CLEAR ARCHIVE") return;
  db = clearDB();
  document.getElementById("log-container").innerHTML = "";
  log("Database cleared. Ready for a fresh run.", "ok");
  refreshUI();
}

// ─── API key ───────────────────────────────────────────────────────────────
function onSaveKey() {
  const key = document.getElementById("api-key-input").value.trim();
  const provider = getProvider();
  if (provider.keyPrefix && !key.startsWith(provider.keyPrefix)) {
    const ok = confirm(
      `Key doesn't start with "${provider.keyPrefix}" (expected for ${provider.label}). Save anyway?`
    );
    if (!ok) return;
  }
  saveApiKey(key);
  studentProfile = readStudentProfileForm();
  saveStudentProfile(studentProfile);
  toggleSettings(false);
  log(`${provider.label} settings saved.`, "ok");
}

function prefillApiKey() {
  const key = getApiKey();
  if (key) document.getElementById("api-key-input").value = key;
}

function prefillStudentProfile() {
  studentProfile = getStudentProfile();
  setFormValue("profile-level", studentProfile.level);
  setFormValue("profile-compute", studentProfile.compute);
  setFormValue("profile-hours", studentProfile.weeklyHours);
  setFormValue("profile-style", studentProfile.style);
  setFormValue("profile-focus", studentProfile.focus);
  setFormValue("profile-target-roles", studentProfile.targetRoles);
}

function readStudentProfileForm() {
  return {
    level: document.getElementById("profile-level")?.value || "beginner",
    compute: document.getElementById("profile-compute")?.value || "cpu",
    weeklyHours: document.getElementById("profile-hours")?.value || "4-6",
    style: document.getElementById("profile-style")?.value || "guided",
    focus: document.getElementById("profile-focus")?.value.trim() || "",
    targetRoles: document.getElementById("profile-target-roles")?.value.trim() || "Research Engineer, ML Engineer",
  };
}

function setFormValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
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

  lines.push("## Research directions", "");
  if (!researchDirections.length) {
    lines.push("No current research directions imported.", "");
  } else {
    for (const direction of researchDirections) {
      lines.push(`### ${direction.title}`);
      lines.push(`**Area:** ${direction.area || "Uncategorized"}  |  **Status:** ${direction.status || "candidate"}  |  **Confidence:** ${direction.confidence || "medium"}`);
      if (direction.summary) lines.push(direction.summary, "");
      if (direction.baseline) lines.push("**Baseline:** " + direction.baseline, "");
      if (direction.what_it_adds) lines.push("**What it adds:** " + direction.what_it_adds, "");
      if (direction.why_it_matters) lines.push("**Why it matters:** " + direction.why_it_matters, "");
      if (direction.first_experiment) lines.push("**First experiment:** " + direction.first_experiment, "");
      if (direction.next_step) lines.push("**Next step:** " + direction.next_step, "");
      if ((direction.open_questions || []).length) lines.push("**Open questions:**", ...direction.open_questions.map((item) => "- " + item), "");
      if ((direction.risks || []).length) lines.push("**Risks / prerequisites:**", ...direction.risks.map((item) => "- " + item), "");
      lines.push("---", "");
    }
  }

  lines.push("## Assignments", "");
  for (const a of db.assignments) {
    lines.push(`### ${a.title}`);
    lines.push(`**Area:** ${a.area}  |  **Difficulty:** ${a.difficulty}  |  **~${a.estimated_hours}h**`);
    lines.push(`**Paper:** ${a.paper_ref}`, "");
    lines.push(a.context, "");
    if (a.why_now) lines.push("**Why this next:** " + a.why_now, "");
    if (a.next_30_minutes) lines.push("**First 30 minutes:** " + a.next_30_minutes, "");
    if ((a.prerequisite_concepts || []).length) {
      lines.push("**Prerequisites:**");
      a.prerequisite_concepts.forEach((p) => lines.push("- " + p));
      lines.push("");
    }
    if ((a.concept_ladder || []).length) {
      lines.push("**Concept ladder:**");
      a.concept_ladder.forEach((c) => lines.push("- " + c));
      lines.push("");
    }
    lines.push("**Objective:** " + a.learning_objective, "");
    lines.push("**Tasks:**");
    (a.tasks || []).forEach((t) => lines.push("- " + t));
    if ((a.milestones || []).length) {
      lines.push("", "**Milestones:**");
      a.milestones.forEach((m) => {
        if (typeof m === "string") {
          lines.push("- " + m);
        } else {
          lines.push(`- ${m.title || "Milestone"}: ${m.goal || ""} ${m.checkpoint ? `(checkpoint: ${m.checkpoint})` : ""}`.trim());
        }
      });
    }
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

  lines.push("## Interview history", "");
  if (!interviewHistory.length) {
    lines.push("No interview attempts saved.", "");
  } else {
    for (const attempt of interviewHistory) {
      lines.push(`- **${attempt.title}** — ${attempt.total ? `${attempt.total}/100` : "Not scored"} · ${attempt.completedAt || "date unknown"}`);
      if (attempt.notes) lines.push(`  - Notes: ${attempt.notes}`);
    }
    lines.push("");
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
