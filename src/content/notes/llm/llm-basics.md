---
topic: llm-basics
summary: What a large language model is and how it is used — next-token pretraining, context windows, chat templates, generation settings, zero-/few-shot and chain-of-thought prompting, and evaluation.
status: reviewed
reviewed_by: claude
references:
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter1/2
    locator: Ch. 1, Natural Language Processing and Large Language Models (The Rise of Large Language Models)
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter1/8
    locator: Ch. 1, Deep dive into Text Generation Inference with LLMs (Context Length, Two-Phase Inference, Sampling Strategies)
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter11/2
    locator: Ch. 11, Chat Templates (Base Models vs Instruct Models, Common Template Formats)
  - title: 'Brown et al. (2020), Language Models are Few-Shot Learners (GPT-3)'
    url: https://arxiv.org/abs/2005.14165
    locator: Sec. 2 Approach (zero-, one-, few-shot); Sec. 4 Measuring and Preventing Memorization Of Benchmarks
  - title: 'Wei et al. (2022), Chain-of-Thought Prompting Elicits Reasoning in Large Language Models'
    url: https://arxiv.org/abs/2201.11903
    locator: Sec. 2 Chain-of-Thought Prompting, 3.2 Results
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter11/5
    locator: Ch. 11, Evaluation (Automatic Benchmarks, Alternative Evaluation Approaches, Custom Evaluation)
  - title: 'Yao et al. (2023), Tree of Thoughts: Deliberate Problem Solving with Large Language Models'
    url: https://arxiv.org/abs/2305.10601
    locator: Abstract; Sec. 3 Tree of Thoughts (thought generation, state evaluation, search with backtracking)
---
## Key ideas

- **What an LLM is.** A model with millions to hundreds of billions of parameters trained on
  massive text to understand and generate language; it can do many tasks without
  task-specific training and learn from examples given in the prompt [^1]. GPT stands for
  Generative Pre-trained Transformer [^1]. It is pretrained to predict the next token; an
  *instruct* model is then fine-tuned to follow instructions and hold conversations, while a
  *base* model only continues text [^3].
- **Generation** is token by token. The *prefill* phase processes the whole prompt at once; the
  *decode* phase then produces one token per step, each conditioned on everything so far [^2].
  Nothing is looked up from a table of stored answers.
- **Context window** = the maximum number of tokens the model can process at once: prompt,
  conversation history and the generated reply together [^2]. With a 128k window and up to
  16k output tokens, about 112k tokens remain for the input; older turns must be dropped or
  summarized beyond that.
- **Chat templates.** A conversation (system, user, assistant messages) is formatted into one
  token sequence with the model's own special tokens marking each role and turn; using the
  wrong template degrades an instruct model [^3]. Generation stops at the end-of-sequence
  token, a token limit or a stop sequence [^2].
- **Sampling settings** [^2]. Temperature above 1 makes choices more random, below 1 more
  focused; top-k/top-p restrict the candidates; `max_tokens` and stop sequences control
  length. None of them makes the answer factually correct, and sampled outputs differ between
  runs.
- **In-context learning** [^4]. *Zero-shot*: only a natural-language task description.
  *One-shot*: plus one demonstration. *Few-shot*: plus $K$ demonstrations (GPT-3 used 10–100,
  as many as fit in its 2048-token window). All use forward passes only, no weight updates;
  *fine-tuning* is the setting that updates weights on labelled data. Prompt engineering
  (role, context, examples, required output format such as a JSON schema) is therefore
  usable in both zero- and few-shot settings.
- **Chain-of-thought (CoT)** [^5]: few-shot exemplars that write out intermediate reasoning
  steps make the model generate its own steps before the answer. The gain is an emergent
  ability of scale: it appeared only around 100B parameters, and smaller models wrote fluent but
  illogical chains that scored *below* standard prompting. *Tree of Thoughts* goes further: it
  explores several reasoning paths, lets the model evaluate the partial solutions, and can look
  ahead or backtrack, which helps on search-like puzzles (e.g. the Game of 24) where a single
  left-to-right chain fails [^7].
- **Limitations** [^1]: hallucinations (confident but wrong statements), biases from the
  training data, limited context, high compute cost. Use LLMs for drafting, summarizing,
  extraction and coding help with a human check; not alone for high-stakes decisions or
  facts the model never saw (current or private documents need retrieval).
- **Evaluation** [^6]. Automatic benchmarks give standardized, reproducible comparisons
  (MMLU: knowledge in 57 subjects; GSM8K: math word problems; BBH: hard reasoning) but may not
  transfer to your use case. LLM-as-judge uses one model to grade another (with its own
  biases); arenas such as Chatbot Arena collect human votes between two anonymous models;
  custom evaluation sets built from real queries complement, not replace, benchmarks.
  *Data contamination*, test items appearing in the pretraining data, can inflate scores [^4].

## Formulas

- Autoregressive generation: $P(y_1 \dots y_T \mid x) = \prod_{t=1}^{T} P(y_t \mid x, y_{\lt t})$.
- Context budget: prompt tokens $+$ generated tokens $\le$ context length.
- Training pairs from a token stream: inputs $x_{i:i+L}$, targets $x_{i+1:i+L+1}$ (shifted by
  one), so each window of length $L$ yields $L$ next-token predictions.

## Worked example

A tokenized text has 12 ids (100–111). Cutting training windows of length $L = 4$:

| stride | window starts | windows | next-token targets |
| --- | --- | --- | --- |
| 4 | 0, 4 | 2 | 8 |
| 2 | 0, 2, 4, 6 | 4 | 16 |
| 1 | 0, …, 7 | 8 | 32 |

A window starting at 8 is impossible: its last target would be the 13th token. Smaller
strides give more (overlapping) examples from the same text.

## In code

```python
import torch

ids = torch.arange(100, 112)                          # 12 token ids of a tokenized text
L, stride = 4, 4                                      # context length, step between windows
starts = range(0, len(ids) - L, stride)               # each window needs one extra token as target
X = torch.stack([ids[i:i + L] for i in starts])
Y = torch.stack([ids[i + 1:i + L + 1] for i in starts])
print(X.tolist())                                     # [[100, 101, 102, 103], [104, 105, 106, 107]]
print(Y.tolist())                                     # [[101, 102, 103, 104], [105, 106, 107, 108]]
print(len(range(0, len(ids) - L, 2)))                 # 4 windows with stride 2
```

## Common pitfalls

- Few-shot examples and chain-of-thought do not update the weights or persist to the next
  conversation; only the input changes.
- Zero-shot means no demonstrations, not "no prompt": the task description is still
  engineered.
- The context window counts tokens of input *and* output, not messages.
- Lower temperature gives more predictable text, not shorter or more correct text.
- CoT is not a guarantee: it helps large models on multi-step problems and can hurt small ones.
- A high benchmark score does not prove fitness for your domain, and it may be inflated by
  contamination.
- The model never runs as a lookup table or remembers other users; variation between runs
  comes from sampling.
