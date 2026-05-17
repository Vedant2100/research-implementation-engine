import { getBuildGuide } from "./build-guides.js";

function guideFromAssignment(assignment) {
  if (!assignment) return "";
  return assignment.code_build_guide || assignment.code_harness || "";
}

const CODE_KEY   = "research_engine_code";
const STATUS_KEY = "research_engine_status";

export function slugTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCode(title, assignment = null) {
  try {
    const key = slugTitle(title);
    const saved = (JSON.parse(localStorage.getItem(CODE_KEY) || "{}"))[key];
    if (saved !== undefined && String(saved).trim() !== "") return saved;
    const fromAssign = guideFromAssignment(assignment);
    if (fromAssign.trim()) return fromAssign;
    return getBuildGuide(title);
  } catch {
    const fromAssign = guideFromAssignment(assignment);
    if (fromAssign.trim()) return fromAssign;
    return getBuildGuide(title);
  }
}

export function saveCode(title, code) {
  try {
    const s = JSON.parse(localStorage.getItem(CODE_KEY) || "{}");
    s[slugTitle(title)] = code;
    localStorage.setItem(CODE_KEY, JSON.stringify(s));
  } catch {}
}

export function getStatus(title) {
  try {
    return (JSON.parse(localStorage.getItem(STATUS_KEY) || "{}"))[slugTitle(title)] || "todo";
  } catch {
    return "todo";
  }
}

export function setStatus(title, status) {
  try {
    const s = JSON.parse(localStorage.getItem(STATUS_KEY) || "{}");
    s[slugTitle(title)] = status;
    localStorage.setItem(STATUS_KEY, JSON.stringify(s));
  } catch {}
}

export function clearCode(title) {
  try {
    const s = JSON.parse(localStorage.getItem(CODE_KEY) || "{}");
    delete s[slugTitle(title)];
    localStorage.setItem(CODE_KEY, JSON.stringify(s));
  } catch {}
}
