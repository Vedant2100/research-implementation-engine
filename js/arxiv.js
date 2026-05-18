/**
 * Lightweight arXiv search.
 * Query the arXiv API (free, no key) and return recent papers as plain text
 * the LLM can read inside its user message. Replaces "live web search".
 */

const ARXIV_BASE = "https://export.arxiv.org/api/query";

const AREA_QUERIES = {
  agentic_security:
    'all:"prompt injection" OR all:"LLM jailbreak" OR all:"agent red-team" OR all:"indirect prompt injection"',
  self_improving:
    'all:"self-rewarding" OR all:"SPIN" OR all:"iterative DPO" OR all:"self-improvement language model"',
  llm:
    'all:"transformer architecture" OR all:"mixture of experts" OR all:"RoPE" OR all:"long context"',
  rl:
    'all:"GRPO" OR all:"DPO" OR all:"process reward model" OR all:"RLHF reasoning"',
  nlp: 'cat:cs.CL AND (all:"in-context learning" OR all:"chain of thought")',
};

export async function fetchArxivPapers(areaId, max = 8) {
  const query = AREA_QUERIES[areaId] || AREA_QUERIES.llm;
  const url =
    `${ARXIV_BASE}?search_query=${encodeURIComponent(query)}` +
    `&start=0&max_results=${max}&sortBy=submittedDate&sortOrder=descending`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`arXiv ${res.status}`);
  const xml = await res.text();
  return parseArxivAtom(xml);
}

function parseArxivAtom(xml) {
  const entries = xml.split(/<entry>/i).slice(1);
  const papers = [];
  for (const e of entries) {
    const block = e.split(/<\/entry>/i)[0];
    const title = textBetween(block, "title");
    const summary = textBetween(block, "summary");
    const published = textBetween(block, "published");
    const idLine = textBetween(block, "id");
    const authors = [...block.matchAll(/<name>([\s\S]*?)<\/name>/g)]
      .slice(0, 3)
      .map((m) => m[1].trim())
      .join(", ");
    if (title && summary) {
      papers.push({
        title: title.replace(/\s+/g, " ").trim(),
        authors,
        year: published ? Number(published.slice(0, 4)) : null,
        url: idLine.trim(),
        abstract: summary.replace(/\s+/g, " ").trim().slice(0, 600),
      });
    }
  }
  return papers;
}

function textBetween(s, tag) {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(s);
  return m ? m[1] : "";
}

export function formatArxivForPrompt(papers) {
  if (!papers.length) return "(no arXiv results)";
  return papers
    .map(
      (p, i) =>
        `[${i + 1}] ${p.title} (${p.year || "?"}, ${p.authors || "?"}) ${p.url}\n    ${p.abstract}`
    )
    .join("\n\n");
}
