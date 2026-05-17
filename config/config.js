/**
 * CONFIG
 * ──────
 * Set your Anthropic API key here (or paste it in the app's Settings panel).
 * Never commit a real key. Add config.js to .gitignore if you set it here.
 *
 * Claude Code instruction: do NOT modify API_KEY. Leave it as empty string.
 * Users set it via the UI or via a .env approach if they wrap this in Node.
 */

export const CONFIG = {
  // Paste your Anthropic API key here, or leave blank and enter it in the UI
  API_KEY: "",

  // Model to use — claude-sonnet-4-20250514 is the sweet spot for speed + quality
  MODEL: "claude-sonnet-4-20250514",

  // Max tokens for the research agent response
  MAX_TOKENS: 4000,

  // Enable web search on each run (costs slightly more, but finds latest papers)
  ENABLE_WEB_SEARCH: true,

  // Max papers to keep in DB before pruning oldest
  MAX_PAPERS: 200,

  // Max assignments to keep in DB
  MAX_ASSIGNMENTS: 100,

  // LocalStorage key for persistence
  STORAGE_KEY: "pytorch_research_engine_v1",
};
