/**
 * Starter content — transformers (llm) & RL, medium difficulty.
 * Merged once per browser via storage.js (SEED_VERSION).
 */

export const SEED_VERSION = "tiny_attention_tests_bottom_v5";

export const SEED_PAPERS = [
  {
    title: "PyTorch: An Imperative Style, High-Performance Deep Learning Library",
    authors: "Adam Paszke et al.",
    year: 2019,
    venue: "NeurIPS 2019",
    area: "llm",
    core_idea:
      "PyTorch makes tensor programs feel like normal Python while still supporting automatic differentiation and accelerated kernels.",
    why_important:
      "Before reproducing transformer papers, a student needs to understand tensors, autograd, modules, and training loops.",
    pytorch_hook: "torch.Tensor shapes + autograd + nn.Module + optimizer.step()",
  },
  {
    title: "Attention Is All You Need",
    authors: "Vaswani et al.",
    year: 2017,
    venue: "NeurIPS 2017",
    area: "llm",
    core_idea:
      "Scaled dot-product attention lets tokens mix information by comparing queries and keys, then averaging values.",
    why_important:
      "Almost every modern LLM paper modifies attention, so a tiny attention layer is the safest bridge into transformers.",
    pytorch_hook: "QK^T softmax V with explicit shape checks",
  },
  {
    title: "Human-level control through deep reinforcement learning",
    authors: "Mnih et al.",
    year: 2015,
    venue: "Nature 2015",
    area: "rl",
    core_idea:
      "DQN learns action values from experience replay and a target network, turning reward feedback into supervised-style updates.",
    why_important:
      "It is a concrete way to learn states, actions, rewards, targets, and training instability before modern RLHF losses.",
    pytorch_hook: "Q-network forward pass + Bellman target + MSE loss",
  },
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
].filter((paper) => paper.title === "Attention Is All You Need");

export const SEED_ASSIGNMENTS = [
  {
    title: "PyTorch training loop from zero",
    paper_ref: "PyTorch: An Imperative Style, High-Performance Deep Learning Library",
    area: "llm",
    difficulty: "starter",
    estimated_hours: 5,
    why_now:
      "This teaches the mechanics every later research assignment assumes: tensors, gradients, modules, loss, and optimizer steps.",
    learning_objective:
      "Build and debug a complete PyTorch training loop on a tiny regression problem.",
    context:
      "The PyTorch paper is not an LLM paper; it is the toolchain underneath the LLM papers. Implementing a tiny end-to-end loop first makes later attention and RL assignments much less mysterious.",
    prerequisite_concepts: ["Python functions/classes", "basic arrays", "high-school linear functions"],
    concept_ladder: [
      "Create tensors and inspect shapes",
      "Track gradients with autograd",
      "Wrap parameters in nn.Module",
      "Train with loss.backward() and optimizer.step()",
    ],
    next_30_minutes:
      "In the one editor file, generate x/y tensors for y = 3x + noise, and print the shape of every tensor before training.",
    setup:
      "CPU is enough. No dataset download. Use one file: assignment.py. Put tiny test functions/assertions at the bottom of that same file.",
    tasks: [
      "Task 1: Generate synthetic x/y tensors and split train/val.",
      "Task 2: Build a one-layer nn.Module and verify output shape.",
      "Task 3: Write the training loop with zero_grad, forward, loss, backward, step.",
      "Task 4: Plot or print train/val loss every 20 steps.",
    ],
    milestones: [
      {
        title: "Shapes are boring",
        goal: "Every tensor shape is printed and expected.",
        checkpoint: "x is (256, 1), y is (256, 1), predictions are (batch, 1).",
      },
      {
        title: "Gradients exist",
        goal: "The model parameters receive non-null gradients.",
        checkpoint: "After loss.backward(), weight.grad is finite.",
      },
      {
        title: "Loss goes down",
        goal: "The loop actually learns the line.",
        checkpoint: "Validation MSE is lower than the initial MSE.",
      },
    ],
    checkpoint_tests: [
      "assert model(x[:4]).shape == (4, 1)",
      "assert torch.isfinite(loss)",
      "assert final_val_loss < initial_val_loss",
    ],
    hint_levels: [
      "Start by making the data and model shapes match.",
      "If loss does not move, print gradients before optimizer.step().",
      "The loop order is zero_grad -> forward -> loss -> backward -> step.",
    ],
    stretch_goal: "Replace nn.Linear with a two-layer MLP and compare loss curves.",
    key_pytorch_concepts: ["Tensor shapes", "autograd", "nn.Module", "optimizer.step"],
    debug_hints:
      "Most beginner bugs are shape bugs. Print x.shape, y.shape, pred.shape, and loss.item() before changing anything else.",
    starter_code_hint:
      "for step in range(200): zero gradients, run model, compute mse, backward, optimizer step",
    verification: [
      "inline check: model output shape and finite loss on a 4-row batch",
      "smoke: 200 steps on CPU, loss finite and decreasing",
      "eval: final validation MSE lower than initial validation MSE",
      "done when: you can explain what backward() and step() each changed",
    ],
    code_build_guide:
      "# Project: PyTorch training loop from zero\n# Paper: PyTorch: An Imperative Style, High-Performance Deep Learning Library\n# End goal: train a tiny model until validation loss goes down\n# Compute: CPU is enough\n# File: assignment.py only\n#\n# STEP 0: Use one file\n# - Put everything in this one editor buffer: data, model, training loop, and checks\n# - When you are ready, save/copy this buffer as assignment.py and run: python assignment.py\n# - Do not create train.py, tests/, packages, or extra modules for this assignment\n#\n# STEP 1: Generate data\n# - Make x with shape (256, 1)\n# - Make y = 3 * x + small noise, also shape (256, 1)\n# - Split into train and validation tensors\n# - Checkpoint: print x.shape, y.shape, x_train.shape\n#\n# STEP 2: Build the model\n# - Create a small nn.Module named TinyRegressor in this same file\n# - It should contain one nn.Linear(1, 1)\n# - Its forward(x) returns predictions with shape (batch, 1)\n# - Checkpoint: assert model(x[:4]).shape == (4, 1)\n#\n# STEP 3: Write the training loop\n# - Use MSE loss\n# - Use Adam or SGD\n# - Each step: zero gradients, forward pass, compute loss, backward, optimizer step\n# - Checkpoint: after backward, confirm gradients are finite\n#\n# STEP 4: Add inline checks at the bottom\n# - Add small assert statements in this same file instead of a separate test file\n# - Save initial validation loss before training\n# - Print train and validation loss every 20 steps\n# - Checkpoint: final validation loss should be below initial validation loss\n#\n# HINT 1: If loss is not scalar, check reduction='mean'\n# HINT 2: If gradients are None, backward was not called on the loss from this model\n# HINT 3: The optimizer only changes parameters after optimizer.step()\n#\n# DONE: mark done when inline checks pass and you can explain zero_grad, backward, and step",
  },
  {
    title: "Tiny attention by hand",
    paper_ref: "Attention Is All You Need",
    area: "llm",
    difficulty: "starter",
    estimated_hours: 6,
    why_now:
      "Attention is the smallest LLM concept worth learning after basic PyTorch mechanics.",
    learning_objective:
      "Implement scaled dot-product attention with explicit tensor shapes and a tiny causal mask.",
    context:
      "The original Transformer paper introduced attention as the core operation. You will build the smallest useful version so later RoPE, GQA, and KV-cache papers have a place to attach.",
    prerequisite_concepts: ["Matrix multiplication", "softmax", "batch and sequence dimensions"],
    concept_ladder: [
      "Represent tokens as vectors",
      "Project vectors into Q, K, and V",
      "Compute attention scores with QK^T",
      "Apply softmax and mix values",
      "Add a causal mask so future tokens are hidden",
    ],
    next_30_minutes:
      "Make random q, k, v tensors with shape (batch=2, time=4, dim=8), compute q @ k.transpose(-2, -1), and inspect the score shape.",
    setup:
      "CPU is enough. Synthetic tensors only. Use one file: assignment.py. Fill the TODO zones, then run python assignment.py once to execute the built-in tests.",
    tasks: [
      "Task 1: Implement scaled dot-product attention as a function.",
      "Task 2: Add a causal mask and prove future positions get zero probability.",
      "Task 3: Wrap it in a tiny nn.Module with q/k/v projections.",
      "Task 4: Train on a toy next-token copy task for a short smoke run.",
    ],
    milestones: [
      {
        title: "Scores have the right shape",
        goal: "Understand why attention scores are (B, T, T).",
        checkpoint: "scores.shape == (2, 4, 4).",
      },
      {
        title: "Mask blocks the future",
        goal: "Causal attention cannot look ahead.",
        checkpoint: "attention weights above the diagonal are near zero.",
      },
      {
        title: "Module trains",
        goal: "The attention module participates in a loss and gradients flow.",
        checkpoint: "Loss decreases on a tiny copy task.",
      },
    ],
    key_pytorch_concepts: ["matmul", "softmax", "masking", "nn.Linear"],
    code_build_guide:
      "# Project: Tiny attention by hand\n# Paper: Attention Is All You Need\n# Goal: fill the student code section, then run this file once: python assignment.py\n# Compute: CPU is enough\n# Rule: keep this as ONE file. Do not create attention.py, tests/, or extra modules.\n\nimport torch\nimport torch.nn as nn\n\n\n# =========================\n# STUDENT CODE STARTS HERE\n# =========================\n\n\ndef scaled_dot_product_attention(q, k, v, causal=False):\n    # TODO: write this function.\n    raise AssertionError(\"TODO: implement scaled_dot_product_attention\")\n\n\nclass TinyAttention(nn.Module):\n    # TODO: write this module.\n    def __init__(self, d_model):\n        super().__init__()\n        raise AssertionError(\"TODO: implement TinyAttention.__init__\")\n\n    def forward(self, x, causal=True):\n        raise AssertionError(\"TODO: implement TinyAttention.forward\")\n\n\n# =======================\n# STUDENT CODE ENDS HERE\n# TESTS START BELOW\n# =======================\n\n\ndef test_scaled_attention_shapes():\n    B, T, D = 2, 4, 8\n    q = torch.randn(B, T, D)\n    k = torch.randn(B, T, D)\n    v = torch.randn(B, T, D)\n    out, weights = scaled_dot_product_attention(q, k, v, causal=False)\n    assert out.shape == (B, T, D), f\"out shape was {out.shape}\"\n    assert weights.shape == (B, T, T), f\"weights shape was {weights.shape}\"\n    row_sums = weights.sum(dim=-1)\n    assert torch.allclose(row_sums, torch.ones_like(row_sums), atol=1e-5), row_sums\n\n\ndef test_causal_mask_blocks_future():\n    B, T, D = 2, 4, 8\n    q = torch.randn(B, T, D)\n    k = torch.randn(B, T, D)\n    v = torch.randn(B, T, D)\n    _, weights = scaled_dot_product_attention(q, k, v, causal=True)\n    future_mask = torch.triu(torch.ones(T, T, dtype=torch.bool), diagonal=1)\n    future_weights = weights[:, future_mask]\n    assert future_weights.numel() > 0\n    assert future_weights.abs().max().item() < 1e-5, future_weights\n\n\ndef test_tiny_attention_backward():\n    B, T, D = 2, 4, 8\n    model = TinyAttention(d_model=D)\n    x = torch.randn(B, T, D)\n    out = model(x, causal=True)\n    assert out.shape == x.shape, f\"output shape was {out.shape}\"\n    loss = out.pow(2).mean()\n    assert torch.isfinite(loss), loss\n    loss.backward()\n    assert model.q_proj.weight.grad is not None, \"q_proj did not receive gradients\"\n    assert torch.isfinite(model.q_proj.weight.grad).all(), \"q_proj gradients contain NaN/inf\"\n\n\ndef run_all_tests():\n    print(\"Running tiny attention checks...\")\n    test_scaled_attention_shapes()\n    print(\"1/3 scaled attention shapes passed\")\n    test_causal_mask_blocks_future()\n    print(\"2/3 causal mask passed\")\n    test_tiny_attention_backward()\n    print(\"3/3 backward pass passed\")\n    print(\"All checks passed. You can mark this assignment done.\")\n\n\nif __name__ == \"__main__\":\n    run_all_tests()\n",
  },
  {
    title: "Q-learning before RLHF",
    paper_ref: "Human-level control through deep reinforcement learning",
    area: "rl",
    difficulty: "starter",
    estimated_hours: 6,
    why_now:
      "Modern RLHF and GRPO are easier after you understand actions, rewards, value estimates, and bootstrapped targets.",
    learning_objective:
      "Train a tiny Q-network on a toy environment and understand the Bellman target.",
    context:
      "The DQN paper scaled Q-learning with neural networks. You will build a tiny version on a toy problem to learn the moving parts before touching language-model RL.",
    prerequisite_concepts: ["Supervised loss", "argmax", "state/action/reward vocabulary"],
    concept_ladder: [
      "Represent state as a tensor",
      "Predict one value per action",
      "Choose actions with epsilon-greedy exploration",
      "Train toward reward plus next-state value",
    ],
    next_30_minutes:
      "Define a 1D gridworld with five positions, two actions, and reward +1 at the goal. Print one transition tuple.",
    setup:
      "CPU is enough. No gym dependency required. Use one file: assignment.py. Put the environment, QNet, training loop, and inline checks in that same file.",
    tasks: [
      "Task 1: Build the tiny gridworld transition function.",
      "Task 2: Implement QNet(state) -> values for two actions.",
      "Task 3: Compute Bellman targets with a frozen no_grad next value.",
      "Task 4: Train with epsilon-greedy exploration and plot episode reward.",
    ],
    milestones: [
      {
        title: "Environment is deterministic",
        goal: "You can predict one transition by hand.",
        checkpoint: "Moving right from position 3 reaches goal and gives reward 1.",
      },
      {
        title: "Network predicts actions",
        goal: "QNet returns one score per action.",
        checkpoint: "q_values.shape == (batch, 2).",
      },
      {
        title: "Policy improves",
        goal: "The agent reaches the goal more often over time.",
        checkpoint: "Average reward over last 20 episodes beats first 20.",
      },
    ],
    checkpoint_tests: [
      "assert qnet(states).shape == (batch, 2)",
      "assert target tensor is detached from next_q gradients",
      "assert last_reward_mean > first_reward_mean",
    ],
    hint_levels: [
      "The target is reward + gamma * max_next_q for non-terminal states.",
      "Use torch.no_grad() for the next-state value.",
      "Your loss compares q_value_for_action against the target.",
    ],
    stretch_goal: "Add a replay buffer and compare learning stability with and without it.",
    key_pytorch_concepts: ["gather", "no_grad", "MSE loss", "epsilon-greedy"],
    debug_hints:
      "If the policy never improves, first check that terminal transitions do not bootstrap from next_q.",
    starter_code_hint:
      "chosen_q = q_values.gather(1, actions[:, None]).squeeze(1); target = rewards + gamma * next_q.max(dim=1).values * not_done",
    verification: [
      "inline check: q-network output shape and target detach behavior",
      "smoke: 200 episodes on CPU, no NaN",
      "eval: average reward improves across training",
      "done when: you can explain reward, target, and chosen_q in one paragraph",
    ],
    code_build_guide:
      "# Project: Q-learning before RLHF\n# Paper: Human-level control through deep reinforcement learning\n# End goal: train a tiny Q-network in a toy gridworld\n# Compute: CPU is enough\n# File: assignment.py only\n#\n# STEP 0: Use one file\n# - Put the environment, QNet, training loop, and inline checks in this one file\n# - When ready, run: python assignment.py\n# - Do not create env.py, qnet.py, train_dqn.py, tests/, or extra modules\n#\n# STEP 1: Build the environment\n# - State is an integer position from 0 to 4\n# - Actions are left=0 and right=1\n# - Reward is +1 when the agent reaches position 4\n# - Checkpoint: stepping right from position 3 ends episode with reward 1\n#\n# STEP 2: Build QNet\n# - Input can be one-hot state with shape (B, 5)\n# - Output has shape (B, 2), one value per action\n# - Checkpoint: qnet(states).shape == (B, 2)\n#\n# STEP 3: Compute Bellman targets\n# - chosen_q is the Q value for the action actually taken\n# - target is reward + gamma * max next_q for non-terminal states\n# - Use no_grad for next_q\n# - Checkpoint: target does not require grad\n#\n# STEP 4: Train\n# - Use epsilon-greedy exploration\n# - Store first 20 and last 20 episode rewards\n# - Checkpoint: later average reward is higher\n#\n# STEP 5: Add inline checks at the bottom\n# - Use assert statements in this same file instead of separate tests\n# - Check output shape, detached target, and reward improvement\n#\n# HINT 1: gather selects the Q value for the action column\n# HINT 2: terminal states should not include next_q\n# HINT 3: lower epsilon over time after the agent explores enough\n#\n# DONE: mark done when inline checks pass and reward improves",
  },
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
      "Task 5: add an eval helper in the same file that reports bits-per-char / perplexity on a held-out chunk.",
    ],
    stretch_goal:
      "Add GQA (fewer KV heads) using the GQA paper grouping and compare inference KV memory vs full MHA at equal quality.",
    key_pytorch_concepts: ["einsum", "causal mask", "RoPE", "nn.Parameter"],
    debug_hints:
      "RoPE cos/sin cache must match seq_len at forward time; off-by-one in position ids causes sudden loss spikes after context length changes.",
    starter_code_hint:
      `# rotate half dims: x1, x2 = x.chunk(2, dim=-1); return torch.cat((-x2, x1), dim=-1) * sin + x * cos`,
    verification: [
      "inline check: RoPE output shape matches Q; rotating position m vs m+k changes dot product predictably",
      "smoke: 32 batch, 128 seq, 100 steps — loss finite and decreasing",
      "eval: val perplexity < 2.0 bits/char on Shakespeare (trend; paper used large-scale pretrain)",
      "ablation: RoPE curve below learned-pos curve on same step budget",
      "done when: the in-file eval helper shows PPL improves over epoch-0 and ablation shows RoPE wins",
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
      "Task 5: add an eval helper in the same file that prints loss + estimated KV cache size per token.",
    ],
    stretch_goal: "Load equal-param MHA checkpoint and up-convert to GQA via mean-grouping K/V weights (paper's recipe).",
    key_pytorch_concepts: ["view/reshape heads", "repeat_interleave", "scaled_dot_product_attention"],
    debug_hints:
      "Wrong repeat factor (n_heads // n_kv_heads) gives silent shape bugs or duplicated heads — assert head divisibility at init.",
    starter_code_hint:
      `k = k.repeat_interleave(self.n_heads // self.n_kv_heads, dim=1)  # after (B, n_kv, T, d)`,
    verification: [
      "inline check: output shape (B,T,d_model); GQA matches reference on random input",
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
      "Task 5: add an eval helper in the same file that reports pass@1 on held-out 100 problems.",
    ],
    stretch_goal: "Add KL penalty to frozen reference policy (DeepSeek-R1 recipe) and compare stability.",
    key_pytorch_concepts: ["torch.no_grad sampling", "logprob gather", "advantage normalization"],
    debug_hints:
      "If all rewards in a group are equal, advantages are zero — mix easy/hard prompts or add small format reward so groups have variance.",
    starter_code_hint:
      `adv = (r - r.mean(dim=1, keepdim=True)) / (r.std(dim=1, keepdim=True) + 1e-8)`,
    verification: [
      "inline check: advantages mean≈0 std≈1 per group; loss finite with zero-variance guard",
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
      "Task 5: add an eval helper in the same file that reports % pairs where logp(chosen) > logp(rejected).",
    ],
    stretch_goal: "Compare one epoch of DPO vs reward-weighted SFT on chosen-only — same compute budget.",
    key_pytorch_concepts: ["log_softmax gather", "stop-gradient ref", "Bradley-Terry loss"],
    debug_hints:
      "Forgetting reference KL: policy collapses to high-confidence garbage — if val chosen logprob explodes while rejected does too, lower β or add SFT mix.",
    starter_code_hint:
      `logits = -(beta * (logp_w - logp_l - ref_w + ref_l)).sigmoid().log()`,
    verification: [
      "inline check: DPO loss decreases when chosen logp artificially boosted on dummy batch",
      "smoke: 64 pairs, 50 steps — loss finite",
      "eval: >65% pairs prefer chosen on val (paper-scale tasks hit higher; trend matters)",
      "ablation: β=0.1 beats β=0.01 on margin without collapse",
      "done when: val pair-accuracy beats init checkpoint",
    ],
  },
].filter((assignment) => assignment.title === "Tiny attention by hand");
