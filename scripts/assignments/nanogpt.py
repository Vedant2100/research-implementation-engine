# Project: GPT decoder-only language model from scratch
# Paper: Attention Is All You Need (Vaswani et al., 2017) + Language Models are Unsupervised Multitask Learners (Radford et al., 2019)
# Goal: implement the full causal transformer LM architecture AND the end-to-end pretraining pipeline
# Compute: CPU is enough at the tiny config used by the tests
# Rule: keep this as ONE file.
# Run when done: python assignment.py

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


class GPT(nn.Module):
    def __init__(self, vocab_size, max_seq_len, embed_dim, depth, num_heads, mlp_ratio):
        super().__init__()
        raise AssertionError("TODO: implement GPT.__init__")

    def forward(self, idx):
        raise AssertionError("TODO: implement GPT.forward")


def get_dataloaders(num_train, num_val, vocab_size, seq_len, batch_size):
    raise AssertionError("TODO: implement get_dataloaders")


def train_one_epoch(model, loader, optimizer, device):
    raise AssertionError("TODO: implement train_one_epoch")


def evaluate(model, loader, device):
    raise AssertionError("TODO: implement evaluate")


def run_pipeline():
    raise AssertionError("TODO: implement run_pipeline that wires data, model, optimizer, training and evaluation, and returns a dict with train_loss and val_loss")


# =========================
# STUDENT CODE ENDS HERE
# TESTS START BELOW
# =========================


TINY_CONFIG = dict(
    vocab_size=64,
    max_seq_len=16,
    embed_dim=64,
    depth=2,
    num_heads=4,
    mlp_ratio=2,
)


def test_gpt_forward_shape():
    model = GPT(**TINY_CONFIG)
    idx = torch.randint(0, TINY_CONFIG["vocab_size"], (2, TINY_CONFIG["max_seq_len"]))
    logits = model(idx)
    expected = (2, TINY_CONFIG["max_seq_len"], TINY_CONFIG["vocab_size"])
    assert logits.shape == expected, f"logits shape was {logits.shape}, expected {expected}"
    assert torch.isfinite(logits).all(), "logits contain NaN/inf"


def test_gpt_overfits_one_batch():
    torch.manual_seed(0)
    model = GPT(**TINY_CONFIG)
    idx = torch.randint(0, TINY_CONFIG["vocab_size"], (4, TINY_CONFIG["max_seq_len"]))
    targets = torch.randint(0, TINY_CONFIG["vocab_size"], (4, TINY_CONFIG["max_seq_len"]))
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-3)
    V = TINY_CONFIG["vocab_size"]
    initial = F.cross_entropy(model(idx).reshape(-1, V), targets.reshape(-1)).item()
    for _ in range(80):
        optimizer.zero_grad()
        loss = F.cross_entropy(model(idx).reshape(-1, V), targets.reshape(-1))
        loss.backward()
        optimizer.step()
    final = F.cross_entropy(model(idx).reshape(-1, V), targets.reshape(-1)).item()
    assert final < 0.5 * initial, f"final loss {final:.4f} should be much lower than initial {initial:.4f}"


def test_pipeline_runs_and_reports_metrics():
    torch.manual_seed(0)
    result = run_pipeline()
    assert isinstance(result, dict), "run_pipeline must return a dict"
    assert "train_loss" in result and "val_loss" in result, "result must contain train_loss and val_loss"
    val_loss = float(result["val_loss"])
    assert val_loss == val_loss, "val_loss is NaN"


def run_all_tests():
    print("Running GPT pipeline checks...")
    test_gpt_forward_shape()
    print("1/3 GPT forward shape passed")
    test_gpt_overfits_one_batch()
    print("2/3 model can overfit a single batch")
    test_pipeline_runs_and_reports_metrics()
    print("3/3 end-to-end pipeline returns metrics")
    print("All checks passed. You can mark this assignment done.")


if __name__ == "__main__":
    run_all_tests()
