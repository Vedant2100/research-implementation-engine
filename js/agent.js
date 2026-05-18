/**
 * AGENT MODULE
 * ────────────
 * Sends one research request to the configured LLM provider.
 *   - openai     → POST {baseUrl}/chat/completions  (NVIDIA NIM, DeepSeek, OpenAI, etc.)
 *   - anthropic  → POST {baseUrl}/messages         (Claude)
 *
 * Implements an OpenAI-style tool-use loop so the model can decide
 * to call `search_arxiv` for fresh papers when prior knowledge is
 * insufficient (e.g. after the user has done several assignments).
 */

import { CONFIG, getProvider } from "../config/config.js";
import { SYSTEM_PROMPT } from "./prompt.js";
import { getApiKey } from "./storage.js";
import { searchArxivByQuery, formatArxivForPrompt } from "./arxiv.js";

const ARXIV_TOOL = {
  type: "function",
  function: {
    name: "search_arxiv",
    description:
      "Search arXiv for recent papers. Use this when you need NEW papers beyond canonical " +
      "ones in your training (e.g. when the user has already covered several assignments " +
      "in this area, or when you need papers from the last 6 months).",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "arXiv query, e.g. all:\"flash attention\" OR all:\"MoE routing\". Be specific.",
        },
        max_results: {
          type: "integer",
          description: "1-10. Default 6.",
          minimum: 1,
          maximum: 10,
        },
      },
      required: ["query"],
    },
  },
};

const TOOLS = [ARXIV_TOOL];
const MAX_TOOL_HOPS = 3;

export async function runResearchAgent(
  existingTitles = [],
  onLog = () => {},
  {
    areaId,
    areaLabel,
    existingAssignmentTitles = [],
    completedAssignmentTitles = [],
    studentProfile = {},
  } = {}
) {
  const apiKey = getApiKey();
  const usingProxy = !!CONFIG.PROXY_URL;
  if (!apiKey && !usingProxy) {
    throw new Error("No API key set. Add it in Settings (or start the dev proxy).");
  }
  if (!areaId || !areaLabel) throw new Error("Pick a research area before running.");

  const provider = getProvider();
  const userMessage = buildUserMessage(
    existingTitles,
    areaId,
    areaLabel,
    existingAssignmentTitles,
    completedAssignmentTitles,
    studentProfile
  );

  onLog(
    `Researching ${areaLabel} via ${provider.label}. Model decides if it needs arXiv search.`,
    "search"
  );

  const { rawText, searchCount } =
    provider.format === "anthropic"
      ? await callAnthropic(provider, apiKey, userMessage, onLog)
      : await callOpenAICompatibleWithTools(provider, apiKey, userMessage, onLog);

  return parseResponse(rawText, searchCount, onLog);
}

async function callOpenAICompatibleWithTools(provider, apiKey, userMessage, onLog) {
  const url = CONFIG.PROXY_URL
    ? `${CONFIG.PROXY_URL.replace(/\/$/, "")}/chat/completions`
    : `${provider.baseUrl}/chat/completions`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  let toolCallsUsed = 0;
  let lastUsage = null;

  for (let hop = 0; hop <= MAX_TOOL_HOPS; hop++) {
    const body = {
      model: provider.model,
      max_tokens: CONFIG.MAX_TOKENS,
      temperature: 0.5,
      top_p: 0.95,
      messages,
      tools: TOOLS,
      tool_choice: hop >= MAX_TOOL_HOPS ? "none" : "auto",
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || err?.detail || err?.message || `API error ${response.status}`;
      throw new Error(`${provider.label}: ${msg}`);
    }

    const data = await response.json();
    lastUsage = data.usage || lastUsage;
    const choice = data.choices?.[0]?.message;
    if (!choice) throw new Error("No message returned from provider.");

    const toolCalls = choice.tool_calls || [];

    if (toolCalls.length === 0) {
      if (lastUsage?.total_tokens) onLog(`Tokens used: ${lastUsage.total_tokens}`, "ok");
      return { rawText: choice.content || "", searchCount: toolCallsUsed };
    }

    messages.push({
      role: "assistant",
      content: choice.content || "",
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      const name = call.function?.name;
      let args = {};
      try {
        args = JSON.parse(call.function?.arguments || "{}");
      } catch {}

      let result = "";
      if (name === "search_arxiv") {
        toolCallsUsed++;
        const q = args.query || "";
        const max = Math.min(10, Math.max(1, args.max_results || 6));
        onLog(`Agent decided to search arXiv: "${q.slice(0, 80)}"`, "search");
        try {
          const papers = await searchArxivByQuery(q, max);
          result = formatArxivForPrompt(papers);
          onLog(`arXiv returned ${papers.length} papers`, "ok");
        } catch (e) {
          result = `arXiv error: ${e.message}`;
          onLog(`arXiv error: ${e.message}`, "err");
        }
      } else {
        result = `Unknown tool: ${name}`;
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result.slice(0, 6000),
      });
    }
  }

  throw new Error("Tool-call loop exceeded MAX_TOOL_HOPS without final answer.");
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
    onLog("Runnable assignment file included — open Code on the card", "ok");
  } else if (assignments.length) {
    onLog("Warning: assignment missing code_build_guide", "err");
  }

  onLog(`Parsed ${papers.length} papers, ${assignments.length} assignment`, "ok");
  return { papers, assignments, searchCount };
}

function buildUserMessage(
  existingTitles,
  areaId,
  areaLabel,
  existingAssignmentTitles,
  completedAssignmentTitles,
  studentProfile
) {
  const completedCount = completedAssignmentTitles.length;
  const profile = {
    level: "beginner",
    compute: "cpu",
    weeklyHours: "4-6",
    style: "guided",
    ...studentProfile,
  };
  const progressNote =
    completedCount === 0
      ? "STAGE: foundations. The student has completed 0 assignments in this area. Teach prerequisites first. Prefer a canonical paper and a tiny reproducible project. Do not search unless the area truly has no canonical beginner anchor."
      : completedCount < 3
      ? `STAGE: scaffolded builder. The student has completed ${completedCount} assignment(s) in this area. Introduce one paper idea at a time, with clear checkpoints. Search is optional.`
      : `STAGE: paper reproduction. The student has completed ${completedCount} assignment(s) in this area. You SHOULD call search_arxiv at least once to find a recent/novel paper and avoid covered concepts.`;

  const existingPapers =
    existingTitles.length > 0
      ? `Papers already in database — do NOT repeat:\n${existingTitles.join("\n")}`
      : "No papers in database yet.";

  const existingAssigns =
    existingAssignmentTitles.length > 0
      ? `Assignments already built — do NOT repeat these topics:\n${existingAssignmentTitles.join("\n")}`
      : "No prior assignments in database.";

  const completedAssigns =
    completedAssignmentTitles.length > 0
      ? `Assignments the student marked DONE in this area:\n${completedAssignmentTitles.join("\n")}`
      : "No assignments marked done in this area yet.";

  return `
THIS RUN — FOCUS AREA: ${areaLabel}
area id (use in JSON "area" field): ${areaId}

${progressNote}

STUDENT PROFILE:
- level: ${profile.level}
- compute: ${profile.compute}
- weekly hours: ${profile.weeklyHours}
- teaching style: ${profile.style}

Treat this as a naive student unless profile says otherwise. If profile.level is beginner,
make the first checkpoint doable in 30 minutes, include prerequisite concepts, and avoid
large-scale training. Use tiny synthetic or toy datasets when needed, but still connect the
work to a real paper.

You have one tool available: search_arxiv(query, max_results). Use it when knowledge
of recent (post-2024) papers in this area would noticeably improve the assignment.
Otherwise skip it and answer directly — tool calls cost latency.

Design exactly ONE end-to-end PyTorch assignment that maximizes teaching value for
the student's current stage. Show which paper you picked and why over runner-ups.
Include code_build_guide: one runnable Python file with TODO comment zones and
executable checks/tests. Do not provide completed solution implementations.

${existingPapers}

${existingAssigns}

${completedAssigns}

Output: 4-6 papers (all area="${areaId}"), exactly 1 assignment (area="${areaId}").
Return ONLY valid JSON. No markdown fences. No preamble. No <think> tags.
  `.trim();
}
