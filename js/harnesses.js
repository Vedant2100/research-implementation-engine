/**
 * Default code harnesses for starter assignments.
 * Shown in the Monaco editor when no saved code exists (click Code on a card).
 */

import { slugTitle } from "./code-store.js";

const HARNESSES = {
  "rope-causal-self-attention-on-a-char-level-lm": `# rope_lm/ — RoFormer (RoPE) char-level LM
# Run: pytest tests/test_rope.py  |  python train.py  |  python eval.py

from __future__ import annotations

import math
from dataclasses import dataclass

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch import Tensor


# ─── Task 1: RoPE ───────────────────────────────────────────────────────────

class RotaryEmbedding(nn.Module):
    """
    Precompute cos/sin tables for positions [0, max_seq_len).

    forward(seq_len) -> (cos, sin) each (seq_len, head_dim)
    """

    def __init__(self, head_dim: int, max_seq_len: int = 2048, base: float = 10000.0) -> None:
        super().__init__()
        assert head_dim % 2 == 0, "head_dim must be even for RoPE"
        self.head_dim = head_dim
        # TODO: register_buffer inv_freq, build cos/sin caches

    def forward(self, seq_len: int, device: torch.device) -> tuple[Tensor, Tensor]:
        """Returns cos, sin shaped (seq_len, head_dim)."""
        raise NotImplementedError


def apply_rotary_pos_emb(q: Tensor, k: Tensor, cos: Tensor, sin: Tensor) -> tuple[Tensor, Tensor]:
    """
    Rotate Q/K along last dim.

    Args:
        q, k: (batch, n_heads, seq_len, head_dim)
        cos, sin: (seq_len, head_dim) broadcastable to q/k
    Returns:
        q_rot, k_rot: same shape as q, k; norm preserved per pair of dims
    """
    raise NotImplementedError


# ─── Task 2: Causal attention + block ───────────────────────────────────────

class CausalSelfAttention(nn.Module):
    """
    Multi-head self-attention with RoPE and causal mask.

    forward(x) -> (batch, seq_len, d_model)
    """

    def __init__(
        self,
        d_model: int,
        n_heads: int,
        max_seq_len: int,
        dropout: float = 0.1,
    ) -> None:
        super().__init__()
        assert d_model % n_heads == 0
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads
        # TODO: q_proj, k_proj, v_proj, out_proj, rope, dropout

    def forward(self, x: Tensor) -> Tensor:
        """
        Args:
            x: (B, T, d_model)
        Returns:
            (B, T, d_model)
        """
        raise NotImplementedError


class TransformerBlock(nn.Module):
    """Pre-norm: LN -> attention -> residual -> LN -> MLP -> residual."""

    def __init__(self, d_model: int, n_heads: int, max_seq_len: int, mlp_ratio: int = 4) -> None:
        super().__init__()
        # TODO: ln1, attn, ln2, mlp (Linear-GELU-Linear)

    def forward(self, x: Tensor) -> Tensor:
        raise NotImplementedError


class CharLM(nn.Module):
    """
    Token embedding + N blocks + LM head.

    forward(idx) -> logits (B, T, vocab_size)
    """

    def __init__(
        self,
        vocab_size: int,
        d_model: int,
        n_heads: int,
        n_layers: int,
        max_seq_len: int,
    ) -> None:
        super().__init__()
        # TODO

    def forward(self, idx: Tensor) -> Tensor:
        raise NotImplementedError


# ─── Task 3–5: train / eval ───────────────────────────────────────────────────

@dataclass
class TrainConfig:
    data_path: str = "data/tiny_shakespeare.txt"
    batch_size: int = 32
    seq_len: int = 128
    lr: float = 3e-4
    max_steps: int = 5000
    use_rope: bool = True  # Task 4: set False for learned-pos ablation


def train(config: TrainConfig) -> dict[str, list[float]]:
    """
    Returns {"train_loss": [...], "val_ppl": [...]} for plotting.
    """
    raise NotImplementedError


def perplexity(model: CharLM, data: Tensor, seq_len: int) -> float:
    """Bits per character or exp(cross_entropy); document which you use in eval.py."""
    raise NotImplementedError


if __name__ == "__main__":
    # smoke: 100 steps, tiny subset
    pass
`,

  "grouped-query-attention-block-gqa-from-scratch": `# gqa/ — Grouped-query attention (Ainslie et al.)
# Run: pytest tests/test_gqa.py  |  python train.py  |  python eval.py

from __future__ import annotations

from dataclasses import dataclass

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch import Tensor


# ─── Task 1–2: GQA attention ────────────────────────────────────────────────

class GQAAttention(nn.Module):
    """
    n_heads query heads, n_kv_heads key/value heads (n_heads % n_kv_heads == 0).

    forward(x) -> (B, T, d_model)
    KV cache footprint scales with n_kv_heads (Task 4).
    """

    def __init__(
        self,
        d_model: int,
        n_heads: int,
        n_kv_heads: int,
        dropout: float = 0.0,
    ) -> None:
        super().__init__()
        assert d_model % n_heads == 0
        assert n_heads % n_kv_heads == 0, "n_heads must divide n_kv_heads"
        self.n_heads = n_heads
        self.n_kv_heads = n_kv_heads
        self.head_dim = d_model // n_heads
        self.n_rep = n_heads // n_kv_heads
        # TODO: q_proj -> (B,T,n_heads,hd); k_proj,v_proj -> (B,T,n_kv_heads,hd)

    def forward(self, x: Tensor, attn_mask: Tensor | None = None) -> Tensor:
        """
        Args:
            x: (B, T, d_model)
            attn_mask: optional (T, T) bool, True = allow attend
        Returns:
            (B, T, d_model)
        """
        raise NotImplementedError


def reference_mha_forward(
    x: Tensor, d_model: int, n_heads: int
) -> Tensor:
    """Slow but correct MHA for numerical test (Task 2). Same shapes as GQA output."""
    raise NotImplementedError


def max_abs_diff(a: Tensor, b: Tensor) -> float:
    """Task 2: assert max_abs_diff(gqa_out, ref_out) < 1e-5"""
    return (a - b).abs().max().item()


# ─── Task 3: tiny LM ──────────────────────────────────────────────────────────

class TinyBlock(nn.Module):
    def __init__(self, d_model: int, n_heads: int, n_kv_heads: int) -> None:
        super().__init__()
        self.ln = nn.LayerNorm(d_model)
        self.attn = GQAAttention(d_model, n_heads, n_kv_heads)
        # TODO: MLP

    def forward(self, x: Tensor) -> Tensor:
        raise NotImplementedError


class TinyLM(nn.Module):
    def __init__(
        self,
        vocab_size: int = 1000,
        d_model: int = 256,
        n_heads: int = 8,
        n_kv_heads: int = 2,
        n_layers: int = 2,
    ) -> None:
        super().__init__()
        # TODO

    def forward(self, idx: Tensor) -> Tensor:
        """logits (B, T, vocab_size)"""
        raise NotImplementedError


# ─── Task 4–5: memory + eval ──────────────────────────────────────────────────

def kv_cache_bytes(
    batch: int,
    seq_len: int,
    n_kv_heads: int,
    head_dim: int,
    dtype: torch.dtype = torch.float16,
) -> int:
    """
    Task 4/5: estimated KV cache size for one layer (K+V).
    Returns bytes (document formula in eval.py).
    """
    bytes_per_elem = {torch.float16: 2, torch.float32: 4, torch.bfloat16: 2}[dtype]
    return 2 * batch * seq_len * n_kv_heads * head_dim * bytes_per_elem


@dataclass
class TrainConfig:
    steps: int = 5000
    batch_size: int = 32
    seq_len: int = 64
    n_kv_heads: int = 2


def train(config: TrainConfig) -> dict[str, float]:
    """Returns {"final_loss": float} on synthetic next-token data."""
    raise NotImplementedError


def eval_loss_and_memory(config: TrainConfig) -> dict[str, float]:
    """
    Task 5: returns e.g. {"val_loss": 2.1, "kv_bytes_per_token": 4096}
    """
    raise NotImplementedError
`,

  "grpo-on-a-toy-math-word-policy-no-critic": `# grpo/ — Group Relative Policy Optimization (DeepSeekMath)
# Run: pytest tests/test_grpo.py  |  python train.py  |  python eval.py

from __future__ import annotations

from dataclasses import dataclass

import torch
import torch.nn as nn
from torch import Tensor


# ─── Policy (tiny transformer) ────────────────────────────────────────────────

class PolicyLM(nn.Module):
    """
    Autoregressive LM for math-word prompts.

    generate(prompt_ids, max_new_tokens) -> (token_ids, logprobs)
    logprob_of_sequence(ids) -> (total_logprob,) per batch item
    """

    def __init__(self, vocab_size: int, d_model: int, n_layers: int = 4) -> None:
        super().__init__()
        # TODO: embed, blocks, lm_head

    def forward(self, idx: Tensor) -> Tensor:
        """logits (B, T, vocab)"""
        raise NotImplementedError

    @torch.no_grad()
    def generate(
        self, prompt_ids: Tensor, max_new_tokens: int, temperature: float = 1.0
    ) -> tuple[Tensor, Tensor]:
        """
        Args:
            prompt_ids: (B, T_prompt)
        Returns:
            full_ids: (B, T_prompt + new)
            sum_logprobs: (B,) log pi(a|s) over generated tokens only
        """
        raise NotImplementedError


# ─── Task 1: group sampling ───────────────────────────────────────────────────

@dataclass
class GroupSample:
    """One completion in a GRPO group."""
    prompt_ids: Tensor      # (T_prompt,)
    completion_ids: Tensor  # (T_new,)
    logprob: float          # scalar
    reward: float           # scalar, e.g. +1 exact answer else 0


def rule_reward(prompt: str, completion: str) -> float:
    """Parse 'a+b=' style prompt; +1.0 if completion matches int answer."""
    raise NotImplementedError


def sample_group(
    policy: PolicyLM,
    prompt_ids: Tensor,
    group_size: int,
    max_new_tokens: int,
) -> list[GroupSample]:
    """
    Task 1: draw G completions for one prompt.

    Returns:
        list of length G with logprobs and rewards filled
    """
    raise NotImplementedError


# ─── Task 2: advantages ───────────────────────────────────────────────────────

def grpo_advantages(rewards: Tensor, eps: float = 1e-8) -> Tensor:
    """
    Args:
        rewards: (B, G) one row per prompt, G samples per group
    Returns:
        advantages: (B, G) with mean~0, std~1 along dim=1
        If std < eps for a row, return zeros for that row (no gradient noise).
    """
    raise NotImplementedError


# ─── Task 3: clipped policy loss ─────────────────────────────────────────────

def grpo_loss(
    logprobs: Tensor,
    old_logprobs: Tensor,
    advantages: Tensor,
    clip_eps: float = 0.2,
) -> Tensor:
    """
    PPO-style clipped surrogate, mean over batch*group.

    Args:
        logprobs, old_logprobs, advantages: (B, G)
    Returns:
        scalar loss to minimize (negative surrogate)
    """
    raise NotImplementedError


@dataclass
class GRPOConfig:
    group_size: int = 4
    clip_eps: float = 0.2
    lr: float = 1e-4
    epochs: int = 4
    normalize_group: bool = True  # Task 4 ablation: False = raw rewards


def train_step(
    policy: PolicyLM,
    optimizer: torch.optim.Optimizer,
    batch_prompts: list[Tensor],
    config: GRPOConfig,
) -> dict[str, float]:
    """
    One optimizer step over a batch of prompts.

    Returns:
        {"loss": float, "mean_reward": float, "mean_adv_std": float}
    """
    raise NotImplementedError


def train(config: GRPOConfig) -> list[dict[str, float]]:
    """Full loop; log solve-rate each epoch for Task 4 plots."""
    raise NotImplementedError


# ─── Task 5: eval ─────────────────────────────────────────────────────────────

def pass_at_one(policy: PolicyLM, eval_prompts: list[str]) -> float:
    """
    Task 5: fraction of prompts where first greedy decode is correct.
    Returns float in [0, 1].
    """
    raise NotImplementedError
`,

  "dpo-alignment-on-pairwise-preferences-tiny-lm": `# dpo/ — Direct Preference Optimization (Rafailov et al.)
# Run: pytest tests/test_dpo.py  |  python train.py  |  python eval.py

from __future__ import annotations

from dataclasses import dataclass

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch import Tensor


# ─── Task 1: sequence logprob ───────────────────────────────────────────────

class TinyLM(nn.Module):
    def __init__(self, vocab_size: int, d_model: int, n_layers: int = 2) -> None:
        super().__init__()
        # TODO

    def forward(self, idx: Tensor) -> Tensor:
        """logits (B, T, vocab)"""
        raise NotImplementedError


def sequence_logprob(
    model: TinyLM,
    input_ids: Tensor,
    attention_mask: Tensor | None = None,
) -> Tensor:
    """
    Sum log pi(token_t | prefix) over non-masked positions.

    Args:
        input_ids: (B, T) full sequence (prompt + response)
        attention_mask: (B, T) 1 = include in loss, 0 = pad
    Returns:
        (B,) total log probability per sequence
    """
    raise NotImplementedError


# ─── Task 2: DPO loss ────────────────────────────────────────────────────────

def dpo_loss(
    policy: TinyLM,
    reference: TinyLM,
    chosen_ids: Tensor,
    rejected_ids: Tensor,
    chosen_mask: Tensor,
    rejected_mask: Tensor,
    beta: float = 0.1,
) -> Tensor:
    """
    Rafailov et al. Eq. 5 — mean over batch.

    Args:
        policy: trainable pi_theta
        reference: frozen pi_ref (eval mode, no grad)
        chosen_ids, rejected_ids: (B, T)
        chosen_mask, rejected_mask: (B, T)
    Returns:
        scalar loss (minimize)
    """
    pi_chosen = sequence_logprob(policy, chosen_ids, chosen_mask)
    pi_rejected = sequence_logprob(policy, rejected_ids, rejected_mask)
    ref_chosen = sequence_logprob(reference, chosen_ids, chosen_mask)
    ref_rejected = sequence_logprob(reference, rejected_ids, rejected_mask)
    # TODO: logits = beta * ((pi_c - pi_r) - (ref_c - ref_r)); return -logsigmoid(logits).mean()
    raise NotImplementedError


@dataclass
class PreferenceBatch:
    """One preference pair."""
    prompt_ids: Tensor
    chosen_ids: Tensor
    rejected_ids: Tensor
    chosen_mask: Tensor
    rejected_mask: Tensor


@dataclass
class DPOConfig:
    beta: float = 0.1
    lr: float = 5e-5
    epochs: int = 3
    batch_size: int = 8


# ─── Task 3–5: train / eval ───────────────────────────────────────────────────

def train(
    policy: TinyLM,
    reference: TinyLM,
    train_pairs: list[PreferenceBatch],
    val_pairs: list[PreferenceBatch],
    config: DPOConfig,
) -> dict[str, list[float]]:
    """
    Returns:
        {
          "loss": [...],
          "val_pair_accuracy": [...],  # % chosen logp > rejected logp
          "implicit_margin": [...],    # mean(pi_c - pi_r - ref_c + ref_r)
        }
    """
    raise NotImplementedError


def pair_accuracy(
    policy: TinyLM,
    pairs: list[PreferenceBatch],
) -> float:
    """
    Task 5: fraction where log p_pi(chosen) > log p_pi(rejected).
    Returns float in [0, 1].
    """
    raise NotImplementedError


def copy_reference(policy: TinyLM) -> TinyLM:
    """Deep copy + freeze all params for pi_ref."""
    raise NotImplementedError
`,
};

export function getHarness(title) {
  return HARNESSES[slugTitle(title)] || "";
}

export function listHarnessTitles() {
  return Object.keys(HARNESSES);
}
