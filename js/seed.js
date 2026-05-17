/**
 * Starter content — transformers (llm) & RL, medium difficulty.
 * Merged once per browser via storage.js (SEED_VERSION).
 */

export const SEED_VERSION = "starter_llm_rl_v1";

export const SEED_PAPERS = [
  {
    title: "RoFormer: Enhanced Transformer with Rotary Position Embedding",
    authors: "Jianlin Su et al.",
    year: 2021,
    venue: "arXiv / NeurIPS 2021",
    area: "llm",
    core_idea:
      "Replaces absolute position embeddings by rotating Q/K pairs in 2D subspaces as a function of position, encoding relative distance in attention logits.",
    why_important:
      "RoPE is the default position scheme in Llama, Mistral, and DeepSeek — you cannot read modern LLM code without implementing it once.",
    pytorch_hook: "apply_rotary_pos_emb(q, k, cos, sin) + nn.MultiheadAttention or manual matmul attention",
  },
  {
    title: "GQA: Training Generalized Multi-Query Attention Models from Multi-Head Checkpoints",
    authors: "Joshua Ainslie et al.",
    year: 2023,
    venue: "arXiv preprint",
    area: "llm",
    core_idea:
      "Groups query heads to share fewer K/V heads than Q heads, cutting KV-cache memory at inference with minimal quality loss vs full MHA.",
    why_important:
      "Llama-2/3 and many production models use GQA/MQA — understanding head grouping is core transformer engineering.",
    pytorch_hook: "repeat_interleave on K/V projections + grouped Q heads in forward()",
  },
  {
    title: "DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models",
    authors: "Zhihong Shao et al.",
    year: 2024,
    venue: "arXiv preprint",
    area: "rl",
    core_idea:
      "Introduces Group Relative Policy Optimization (GRPO): sample a group of completions per prompt, normalize rewards within the group, and update the policy without a separate critic network.",
    why_important:
      "GRPO is the RL backbone behind DeepSeek-R1-style reasoning training — simpler and cheaper than PPO+value head for LLMs.",
    pytorch_hook: "grouped advantage tensor + clipped policy ratio loss in a custom train_step()",
  },
  {
    title: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
    authors: "Rafailov et al.",
    year: 2023,
    venue: "NeurIPS 2023",
    area: "rl",
    core_idea:
      "Derives a closed-form preference loss from the Bradley-Terry + KL-constrained RLHF objective so you can fine-tune the policy directly on (chosen, rejected) pairs.",
    why_important:
      "DPO replaced PPO for most alignment fine-tuning pipelines — one loss, no reward model sampling loop.",
    pytorch_hook: "-log σ(β · (log π_θ(y_w|x) - log π_θ(y_l|x) - log π_ref gap))) on token logprobs",
  },
];

export const SEED_ASSIGNMENTS = [
  {
    title: "RoPE causal self-attention on a char-level LM",
    paper_ref: "RoFormer: Enhanced Transformer with Rotary Position Embedding",
    area: "llm",
    difficulty: "medium",
    estimated_hours: 14,
    learning_objective:
      "Implement rotary position embeddings and causal multi-head attention without HuggingFace, and see perplexity drop on a tiny corpus.",
    context:
      "RoPE encodes relative position by rotating Q/K; every modern open LLM uses it. Building it on a 4-layer transformer on Tiny Shakespeare or tinystories-10k makes the math concrete.",
    setup:
      "Dataset: Tiny Shakespeare (~1MB) or 10k lines from TinyStories. 1 GPU or strong CPU. Start: `import torch; from torch.utils.data import DataLoader` + char tokenizer with vocab < 256.",
    tasks: [
      "Task 1: Implement `RotaryEmbedding` + `apply_rotary_pos_emb(q, k)` for even head_dim; unit-test rotation preserves norm.",
      "Task 2: Build `CausalSelfAttention` (QKV proj, RoPE, softmax mask, out proj) and a 4-layer `TransformerBlock` stack.",
      "Task 3: Train char-LM with AdamW; plot train/val perplexity for 20k–50k steps — target val PPL clearly below untrained baseline.",
      "Task 4: Ablate RoPE → absolute learned positions (same params budget); plot val PPL vs steps.",
      "Task 5: `eval.py` reports bits-per-char / perplexity on held-out chunk.",
    ],
    stretch_goal:
      "Add GQA (fewer KV heads) using the GQA paper grouping and compare inference KV memory vs full MHA at equal quality.",
    key_pytorch_concepts: ["einsum", "causal mask", "RoPE", "nn.Parameter"],
    debug_hints:
      "RoPE cos/sin cache must match seq_len at forward time; off-by-one in position ids causes sudden loss spikes after context length changes.",
    starter_code_hint:
      `# rotate half dims: x1, x2 = x.chunk(2, dim=-1); return torch.cat((-x2, x1), dim=-1) * sin + x * cos`,
    verification: [
      "pytest: RoPE output shape matches Q; rotating position m vs m+k changes dot product predictably",
      "smoke: 32 batch, 128 seq, 100 steps — loss finite and decreasing",
      "eval: val perplexity < 2.0 bits/char on Shakespeare (trend; paper used large-scale pretrain)",
      "ablation: RoPE curve below learned-pos curve on same step budget",
      "done when: eval.py PPL improves over epoch-0 and ablation shows RoPE wins",
    ],
  },
  {
    title: "Grouped-query attention block (GQA) from scratch",
    paper_ref: "GQA: Training Generalized Multi-Query Attention Models from Multi-Head Checkpoints",
    area: "llm",
    difficulty: "medium",
    estimated_hours: 12,
    learning_objective:
      "Map MHA → GQA by sharing K/V heads across Q groups and verify forward/backward matches a reference MHA on small tensors.",
    context:
      "Production LLMs trade full multi-head KV for grouped heads to shrink the KV cache. Implementing GQA teaches how head dimensions actually broadcast.",
    setup:
      "Synthetic data: random (B, T, d_model). d_model=256, n_heads=8, n_kv_heads=2. Compare against a slow reference loop before scaling.",
    tasks: [
      "Task 1: `GQAAttention` with separate Q (n_heads) and K/V (n_kv_heads) projections + `repeat_interleave` on K/V.",
      "Task 2: Numerical test: GQA vs expanded MHA on T=32 — max abs diff < 1e-5.",
      "Task 3: Plug into 2-layer transformer; train 5k steps on synthetic next-token task (fixed vocab 1k).",
      "Task 4: Ablate n_kv_heads: 8 vs 2 vs 1 — plot val loss and peak KV memory (bytes).",
      "Task 5: `eval.py` prints loss + estimated KV cache size per token.",
    ],
    stretch_goal: "Load equal-param MHA checkpoint and up-convert to GQA via mean-grouping K/V weights (paper's recipe).",
    key_pytorch_concepts: ["view/reshape heads", "repeat_interleave", "scaled_dot_product_attention"],
    debug_hints:
      "Wrong repeat factor (n_heads // n_kv_heads) gives silent shape bugs or duplicated heads — assert head divisibility at init.",
    starter_code_hint:
      `k = k.repeat_interleave(self.n_heads // self.n_kv_heads, dim=1)  # after (B, n_kv, T, d)`,
    verification: [
      "pytest: output shape (B,T,d_model); GQA matches reference on random input",
      "smoke: 1k steps synthetic LM — loss down 20%+",
      "eval: n_kv_heads=2 within 5% loss of n_kv_heads=8 at same steps (paper trend)",
      "ablation: KV bytes scale ~ n_kv_heads / n_heads",
      "done when: numerical test passes and memory plot matches theory",
    ],
  },
  {
    title: "GRPO on a toy math-word policy (no critic)",
    paper_ref: "DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models",
    area: "rl",
    difficulty: "medium",
    estimated_hours: 16,
    learning_objective:
      "Implement group-relative advantages and a clipped policy-gradient update without a value network.",
    context:
      "GRPO samples G completions per prompt, normalizes rewards within each group, and updates π toward high-relative samples. A tiny GPT-2-scale model on grade-school arithmetic with rule-based correctness reward is enough to see the mechanism.",
    setup:
      "Prompts: 500 GSM8K-style questions (or synthetic a+b=c). Policy: 4-layer transformer ~10M params. G=4 samples/prompt. Reward: +1 exact match else 0.",
    tasks: [
      "Task 1: `sample_group(prompt)` → G token sequences + logprobs under current policy.",
      "Task 2: `grpo_advantages(rewards)` → (r - mean_g) / (std_g + eps) per group.",
      "Task 3: `grpo_loss` with PPO-style clip ε=0.2; train 2k prompts × 4 epochs.",
      "Task 4: Ablate group norm → raw rewards; plot solve-rate vs steps.",
      "Task 5: `eval.py` reports pass@1 on held-out 100 problems.",
    ],
    stretch_goal: "Add KL penalty to frozen reference policy (DeepSeek-R1 recipe) and compare stability.",
    key_pytorch_concepts: ["torch.no_grad sampling", "logprob gather", "advantage normalization"],
    debug_hints:
      "If all rewards in a group are equal, advantages are zero — mix easy/hard prompts or add small format reward so groups have variance.",
    starter_code_hint:
      `adv = (r - r.mean(dim=1, keepdim=True)) / (r.std(dim=1, keepdim=True) + 1e-8)`,
    verification: [
      "pytest: advantages mean≈0 std≈1 per group; loss finite with zero-variance guard",
      "smoke: 50 prompts, G=4, 20 update steps — no NaN",
      "eval: solve-rate improves vs random init (paper reports large gains at scale; you need positive trend)",
      "ablation: group-norm curve beats raw-reward curve",
      "done when: pass@1 on holdout > init + ablation confirms group norm helps",
    ],
  },
  {
    title: "DPO alignment on pairwise preferences (tiny LM)",
    paper_ref: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
    area: "rl",
    difficulty: "medium",
    estimated_hours: 14,
    learning_objective:
      "Implement the DPO loss on token log-probabilities with a frozen reference model and β temperature.",
    context:
      "DPO skips reward modeling and PPO by optimizing preferences directly. A 2-layer LM on synthetic (good_summary, bad_summary) pairs shows why β and the reference model matter.",
    setup:
      "Build 2k preference pairs (prompt, chosen, rejected) from templated text or Anthropic HH subset — truncate to 128 tokens. β=0.1. Reference = copy of init frozen.",
    tasks: [
      "Task 1: `sequence_logprob(model, ids)` summed over non-pad tokens.",
      "Task 2: `dpo_loss(π_θ, π_ref, chosen, rejected)` per Rafailov Eq. 5; mean over batch.",
      "Task 3: Train policy 3 epochs; track implicit reward margin on val set.",
      "Task 4: Ablate β ∈ {0.01, 0.1, 0.5} — plot chosen-vs-rejected logprob gap.",
      "Task 5: `eval.py` reports % pairs where logp(chosen) > logp(rejected).",
    ],
    stretch_goal: "Compare one epoch of DPO vs reward-weighted SFT on chosen-only — same compute budget.",
    key_pytorch_concepts: ["log_softmax gather", "stop-gradient ref", "Bradley-Terry loss"],
    debug_hints:
      "Forgetting reference KL: policy collapses to high-confidence garbage — if val chosen logprob explodes while rejected does too, lower β or add SFT mix.",
    starter_code_hint:
      `logits = -(beta * (logp_w - logp_l - ref_w + ref_l)).sigmoid().log()`,
    verification: [
      "pytest: DPO loss decreases when chosen logp artificially boosted on dummy batch",
      "smoke: 64 pairs, 50 steps — loss finite",
      "eval: >65% pairs prefer chosen on val (paper-scale tasks hit higher; trend matters)",
      "ablation: β=0.1 beats β=0.01 on margin without collapse",
      "done when: val pair-accuracy beats init checkpoint",
    ],
  },
];
