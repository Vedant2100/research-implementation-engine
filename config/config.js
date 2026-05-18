/**
 * CONFIG
 * ──────
 * Set your Anthropic API key here (or paste it in the app's Settings panel).
 * Never commit a real key. Add config.js to .gitignore if you set it here.
 *
 * Claude Code instruction: do NOT modify API_KEY. Leave it as empty string.
 * Users set it via the UI or via a .env approach if they wrap this in Node.
 */

// Provider profiles — switch with CONFIG.PROVIDER below.
export const PROVIDERS = {
  nvidia: {
    label: "NVIDIA NIM (DeepSeek V4 Flash)",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "deepseek-ai/deepseek-v4-flash",
    keyHint: "nvapi-...",
    keyDocsUrl: "https://build.nvidia.com/",
    format: "openai",
    keyPrefix: "nvapi-",
  },
  nvidiaPro: {
    label: "NVIDIA NIM (DeepSeek V4 Pro — slow thinker)",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "deepseek-ai/deepseek-v4-pro",
    keyHint: "nvapi-...",
    keyDocsUrl: "https://build.nvidia.com/",
    format: "openai",
    keyPrefix: "nvapi-",
  },
  nvidiaQwen: {
    label: "NVIDIA NIM (Qwen3 80B Instruct — fast)",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "qwen/qwen3-next-80b-a3b-instruct",
    keyHint: "nvapi-...",
    keyDocsUrl: "https://build.nvidia.com/",
    format: "openai",
    keyPrefix: "nvapi-",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-sonnet-4-20250514",
    keyHint: "sk-ant-api03-...",
    keyDocsUrl: "https://console.anthropic.com/settings/keys",
    format: "anthropic",
    keyPrefix: "sk-ant-",
  },
};

export const CONFIG = {
  PROVIDER: "nvidia",

  // Optional proxy URL that holds the API key server-side.
  // Local dev: `npm run dev` starts scripts/dev-proxy.mjs on :3001 reading .env.
  // Production (GitHub Pages): deploy the same script as a Cloudflare Worker
  //   or Vercel function and set this to its URL.
  PROXY_URL: "http://localhost:3001/v1",

  API_KEY: "",

  MAX_TOKENS: 16000,

  // arXiv tool: pre-fetches paper abstracts for the chosen area before calling the LLM.
  // Free, no API key, much better than relying on the model's training cutoff for
  // 2025-2026 papers. Adds ~1-2s per run.
  ENABLE_ARXIV: true,

  ENABLE_WEB_SEARCH: false,

  MAX_PAPERS: 200,
  MAX_ASSIGNMENTS: 100,
  STORAGE_KEY: "pytorch_research_engine_v1",
};

export function getProvider() {
  return PROVIDERS[CONFIG.PROVIDER] || PROVIDERS.nvidia;
}
