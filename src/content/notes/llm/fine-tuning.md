---
topic: fine-tuning
summary: Adapting a pretrained model to a task — full fine-tuning (BERT heads, T5 text-to-text, SFT batches) and parameter-efficient methods such as LoRA, QLoRA, adapters, prefix and prompt tuning.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_attention-mechanisms-and-transformers/large-pretraining-transformers.html
    locator: Sec. 11.9.1.2 Fine-Tuning BERT, 11.9.2.2 Fine-Tuning T5
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter3/2
    locator: Ch. 3 Fine-tuning a pretrained model, Processing the data (Dynamic padding)
  - title: 'Hu et al. (2021), LoRA: Low-Rank Adaptation of Large Language Models'
    url: https://arxiv.org/abs/2106.09685
    locator: Sec. 3 Aren't Existing Solutions Good Enough? (adapter latency), 4.1 Low-Rank-Parametrized Update Matrices, 4.2 Applying LoRA to Transformer
  - title: 'Dettmers et al. (2023), QLoRA: Efficient Finetuning of Quantized LLMs'
    url: https://arxiv.org/abs/2305.14314
    locator: Sec. 3 QLoRA Finetuning (4-bit NormalFloat, Double Quantization, Paged Optimizers); Sec. 4 QLoRA vs. Standard Finetuning
  - title: 'Houlsby et al. (2019), Parameter-Efficient Transfer Learning for NLP'
    url: https://arxiv.org/abs/1902.00751
    locator: Abstract and Sec. 1 Introduction (frozen base, no forgetting); Sec. 2.1 Instantiation for Transformer Networks (Figure 2)
  - title: 'Lester et al. (2021), The Power of Scale for Parameter-Efficient Prompt Tuning'
    url: https://arxiv.org/abs/2104.08691
    locator: Sec. 2 Prompt Tuning, 3.1 Closing the Gap, 4 Comparison to Similar Approaches
  - title: 'PyTorch documentation: torch.nn.CrossEntropyLoss'
    url: https://docs.pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html
    locator: Parameters, ignore_index (default -100)
  - title: 'Wikipedia: Catastrophic interference'
    url: https://en.wikipedia.org/wiki/Catastrophic_interference
    locator: Introduction; Proposed solutions (Rehearsal, Elastic weight consolidation)
---
## Key ideas

- **Full fine-tuning** updates all weights of a pretrained model on task data. The model is
  not shrunk: it keeps every parameter, plus at most a small new task head (distillation, not
  fine-tuning, makes a smaller model).
  - *BERT-style encoder:* feed the `<cls>` output, which depends on all tokens, into a new
    fully connected layer trained from scratch; the pretrained layers are updated too [^1].
  - *T5:* every task is text-to-text with a task description in the input ("Summarize: …"),
    the decoder generates outputs of any length and no extra layers are needed, so one
    minibatch can mix tasks [^1].
  - *Decoder LLMs (SFT):* train on prompt–response text with the usual next-token loss;
    positions to ignore (padding, often the prompt) get label $-100$, the default
    `ignore_index` that PyTorch's cross-entropy loss skips [^7].
- **Batching.** *Dynamic padding* pads each batch only to its own longest sequence (done by a
  collate function such as `DataCollatorWithPadding`), which saves computation compared with
  padding everything to the global maximum [^2].
- **Parameter-efficient fine-tuning (PEFT)** freezes the pretrained weights and trains a few
  new ones, which saves memory and lets one base model serve many tasks by swapping the small
  task-specific weights [^3].
- **LoRA** [^3]. For a frozen $W_0 \in \mathbb{R}^{d \times k}$ learn $\Delta W = BA$ with
  $B \in \mathbb{R}^{d \times r}$, $A \in \mathbb{R}^{r \times k}$, $r \ll \min(d, k)$. $A$
  starts random Gaussian and $B$ at zero, so training starts exactly at the pretrained model;
  the update is scaled by $\alpha/r$, which spares retuning the learning rate when $r$ changes.
  The memory saving comes mainly from not storing gradients and Adam states for frozen weights
  (up to 2/3 less VRAM; GPT-3 175B: 1.2 TB → 350 GB). Because the update is linear and parallel
  to $W_0$, it can be merged into $W = W_0 + BA$: no extra inference latency. The original
  paper adapts only attention matrices (e.g. $W_q$, $W_v$).
- **QLoRA** [^4] stores the frozen base model in 4-bit NormalFloat (NF4, levels at quantiles
  of a normal distribution), dequantizes to BFloat16 for each matmul, and backpropagates
  through it into 16-bit LoRA adapters. *Double quantization* also quantizes the per-block
  scaling constants; *paged optimizers* move optimizer states to CPU RAM during memory spikes.
  It found LoRA on all linear layers necessary to match 16-bit full fine-tuning.
- **Adapters** [^5] insert a small bottleneck MLP (down-projection, non-linearity,
  up-projection, skip connection) twice per Transformer layer. They run in sequence with the
  other layers, so unlike merged LoRA they add inference latency [^3].
- **Prefix vs. prompt tuning** [^6]. Prefix tuning prepends trainable vectors to the
  activations of every layer; prompt tuning prepends a few trainable "soft prompt" embeddings
  to the input only. Soft prompts must be learned by gradient descent and match no real words,
  but prompt tuning closes the gap to full model tuning as models grow, matching it at T5-XXL
  (11B).

## Formulas

- LoRA forward [^3]: $h = W_0 x + \frac{\alpha}{r} B A x$; trainable parameters per matrix
  $r(d + k)$ instead of $dk$ (equal only at $r = dk/(d + k)$, i.e. 2048 for $4096 \times 4096$).
- Gradients at initialization ($B = 0$): $\partial L/\partial B \ne 0$ but
  $\partial L/\partial A = \frac{\alpha}{r} B^\top g\,x^\top = 0$; $A$ starts learning after the
  first update of $B$.
- Houlsby adapter with bottleneck $m$ [^5]: $2md + d + m$ parameters (weights and biases of the
  two projections).
- Quantized storage: bits per parameter $= 4 + 32/64 = 4.5$ with one fp32 constant per block
  of 64, or $4 + 8/64 + 32/(64 \cdot 256) \approx 4.127$ with double quantization [^4].

## Worked example

A 7B model with 32 layers and $d_{model} = 4096$; LoRA with $r = 8$ on $W_q$ and $W_v$:

- per matrix $8 \cdot (4096 + 4096) = 65{,}536$; total $65{,}536 \cdot 2 \cdot 32 = 4{,}194{,}304$
  trainable parameters, about $0.06\%$ of 7B.
- Base weights: $7 \times 10^9 \cdot 2$ bytes $= 14$ GB in bfloat16; $3.5$ GB as 4-bit codes;
  with double-quantized constants $7 \times 10^9 \cdot 4.127 / 8 \approx 3.61$ GB (3.94 GB with
  fp32 constants).

## In code

```python
import torch
import torch.nn as nn

class LoRALinear(nn.Module):
    def __init__(self, base, r=8, alpha=16):
        super().__init__()
        self.base = base.requires_grad_(False)                     # frozen W0 and bias
        self.A = nn.Parameter(torch.randn(r, base.in_features) * 0.01)
        self.B = nn.Parameter(torch.zeros(base.out_features, r))   # B = 0, so BA = 0 at start
        self.s = alpha / r
    def forward(self, x):
        return self.base(x) + self.s * (x @ self.A.T @ self.B.T)
layer, x = LoRALinear(nn.Linear(512, 512)), torch.randn(4, 512)
print(torch.equal(layer(x), layer.base(x)))                        # True: starts at W0
print(sum(p.numel() for p in layer.parameters() if p.requires_grad))  # 8192 = 8 * (512 + 512)
```

## Common pitfalls

- Plain LoRA does not quantize the base model; 4-bit storage is what QLoRA adds.
- Gradients still flow *through* frozen layers to reach adapters below them; only the weight
  gradients and optimizer states of frozen matrices are skipped.
- The $\alpha/r$ factor does not cap the rank (the shapes do) and does not make $BA = 0$ at
  the start (the zero init of $B$ does).
- Unmerged, the LoRA branch costs extra compute; zero added latency requires merging.
- Prefix tuning ≠ prompt tuning: every layer vs. input embeddings only; neither updates the
  pretrained weights.
- Fine-tuning a narrow task can overwrite earlier abilities (catastrophic forgetting); mixing in
  original data (rehearsal) or an EWC penalty reduces it [^8], and adapters leave the frozen
  base model intact [^5].
- Fine-tuning with a different tokenizer than the pretrained one breaks the embedding lookup.
