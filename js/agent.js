/**
 * AGENT MODULE
 * ────────────
 * Sends one research request to the configured LLM provider.
 * Supports two response formats:
 *   - openai     → POST {baseUrl}/chat/completions (NVIDIA NIM, DeepSeek, OpenAI, etc.)
 *   - anthropic  → POST {baseUrl}/messages  (Claude)
 */

import { CONFIG, getProvider } from "../config/config.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { getApiKey } from "./storage.js";
import { fetchArxivPapers, formatArxivForPrompt } from "./arxiv.js";

export async function runResearchAgent(
  existingTitles = [],
  onLog = () => {},
  { areaId, areaLabel, existingAssignmentTitles = [] } = {}
) {
  const apiKey = getApiKey();
  const usingProxy = !!CONFIG.PROXY_URL;
  if (!apiKey && !usingProxy) {
    throw new Error("No API key set. Add it in Settings (or start the dev proxy).");
  }
  if (!areaId || !areaLabel) throw new Error("Pick a research area before running.");

  const provider = getProvider();

  let arxivBlock = "";
  if (CONFIG.ENABLE_ARXIV) {
    try {
      onLog(`Fetching recent arXiv papers for ${areaLabel}...`, "search");
      const papers = await fetchArxivPapers(areaId, 8);
      arxivBlock = formatArxivForPrompt(papers);
      onLog(`Got ${papers.length} arXiv abstracts (passed to model)`, "ok");
    } catch (e) {
      onLog(`arXiv fetch failed: ${e.message} (continuing without it)`, "err");
    }
  }

  const userMessage = buildUserMessage(
    existingTitles,
    areaId,
    areaLabel,
    existingAssignmentTitles,
    arxivBlock
  );

  onLog(`Researching: ${areaLabel} via ${provider.label} (${provider.model})...`, "search");

  const { rawText, searchCount } =
    provider.format === "anthropic"
      ? await callAnthropic(provider, apiKey, userMessage, onLog)
      : await callOpenAICompatible(provider, apiKey, userMessage, onLog);

  return parseResponse(rawText, searchCount, onLog);
}

async function callOpenAICompatible(provider, apiKey, userMessage, onLog) {
  const body = {
    model: provider.model,
    max_tokens: CONFIG.MAX_TOKENS,
    temperature: 0.6,
    top_p: 0.95,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  };

  const url = CONFIG.PROXY_URL
    ? `${CONFIG.PROXY_URL.replace(/\/$/, "")}/chat/completions`
    : `${provider.baseUrl}/chat/completions`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || err?.detail || err?.message || `API error ${response.status}`;
    if (response.status === 0 || response.status === 401) {
      throw new Error(`${provider.label}: ${msg}. Check API key.`);
    }
    throw new Error(`${provider.label}: ${msg}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0]?.message;
  if (!choice) throw new Error("No message returned from provider.");

  const thinking = choice.reasoning_content || "";
  const text = choice.content || "";

  if (thinking) onLog(`Model thought for ~${thinking.length} chars`, "search");
  if (data.usage?.total_tokens) onLog(`Tokens used: ${data.usage.total_tokens}`, "ok");

  return { rawText: text, searchCount: 0 };
}

async function callAnthropic(provider, apiKey, userMessage, onLog) {
  const tools = CONFIG.ENABLE_WEB_SEARCH
    ? [{ type: "web_search_20250305", name: "web_search" }]
    : [];

  const body = {
    model: provider.model,
    max_tokens: CONFIG.MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  };
  if (tools.length) body.tools = tools;

  const response = await fetch(`${provider.baseUrl}/messages`, {
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
    throw new Error(err?.error?.message || `Anthropic API error ${response.status}`);
  }

  const data = await response.json();
  const searchBlocks = (data.content || []).filter((b) => b.type === "tool_use");
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  if (searchBlocks.length > 0) {
    onLog(`Anthropic ran ${searchBlocks.length} web search(es)`, "search");
  }
  return { rawText: text, searchCount: searchBlocks.length };
}

function parseResponse(rawText, searchCount, onLog) {
  let cleaned = String(rawText || "");
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned.replace(/```json|```/g, "").trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(
      "Agent returned no parseable JSON. Raw response:\n" + cleaned.slice(0, 500)
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned.substring(start, end + 1));
  } catch (e) {
    throw new Error("JSON parse failed: " + e.message + "\n" + cleaned.slice(0, 400));
  }

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
  return { papers, assignments, searchCount };
}

function buildUserMessage(existingTitles, areaId, areaLabel, existingAssignmentTitles, arxivBlock) {
  const existingPapers =
    existingTitles.length > 0
      ? `Papers already in database — do NOT repeat:\n${existingTitles.join("\n")}`
      : "No papers in database yet.";

  const existingAssigns =
    existingAssignmentTitles.length > 0
      ? `Assignments already built — do NOT repeat these topics/titles:\n${existingAssignmentTitles.join("\n")}`
      : "No prior assignments in database.";

  const arxivSection = arxivBlock
    ? `\nRECENT ARXIV PAPERS FOR THIS AREA (fresh search, prefer these for your selection):\n${arxivBlock}\n`
    : "";

  return `
THIS RUN — FOCUS AREA: ${areaLabel}
area id (use in JSON "area" field): ${areaId}

Pick the best papers from the arXiv list below (or use one you know is canonical for this
area if the list misses it). Design exactly ONE end-to-end PyTorch assignment that
teaches the maximum depth — not a survey. Include code_build_guide: comment-only
steps (# lines), no class skeletons or NotImplementedError stubs.
${arxivSection}
${existingPapers}

${existingAssigns}

Output: 4-6 papers (all area="${areaId}"), exactly 1 assignment (area="${areaId}").
Return ONLY valid JSON. No markdown fences. No preamble. No <think> tags in output.
  `.trim();
}
