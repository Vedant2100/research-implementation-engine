# Project: Vision Transformer (ViT) from scratch
# Paper: An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale
# Goal: implement the full ViT architecture AND the end-to-end training pipeline
# Compute: CPU is enough at the tiny config used by the tests
# Rule: keep this as ONE file. Do not create vit.py, train.py, tests/, or extra modules.
# Run when done: python assignment.py

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset


# =========================
# STUDENT CODE STARTS HERE
# =========================


class PatchEmbedding(nn.Module):
    def __init__(self, image_size, patch_size, in_channels, embed_dim):
        super().__init__()
        raise AssertionError("TODO: implement PatchEmbedding.__init__")

    def forward(self, x):
        raise AssertionError("TODO: implement PatchEmbedding.forward")


class MultiHeadSelfAttention(nn.Module):
    def __init__(self, embed_dim, num_heads):
        super().__init__()
        raise AssertionError("TODO: implement MultiHeadSelfAttention.__init__")

    def forward(self, x):
        raise AssertionError("TODO: implement MultiHeadSelfAttention.forward")


class MLPBlock(nn.Module):
    def __init__(self, embed_dim, mlp_ratio):
        super().__init__()
        raise AssertionError("TODO: implement MLPBlock.__init__")

    def forward(self, x):
        raise AssertionError("TODO: implement MLPBlock.forward")


class TransformerBlock(nn.Module):
    def __init__(self, embed_dim, num_heads, mlp_ratio):
        super().__init__()
        raise AssertionError("TODO: implement TransformerBlock.__init__")

    def forward(self, x):
        raise AssertionError("TODO: implement TransformerBlock.forward")


class ViT(nn.Module):
    def __init__(self, image_size, patch_size, in_channels, num_classes, embed_dim, depth, num_heads, mlp_ratio):
        super().__init__()
        raise AssertionError("TODO: implement ViT.__init__")

    def forward(self, x):
        raise AssertionError("TODO: implement ViT.forward")


def get_dataloaders(num_train, num_val, image_size, in_channels, num_classes, batch_size):
    raise AssertionError("TODO: implement get_dataloaders")


def train_one_epoch(model, loader, optimizer, device):
    raise AssertionError("TODO: implement train_one_epoch")


def evaluate(model, loader, device):
    raise AssertionError("TODO: implement evaluate")


def run_pipeline():
    raise AssertionError("TODO: implement run_pipeline that wires data, model, optimizer, training and evaluation, and returns a dict with train_loss and val_accuracy")


# =========================
# STUDENT CODE ENDS HERE
# TESTS START BELOW
# =========================


TINY_CONFIG = dict(
    image_size=8,
    patch_size=4,
    in_channels=3,
    num_classes=4,
    embed_dim=32,
    depth=2,
    num_heads=4,
    mlp_ratio=2,
)


def test_vit_forward_shape():
    model = ViT(**TINY_CONFIG)
    x = torch.randn(2, TINY_CONFIG["in_channels"], TINY_CONFIG["image_size"], TINY_CONFIG["image_size"])
    logits = model(x)
    assert logits.shape == (2, TINY_CONFIG["num_classes"]), f"logits shape was {logits.shape}"
    assert torch.isfinite(logits).all(), "logits contain NaN/inf"


def test_vit_overfits_one_batch():
    torch.manual_seed(0)
    model = ViT(**TINY_CONFIG)
    x = torch.randn(8, TINY_CONFIG["in_channels"], TINY_CONFIG["image_size"], TINY_CONFIG["image_size"])
    y = torch.randint(0, TINY_CONFIG["num_classes"], (8,))
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-3)
    initial_loss = F.cross_entropy(model(x), y).item()
    for _ in range(80):
        optimizer.zero_grad()
        loss = F.cross_entropy(model(x), y)
        loss.backward()
        optimizer.step()
    final_loss = F.cross_entropy(model(x), y).item()
    assert final_loss < 0.5 * initial_loss, (
        f"final loss {final_loss:.4f} should be much lower than initial {initial_loss:.4f}"
    )


def test_pipeline_runs_and_reports_metrics():
    torch.manual_seed(0)
    result = run_pipeline()
    assert isinstance(result, dict), "run_pipeline must return a dict"
    assert "val_accuracy" in result, "result must contain val_accuracy"
    assert "train_loss" in result, "result must contain train_loss"
    val_acc = float(result["val_accuracy"])
    assert 0.0 <= val_acc <= 1.0, f"val_accuracy out of range: {val_acc}"


def run_all_tests():
    print("Running ViT pipeline checks...")
    test_vit_forward_shape()
    print("1/3 ViT forward shape passed")
    test_vit_overfits_one_batch()
    print("2/3 model can overfit a single batch")
    test_pipeline_runs_and_reports_metrics()
    print("3/3 end-to-end pipeline returns metrics")
    print("All checks passed. You can mark this assignment done.")


if __name__ == "__main__":
    run_all_tests()
