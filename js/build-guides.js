/**
 * Default build guides for starter assignments.
 * Shown in the Monaco editor when no saved code exists.
 */

import { slugTitle } from "./code-store.js";

const BUILD_GUIDES = {
  "rope-causal-self-attention-on-a-char-level-lm": `# ═══════════════════════════════════════════════════════════════════
# BUILD GUIDE: RoPE causal self-attention on a char-level LM
# Paper: RoFormer — Rotary Position Embedding
# Goal: 4-layer char LM on Tiny Shakespeare; val perplexity beats baseline
# Run when done: python assignment.py
# ═══════════════════════════════════════════════════════════════════

# ─── STEP 0 — Single-file layout ───────────────────────────────────
# Use ONE file only: assignment.py
# Put modules, training loop, eval helper, and inline assert checks in that file.
# Do not create packages, tests/, train.py, or eval.py for this editor workflow.
# Dataset: Tiny Shakespeare (~1MB text file). Char tokenizer, vocab < 256.

# ─── STEP 1 — RotaryEmbedding (Task 1) ─────────────────────────────
# In assignment.py, build class RotaryEmbedding(nn.Module):
#   __init__(head_dim, max_seq_len=2048, base=10000.0)
#     - assert head_dim % 2 == 0
#     - precompute inv_freq; register_buffer cos/sin for positions 0..max_seq_len-1
#   forward(seq_len, device) → (cos, sin), each shape (seq_len, head_dim)
#
# Then function apply_rotary_pos_emb(q, k, cos, sin):
#   - q, k: (B, n_heads, T, head_dim)
#   - rotate pairs of dims (half-split trick); return q_rot, k_rot same shape
#
# INLINE CHECKS at the bottom of assignment.py:
#   - output shapes match input
#   - vector norm preserved per position
#   - dot(q[m], k[n]) changes when you shift position index

# ─── STEP 2 — CausalSelfAttention + block (Task 2) ─────────────────
# class CausalSelfAttention(nn.Module):
#   - Q,K,V,O projections; n_heads; apply RoPE to Q,K before scores
#   - causal mask: upper triangle -inf before softmax
#   - forward(x: B,T,d_model) → B,T,d_model
#
# class TransformerBlock: pre-norm attention + pre-norm MLP (4x expansion)
# class CharLM: embed + N blocks + lm_head → logits (B,T,vocab)

# ─── STEP 3 — Train (Task 3) ───────────────────────────────────────
# In the same file: AdamW, cross-entropy on next char, seq_len=128, ~20k-50k steps
# Log train loss + val perplexity every N steps
# SUCCESS TREND: val PPL clearly below epoch-0 random baseline

# ─── STEP 4 — Ablation (Task 4) ────────────────────────────────────
# Same model width/depth but REPLACE RoPE with learned absolute nn.Embedding positions
# Plot val PPL vs steps: RoPE curve should beat learned-pos (same step budget)

# ─── STEP 5 — Eval helper (Task 5) ─────────────────────────────────
# In the same file, add a function that reports bits-per-char or perplexity
# on a held-out text chunk
# Print one number you can compare week-to-week

# ─── STRETCH (optional) ──────────────────────────────────────────────
# Swap attention to GQA (fewer KV heads); log KV cache bytes per token vs full MHA

`,

  "grouped-query-attention-block-gqa-from-scratch": `# ═══════════════════════════════════════════════════════════════════
# BUILD GUIDE: Grouped-query attention (GQA) from scratch
# Paper: GQA — Training Generalized Multi-Query Attention Models...
# Goal: GQA matches reference MHA numerically; KV memory scales with n_kv_heads
# ═══════════════════════════════════════════════════════════════════

# ─── STEP 0 — Setup ────────────────────────────────────────────────
# Use ONE file only: assignment.py
# Put GQAAttention, the tiny model, inline checks, train loop, and eval printout in it.
# Defaults: d_model=256, n_heads=8, n_kv_heads=2, head_dim=32

# ─── STEP 1 — GQAAttention (Task 1) ────────────────────────────────
# class GQAAttention(nn.Module):
#   __init__(d_model, n_heads, n_kv_heads):
#     - assert n_heads % n_kv_heads == 0
#     - n_rep = n_heads // n_kv_heads
#     - separate Linear for Q → (B,T,n_heads,hd)
#     - K,V → (B,T,n_kv_heads,hd) then repeat_interleave on head dim to match Q
#   forward(x) → (B,T,d_model) via scaled_dot_product_attention or manual softmax
#
# WRITE DOWN: expected KV cache bytes ∝ n_kv_heads (not n_heads)

# ─── STEP 2 — Numerical match (Task 2) ─────────────────────────────
# reference_mha_forward(x): slow correct MHA with n_heads KV heads
# Random x shape (2, 32, 256): assert max_abs_diff(gqa, ref) < 1e-5

# ─── STEP 3 — Tiny LM train (Task 3) ───────────────────────────────
# 2-layer TinyLM with GQA; synthetic vocab=1000, random next-token labels
# 5k steps — loss should drop >20% from step 0

# ─── STEP 4 — Ablation (Task 4) ────────────────────────────────────
# Train/eval with n_kv_heads in {8, 2, 1} — plot val loss + kv_cache_bytes()
# EXPECT: n_kv_heads=2 within ~5% loss of 8; bytes scale ~ n_kv_heads/n_heads

# ─── STEP 5 — Eval printout (Task 5) ───────────────────────────────
# In the same file, print val_loss and kv_bytes_per_token for current config

`,

  "grpo-on-a-toy-math-word-policy-no-critic": `# ═══════════════════════════════════════════════════════════════════
# BUILD GUIDE: GRPO on a toy math-word policy (no critic)
# Paper: DeepSeekMath — Group Relative Policy Optimization
# Goal: group-normalized advantages + clipped policy loss; pass@1 improves
# ═══════════════════════════════════════════════════════════════════

# ─── STEP 0 — Setup ────────────────────────────────────────────────
# Use ONE file only: assignment.py
# Put PolicyLM, GRPO helpers, inline checks, training loop, and eval in it.
# ~500 prompts like "12+7=" ; rule reward +1 exact answer else 0; G=4 samples/prompt

# ─── STEP 1 — Policy + sampling (Task 1) ───────────────────────────
# class PolicyLM: small transformer LM
#   generate(prompt_ids, max_new_tokens) → full_ids, sum_logprobs (generated tokens only)
# sample_group(policy, prompt, G=4) → list of GroupSample(dataclass):
#   prompt_ids, completion_ids, logprob, reward

# ─── STEP 2 — Advantages (Task 2) ──────────────────────────────────
# grpo_advantages(rewards: B,G tensor):
#   (r - mean_group) / (std_group + eps)
#   if std < eps for a row → zeros (no update noise)
# TEST: per-row mean≈0, std≈1

# ─── STEP 3 — Loss + train (Task 3) ────────────────────────────────
# grpo_loss(logprobs, old_logprobs, advantages, clip_eps=0.2): PPO-style clip
# train loop: sample groups → backward → optimizer step
# CONFIG flag normalize_group=True; log mean_reward each epoch

# ─── STEP 4 — Ablation (Task 4) ────────────────────────────────────
# Run with normalize_group=False (raw rewards as advantages)
# Plot solve-rate vs steps — group norm curve should win

# ─── STEP 5 — Eval helper (Task 5) ─────────────────────────────────
# In the same file, compute pass@1 on 100 held-out prompts

# ─── STRETCH ───────────────────────────────────────────────────────
# Add KL to frozen reference policy; compare training stability

`,

  "dpo-alignment-on-pairwise-preferences-tiny-lm": `# ═══════════════════════════════════════════════════════════════════
# BUILD GUIDE: DPO alignment on pairwise preferences (tiny LM)
# Paper: Direct Preference Optimization (Rafailov et al., NeurIPS 2023)
# Goal: DPO loss on token logprobs; val pair-accuracy > init
# ═══════════════════════════════════════════════════════════════════

# ─── STEP 0 — Setup ────────────────────────────────────────────────
# Use ONE file only: assignment.py
# Put the model, loss, inline checks, training loop, and eval in it.
# 2k pairs (prompt, chosen, rejected); truncate 128 tokens; β=0.1
# reference = copy of init policy, all params frozen (requires_grad=False)

# ─── STEP 1 — sequence_logprob (Task 1) ────────────────────────────
# def sequence_logprob(model, input_ids, mask):
#   sum of log pi(token_t | prefix) over positions where mask==1
#   return shape (B,)

# ─── STEP 2 — dpo_loss (Task 2) ────────────────────────────────────
# Inputs: policy, reference, chosen/rejected ids + masks
# pi_c, pi_r, ref_c, ref_r = sequence_logprob for each
# loss = -log sigmoid( β * ((pi_c - pi_r) - (ref_c - ref_r)) ).mean()
# TEST: artificially boost chosen logp → loss decreases

# ─── STEP 3 — Train (Task 3) ─────────────────────────────────────────
# 3 epochs; log train loss + val implicit margin + pair_accuracy

# ─── STEP 4 — Ablation β (Task 4) ────────────────────────────────────
# β in {0.01, 0.1, 0.5} — plot chosen-rejected logp gap; pick stable β

# ─── STEP 5 — Eval helper (Task 5) ─────────────────────────────────
# In the same file, compute pair_accuracy on the validation set
# DONE: beat init checkpoint (paper-scale uses higher %; you need upward trend)

`,
};

/** @deprecated use getBuildGuide */
export function getHarness(title) {
  return getBuildGuide(title);
}

export function getBuildGuide(title) {
  return BUILD_GUIDES[slugTitle(title)] || "";
}
