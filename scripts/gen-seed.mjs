#!/usr/bin/env node
/**
 * gen-seed.mjs — regenerate js/seed.js from the Python files in scripts/assignments/.
 *
 * To add a new assignment for a future week:
 *   1. Drop the Python file into scripts/assignments/<slug>.py (signatures + TODO
 *      raises in the student section; integration tests below the banner).
 *   2. Add an entry to ASSIGNMENTS below (and a paper to PAPERS if it is a new one).
 *   3. Bump SEED_VERSION below (so existing browsers re-merge the new seeds).
 *   4. Run: npm run gen-seed
 *
 * The script reads every referenced .py file, JSON-stringifies its contents, and
 * emits js/seed.js. It also AST-checks each Python file so a broken assignment
 * never reaches the browser.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const PY_DIR = path.join(HERE, "assignments");
const OUT = path.join(ROOT, "js", "seed.js");

const SEED_VERSION = "llm_week_v1";

const PAPERS = [
  {
    title:
      "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
    authors: "Dosovitskiy et al.",
    year: 2020,
    venue: "ICLR 2021",
    area: "llm",
    core_idea:
      "Treat an image as a sequence of patches, embed each patch, run them through a standard transformer encoder with a learnable [CLS] token, and classify from the [CLS] output.",
    why_important:
      "ViT is the canonical full-architecture transformer outside of language. Building it end-to-end teaches patching, positional encoding, multi-head self-attention, residual transformer blocks, and an entire training/eval pipeline in one project.",
    pytorch_hook:
      "nn.Conv2d patch embedding + learnable [CLS] + positional embedding + stacked TransformerBlocks + classifier head + full training loop with evaluation",
  },
  {
    title: "Language Models are Unsupervised Multitask Learners",
    authors: "Radford et al.",
    year: 2019,
    venue: "OpenAI tech report",
    area: "llm",
    core_idea:
      "A decoder-only causal transformer trained on next-token prediction at scale is enough to learn surprising amounts of language understanding without task-specific supervision.",
    why_important:
      "The GPT-2 architecture is the backbone every modern LLM iterates on. Reproducing it from scratch teaches token embeddings, causal masks, residual transformer blocks, and the LM head.",
    pytorch_hook:
      "TokenEmbedding + positional embedding + causal self-attention + MLP + TransformerBlock + LM head + cross-entropy on next token",
  },
  {
    title: "LLaMA: Open and Efficient Foundation Language Models",
    authors: "Touvron et al.",
    year: 2023,
    venue: "arXiv preprint",
    area: "llm",
    core_idea:
      "Combine RoPE positional embeddings, RMSNorm, SwiGLU MLPs, and (in later variants) grouped-query attention into a cleaner, faster decoder-only transformer than GPT-2.",
    why_important:
      "LLaMA is the de-facto recipe behind most open LLMs (Mistral, Qwen, DeepSeek). Reproducing the modern stack teaches what changed from GPT-2 and why.",
    pytorch_hook:
      "RMSNorm + RotaryEmbedding + GQA attention + SwiGLU + residual blocks + LM head",
  },
  {
    title:
      "Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity",
    authors: "Fedus, Zoph, Shazeer",
    year: 2021,
    venue: "JMLR 2022",
    area: "llm",
    core_idea:
      "Replace the dense MLP in every other transformer block with a sparsely-gated mixture of experts: a router sends each token to its top-k experts and the outputs are combined with router weights.",
    why_important:
      "MoE is how modern frontier models (GPT-4, Mixtral, DeepSeek-V3) get more parameters without proportionally more FLOPs. Building one teaches routing, load balancing, and sparse dispatch.",
    pytorch_hook:
      "TopKRouter + ExpertMLP list + SparseMoE forward + auxiliary load-balancing loss + full LM training loop",
  },
  {
    title: "Mamba: Linear-Time Sequence Modeling with Selective State Spaces",
    authors: "Gu and Dao",
    year: 2023,
    venue: "arXiv preprint",
    area: "llm",
    core_idea:
      "Replace self-attention with a selective state-space model whose A, B, C matrices depend on the input, giving linear-time sequence modeling with content-based gating.",
    why_important:
      "Mamba and its descendants are the first non-attention architectures to compete with transformers at scale and underlie every modern hybrid. Implementing the selective SSM teaches a fundamentally different way to model sequences.",
    pytorch_hook:
      "1D causal conv + SiLU gate + selective SSM scan (A, B, C functions of input) + residual blocks + LM head",
  },
  {
    title:
      "SAMBA: Simple Hybrid State Space Models for Efficient Unlimited Context Language Modeling",
    authors: "Ren et al.",
    year: 2025,
    venue: "ICLR 2025",
    area: "llm",
    core_idea:
      "Interleave Mamba selective-SSM layers with sliding-window attention layers in a single decoder so the SSM handles long-range compression while local attention handles precise recall.",
    why_important:
      "SAMBA scales to 3.8B params with 3.2T tokens and shows 3.7x higher throughput than dense transformers on long context. It is the cleanest recent recipe for hybrid LLMs and a great way to see why both halves matter.",
    pytorch_hook:
      "alternating MambaBlock and SlidingWindowAttention layers + SwiGLU MLP + RMSNorm + LM head",
  },
  {
    title:
      "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
    authors: "Rafailov et al.",
    year: 2023,
    venue: "NeurIPS 2023",
    area: "llm",
    core_idea:
      "Derive a closed-form preference loss from the KL-constrained RLHF objective so you can fine-tune the policy directly on (chosen, rejected) pairs without a separate reward model or PPO.",
    why_important:
      "DPO replaced PPO as the default alignment recipe in most open-model pipelines (Zephyr, Tulu, Llama-Instruct). Implementing it end-to-end teaches reference policies, token log-probs, and the entire preference fine-tuning loop.",
    pytorch_hook:
      "frozen reference policy + sequence_logprob + -log sigmoid(beta * ((pi_c - pi_r) - (ref_c - ref_r))) + train loop + pair-accuracy eval",
  },
];

const ASSIGNMENTS = [
  {
    pyFile: "vit.py",
    title: "Vision Transformer (ViT) from scratch",
    paper_ref:
      "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
    difficulty: "medium",
    estimated_hours: 12,
    why_now:
      "This is the big-pipeline warmup: ViT forces you to build every part of a real transformer (patch embed, attention, MLP, residual block, full encoder) plus the surrounding training + evaluation pipeline.",
    learning_objective:
      "Implement the full ViT architecture and the end-to-end training/evaluation pipeline so a single python assignment.py call trains it and reports a validation accuracy.",
    context:
      "ViT showed that a transformer with no convolutions and no recurrence can match or beat CNNs on image classification when applied to sequences of image patches. You will reproduce the architecture and the pipeline around it at a tiny scale that runs on CPU.",
    prerequisite_concepts: [
      "Tensor shapes and broadcasting",
      "nn.Module, forward(), and parameter registration",
      "Cross-entropy loss and softmax",
      "Adam/AdamW and basic training loop structure",
    ],
    concept_ladder: [
      "Split an image into non-overlapping patches and project each patch into a vector",
      "Prepend a learnable [CLS] token and add positional embeddings",
      "Run the token sequence through stacked transformer blocks (multi-head self-attention + MLP + residuals + LayerNorm)",
      "Classify from the [CLS] output and train with cross-entropy",
      "Wrap data, model, optimizer, training and evaluation in one run_pipeline() that returns metrics",
    ],
    next_30_minutes:
      "Open assignment.py and implement PatchEmbedding so that a (B, C, H, W) input becomes (B, num_patches, embed_dim). Then re-run python assignment.py and watch the first test fail with a clear shape message.",
    setup:
      "CPU is enough. No external dataset download - the tests use a tiny synthetic image dataset you build inside get_dataloaders. Use one file: assignment.py.",
    tasks: [
      "Task 1: Implement PatchEmbedding, MultiHeadSelfAttention, MLPBlock, and TransformerBlock.",
      "Task 2: Implement the full ViT class (patch embed + [CLS] + pos embed + transformer stack + classifier head).",
      "Task 3: Implement get_dataloaders, train_one_epoch, and evaluate.",
      "Task 4: Implement run_pipeline that ties everything together and returns {train_loss, val_accuracy}.",
    ],
    milestones: [
      { title: "Forward pass returns logits", goal: "A random batch flows through the full ViT and produces (B, num_classes) logits with no NaNs.", checkpoint: "test_vit_forward_shape passes." },
      { title: "The architecture can learn", goal: "Cross-entropy loss on a single fixed batch drops sharply over a few steps of AdamW.", checkpoint: "test_vit_overfits_one_batch passes." },
      { title: "End-to-end pipeline runs", goal: "run_pipeline() builds data, trains the model, evaluates, and returns metrics.", checkpoint: "test_pipeline_runs_and_reports_metrics passes." },
    ],
    key_pytorch_concepts: [
      "nn.Conv2d as a patch embedder",
      "learnable nn.Parameter tokens and positional embeddings",
      "multi-head attention via reshape + matmul + softmax",
      "residual + LayerNorm transformer blocks",
      "full train/eval pipeline returning metrics",
    ],
  },
  {
    pyFile: "nanogpt.py",
    title: "Decoder-only GPT language model from scratch",
    paper_ref: "Language Models are Unsupervised Multitask Learners",
    difficulty: "medium",
    estimated_hours: 10,
    why_now:
      "After ViT, GPT-2 is the natural next step: same transformer block but causal, plus the full LM training pipeline (next-token cross-entropy, validation loss).",
    learning_objective:
      "Implement the full GPT-2 style decoder LM and the end-to-end pretraining pipeline producing train and validation loss.",
    context:
      "GPT-2 is the canonical decoder-only causal transformer. You will rebuild token embeddings, causal self-attention, transformer blocks, an LM head, and a synthetic next-token training pipeline.",
    prerequisite_concepts: [
      "Causal masking",
      "Cross-entropy on (B*T, V) flat logits",
      "Embeddings and weight tying",
    ],
    concept_ladder: [
      "Token + position embedding produce a (B, T, D) sequence",
      "Causal self-attention mixes only past tokens",
      "Stacked transformer blocks build a deep model",
      "LM head projects back to vocab and trains with cross-entropy",
    ],
    next_30_minutes:
      "Implement TokenEmbedding so (B, T) int ids become (B, T, D) embeddings plus learned position embeddings, then run python assignment.py.",
    setup:
      "CPU is enough. Synthetic next-token data inside get_dataloaders.",
    tasks: [
      "Task 1: TokenEmbedding, CausalSelfAttention (with causal mask), MLPBlock, TransformerBlock.",
      "Task 2: Full GPT model with LM head.",
      "Task 3: get_dataloaders producing (input_ids, target_ids) pairs.",
      "Task 4: train_one_epoch, evaluate, run_pipeline returning train_loss and val_loss.",
    ],
    milestones: [
      { title: "Causal forward pass", goal: "GPT returns (B, T, V) logits with proper causal masking.", checkpoint: "test_gpt_forward_shape passes." },
      { title: "Overfits a batch", goal: "Cross-entropy on a fixed batch drops sharply.", checkpoint: "test_gpt_overfits_one_batch passes." },
      { title: "Pipeline returns metrics", goal: "run_pipeline trains then evaluates and returns dict.", checkpoint: "test_pipeline_runs_and_reports_metrics passes." },
    ],
    key_pytorch_concepts: [
      "causal mask via torch.tril",
      "B*T flat cross-entropy",
      "weight tying between embedding and LM head (optional)",
      "AdamW training loop",
    ],
  },
  {
    pyFile: "llama.py",
    title: "LLaMA-style modern decoder (RoPE + RMSNorm + SwiGLU + GQA)",
    paper_ref: "LLaMA: Open and Efficient Foundation Language Models",
    difficulty: "hard",
    estimated_hours: 14,
    why_now:
      "Once you have GPT-2 working, LLaMA shows what every modern open LLM actually uses: rotary positions, RMSNorm pre-normalization, SwiGLU MLPs, and grouped-query attention.",
    learning_objective:
      "Implement the modern LLaMA decoder stack from scratch and train it end-to-end on synthetic data.",
    context:
      "LLaMA is the recipe shared by Mistral, Qwen, DeepSeek, and most other open models. Every change vs GPT-2 has a measurable reason; building it from scratch lets you feel them.",
    prerequisite_concepts: [
      "RoPE rotation of Q/K",
      "RMSNorm vs LayerNorm",
      "SwiGLU activation",
      "Grouped-query attention",
    ],
    concept_ladder: [
      "RMSNorm normalizes by RMS, no mean subtraction",
      "RotaryEmbedding produces cos/sin tables; apply_rotary rotates Q/K pairs",
      "Grouped-query attention shares K/V across multiple Q heads",
      "SwiGLU = (silu(W1 x) * W2 x) W3",
      "Stack LlamaBlocks and finish with an LM head",
    ],
    next_30_minutes:
      "Implement RMSNorm (forward = x * rsqrt(mean(x^2) + eps) * weight) and run python assignment.py once to confirm it imports.",
    setup:
      "CPU is enough at the tiny config. Synthetic vocab + sequence data.",
    tasks: [
      "Task 1: RMSNorm and RotaryEmbedding (cos/sin tables of shape (seq_len, head_dim)).",
      "Task 2: LlamaAttention with GQA and RoPE applied to Q and K.",
      "Task 3: SwiGLU MLP and the full LlamaBlock (pre-norm RMSNorm + attention + RMSNorm + SwiGLU + residuals).",
      "Task 4: LlamaModel stacking blocks; pipeline returns train_loss and val_loss.",
    ],
    milestones: [
      { title: "Forward shape", goal: "LlamaModel returns (B, T, V) logits.", checkpoint: "test_llama_forward_shape passes." },
      { title: "Trains on one batch", goal: "Loss halves on a fixed batch within 80 AdamW steps.", checkpoint: "test_llama_overfits_one_batch passes." },
      { title: "Pipeline runs", goal: "run_pipeline returns finite train_loss and val_loss.", checkpoint: "test_pipeline_runs_and_reports_metrics passes." },
    ],
    key_pytorch_concepts: [
      "rotary position embedding",
      "RMSNorm",
      "grouped-query attention via repeat_interleave",
      "SwiGLU",
      "pre-norm transformer blocks",
    ],
  },
  {
    pyFile: "moe.py",
    title: "Mixture-of-Experts (MoE) decoder LM",
    paper_ref:
      "Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity",
    difficulty: "hard",
    estimated_hours: 14,
    why_now:
      "MoE is the architectural lever behind every frontier model: more params, same FLOPs. Building one teaches routing, top-k dispatch, and load balancing.",
    learning_objective:
      "Implement the full sparse MoE transformer LM and train it end-to-end with an auxiliary load-balancing loss.",
    context:
      "A Switch/Mixtral-style block replaces the dense MLP with N experts and a router that sends each token to its top-k. Routed outputs are weighted by router probabilities. Without a balance loss the router collapses to one expert; with it, all experts get used.",
    prerequisite_concepts: [
      "Softmax routing",
      "torch.topk and torch.scatter",
      "Auxiliary load-balancing loss",
    ],
    concept_ladder: [
      "Router projects tokens to N expert logits and selects top-k",
      "ExpertMLP is the same as a vanilla MLP block",
      "SparseMoE dispatches each token to its k experts and weights outputs",
      "Track router stats and add a balance loss to keep experts utilised",
    ],
    next_30_minutes:
      "Implement TopKRouter: softmax over expert logits, return (top_k_probs, top_k_indices) shaped (B*T, k). Run python assignment.py.",
    setup:
      "CPU is enough. Synthetic next-token sequences.",
    tasks: [
      "Task 1: TopKRouter and ExpertMLP.",
      "Task 2: SparseMoE forward that dispatches tokens, runs each expert, and combines outputs.",
      "Task 3: MoETransformerBlock with attention + SparseMoE.",
      "Task 4: MoELM stacking blocks. train_one_epoch should optionally add a load-balancing loss term.",
    ],
    milestones: [
      { title: "Sparse forward", goal: "MoELM returns (B, T, V) logits using only top-k experts per token.", checkpoint: "test_moe_forward_shape passes." },
      { title: "Trains on one batch", goal: "Cross-entropy on a fixed batch halves within 100 steps.", checkpoint: "test_moe_overfits_one_batch passes." },
      { title: "Pipeline runs", goal: "run_pipeline returns train_loss and val_loss.", checkpoint: "test_pipeline_runs_and_reports_metrics passes." },
    ],
    key_pytorch_concepts: [
      "torch.topk",
      "scatter / index_select dispatch",
      "load-balancing auxiliary loss",
      "softmax routing",
    ],
  },
  {
    pyFile: "mamba.py",
    title: "Mamba selective SSM language model",
    paper_ref: "Mamba: Linear-Time Sequence Modeling with Selective State Spaces",
    difficulty: "hard",
    estimated_hours: 16,
    why_now:
      "A full non-attention architecture. Building Mamba forces you to understand selective scans and why content-dependent SSM dynamics rival attention.",
    learning_objective:
      "Implement the full Mamba block, stack it into an LM, and train end-to-end on synthetic next-token data.",
    context:
      "Mamba replaces self-attention with a selective state-space scan. The A, B, C matrices are functions of the input (selectivity), which gives it content-based gating without quadratic cost. A small reference implementation runs cleanly on CPU.",
    prerequisite_concepts: [
      "Linear recurrences",
      "1D causal convolutions",
      "SiLU gating",
      "Discretization of continuous SSMs (zero-order hold)",
    ],
    concept_ladder: [
      "SelectiveSSM: project x -> dt, B, C; discretize A, B; scan over time",
      "MambaBlock: input projection -> conv1d -> SiLU -> SSM -> gate * SSM_out -> output projection",
      "Stack blocks and end with RMSNorm + LM head",
      "Train with cross-entropy on next-token like a transformer",
    ],
    next_30_minutes:
      "Implement the input/output projection and 1D causal conv1d inside MambaBlock (no SSM yet) and run python assignment.py.",
    setup:
      "CPU is enough. A simple Python loop SSM scan is fine (no CUDA kernels).",
    tasks: [
      "Task 1: SelectiveSSM with discretized A, B, C dependent on input.",
      "Task 2: MambaBlock = input proj + conv + SiLU + SSM + gate + output proj.",
      "Task 3: MambaLM stacks blocks, embeds tokens, projects to vocab.",
      "Task 4: Full training pipeline returning train_loss and val_loss.",
    ],
    milestones: [
      { title: "SSM forward", goal: "MambaLM returns (B, T, V) logits.", checkpoint: "test_mamba_forward_shape passes." },
      { title: "Overfits a batch", goal: "Loss halves on a fixed batch within 120 steps.", checkpoint: "test_mamba_overfits_one_batch passes." },
      { title: "Pipeline runs", goal: "run_pipeline returns train_loss and val_loss.", checkpoint: "test_pipeline_runs_and_reports_metrics passes." },
    ],
    key_pytorch_concepts: [
      "1D causal conv",
      "SiLU gating",
      "discretized linear scan",
      "selective parameters as functions of input",
    ],
  },
  {
    pyFile: "samba.py",
    title: "SAMBA hybrid LM (Mamba + sliding-window attention)",
    paper_ref:
      "SAMBA: Simple Hybrid State Space Models for Efficient Unlimited Context Language Modeling",
    difficulty: "hard",
    estimated_hours: 16,
    why_now:
      "After plain Mamba, build the 2025 hybrid that interleaves Mamba and sliding-window attention. This is the cleanest recent recipe for combining SSMs with attention.",
    learning_objective:
      "Implement a SAMBA-style decoder that alternates Mamba blocks with sliding-window attention blocks and train it end-to-end.",
    context:
      "SAMBA shows that attention and SSMs are complementary: SSM compresses long history, sliding-window attention does precise local recall. The architecture stacks both kinds of layers in alternation, with SwiGLU MLPs.",
    prerequisite_concepts: [
      "Selective SSMs (from the Mamba assignment)",
      "Sliding-window attention masks",
      "Pre-norm residual blocks",
    ],
    concept_ladder: [
      "Reuse the SelectiveSSM and MambaBlock you already wrote",
      "Add SlidingWindowAttention with a local causal mask of width w",
      "SambaLayer wraps either a Mamba or SWA op plus a SwiGLU MLP with residuals",
      "SambaLM interleaves the two layer kinds in a single stack",
    ],
    next_30_minutes:
      "Sketch SlidingWindowAttention: causal mask where position i can only see positions in [i - window + 1, i].",
    setup:
      "CPU is enough. Synthetic next-token data, seq_len=32, window_size=8.",
    tasks: [
      "Task 1: SelectiveSSM + MambaBlock (reuse your Mamba assignment).",
      "Task 2: SlidingWindowAttention with local causal mask.",
      "Task 3: SwiGLU MLP and SambaLayer (kind in {'mamba', 'swa'}).",
      "Task 4: SambaLM that interleaves layer kinds; full training pipeline.",
    ],
    milestones: [
      { title: "Hybrid forward", goal: "SambaLM returns (B, T, V) logits with both layer kinds in the stack.", checkpoint: "test_samba_forward_shape passes." },
      { title: "Trains on one batch", goal: "Loss halves on a fixed batch.", checkpoint: "test_samba_overfits_one_batch passes." },
      { title: "Pipeline runs", goal: "run_pipeline returns train_loss and val_loss.", checkpoint: "test_pipeline_runs_and_reports_metrics passes." },
    ],
    key_pytorch_concepts: [
      "sliding-window causal mask",
      "alternating layer kinds in a stack",
      "Mamba SSM + attention in one architecture",
      "SwiGLU + RMSNorm",
    ],
  },
  {
    pyFile: "dpo.py",
    title: "DPO alignment pipeline from scratch",
    paper_ref:
      "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
    difficulty: "medium",
    estimated_hours: 10,
    why_now:
      "Alignment is the other half of LLM work. DPO is the canonical preference-fine-tuning recipe; doing it end-to-end teaches reference policies, token log-probs, and pair evaluation.",
    learning_objective:
      "Implement a tiny LM plus the full DPO training pipeline against a frozen reference, and evaluate pair accuracy.",
    context:
      "DPO derives a preference loss directly from the KL-constrained RLHF objective: -log sigmoid(beta * ((pi_chosen - pi_rejected) - (ref_chosen - ref_rejected))). No reward model, no PPO. You will build the tiny LM, the loss, the training loop, and a pair-accuracy evaluator.",
    prerequisite_concepts: [
      "Token log-probabilities",
      "Frozen reference models",
      "Bradley-Terry preference modeling",
    ],
    concept_ladder: [
      "Build a small causal transformer LM (TinyLM)",
      "sequence_logprob computes log p(completion | prompt) under the policy",
      "dpo_loss combines policy and reference logprobs with beta",
      "Training updates only the policy; the reference stays frozen",
      "Evaluate pair_accuracy = fraction of pairs where policy prefers chosen",
    ],
    next_30_minutes:
      "Build TinyLM (same shape as your GPT) and confirm logits shape with python assignment.py.",
    setup:
      "CPU is enough. Synthetic (chosen, rejected) preference pairs from get_dataloaders.",
    tasks: [
      "Task 1: TinyLM (token embed + causal blocks + LM head).",
      "Task 2: sequence_logprob for completion tokens only (positions >= prompt_len).",
      "Task 3: dpo_loss against a frozen reference with beta=0.1.",
      "Task 4: train_one_epoch + evaluate + run_pipeline returning train_loss and pair_accuracy.",
    ],
    milestones: [
      { title: "TinyLM forward", goal: "Logits shape correct on a batch.", checkpoint: "test_tinylm_forward_shape passes." },
      { title: "DPO loss decreases", goal: "AdamW + dpo_loss decrease on a fixed pair batch.", checkpoint: "test_dpo_loss_decreases_on_one_batch passes." },
      { title: "Pipeline runs", goal: "run_pipeline returns train_loss and pair_accuracy in [0, 1].", checkpoint: "test_pipeline_runs_and_reports_metrics passes." },
    ],
    key_pytorch_concepts: [
      "torch.gather on log-softmax logits",
      "requires_grad_(False) for the reference",
      "sigmoid + log of preference margin",
      "pair-accuracy evaluation",
    ],
  },
];

function astCheck(pyPath) {
  try {
    execSync(
      `python3 -c "import ast; ast.parse(open('${pyPath}').read())"`,
      { stdio: "pipe" },
    );
  } catch (e) {
    throw new Error(`Python AST parse failed for ${pyPath}:\n${e.stderr?.toString() || e.message}`);
  }
}

function indent(jsonStr, spaces) {
  const pad = " ".repeat(spaces);
  return jsonStr.replace(/^/gm, pad).trimStart();
}

function main() {
  const builtAssignments = ASSIGNMENTS.map((a) => {
    const pyPath = path.join(PY_DIR, a.pyFile);
    if (!fs.existsSync(pyPath)) {
      throw new Error(`Missing Python file: ${pyPath}`);
    }
    astCheck(pyPath);
    const guide = fs.readFileSync(pyPath, "utf8");
    return {
      title: a.title,
      paper_ref: a.paper_ref,
      area: "llm",
      difficulty: a.difficulty,
      estimated_hours: a.estimated_hours,
      why_now: a.why_now,
      learning_objective: a.learning_objective,
      context: a.context,
      prerequisite_concepts: a.prerequisite_concepts,
      concept_ladder: a.concept_ladder,
      next_30_minutes: a.next_30_minutes,
      setup: a.setup,
      tasks: a.tasks,
      milestones: a.milestones,
      key_pytorch_concepts: a.key_pytorch_concepts,
      code_build_guide: guide,
    };
  });

  const papersJson = indent(JSON.stringify(PAPERS, null, 2), 2);
  const assignmentsJson = indent(JSON.stringify(builtAssignments, null, 2), 2);

  const out = `/**
 * Starter content — generated by scripts/gen-seed.mjs.
 * Do not edit by hand. To add or change an assignment:
 *   1. Edit or add Python files in scripts/assignments/
 *   2. Edit ASSIGNMENTS / PAPERS in scripts/gen-seed.mjs
 *   3. Bump SEED_VERSION in scripts/gen-seed.mjs
 *   4. Run: npm run gen-seed
 */

export const SEED_VERSION = ${JSON.stringify(SEED_VERSION)};

export const SEED_PAPERS = ${papersJson};

export const SEED_ASSIGNMENTS = ${assignmentsJson};
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out);
  console.log(
    `wrote ${path.relative(ROOT, OUT)} — ${builtAssignments.length} assignments, ${PAPERS.length} papers, ${out.length} bytes (SEED_VERSION="${SEED_VERSION}")`,
  );
}

main();
