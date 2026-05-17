/**
 * AGENT MODULE
 * ────────────
 * Handles all Anthropic API calls. Isolated here so Claude Code can:
 *   - Swap the model
 *   - Add new tools (e.g. arxiv search, github search)
 *   - Change the multi-turn conversation strategy
 *   - Add retry logic / rate limiting
 *
 * Claude Code instruction: if the user says "add arxiv search as a tool",
 * add the tool definition to TOOLS array and handle it in parseResponse().
 */

import { CONFIG } from "../config/config.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { getApiKey } from "./storage.js";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

// ─── Tool definitions ──────────────────────────────────────────────────────
const TOOLS = [];

if (CONFIG.ENABLE_WEB_SEARCH) {
  TOOLS.push({ type: "web_search_20250305", name: "web_search" });
}

// ─── Main research call ────────────────────────────────────────────────────
/**
 * Run one research cycle.
 * @param {string[]} existingTitles - paper titles already in DB (to avoid repeats)
 * @param {function} onLog - callback(message, type) for streaming log updates
 * @returns {{ papers: object[], assignments: object[], searchCount: number }}
 */
export async function runResearchAgent(
  existingTitles = [],
  onLog = () => {},
  { areaId, areaLabel, existingAssignmentTitles = [] } = {}
) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No API key set. Add it in Settings.");
  if (!areaId || !areaLabel) throw new Error("Pick a research area before running.");

  const userMessage = buildUserMessage(existingTitles, areaId, areaLabel, existingAssignmentTitles);

  onLog(`Researching: ${areaLabel} (1 assignment max)...`, "search");
  onLog("Calling Anthropic API with web search enabled...", "search");

  const body = {
    model: CONFIG.MODEL,
    max_tokens: CONFIG.MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  };

  if (TOOLS.length > 0) body.tools = TOOLS;

  const response = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-calls": "true",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return parseResponse(data, onLog);
}

// ─── Response parsing ──────────────────────────────────────────────────────
function parseResponse(data, onLog) {
  const searchBlocks = (data.content || []).filter((b) => b.type === "tool_use");
  if (searchBlocks.length > 0) {
    onLog(`Agent ran ${searchBlocks.length} web search(es) for latest papers`, "search");
  }

  const rawText = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const cleaned = rawText.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error(
      "Agent returned no parseable JSON. Raw response:\n" + rawText.slice(0, 500)
    );
  }

  const parsed = JSON.parse(cleaned.substring(start, end + 1));

  const papers = Array.isArray(parsed.papers) ? parsed.papers : [];
  let assignments = Array.isArray(parsed.assignments) ? parsed.assignments : [];
  if (assignments.length > 1) {
    onLog(`Agent returned ${assignments.length} assignments — keeping best (first) only`, "search");
    assignments = assignments.slice(0, 1);
  }

  const guide = assignments[0]?.code_build_guide || assignments[0]?.code_harness;
  if (guide && String(guide).trim().length > 100) {
    onLog("Build guide (comments) included — open Code on the card", "ok");
  } else if (assignments.length) {
    onLog("Warning: assignment missing code_build_guide", "err");
  }

  onLog(`Parsed ${papers.length} papers, ${assignments.length} assignment`, "ok");
  return { papers, assignments, searchCount: searchBlocks.length };
}

// ─── Message builder ───────────────────────────────────────────────────────
function buildUserMessage(existingTitles, areaId, areaLabel, existingAssignmentTitles) {
  const existingPapers =
    existingTitles.length > 0
      ? `Papers already in database — do NOT repeat:\n${existingTitles.join("\n")}`
      : "No papers in database yet.";

  const existingAssigns =
    existingAssignmentTitles.length > 0
      ? `Assignments already built — do NOT repeat these topics/titles:\n${existingAssignmentTitles.join("\n")}`
      : "No prior assignments in database.";

  return `
THIS RUN — FOCUS AREA: ${areaLabel}
area id (use in JSON "area" field): ${areaId}

Do deep, proper research ONLY in this area. Use web search. Find the best recent papers
and design exactly ONE assignment that teaches the maximum depth (one end-to-end
PyTorch project, not a survey). Include code_build_guide: comment-only steps (# lines),
no class skeletons or NotImplementedError stubs.

${existingPapers}

${existingAssigns}

Output: 4-6 papers (all area="${areaId}"), exactly 1 assignment (area="${areaId}").
Return ONLY valid JSON. No markdown fences. No preamble.
  `.trim();
}
