/**
 * STORAGE MODULE
 * ──────────────
 * All read/write to localStorage lives here.
 * Claude Code instruction: to swap to IndexedDB, SQLite (via sql.js), or a
 * backend API, replace only this file — the rest of the app doesn't change.
 */

import { CONFIG } from "../config/config.js";

const KEY = CONFIG.STORAGE_KEY;

export function loadDB() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshDB();
    const db = JSON.parse(raw);
    db.areas = new Set(db.areas || []);
    return db;
  } catch (e) {
    console.warn("Storage load failed, starting fresh:", e);
    return freshDB();
  }
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
