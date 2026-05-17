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
