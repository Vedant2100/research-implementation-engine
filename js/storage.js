/**
 * STORAGE MODULE
 * ──────────────
 * All read/write to localStorage lives here.
 * Claude Code instruction: to swap to IndexedDB, SQLite (via sql.js), or a
 * backend API, replace only this file — the rest of the app doesn't change.
 */

import { CONFIG } from "../config/config.js";
import { SEED_VERSION, SEED_PAPERS, SEED_ASSIGNMENTS } from "./seed.js";

const KEY = CONFIG.STORAGE_KEY;
const SEED_FLAG = `research_engine_seed_${SEED_VERSION}`;
const PROFILE_KEY = "research_engine_student_profile";
const CODE_KEY = "research_engine_code";
const STATUS_KEY = "research_engine_status";
const STARTER_PRUNE_FLAG = "research_engine_pruned_starters_tiny_attention_v1";

const KEEP_STARTER_TITLE = "Tiny attention by hand";
const OLD_STARTER_TITLES = [
  "PyTorch training loop from zero",
  "Q-learning before RLHF",
  "RoPE causal self-attention on a char-level LM",
  "Grouped-query attention block (GQA) from scratch",
  "GRPO on a toy math-word policy (no critic)",
  "DPO alignment on pairwise preferences (tiny LM)",
];
const OLD_STARTER_PAPERS = [
  "PyTorch: An Imperative Style, High-Performance Deep Learning Library",
  "Human-level control through deep reinforcement learning",
  "RoFormer: Enhanced Transformer with Rotary Position Embedding",
  "GQA: Training Generalized Multi-Query Attention Models from Multi-Head Checkpoints",
  "DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models",
  "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
];

const DEFAULT_PROFILE = {
  level: "beginner",
  compute: "cpu",
  weeklyHours: "4-6",
  style: "guided",
};

export function loadDB() {
  try {
    const raw = localStorage.getItem(KEY);
    const db = raw ? JSON.parse(raw) : freshDB();
    db.areas = new Set(db.areas || []);
    return applySeedIfNeeded(db);
  } catch (e) {
    console.warn("Storage load failed, starting fresh:", e);
    return applySeedIfNeeded(freshDB());
  }
}

function applySeedIfNeeded(db) {
  db = pruneOldStarterContent(db);
  if (localStorage.getItem(SEED_FLAG)) return db;

  const titles = new Set([
    ...db.papers.map((p) => p.title?.toLowerCase()),
    ...db.assignments.map((a) => a.title?.toLowerCase()),
  ]);

  let added = 0;
  for (const p of SEED_PAPERS) {
    if (!titles.has(p.title.toLowerCase())) {
      db.papers.push(p);
      if (p.area) db.areas.add(p.area);
      titles.add(p.title.toLowerCase());
      added++;
    }
  }
  for (const a of SEED_ASSIGNMENTS) {
    if (!titles.has(a.title.toLowerCase())) {
      db.assignments.push(a);
      if (a.area) db.areas.add(a.area);
      titles.add(a.title.toLowerCase());
      added++;
    }
  }

  if (added > 0) {
    saveDB(db);
    sessionStorage.setItem("research_engine_seed_notice", String(added));
  }
  localStorage.setItem(SEED_FLAG, "1");
  return db;
}

function pruneOldStarterContent(db) {
  if (localStorage.getItem(STARTER_PRUNE_FLAG)) return db;

  const oldAssignmentTitles = new Set(OLD_STARTER_TITLES.map((title) => title.toLowerCase()));
  const oldPaperTitles = new Set(OLD_STARTER_PAPERS.map((title) => title.toLowerCase()));
  const beforeAssignments = db.assignments.length;
  const beforePapers = db.papers.length;

  db.assignments = db.assignments.filter((a) => !oldAssignmentTitles.has(a.title?.toLowerCase()));
  db.papers = db.papers.filter((p) => !oldPaperTitles.has(p.title?.toLowerCase()));
  refreshKeptStarter(db);
  db.areas = new Set([...db.papers, ...db.assignments].map((item) => item.area).filter(Boolean));

  pruneSavedMaps([KEEP_STARTER_TITLE, ...OLD_STARTER_TITLES]);

  localStorage.setItem(STARTER_PRUNE_FLAG, "1");
  if (db.assignments.length !== beforeAssignments || db.papers.length !== beforePapers) {
    saveDB(db);
  }
  return db;
}

function refreshKeptStarter(db) {
  const seedPaper = SEED_PAPERS.find((p) => p.title === "Attention Is All You Need");
  const seedAssignment = SEED_ASSIGNMENTS.find((a) => a.title === KEEP_STARTER_TITLE);
  if (seedPaper) {
    const idx = db.papers.findIndex((p) => p.title === seedPaper.title);
    if (idx === -1) db.papers.push(seedPaper);
    else db.papers[idx] = seedPaper;
  }
  if (seedAssignment) {
    const idx = db.assignments.findIndex((a) => a.title === seedAssignment.title);
    if (idx === -1) db.assignments.push(seedAssignment);
    else db.assignments[idx] = seedAssignment;
  }
}

function pruneSavedMaps(titles) {
  for (const keyName of [CODE_KEY, STATUS_KEY]) {
    try {
      const map = JSON.parse(localStorage.getItem(keyName) || "{}");
      let changed = false;
      for (const title of titles) {
        const key = slugTitle(title);
        if (key in map) {
          delete map[key];
          changed = true;
        }
      }
      if (changed) localStorage.setItem(keyName, JSON.stringify(map));
    } catch {}
  }
}

export function consumeSeedNotice() {
  const n = sessionStorage.getItem("research_engine_seed_notice");
  if (n) sessionStorage.removeItem("research_engine_seed_notice");
  return n ? Number(n) : 0;
}

export function saveDB(db) {
  try {
    const toSave = { ...db, areas: [...db.areas] };
    localStorage.setItem(KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error("Storage save failed:", e);
  }
}

export function clearDB() {
  localStorage.removeItem(KEY);
  return freshDB();
}

export function getApiKey() {
  return CONFIG.API_KEY || localStorage.getItem("research_engine_api_key") || "";
}

export function saveApiKey(key) {
  localStorage.setItem("research_engine_api_key", key);
}

export function getStudentProfile() {
  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveStudentProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...DEFAULT_PROFILE, ...profile }));
}

function freshDB() {
  return {
    papers: [],
    assignments: [],
    logs: [],
    runCount: 0,
    areas: new Set(),
    lastRun: null,
  };
}

function slugTitle(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
