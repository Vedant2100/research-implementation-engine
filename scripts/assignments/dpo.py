# Project: DPO alignment pipeline from scratch
# Paper: Direct Preference Optimization: Your Language Model is Secretly a Reward Model (Rafailov et al., NeurIPS 2023)
# Goal: implement a tiny LM plus the FULL alignment pipeline (preference data, DPO training with a frozen reference, evaluation)
# Compute: CPU is enough at the tiny config used by the tests
# Rule: keep this as ONE file.
# Run when done: python assignment.py

import copy
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset


# =========================
# STUDENT CODE STARTS HERE
# =========================


class TokenEmbedding(nn.Module):
    def __init__(self, vocab_size, embed_dim, max_seq_len):
        super().__init__()
        raise AssertionError("TODO: implement TokenEmbedding.__init__")

    def forward(self, idx):
        raise AssertionError("TODO: implement TokenEmbedding.forward")


class CausalSelfAttention(nn.Module):
    def __init__(self, embed_dim, num_heads, max_seq_len):
        super().__init__()
        raise AssertionError("TODO: implement CausalSelfAttention.__init__")

    def forward(self, x):
        raise AssertionError("TODO: implement CausalSelfAttention.forward")


class MLPBlock(nn.Module):
    def __init__(self, embed_dim, mlp_ratio):
        super().__init__()
        raise AssertionError("TODO: implement MLPBlock.__init__")

    def forward(self, x):
        raise AssertionError("TODO: implement MLPBlock.forward")


class TransformerBlock(nn.Module):
    def __init__(self, embed_dim, num_heads, mlp_ratio, max_seq_len):
        super().__init__()
        raise AssertionError("TODO: implement TransformerBlock.__init__")

    def forward(self, x):
        raise AssertionError("TODO: implement TransformerBlock.forward")


class TinyLM(nn.Module):
    def __init__(self, vocab_size, max_seq_len, embed_dim, depth, num_heads, mlp_ratio):
        super().__init__()
        raise AssertionError("TODO: implement TinyLM.__init__")

    def forward(self, idx):
        raise AssertionError("TODO: implement TinyLM.forward")


def sequence_logprob(model, sequence_ids, prompt_len):
    raise AssertionError("TODO: implement sequence_logprob (sum log-prob of completion tokens only, after the prompt)")


def dpo_loss(policy, reference, chosen_ids, rejected_ids, prompt_len, beta):
    raise AssertionError("TODO: implement dpo_loss using sequence_logprob and the Rafailov objective")


def get_dataloaders(num_train, num_val, vocab_size, seq_len, prompt_len, batch_size):
    raise AssertionError("TODO: implement get_dataloaders that yields (chosen_ids, rejected_ids)")


def train_one_epoch(policy, reference, loader, optimizer, device, beta, prompt_len):
    raise AssertionError("TODO: implement train_one_epoch for DPO")


def evaluate(policy, reference, loader, device, prompt_len):
    raise AssertionError("TODO: implement evaluate returning pair_accuracy (fraction where seq_logprob(chosen) > seq_logprob(rejected) under policy)")


def run_pipeline():
    raise AssertionError("TODO: implement run_pipeline that builds policy + frozen reference, runs DPO training, evaluates, and returns dict with train_loss and pair_accuracy")


# =========================
# STUDENT CODE ENDS HERE
# TESTS START BELOW
# =========================


TINY_CONFIG = dict(
    vocab_size=32,
    max_seq_len=16,
    embed_dim=64,
    depth=2,
    num_heads=4,
    mlp_ratio=2,
)
BETA = 0.1
PROMPT_LEN = 4


def test_tinylm_forward_shape():
    model = TinyLM(**TINY_CONFIG)
    idx = torch.randint(0, TINY_CONFIG["vocab_size"], (2, TINY_CONFIG["max_seq_len"]))
    logits = model(idx)
    expected = (2, TINY_CONFIG["max_seq_len"], TINY_CONFIG["vocab_size"])
    assert logits.shape == expected, f"logits shape was {logits.shape}, expected {expected}"
    assert torch.isfinite(logits).all(), "logits contain NaN/inf"


def test_dpo_loss_decreases_on_one_batch():
    torch.manual_seed(0)
    policy = TinyLM(**TINY_CONFIG)
    reference = copy.deepcopy(policy)
    for p in reference.parameters():
        p.requires_grad_(False)
    chosen = torch.randint(0, TINY_CONFIG["vocab_size"], (4, TINY_CONFIG["max_seq_len"]))
    rejected = torch.randint(0, TINY_CONFIG["vocab_size"], (4, TINY_CONFIG["max_seq_len"]))
    optimizer = torch.optim.AdamW(policy.parameters(), lr=3e-3)
    initial = dpo_loss(policy, reference, chosen, rejected, PROMPT_LEN, BETA).item()
    for _ in range(80):
        optimizer.zero_grad()
        loss = dpo_loss(policy, reference, chosen, rejected, PROMPT_LEN, BETA)
        loss.backward()
        optimizer.step()
    final = dpo_loss(policy, reference, chosen, rejected, PROMPT_LEN, BETA).item()
    assert final < initial - 0.05, f"final dpo loss {final:.4f} should be lower than initial {initial:.4f}"


def test_pipeline_runs_and_reports_metrics():
    torch.manual_seed(0)
    result = run_pipeline()
    assert isinstance(result, dict), "run_pipeline must return a dict"
    assert "train_loss" in result, "result must contain train_loss"
    assert "pair_accuracy" in result, "result must contain pair_accuracy"
    pa = float(result["pair_accuracy"])
    assert 0.0 <= pa <= 1.0, f"pair_accuracy out of range: {pa}"


def run_all_tests():
    print("Running DPO pipeline checks...")
    test_tinylm_forward_shape()
    print("1/3 TinyLM forward shape passed")
    test_dpo_loss_decreases_on_one_batch()
    print("2/3 DPO loss decreases on a fixed batch")
    test_pipeline_runs_and_reports_metrics()
    print("3/3 end-to-end pipeline returns metrics")
    print("All checks passed. You can mark this assignment done.")


if __name__ == "__main__":
    run_all_tests()
