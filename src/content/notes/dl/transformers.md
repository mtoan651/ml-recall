---
topic: transformers
summary: Attention and the Transformer; scaled dot-product attention, masking, multi-head attention, positional encoding, the blocks, model families, cost, and vision and speech models.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_attention-mechanisms-and-transformers/attention-scoring-functions.html
    locator: Sec. 11.3 Attention Scoring Functions (11.3.1 Dot Product Attention, 11.3.2.1 Masked Softmax Operation, 11.3.4 Additive Attention)
  - title: 'Vaswani et al. (2017), Attention Is All You Need'
    url: https://arxiv.org/abs/1706.03762
    locator: Sec. 3.1 Encoder and Decoder Stacks; 3.2.1 Scaled Dot-Product Attention; 3.2.2 Multi-Head Attention; 3.2.3 Applications of Attention in our Model; 3.3 Position-wise Feed-Forward Networks; 3.5 Positional Encoding; 4 Why Self-Attention (Table 1)
  - source: d2l
    url: https://d2l.ai/chapter_attention-mechanisms-and-transformers/transformer.html
    locator: Sec. 11.7.1 Model; 11.7.2 Positionwise Feed-Forward Networks; 11.7.3 Residual Connection and Layer Normalization; 11.7.5 Decoder
  - source: d2l
    url: https://d2l.ai/chapter_attention-mechanisms-and-transformers/vision-transformer.html
    locator: Sec. 11.8.1 Model; 11.8.2 Patch Embedding; 11.8.3 Vision Transformer Encoder; 11.8.6 Summary and Discussion; 11.8.7 Exercises (Exercise 2)
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter1/6
    locator: Chapter 1.6 Transformer Architectures (Encoder models, Decoder models, Sequence-to-sequence models)
  - title: 'Wikipedia: Transformer (deep learning)'
    url: https://en.wikipedia.org/wiki/Transformer_(deep_learning)
    locator: Subsequent work, Efficient implementation, KV caching
  - title: 'Dosovitskiy et al. (2021), An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale'
    url: https://arxiv.org/abs/2010.11929
    locator: Sec. 1 Introduction; 3.1 Vision Transformer (ViT), Inductive bias; 3.2 Fine-tuning and Higher Resolution
  - source: hf-audio-course
    url: https://huggingface.co/learn/audio-course/chapter3/seq2seq
    locator: Unit 3, Seq2Seq architectures (Automatic speech recognition; Text-to-speech)
---
## Key ideas

- **Attention** is a soft lookup: a query is compared with every key, the scores go through a softmax, and the output is the weighted average of the values. Every value stays in the sum; only its weight changes.
- **Scaled dot-product attention** scores $\mathbf{q}^\top\mathbf{k}/\sqrt{d}$. For vectors with independent zero-mean, unit-variance entries a dot product has variance $d$, so dividing by $\sqrt{d}$ brings the scores back to unit variance [^1]; unscaled, large dot products push the softmax into a region with tiny gradients [^2]. Additive attention $\mathbf{w}_v^\top\tanh(W_q\mathbf{q} + W_k\mathbf{k})$ also handles queries and keys of different sizes [^1]; when the sizes match, dot products win in practice because a batch of them is one optimized matrix multiplication [^2].
- **Masking**: scores that must be ignored (padding, or future tokens in a decoder) are set to $-\infty$ (in code, a very large negative number) before the softmax, so they get weight 0 and the remaining weights still sum to 1 [^1][^2]. Zeroing weights after the softmax would leave rows that sum to less than 1. A causal mask on $n$ tokens leaves $n(n + 1)/2$ allowed entries.
- **Self-attention** takes queries, keys and values from the same sequence; **cross-attention** (encoder–decoder attention) takes queries from the decoder and keys and values from the encoder outputs [^3].
- **Multi-head attention**: $h$ heads, each with its own learned projections, run in parallel; their outputs are concatenated and multiplied by $W_o$, so different heads can attend to different kinds of relations [^2]. With head size $d/h$ the total cost is about that of one full-width head [^2], and PyTorch's module has $4(d^2 + d)$ parameters whatever $h$ is.
- **Positional encoding**: with no recurrence or convolution, attention by itself ignores token order, so position vectors of the same size are added to the token embeddings [^2]. The sinusoidal encoding is a fixed formula defined for every position and may extrapolate to longer sequences [^2]; a learned table (as in ViT) has one row per trained position [^4].
- **Transformer block**: multi-head self-attention, then a position-wise feed-forward network (the same MLP applied to every token) [^3], with hidden width $4d$ in the original, $512 \to 2048 \to 512$ [^2]. Each sublayer sits inside a residual connection followed by layer normalization, $\mathrm{LayerNorm}(\mathbf{x} + \mathrm{Sublayer}(\mathbf{x}))$: "add & norm", or post-norm [^2][^3]. Later models such as ViT normalize before each sublayer instead (pre-norm), which trains more easily [^4]. The decoder adds masked self-attention and cross-attention [^3]. There is no recurrence and no pooling between blocks: every token keeps its own vector.
- **Families** [^5]: encoder-only (BERT: bidirectional attention, pretrained by reconstructing masked words; classification, NER), decoder-only (GPT: causal attention, next-token prediction; text generation), encoder–decoder (T5, BART: summarization, translation).
- **Cost** [^2]: a self-attention layer costs $O(n^2 d)$ and stores an $n \times n$ weight matrix per head, but needs $O(1)$ sequential steps and has path length $O(1)$ between any two tokens; a recurrent layer costs $O(n d^2)$ with $O(n)$ sequential steps. Long sequences are therefore expensive. In generation, a **KV cache** keeps the keys and values of earlier tokens at every attention layer, so each new token computes only its own query, key and value [^6].
- **Vision Transformer (ViT)**: an $h \times w$ image with patch size $p$ becomes $hw/p^2$ patch tokens, computed by one convolution whose kernel size and stride equal $p$; the output of a `<cls>` token (or the average of the patch outputs) feeds the classifier [^4]. With far less locality and translation bias than a CNN, ViT trails ResNets of similar size on mid-sized data and wins only after pretraining on very large datasets [^4][^7]. For fine-tuning at a higher resolution, the learned position embeddings are interpolated in 2D to the larger patch grid [^7].
- **Speech** [^8]: Whisper is an encoder–decoder; the encoder reads a log-mel spectrogram and the decoder, acting as a language model, generates text tokens through cross-attention. CTC models such as Wav2Vec2 are encoder-only and predict one character per audio frame; the seq2seq approach is the more powerful one. Text-to-speech models predict a spectrogram, and a separately trained vocoder turns it into a waveform.

## Formulas

$$
\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}} + M\right)V,\qquad M_{ij} = \begin{cases} 0 & \text{allowed} \\ -\infty & \text{masked} \end{cases}
$$

$$
\mathrm{MultiHead}(X) = \mathrm{Concat}(\mathrm{head}_1, \ldots, \mathrm{head}_h)\,W_o,\qquad PE_{(i,\,2j)} = \sin\frac{i}{10000^{2j/d}},\quad PE_{(i,\,2j+1)} = \cos\frac{i}{10000^{2j/d}}
$$

Shapes: input $(B, T, d)$; per-head queries $(B, h, T, d/h)$; scores $(B, h, T, T)$; output $(B, T, d)$. Position-wise FFN $d \to 4d \to d$ has $8d^2 + 5d$ parameters.

## Worked example

Three tokens with $Q = K = V = X = \begin{bmatrix} 1 & 0 \\ 0 & 1 \\ 1 & 1 \end{bmatrix}$, $d_k = 2$, causal mask.

- Scores $XX^\top/\sqrt2$: row 2 is $(0, 1, 1)/\sqrt2$, row 3 is $(1, 1, 2)/\sqrt2 = (0.707, 0.707, 1.414)$.
- Row 1 sees only itself: weight 1, output $(1, 0)$.
- Row 2 masks token 3: $\mathrm{softmax}(0, 0.707) = (0.330, 0.670)$, output $(0.330, 0.670)$.
- Row 3 sees all: $\mathrm{softmax}(0.707, 0.707, 1.414) = (0.248, 0.248, 0.503)$, output $0.248(1, 0) + 0.248(0, 1) + 0.503(1, 1) \approx (0.752, 0.752)$.

## In code

```python
import torch
from torch import nn
mha = nn.MultiheadAttention(embed_dim=768, num_heads=12, batch_first=True)
print(sum(p.numel() for p in mha.parameters()))  # 2362368 = 4 * (768 * 768 + 768)
x = torch.zeros(2, 10, 768)                      # (batch, tokens, d_model)
causal = torch.triu(torch.ones(10, 10, dtype=torch.bool), diagonal=1)  # True = blocked
with torch.no_grad():
    out, w = mha(x, x, x, attn_mask=causal)      # w is averaged over the heads
print(out.shape, w.shape)  # torch.Size([2, 10, 768]) torch.Size([2, 10, 10])
print(w[0, 2, :4])         # tensor([0.3333, 0.3333, 0.3333, 0.0000])  token 3 sees tokens 1-3
```

## Common pitfalls

- The scaling is $1/\sqrt{d_k}$, not $1/d_k$; without it large dot products saturate the softmax.
- Mask with $-\infty$ **before** the softmax; zeroing after it breaks the normalization.
- More heads do not add parameters when the model width is fixed, because each head works on a $d/h$ slice; only a "wide" variant that gives every head the full width grows with $h$.
- A Transformer without positional information treats its input as a bag of tokens.
- A learned position table has no rows for positions beyond its length; a longer input needs the table extended, and a ViT fine-tuned on larger images interpolates it.
- Encoder-only models are for understanding tasks, decoder-only for generation; "BERT for text generation" is a classic wrong answer, and so is "Whisper is a CTC model".
- Doubling a ViT's image side at fixed patch size gives $4\times$ the tokens and about $16\times$ the attention-score cost.
- Splitting heads needs `view(B, T, h, d // h).transpose(1, 2)`; a direct `view(B, h, T, d // h)` mixes tokens and features.
