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
    label: "NVIDIA NIM (DeepSeek V4 Pro)",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "deepseek-ai/deepseek-v4-pro",
    keyHint: "nvapi-...",
    keyDocsUrl: "https://build.nvidia.com/",
    format: "openai",
    keyPrefix: "nvapi-",
  },
  nvidiaQwen: {
    label: "NVIDIA NIM (Qwen3 Thinking)",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "qwen/qwen3-next-80b-a3b-thinking",
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

  // Optional proxy that prepends the provider baseUrl path.
  // Required for NVIDIA NIM / DeepSeek / Gemini from GitHub Pages (no CORS).
  // Leave empty for local development with `npm run dev` (CORS bypass via dev server).
  // Example Cloudflare Worker: "https://nim-proxy.<your>.workers.dev"
  PROXY_URL: "",

  API_KEY: "",

  MAX_TOKENS: 16000,

  ENABLE_WEB_SEARCH: false,

  MAX_PAPERS: 200,
  MAX_ASSIGNMENTS: 100,
  STORAGE_KEY: "pytorch_research_engine_v1",
};

export function getProvider() {
  return PROVIDERS[CONFIG.PROVIDER] || PROVIDERS.nvidia;
}
