/**
 * Build assignment brief as markdown and render to HTML for the code workspace.
 */

/** Escape only what would break markdown structure in free text. */
function safeText(text) {
  return String(text || "").replace(/\r\n/g, "\n");
}

function getMarkedParser() {
  if (typeof marked === "undefined") return null;
  if (typeof marked.parse === "function") return marked.parse.bind(marked);
  if (marked.marked && typeof marked.marked.parse === "function") {
    return marked.marked.parse.bind(marked.marked);
  }
  return null;
}

/**
 * Problem description only — shown in the code workspace left panel.
 * @param {Record<string, unknown>} a
 */
export function assignmentProblemMarkdown(a) {
  const lines = [];

  if (a.paper_ref) {
    lines.push(`*${safeText(a.paper_ref)}*`, "");
  }
  if (a.context) {
    lines.push(safeText(a.context), "");
  }
  if (a.learning_objective) {
    lines.push("## What you will build", "", safeText(a.learning_objective), "");
  }
  if (a.setup) {
    lines.push("## Setup", "", safeText(a.setup), "");
  }
  if ((a.tasks || []).length) {
    lines.push("## Tasks", "");
    a.tasks.forEach((t) => lines.push(`- ${safeText(t)}`));
    lines.push("");
  }
  if ((a.milestones || []).length) {
    lines.push("## Milestones", "");
    a.milestones.forEach((m, i) => {
      if (typeof m === "string") {
        lines.push(`${i + 1}. ${safeText(m)}`, "");
        return;
      }
      lines.push(`**${i + 1}. ${safeText(m.title || "Milestone")}**`, "");
      if (m.goal) lines.push(safeText(m.goal), "");
      if (m.checkpoint) {
        lines.push(`> Checkpoint: ${safeText(m.checkpoint)}`, "");
      }
    });
  }

  return lines.join("\n").trim() || "_No problem description for this assignment._";
}

/** Full brief (export / other uses). @param {Record<string, unknown>} a */
export function assignmentToMarkdown(a) {
  const lines = [];
  const area = String(a.area || "").replace(/_/g, " ");
  const diff = a.difficulty || "medium";
  const hours = a.estimated_hours || "?";

  lines.push(`# ${safeText(a.title)}`, "");
  lines.push(
    `| | |`,
    `|---|---|`,
    `| **Area** | ${safeText(area)} |`,
    `| **Difficulty** | ${safeText(diff)} · ~${hours}h |`,
    `| **Paper** | *${safeText(a.paper_ref || "")}* |`,
    "",
  );

  const body = assignmentProblemMarkdown(a);
  if (body && body !== "_No problem description for this assignment._") {
    lines.push(body);
  }
  if (a.why_now) {
    lines.push("## Why this next", "", safeText(a.why_now), "");
  }
  if (a.next_30_minutes) {
    lines.push("## First 30 minutes", "", safeText(a.next_30_minutes), "");
  }
  if ((a.prerequisite_concepts || []).length) {
    lines.push("## Prerequisites", "");
    a.prerequisite_concepts.forEach((p) => lines.push(`- ${safeText(p)}`));
    lines.push("");
  }
  if ((a.concept_ladder || []).length) {
    lines.push("## Concept ladder", "");
    a.concept_ladder.forEach((step, i) => lines.push(`${i + 1}. ${safeText(step)}`));
    lines.push("");
  }
  if ((a.key_pytorch_concepts || []).length) {
    lines.push("## PyTorch concepts", "");
    a.key_pytorch_concepts.forEach((c) => lines.push(`\`${safeText(c)}\``));
    lines.push("");
  }

  return lines.join("\n");
}

/** @param {string} md */
export function renderMarkdownHtml(md) {
  const parse = getMarkedParser();
  if (parse) {
    return parse(md, { breaks: true, gfm: true });
  }
  return fallbackMarkdownHtml(md);
}

function fallbackMarkdownHtml(md) {
  const blocks = md.split(/\n\n+/);
  return blocks
    .map((block) => {
      const t = block.trim();
      if (!t) return "";
      if (t.startsWith("# ")) return `<h1>${inline(t.slice(2))}</h1>`;
      if (t.startsWith("## ")) return `<h2>${inline(t.slice(3))}</h2>`;
      if (t.startsWith("### ")) return `<h3>${inline(t.slice(4))}</h3>`;
      if (t.startsWith("> ")) return `<blockquote><p>${inline(t.slice(2))}</p></blockquote>`;
      if (t.startsWith("- ") || t.startsWith("* ")) {
        const items = t.split("\n").map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ""))}</li>`);
        return `<ul>${items.join("")}</ul>`;
      }
      if (/^\d+\.\s/.test(t)) {
        const items = t.split("\n").map((l) => `<li>${inline(l.replace(/^\d+\.\s+/, ""))}</li>`);
        return `<ol>${items.join("")}</ol>`;
      }
      return `<p>${inline(t.replace(/\n/g, " "))}</p>`;
    })
    .join("");
}

function inline(s) {
  return htmlEsc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function htmlEsc(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
