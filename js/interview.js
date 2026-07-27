/**
 * INTERVIEW MODE
 * Offline-first interview practice for frontier ML roles.
 *
 * The research engine teaches implementation depth. This module adds the
 * interview loop: a bounded prompt, time pressure, explicit follow-ups, and
 * a repeatable rubric for reviewing the attempt afterward.
 */

const HISTORY_KEY = "research_engine_interview_history_v1";

export const INTERVIEW_TRACKS = [
  { id: "research_engineer", label: "Research Engineer" },
  { id: "ml_systems", label: "ML Systems / Performance" },
  { id: "safety_evals", label: "Safety / Evals" },
  { id: "applied_agents", label: "Applied / Agent Engineer" },
];

export const INTERVIEW_ROUNDS = [
  { id: "ml_coding", label: "ML coding", duration: 45 },
  { id: "debugging", label: "Debugging + performance", duration: 45 },
  { id: "systems", label: "ML systems design", duration: 50 },
  { id: "paper_defense", label: "Paper defense", duration: 30 },
];

export const INTERVIEW_PROMPTS = [
  {
    id: "kv-cache",
    track: "research_engineer",
    round: "ml_coding",
    title: "Add KV caching to a decoder",
    context: "You own a small decoder-only transformer used for autoregressive generation. The current implementation recomputes keys and values for every token, so generation becomes quadratic in the number of generated tokens.",
    prompt: "Implement the cache-aware attention path. Define the cache shape and update rules, preserve the uncached training path, and explain how you would test numerical equivalence between cached and uncached generation.",
    deliverables: ["A clear API for past_key_values", "Correct tensor shapes for prefill and decode", "A test plan for logits, position offsets, and batch size 1 vs >1"],
    followups: ["What changes when the context window is full?", "How would you measure tokens/second and memory per sequence?", "What breaks if different requests in a batch have different lengths?"],
    rubric: { correctness: "Cache semantics and tensor shapes are correct.", reasoning: "Explains prefill, decode, positions, and complexity.", testing: "Names tests for numerical parity and edge cases.", performance: "Quantifies the latency/memory tradeoff.", communication: "Starts with assumptions and communicates a structured plan." },
  },
  {
    id: "attention-mask",
    track: "research_engineer",
    round: "ml_coding",
    title: "Implement masked scaled dot-product attention",
    context: "You are given Q, K, and V tensors from a transformer. The function must support causal masking, padding masks, arbitrary batch sizes, and mixed precision without producing NaNs.",
    prompt: "Write the attention function and describe the shape transformations. Handle fully-masked rows safely and explain where scaling and masking happen relative to softmax.",
    deliverables: ["A readable implementation sketch", "Shape annotations for every intermediate", "Tests for causal leakage, padding, and float16/bfloat16"],
    followups: ["When would you use FlashAttention or scaled_dot_product_attention?", "How would you find a one-token causal mask bug?", "What is the memory complexity of the naive implementation?"],
    rubric: { correctness: "Masking, scaling, and softmax order are correct.", reasoning: "Tracks shapes and numerical behavior clearly.", testing: "Includes adversarial masks and causality tests.", performance: "Recognizes the O(T²) memory bottleneck.", communication: "Explains the implementation before diving into details." },
  },
  {
    id: "loss-debug",
    track: "research_engineer",
    round: "debugging",
    title: "Training loss is NaN after step 800",
    context: "A small language model trains normally for several hundred steps. Then the loss becomes NaN. The run uses AdamW, gradient accumulation, bf16 autocast, and a cosine learning-rate schedule.",
    prompt: "Walk through your debugging plan in order. Identify the highest-value metrics and the smallest reproduction you would build before changing the model.",
    deliverables: ["A prioritized debugging decision tree", "Instrumentation you would add", "A safe rollback or bisect strategy"],
    followups: ["How do you distinguish bad data from an optimizer failure?", "What would gradient clipping hide?", "How would you verify the fix does not only move the NaN later?"],
    rubric: { correctness: "Covers plausible numerical and data causes.", reasoning: "Uses isolation and bisection rather than random changes.", testing: "Adds checks for finite inputs, gradients, and activations.", performance: "Balances observability with training overhead.", communication: "States the next experiment and expected outcomes." },
  },
  {
    id: "throughput",
    track: "ml_systems",
    round: "debugging",
    title: "The GPUs are only 35% utilized",
    context: "A distributed pretraining job has plenty of GPU memory available, but throughput is far below the estimate. Data loading is asynchronous on paper, and the model uses bf16.",
    prompt: "Design a profiling sequence to localize the bottleneck. Explain the evidence that would distinguish input starvation, communication overhead, kernel inefficiency, synchronization, and poor batching.",
    deliverables: ["A measurement plan", "Three likely bottlenecks and their signatures", "One low-risk optimization and one structural optimization"],
    followups: ["What would you inspect in a trace?", "How can checkpointing reduce utilization?", "When does increasing batch size make the system worse?"],
    rubric: { correctness: "Identifies the major training-throughput bottlenecks.", reasoning: "Uses measurements and falsifiable hypotheses.", testing: "Proposes controlled comparisons.", performance: "Reasons quantitatively about overlap and utilization.", communication: "Separates diagnosis from remediation." },
  },
  {
    id: "training-platform",
    track: "ml_systems",
    round: "systems",
    title: "Design a fault-tolerant training platform",
    context: "Design the training platform for a 1T-token model trained across thousands of accelerators. Researchers need to launch experiments quickly, compare runs, resume after failures, and inspect training health.",
    prompt: "Start by clarifying requirements. Then describe the data path, parallelism strategy, checkpoint format, orchestration, observability, and failure recovery. Be explicit about what you would build first for a smaller cluster.",
    deliverables: ["A component diagram in words", "Back-of-the-envelope scale estimates", "Failure modes and recovery behavior", "A staged implementation plan"],
    followups: ["How do you avoid losing hours of work after a rack failure?", "What metadata must travel with a checkpoint?", "How would you detect silent data corruption?"],
    rubric: { correctness: "Covers data, compute, storage, orchestration, and evaluation.", reasoning: "Makes assumptions and calculates rough scale.", testing: "Includes failure-injection and recovery tests.", performance: "Discusses throughput, I/O, communication, and cost.", communication: "Presents a coherent design with priorities." },
  },
  {
    id: "eval-platform",
    track: "safety_evals",
    round: "systems",
    title: "Build an evaluation platform for an agent",
    context: "A research team is training an agent that can browse, call tools, and write files. They need reliable evidence about capability, safety, regressions, and model-version changes.",
    prompt: "Design an evaluation harness that runs reproducible tasks, captures trajectories, scores outcomes and intermediate behavior, and supports red-team additions without contaminating the main benchmark.",
    deliverables: ["Task and trajectory schemas", "Scoring and judge strategy", "Regression and contamination controls", "A dashboard or report shape"],
    followups: ["How do you handle nondeterministic agents?", "What is the difference between outcome and process evaluation?", "How do you prevent the model from gaming the evaluator?"],
    rubric: { correctness: "Separates task execution, tracing, scoring, and reporting.", reasoning: "Defines reliable evaluation under nondeterminism.", testing: "Includes adversarial, regression, and evaluator tests.", performance: "Addresses parallel runs and cost controls.", communication: "Explains what evidence is decision-useful." },
  },
  {
    id: "paper-critique",
    track: "research_engineer",
    round: "paper_defense",
    title: "Defend a research direction",
    context: "You are handed a recent paper claiming that a new training objective improves reasoning. You have ten minutes to read the abstract, method summary, and results table before discussion.",
    prompt: "Explain the claim, identify the strongest and weakest evidence, propose the first replication experiment, and name a result that would change your mind.",
    deliverables: ["A two-minute paper summary", "One skeptical question", "One replication and one extension", "A concrete falsification criterion"],
    followups: ["Which baseline is actually decisive?", "What confounders could explain the improvement?", "What would you measure beyond the headline metric?"],
    rubric: { correctness: "Separates the stated claim from interpretation.", reasoning: "Identifies confounders and designs informative experiments.", testing: "Proposes ablations, baselines, and error analysis.", performance: "Considers compute and data efficiency.", communication: "Is concise, skeptical, and technically precise." },
  },
  {
    id: "agent-safety",
    track: "safety_evals",
    round: "paper_defense",
    title: "Design a red-team evaluation",
    context: "A tool-using agent can read untrusted webpages and send email. The team wants to know whether a new prompt-injection defense meaningfully reduces risk without destroying task completion.",
    prompt: "Define the threat model, construct an evaluation set, choose metrics, and explain how you would distinguish a real safety improvement from a more-refusal model.",
    deliverables: ["Threat model and attack taxonomy", "Capability and safety metrics", "A balanced test matrix", "A rollout recommendation with uncertainty"],
    followups: ["How do you generate attacks that are not all variants of one prompt?", "What does a false positive cost here?", "How would you test transfer to unseen tools?"],
    rubric: { correctness: "Defines attacker, assets, actions, and boundaries.", reasoning: "Balances safety with useful behavior.", testing: "Uses held-out attacks and capability controls.", performance: "Considers evaluation cost and coverage.", communication: "Communicates uncertainty without hand-waving." },
  },
  {
    id: "tool-orchestrator",
    track: "applied_agents",
    round: "ml_coding",
    title: "Build a reliable tool-use loop",
    context: "An agent receives a user request, chooses among typed tools, observes results, and may retry. The first version occasionally calls tools with invalid arguments or loops forever.",
    prompt: "Design the state machine and implement the core loop. Include validation, timeouts, retry budgets, idempotency, and a trace that makes failures debuggable.",
    deliverables: ["State transitions", "Tool-schema validation", "Retry and termination policy", "Tests for malformed calls and partial failures"],
    followups: ["How do you avoid retrying a non-idempotent action?", "What belongs in the model prompt versus the runtime?", "How would you measure agent reliability?"],
    rubric: { correctness: "Handles valid, invalid, partial, and terminal states.", reasoning: "Separates policy from runtime guarantees.", testing: "Covers retries, timeouts, and side effects.", performance: "Controls latency, token use, and duplicate work.", communication: "Makes the state machine easy to inspect." },
  },
];

export function getInterviewPrompt(trackId, roundId, excludeIds = []) {
  const pool = INTERVIEW_PROMPTS.filter((p) =>
    (!trackId || p.track === trackId) && (!roundId || p.round === roundId) && !excludeIds.includes(p.id)
  );
  const fallback = INTERVIEW_PROMPTS.filter((p) => (!roundId || p.round === roundId) && !excludeIds.includes(p.id));
  const choices = pool.length ? pool : fallback.length ? fallback : INTERVIEW_PROMPTS;
  return choices[Math.floor(Math.random() * choices.length)];
}

export function loadInterviewHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInterviewAttempt(attempt) {
  const history = [attempt, ...loadInterviewHistory()].slice(0, 50);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (_) {}
  return history;
}

export function getInterviewStats(history = loadInterviewHistory()) {
  const scored = history.filter((a) => Number.isFinite(a.total));
  const average = scored.length ? Math.round(scored.reduce((sum, a) => sum + a.total, 0) / scored.length) : 0;
  return { attempts: history.length, average, best: scored.length ? Math.max(...scored.map((a) => a.total)) : 0 };
}

