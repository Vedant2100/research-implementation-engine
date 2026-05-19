/**
 * Build assignment brief as markdown and render to HTML for the code workspace.
 */

function mdEscape(text) {
  return String(text || "").replace(/([\\`*_{}[\]()#+.!|>-])/g, "\\$1");
}

function htmlEsc(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {Record<string, unknown>} a */
export function assignmentToMarkdown(a) {
  const lines = [];
  const area = String(a.area || "").replace(/_/g, " ");
  const diff = a.difficulty || "medium";
  const hours = a.estimated_hours || "?";

  lines.push(`# ${mdEscape(a.title)}`, "");
  lines.push(
    `| | |`,
    `|---|---|`,
    `| **Area** | ${mdEscape(area)} |`,
    `| **Difficulty** | ${mdEscape(diff)} · ~${hours}h |`,
    `| **Paper** | *${mdEscape(a.paper_ref || "")}* |`,
    "",
  );

  if (a.context) {
    lines.push("## Overview", "", mdEscape(a.context), "");
  }
  if (a.why_now) {
    lines.push("## Why this next", "", mdEscape(a.why_now), "");
  }
  if (a.next_30_minutes) {
    lines.push("## First 30 minutes", "", mdEscape(a.next_30_minutes), "");
  }
  if ((a.prerequisite_concepts || []).length) {
    lines.push("## Prerequisites", "");
    a.prerequisite_concepts.forEach((p) => lines.push(`- ${mdEscape(p)}`));
    lines.push("");
  }
  if ((a.concept_ladder || []).length) {
    lines.push("## Concept ladder", "");
    a.concept_ladder.forEach((step, i) => lines.push(`${i + 1}. ${mdEscape(step)}`));
    lines.push("");
  }
  if (a.learning_objective) {
    lines.push("## Objective", "", mdEscape(a.learning_objective), "");
  }
  if (a.setup) {
    lines.push("## Setup", "", mdEscape(a.setup), "");
  }
  if ((a.tasks || []).length) {
    lines.push("## Tasks", "");
    a.tasks.forEach((t) => lines.push(`- ${mdEscape(t)}`));
    lines.push("");
  }
  if ((a.milestones || []).length) {
    lines.push("## Milestones", "");
    a.milestones.forEach((m, i) => {
      if (typeof m === "string") {
        lines.push(`### ${i + 1}. ${mdEscape(m)}`, "");
        return;
      }
      lines.push(`### ${i + 1}. ${mdEscape(m.title || "Milestone")}`, "");
      if (m.goal) lines.push(mdEscape(m.goal), "");
      if (m.checkpoint) lines.push(`> **Checkpoint:** ${mdEscape(m.checkpoint)}`, "");
    });
  }
  if ((a.key_pytorch_concepts || []).length) {
    lines.push("## PyTorch concepts", "");
    a.key_pytorch_concepts.forEach((c) => lines.push(`\`${mdEscape(c)}\``));
    lines.push("");
  }

  return lines.join("\n");
}

/** @param {string} md */
export function renderMarkdownHtml(md) {
  if (typeof marked !== "undefined" && marked.parse) {
    return marked.parse(md, { breaks: true, gfm: true });
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
      if (t.startsWith("|")) {
        const rows = t.split("\n").filter((r) => r.trim() && !/^\|[-\s|]+\|$/.test(r.trim()));
        const trs = rows.map((row) => {
          const cells = row.split("|").filter((c, i, arr) => i > 0 && i < arr.length - 1);
          const tag = rows.indexOf(row) === 0 ? "th" : "td";
          return `<tr>${cells.map((c) => `<${tag}>${inline(c.trim())}</${tag}>`).join("")}</tr>`;
        });
        return `<table class="md-table"><tbody>${trs.join("")}</tbody></table>`;
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
