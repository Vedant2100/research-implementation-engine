# Project: Mixture-of-Experts (MoE) decoder LM from scratch
# Paper: Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity (Fedus, Zoph, Shazeer, 2021)
# Goal: implement the full sparse MoE transformer architecture AND the end-to-end pretraining pipeline with a load-balancing loss
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


class ExpertMLP(nn.Module):
    def __init__(self, embed_dim, mlp_dim):
        super().__init__()
        raise AssertionError("TODO: implement ExpertMLP.__init__")

    def forward(self, x):
        raise AssertionError("TODO: implement ExpertMLP.forward")


class TopKRouter(nn.Module):
    def __init__(self, embed_dim, num_experts, top_k):
        super().__init__()
        raise AssertionError("TODO: implement TopKRouter.__init__")

    def forward(self, x):
        raise AssertionError("TODO: implement TopKRouter.forward")


class SparseMoE(nn.Module):
    def __init__(self, embed_dim, num_experts, top_k, mlp_dim):
        super().__init__()
        raise AssertionError("TODO: implement SparseMoE.__init__")

    def forward(self, x):
        raise AssertionError("TODO: implement SparseMoE.forward")


class MoETransformerBlock(nn.Module):
    def __init__(self, embed_dim, num_heads, num_experts, top_k, mlp_dim, max_seq_len):
        super().__init__()
        raise AssertionError("TODO: implement MoETransformerBlock.__init__")

    def forward(self, x):
        raise AssertionError("TODO: implement MoETransformerBlock.forward")


class MoELM(nn.Module):
    def __init__(self, vocab_size, max_seq_len, embed_dim, depth, num_heads, num_experts, top_k, mlp_dim):
        super().__init__()
        raise AssertionError("TODO: implement MoELM.__init__")

    def forward(self, idx):
        raise AssertionError("TODO: implement MoELM.forward")


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
    num_experts=4,
    top_k=2,
    mlp_dim=128,
)


def _logits_from(model_out):
    return model_out[0] if isinstance(model_out, tuple) else model_out


def test_moe_forward_shape():
    model = MoELM(**TINY_CONFIG)
    idx = torch.randint(0, TINY_CONFIG["vocab_size"], (2, TINY_CONFIG["max_seq_len"]))
    logits = _logits_from(model(idx))
    expected = (2, TINY_CONFIG["max_seq_len"], TINY_CONFIG["vocab_size"])
    assert logits.shape == expected, f"logits shape was {logits.shape}, expected {expected}"
    assert torch.isfinite(logits).all(), "logits contain NaN/inf"


def test_moe_overfits_one_batch():
    torch.manual_seed(0)
    model = MoELM(**TINY_CONFIG)
    idx = torch.randint(0, TINY_CONFIG["vocab_size"], (4, TINY_CONFIG["max_seq_len"]))
    targets = torch.randint(0, TINY_CONFIG["vocab_size"], (4, TINY_CONFIG["max_seq_len"]))
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-3)
    V = TINY_CONFIG["vocab_size"]

    def ce():
        logits = _logits_from(model(idx))
        return F.cross_entropy(logits.reshape(-1, V), targets.reshape(-1))

    initial = ce().item()
    for _ in range(100):
        optimizer.zero_grad()
        loss = ce()
        loss.backward()
        optimizer.step()
    final = ce().item()
    assert final < 0.5 * initial, f"final loss {final:.4f} should be much lower than initial {initial:.4f}"


def test_pipeline_runs_and_reports_metrics():
    torch.manual_seed(0)
    result = run_pipeline()
    assert isinstance(result, dict), "run_pipeline must return a dict"
    assert "train_loss" in result and "val_loss" in result, "result must contain train_loss and val_loss"


def run_all_tests():
    print("Running MoE pipeline checks...")
    test_moe_forward_shape()
    print("1/3 MoE forward shape passed")
    test_moe_overfits_one_batch()
    print("2/3 model can overfit a single batch")
    test_pipeline_runs_and_reports_metrics()
    print("3/3 end-to-end pipeline returns metrics")
    print("All checks passed. You can mark this assignment done.")


if __name__ == "__main__":
    run_all_tests()
