---
topic: huggingface
summary: Hugging Face in practice — pipelines, tokenizers and Auto classes, the Hub and model cards, 🤗 Datasets (map, slicing, memory mapping, streaming), and training with Trainer and Accelerate.
status: reviewed
reviewed_by: claude
references:
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter1/3
    locator: 'Chapter 1.3 Transformers, what can they do?: Working with pipelines; Zero-shot classification; Mask filling; Named entity recognition'
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter2/4
    locator: 'Chapter 2.4 Tokenizers: Subword tokenization; Loading and saving; Encoding; Decoding'
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter5/3
    locator: "Chapter 5.3 Time to slice and dice: Slicing and dicing our data; The map() method's superpowers"
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter5/4
    locator: 'Chapter 5.4 Big data? 🤗 Datasets to the rescue!: The magic of memory mapping; Streaming datasets'
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter3/4
    locator: 'Chapter 3.4 A full training loop: Prepare for training; The training loop; Supercharge your training loop with 🤗 Accelerate'
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter7/4
    locator: 'Chapter 7.4 Translation: Data collation; Metrics; Fine-tuning the model'
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter4/1
    locator: Chapter 4.1 The Hugging Face Hub (introduction)
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter4/4
    locator: 'Chapter 4.4 Building a model card: introduction; Intended uses & limitations; Training data; Evaluation results'
---
## Key ideas

- **Pipelines.** `pipeline(task)` bundles three steps: the tokenizer preprocesses the text, the model runs, and the output is post-processed into labels, scores or text; without `model=` a default checkpoint for the task is used [^1]. Know which task does what: `text-classification` / `sentiment-analysis` (a label for a whole text), `ner` (entity spans such as PER, ORG, LOC), `fill-mask`, `zero-shot-classification` (you supply `candidate_labels` at call time), `text-generation`, `summarization`, `translation` [^1].
- **Mask tokens differ between checkpoints**: the course's default fill-mask model uses `<mask>`, while `bert-base-cased` uses `[MASK]` (see the code below); check the model before writing the prompt [^1].
- **Tokenizers** turn text into numbers. Most checkpoints use subword tokenization: frequent words stay whole, rare words are split into meaningful pieces (BERT marks continuations with `##`) [^2]. `tokenize()` returns a list of **strings**; `convert_tokens_to_ids()` maps them to vocabulary IDs; `decode()` goes back to text [^2]. Calling the tokenizer directly does everything at once: tokens, IDs, the model's special tokens (`[CLS]` … `[SEP]` for BERT), padding/truncation and an `attention_mask`, with `return_tensors="pt"` for PyTorch.
- **Auto classes.** `AutoTokenizer.from_pretrained(ckpt)` and `AutoModel…from_pretrained(ckpt)` read the checkpoint and build the right class. Load tokenizer and model from the **same checkpoint**, or the IDs mean nothing to the model [^2].
- **The Hub.** Every model on the Hugging Face Hub is stored as a git repository, so its files are versioned; the Hub is not tied to 🤗 Transformers and also hosts models from libraries such as timm (vision), pyannote and Asteroid (speech) or Flair (NLP) [^7]. A repo's `README.md` is its **model card**, a Markdown document on what the model is, its intended uses and limitations (bias included), its training data and procedure and its evaluation results, so others can judge whether it suits them [^8].
- **Datasets: map.** `Dataset.map(fn, batched=True)` passes many examples per call (each column as a list); with a fast tokenizer this was about 30 times faster than unbatched slow tokenization in the course's test [^3]. Padding is a separate step: a data collator pads each batch [^6].
- **Datasets: slicing.** A random sample is `ds.shuffle(seed=…).select(range(n))`, shuffle first; `select` takes row indices, `filter` takes a function that returns `True` for rows to keep [^3]. There is no `ds.sample()`, and the first argument of `shuffle` is the seed.
- **Big data.** 🤗 Datasets stores data with Apache Arrow as memory-mapped files, a mapping between RAM and disk: you can work with datasets much larger than RAM, and several processes can share the file, so `map()` can run in parallel without copying [^4]. With `streaming=True`, `load_dataset` returns an `IterableDataset`: nothing is downloaded up front, and examples are read by iterating (`next(iter(ds))`, `take(n)`, `skip(n)`), not by index [^4].
- **Custom training loop.** Drop the raw text columns the model does not expect, rename `label` to `labels`, set the format to PyTorch tensors, and move both model and batches to one device [^5]. Every 🤗 Transformers model returns `outputs.loss` when the batch contains `labels`, so you call `outputs.loss.backward()` without writing a loss function [^5]. Evaluate with `model.eval()` and `torch.no_grad()`. **Accelerate** runs the same loop on multiple GPUs/TPUs: `accelerator.prepare(...)` wraps model, optimizer and dataloaders, and `accelerator.backward(loss)` replaces `loss.backward()` [^5].
- **Trainer.** The `Trainer` (or `Seq2SeqTrainer`) takes the model, the training arguments, the datasets, a data collator and an optional `compute_metrics`, which receives `(predictions, labels)` at evaluation time and returns a dict of metric values such as BLEU or accuracy [^6]. It does not compute the training loss.
- **Sequence-to-sequence.** Padded positions in `labels` are set to −100 so the loss ignores them (PyTorch's cross-entropy skips index −100); `DataCollatorForSeq2Seq` does this, while `DataCollatorWithPadding` pads only the inputs [^6]. `Seq2SeqTrainer` adds `generate()` to evaluation, because at inference the decoder must produce its output token by token [^6].

## Formulas

- Mean token loss with ignored positions: $\mathcal{L} = \frac{1}{|\{i : y_i \ne -100\}|} \sum_{i : y_i \ne -100} -\log p_\theta(y_i \mid \cdot)$.
- Tokenized batch: `input_ids` and `attention_mask` both have shape (batch, longest sequence); the mask is 1 on real tokens and 0 on padding.

## Worked example

Token logits $(2, 0)$, $(0, 2)$, $(1, 1)$ over a 2-word vocabulary, labels $(0, -100, 1)$:

- position 1: $-\ln \frac{e^2}{e^2 + 1} = \ln(1 + e^{-2}) \approx 0.127$;
- position 2 is padding and is skipped, so it does not matter that the model "predicted" word 1 there;
- position 3: $-\ln \tfrac12 \approx 0.693$.

The loss is $(0.127 + 0.693)/2 \approx 0.41$, an average over the 2 real targets, not 3. Had the padding been labelled with the pad token's ID instead, the model would be trained to predict padding.

## In code

```python
from transformers import AutoTokenizer
from datasets import Dataset
tok = AutoTokenizer.from_pretrained("bert-base-cased")
print(tok.tokenize("Hello!"), tok.mask_token)               # ['Hello', '!'] [MASK]
enc = tok(["Hello!", "Hi"], padding=True, return_tensors="pt")
print(tok.convert_ids_to_tokens(enc["input_ids"][1]))       # ['[CLS]', 'Hi', '[SEP]', '[PAD]']
print(enc["attention_mask"].tolist())                       # [[1, 1, 1, 1], [1, 1, 1, 0]]
ds = Dataset.from_dict({"name": ["Luna", "Max", "Leo", "Bella"], "label": [0, 1, 1, 0]})
print(len(ds.shuffle(seed=0).select(range(2))))            # 2: a random sample of 2 rows
print(list(ds.filter(lambda x: x["name"].startswith("L"))["name"]))   # ['Luna', 'Leo']
ds = ds.map(lambda b: {"n_chars": [len(n) for n in b["name"]]}, batched=True)
print(ds.column_names)                                      # ['name', 'label', 'n_chars']
```

## Common pitfalls

- `tokenizer.tokenize(text)` gives token strings, not IDs and not tensors [^2].
- Special tokens such as `[CLS]` and `[SEP]` are added by the tokenizer, not by the model; padding comes last, after the special tokens.
- A BERT tokenizer with a GPT-2 model (or any mismatched pair) runs without error but feeds the model meaningless IDs [^2].
- `zero-shot-classification` needs `candidate_labels`; a `fill-mask` prompt needs that model's own mask token [^1].
- `ds.select(range(50)).shuffle()` only reorders the first 50 rows; `ds.shuffle(50)` shuffles everything with seed 50 [^3].
- `batched=True` speeds up `map`; it neither pads, nor saves memory, nor converts to tensors [^3].
- A streamed `IterableDataset` has no random access, so `ds[0]` does not give the first example; use `next(iter(ds))` [^4].
- Label padding must be −100, not the pad token ID [^6]; the loss comes from the model when `labels` are given, not from `compute_metrics` [^5].
