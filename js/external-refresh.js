/**
 * EXTERNAL REFRESH WORKFLOW
 *
 * RIE does not call an LLM for this workflow. It creates a compact prompt for
 * Codex/Claude, then validates and imports the structured response locally.
 */

export const CURRENT_RESEARCH_INTERESTS = [
  "Agent governance and runtime policy enforcement",
  "Agent evaluation, reliability, observability, and red-teaming",
  "Memory governance and persistent context",
  "Post-training, RL, alignment, and preference optimization",
  "ML systems, training, inference, and efficiency",
  "Evolving deepfake detection",
];

const RESEARCH_SCHEMA = "research_refresh_v1";
const INTERVIEW_SCHEMA = "interview_refresh_v1";
const MAX_CONTEXT_ITEMS = 12;

export function buildResearchRefreshPrompt({
  db,
  directions = [],
  studentProfile = {},
  interviewHistory = [],
}) {
  const context = {
    purpose: "Find worthwhile research directions, not generic projects.",
    current_interests: CURRENT_RESEARCH_INTERESTS,
    student_profile: compactProfile(studentProfile),
    recent_research_directions: directions.slice(-MAX_CONTEXT_ITEMS).map(compactDirection),
    recent_archive_papers: (db?.papers || []).slice(-MAX_CONTEXT_ITEMS).map((paper) => ({
      title: paper.title,
      area: paper.area,
      core_idea: paper.core_idea,
      url: paper.url || paper.link || "",
    })),
    recent_archive_assignments: (db?.assignments || []).slice(-MAX_CONTEXT_ITEMS).map((assignment) => ({
      title: assignment.title,
      area: assignment.area,
      objective: assignment.learning_objective,
      status: assignment.status || "unknown",
    })),
    interview_weaknesses: summarizeInterviewWeaknesses(interviewHistory),
  };

  return `You are helping me refresh a personal research-direction map for a Research Engineer / ML Engineer career path.

Use web research. Prefer primary sources: recent papers, official lab/blog posts, benchmarks, and technical reports. Cite every important claim with a direct URL and publication year. Do not invent papers or claim novelty without evidence.

My goal is to identify a small number of serious directions worth investigating next. Avoid generic startup ideas, broad buzzwords, and assignments that are only "build a chatbot". Distinguish established work from genuinely open questions. Respect the existing work below: do not repeat a direction merely because it has a different title.

Return JSON only. No Markdown fences and no commentary outside the JSON.

Required JSON shape:
{
  "schema_version": "${RESEARCH_SCHEMA}",
  "directions": [
    {
      "title": "Short, specific direction title",
      "area": "One current-interest area",
      "summary": "What the direction is",
      "baseline": "What is already known",
      "what_it_adds": "The concrete gap or angle",
      "why_it_matters": "Why it matters scientifically or for my target work",
      "prior_work": [{"title": "Paper or report", "year": 2025, "url": "https://...", "relevance": "Why it matters"}],
      "open_questions": ["Question 1"],
      "risks": ["Risk or prerequisite"],
      "first_experiment": "A feasible first experiment with a measurable outcome",
      "next_step": "The next action after the experiment",
      "confidence": "high|medium|low"
    }
  ]
}

Produce 3 to 5 directions. Rank them implicitly by order. Keep each direction concrete enough that I could investigate it this week, but do not generate a giant implementation assignment.

Current state:
${JSON.stringify(context, null, 2)}`;
}

export function buildInterviewRefreshPrompt({
  prompts = [],
  interviewHistory = [],
  studentProfile = {},
  db,
}) {
  const context = {
    target: `${studentProfile.targetRoles || "Research Engineer, ML Engineer"}; frontier AI / agent governance relevant`,
    student_profile: compactProfile(studentProfile),
    current_prompt_catalog: prompts.slice(-30).map((prompt) => ({
      title: prompt.title,
      track: prompt.track,
      round: prompt.round,
      source: prompt.source || "static",
    })),
    recent_attempts: interviewHistory.slice(0, 20).map((attempt) => ({
      title: attempt.title,
      track: attempt.track,
      round: attempt.round,
      total: attempt.total,
      scores: attempt.scores,
      notes: attempt.notes,
    })),
    existing_research_practice: (db?.assignments || []).slice(-MAX_CONTEXT_ITEMS).map((assignment) => ({
      title: assignment.title,
      area: assignment.area,
      objective: assignment.learning_objective,
    })),
  };

  return `You are helping me expand an offline interview-practice catalog for Research Engineer and ML Engineer interviews.

Use web research to check current interview expectations. Use Silvia Sapora's ML interview guide and Chip Huyen's ML interview and ML systems-design material as taxonomies, but write original questions and rubrics. Prefer primary technical sources when a question depends on a paper or system. Cite the sources used in the "source_links" field.

Find coverage gaps rather than producing duplicates. Prioritize coding/algorithms, ML fundamentals, ML implementation, PyTorch, debugging/performance, ML systems design, research/paper defense, agent governance/evaluations, behavioral/project deep dives, and research-engineering practice.

Return JSON only. No Markdown fences and no commentary outside the JSON.

Required JSON shape:
{
  "schema_version": "${INTERVIEW_SCHEMA}",
  "prompts": [
    {
      "title": "Question title",
      "track": "research_engineer|ml_systems|safety_evals|applied_agents",
      "round": "coding_algorithms|ml_fundamentals|ml_coding|pytorch_implementation|debugging|systems|research_engineering|paper_defense|agent_governance|behavioral",
      "context": "Interview scenario",
      "prompt": "What the candidate must answer or implement",
      "deliverables": ["Concrete evidence expected"],
      "followups": ["Interviewer follow-up"],
      "rubric": {
        "correctness": "What correct means",
        "reasoning": "What strong reasoning means",
        "testing": "What testing or evidence is expected",
        "performance": "What performance/tradeoff awareness means",
        "communication": "What clear communication means"
      },
      "competencies": ["implementation", "systems"],
      "source_links": ["https://..."]
    }
  ]
}

Return 8 to 12 prompts, prioritizing gaps in the current catalog. Do not copy answer banks verbatim. Keep each question practical and suitable for a timed session.

Current state:
${JSON.stringify(context, null, 2)}`;
}

export function parseResearchRefresh(text) {
  const parsed = parseJsonDocument(text);
  const rows = Array.isArray(parsed) ? parsed : parsed.directions;
  if (!Array.isArray(rows)) throw new Error("Expected a directions array in the refresh JSON.");
  const directions = rows.map(normalizeDirection).filter(Boolean);
  if (!directions.length) throw new Error("The refresh contained no usable research directions.");
  return directions.slice(0, 12);
}

export function parseInterviewRefresh(text, validTracks, validRounds) {
  const parsed = parseJsonDocument(text);
  const rows = Array.isArray(parsed) ? parsed : parsed.prompts;
  if (!Array.isArray(rows)) throw new Error("Expected a prompts array in the refresh JSON.");
  const prompts = rows
    .map((row) => normalizePrompt(row, validTracks, validRounds))
    .filter(Boolean);
  if (!prompts.length) throw new Error("The refresh contained no usable interview prompts.");
  return prompts.slice(0, 20);
}

export function previewResearchImport(existing, incoming) {
  const seen = new Set(existing.map((item) => canonical(item.title)));
  const fresh = incoming.filter((item) => !seen.has(canonical(item.title)));
  return { fresh, duplicates: incoming.length - fresh.length, total: incoming.length };
}

export function previewInterviewImport(existing, incoming) {
  const seen = new Set(existing.map((item) => promptKey(item)));
  const fresh = incoming.filter((item) => !seen.has(promptKey(item)));
  return { fresh, duplicates: incoming.length - fresh.length, total: incoming.length };
}

export function stampImportedItems(items, source, prefix) {
  const now = new Date().toISOString();
  return items.map((item, index) => ({
    ...item,
    id: item.id || `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    source: source || "external",
    importedAt: now,
  }));
}

function normalizeDirection(row) {
  if (!row || !String(row.title || row.direction || "").trim()) return null;
  return {
    id: String(row.id || "").trim(),
    title: String(row.title || row.direction).trim(),
    area: String(row.area || "Uncategorized").trim(),
    summary: String(row.summary || "").trim(),
    baseline: String(row.baseline || "").trim(),
    what_it_adds: String(row.what_it_adds || row.gap || "").trim(),
    why_it_matters: String(row.why_it_matters || "").trim(),
    prior_work: normalizeSources(row.prior_work || row.sources),
    open_questions: normalizeList(row.open_questions),
    risks: normalizeList(row.risks || row.prerequisites),
    first_experiment: String(row.first_experiment || "").trim(),
    next_step: String(row.next_step || "").trim(),
    confidence: ["high", "medium", "low"].includes(String(row.confidence).toLowerCase())
      ? String(row.confidence).toLowerCase()
      : "medium",
    status: String(row.status || "candidate").trim(),
  };
}

function normalizePrompt(row, validTracks, validRounds) {
  if (!row || !String(row.title || "").trim()) return null;
  const tracks = new Set(validTracks || []);
  const rounds = new Set(validRounds || []);
  const track = tracks.has(row.track) ? row.track : "research_engineer";
  const round = rounds.has(row.round) ? row.round : "ml_coding";
  const rubric = row.rubric && typeof row.rubric === "object" ? row.rubric : {};
  return {
    id: String(row.id || "").trim(),
    track,
    round,
    title: String(row.title).trim(),
    context: String(row.context || "").trim(),
    prompt: String(row.prompt || row.question || "").trim(),
    deliverables: normalizeList(row.deliverables),
    followups: normalizeList(row.followups || row.follow_ups),
    rubric: {
      correctness: String(rubric.correctness || "Defines a technically correct answer."),
      reasoning: String(rubric.reasoning || "Explains assumptions and tradeoffs."),
      testing: String(rubric.testing || "Names tests, measurements, or evidence."),
      performance: String(rubric.performance || "Recognizes relevant scale and efficiency constraints."),
      communication: String(rubric.communication || "Communicates clearly and structures the answer."),
    },
    competencies: normalizeList(row.competencies),
    source_links: normalizeList(row.source_links || row.sources),
    source: "external",
  };
}

function normalizeList(value) {
  if (!Array.isArray(value)) return value ? [String(value)] : [];
  return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12);
}

function normalizeSources(value) {
  if (!Array.isArray(value)) return [];
  return value.map((source) => {
    if (typeof source === "string") return { title: source, url: "", year: "", relevance: "" };
    return {
      title: String(source.title || source.name || "Source").trim(),
      url: String(source.url || source.link || "").trim(),
      year: source.year || "",
      relevance: String(source.relevance || source.why_relevant || "").trim(),
    };
  }).filter((source) => source.title || source.url).slice(0, 12);
}

function parseJsonDocument(text) {
  const raw = String(text || "").replace(/```json|```/gi, "").trim();
  if (!raw) throw new Error("Paste the JSON response from Codex or Claude first.");
  try { return JSON.parse(raw); } catch {}

  const start = raw.search(/[\[{]/);
  if (start === -1) throw new Error("Could not find a JSON object or array in the pasted response.");
  const end = findJsonEnd(raw, start);
  if (end === -1) throw new Error("The pasted JSON appears incomplete.");
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch (e) {
    throw new Error(`Could not parse the pasted JSON: ${e.message}`);
  }
}

function findJsonEnd(text, start) {
  const stack = [];
  let quoted = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === "{" || char === "[") stack.push(char);
    if (char === "}" || char === "]") {
      const expected = char === "}" ? "{" : "[";
      if (stack.pop() !== expected) return -1;
      if (!stack.length) return i;
    }
  }
  return -1;
}

function compactProfile(profile) {
  return {
    level: profile.level || "beginner",
    compute: profile.compute || "cpu",
    weekly_hours: profile.weeklyHours || "4-6",
    style: profile.style || "guided",
    current_focus: profile.focus || "",
    target_roles: profile.targetRoles || "Research Engineer, ML Engineer",
  };
}

function compactDirection(direction) {
  return {
    title: direction.title,
    area: direction.area,
    status: direction.status,
    first_experiment: direction.first_experiment,
    next_step: direction.next_step,
  };
}

function summarizeInterviewWeaknesses(history) {
  const totals = {};
  for (const attempt of history.slice(0, 20)) {
    for (const [key, value] of Object.entries(attempt.scores || {})) {
      totals[key] ||= { sum: 0, count: 0 };
      totals[key].sum += Number(value) || 0;
      totals[key].count++;
    }
  }
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => [
    key,
    Math.round((value.sum / value.count) * 10) / 10,
  ]));
}

function canonical(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function promptKey(prompt) {
  return `${prompt.track || ""}|${prompt.round || ""}|${canonical(prompt.title)}`;
}
