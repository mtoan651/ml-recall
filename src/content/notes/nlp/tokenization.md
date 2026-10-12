---
topic: tokenization
summary: How text becomes token ids — word, character and subword units, the tokenizer pipeline, and the BPE, WordPiece and Unigram algorithms with their training and encoding rules.
status: reviewed
reviewed_by: claude
references:
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter2/4
    locator: Ch. 2 Using Transformers, Tokenizers (Word-based, Character-based, Subword tokenization)
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter6/2
    locator: Ch. 6 The Tokenizers library, Training a new tokenizer from an old one
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter6/4
    locator: Ch. 6, Normalization and pre-tokenization (Normalization, Pre-tokenization, SentencePiece)
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter6/5
    locator: Ch. 6, Byte-Pair Encoding tokenization (Training algorithm, Tokenization algorithm)
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter6/6
    locator: Ch. 6, WordPiece tokenization (Training algorithm, Tokenization algorithm)
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter6/7
    locator: Ch. 6, Unigram tokenization (Training algorithm, Tokenization algorithm)
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter6/8
    locator: Ch. 6, Building a tokenizer, block by block (introduction, the four steps)
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter2/2
    locator: Ch. 2, Behind the pipeline (Preprocessing with a tokenizer)
---
## Key ideas

- **A model sees token ids, not text.** The tokenizer maps text to ids [^1], and each id selects
  one learned row of the embedding matrix.
- **Granularity.** Word-level tokenizers need a huge vocabulary, map unseen words to `[UNK]` and
  treat "dog" and "dogs" as unrelated ids. Character-level ones have a tiny vocabulary and few
  unknowns, but long sequences of units that mean little on their own. Subword tokenizers keep
  frequent words whole and split rare words into meaningful pieces ("annoyingly" →
  "annoying" + "ly") [^1].
- **Pipeline** [^7]: *normalization* (cleanup such as lowercasing, stripping accents, Unicode
  NFC/NFKC) [^3] → *pre-tokenization* (split into words, whose boundaries subwords never
  cross) → *model* (BPE, WordPiece or Unigram) → *post-processing*, which adds the model's
  special tokens (such as `[CLS]` and `[SEP]` for BERT) and builds the attention mask.
- **Whitespace and reversibility** [^3]. BERT's pre-tokenizer splits on whitespace and
  punctuation and keeps only offsets, so a double space is lost. GPT-2's keeps each space as a
  `Ġ` symbol glued to the following word, so decoding restores the text. SentencePiece (T5)
  treats the input as a raw character stream, writes spaces as `▁`, and decodes by
  concatenating pieces; it needs no spaces, which suits Chinese and Japanese.
- **BPE** (GPT-2, RoBERTa) [^4]. *Training:* start from the characters of the corpus, count
  adjacent pairs inside words (weighted by word frequency), merge the most frequent pair into a
  new token, repeat until the target vocabulary size. *Encoding:* split a word into characters
  and replay the learned merges in the order they were learned. A character never seen in
  training becomes unknown; byte-level BPE avoids this by starting from the 256 byte values of
  UTF-8, so every string can be encoded.
- **WordPiece** (BERT) [^5]. Also grows the vocabulary by merges, but chooses the pair with the
  highest score (below), which prefers pairs whose parts are rare on their own. Pieces inside
  a word carry the prefix `##`. Only the vocabulary is kept, not the merges: encoding takes the
  longest vocabulary entry from the start of the word, then repeats on the rest; if at some
  point nothing fits, the *whole word* becomes `[UNK]`.
- **Unigram** (used through SentencePiece) [^6]. Goes the other way: start from a large
  vocabulary and repeatedly drop the 10–20% of tokens whose removal increases the corpus loss
  least, never removing single characters so that every word stays encodable. It encodes a word
  with its most probable segmentation, found by the Viterbi algorithm.
- **Train a new tokenizer** only when you pretrain a model from scratch on a corpus unlike the
  original (another language, source code) [^2]. Fine-tuning reuses the pretrained model's
  own tokenizer: the text must be preprocessed exactly as in pretraining, because each id
  selects the embedding row learned for it [^8].

## Formulas

- BPE vocabulary size $=$ base symbols $+$ number of merges (e.g. 256 bytes $+$ 31,744 merges
  $=$ 32,000) [^4].
- WordPiece pair score [^5]:

$$
\mathrm{score}(a, b) = \frac{\mathrm{freq}(ab)}{\mathrm{freq}(a) \times \mathrm{freq}(b)}
$$

- Unigram: a segmentation $x_1 \dots x_k$ has probability $\prod_i p(x_i)$; the tokenizer picks
  the most probable one, and training minimizes the corpus negative log-likelihood
  $-\sum_{w} \mathrm{count}(w) \log P(w)$ [^6].
- Embedding size $= |V| \times d$: growing a vocabulary from 32,000 to 128,000 tokens at
  $d = 4096$ adds $96{,}000 \times 4096 \approx 393$ million input parameters (and as many in an
  untied output layer), while texts get fewer tokens.
- UTF-8 uses 1 to 4 bytes per character: "café" is 4 characters but 5 bytes, so 5 initial
  byte-level tokens.

## Worked example

BPE on the word counts cat 6, cats 3, hat 4, that 2, chat 1. Split into characters the corpus
is $3 \cdot 6 + 4 \cdot 3 + 3 \cdot 4 + 4 \cdot 2 + 4 \cdot 1 = 54$ symbols, with base
vocabulary {a, c, h, s, t}.

| step | pair counts (top) | merge | corpus length |
| --- | --- | --- | --- |
| 1 | `a t` 16, `c a` 9, `h a` 7 | `at` | $54 - 16 = 38$ |
| 2 | `c at` 9, `h at` 7, `at s` 3 | `cat` | $38 - 9 = 29$ |
| 3 | `h at` 7, `cat s` 3, `t h` 2 | `hat` | $29 - 7 = 22$ |

The vocabulary now has $5 + 3 = 8$ tokens. The unseen word "chats" is encoded as
`c h a t s` → `c h at s` (merge 1; merge 2 needs `c at`, which does not occur) → `c hat s`
(merge 3). WordPiece on the same corpus would merge `t ##h` first: its score
$2/(2 \cdot 3) = 1/3$ beats $16/(16 \cdot 16) = 1/16$ for the most frequent pair `##a ##t`.

## In code

```python
from collections import Counter

corpus = {"cat": 6, "cats": 3, "hat": 4, "that": 2, "chat": 1}
words = {w: " ".join(w) for w in corpus}          # start from single characters
for step in range(3):
    pairs = Counter()
    for w, s in words.items():
        sym = s.split()
        for p in zip(sym, sym[1:]):
            pairs[p] += corpus[w]                 # count pairs inside words only
    (a, b), n = pairs.most_common(1)[0]
    words = {w: f" {s} ".replace(f" {a} {b} ", f" {a}{b} ").strip() for w, s in words.items()}
    print(step + 1, a + b, n)                     # 1 at 16 / 2 cat 9 / 3 hat 7
print(words["that"], "|", words["chat"])          # t hat | c hat
```

## Common pitfalls

- BPE does **not** pick the longest vocabulary entry when encoding; it replays its merges in
  training order. Longest-match-first is WordPiece, and the two can split the same word
  differently.
- BPE starts small and merges the *most frequent* pair; WordPiece also merges but by the
  frequency ratio score; Unigram starts big and prunes by loss, not by frequency.
- Unknown handling differs: WordPiece turns the whole word into `[UNK]`, character-level BPE
  marks only the unseen characters, byte-level BPE never needs `[UNK]`.
- More merges make tokens longer and sequences *shorter*, at the price of larger embedding and
  output layers; the base characters (or bytes) stay, so unseen words still decompose.
- Normalization is text cleanup, not data augmentation or z-scoring of embeddings;
  pre-tokenization splits text into words, and only the model splits words into tokens.
- Swapping in a different tokenizer for a pretrained model breaks it: the same id must still
  point to the embedding row it was trained with.
- Byte-level tokens count UTF-8 bytes, not characters, so non-ASCII text needs more initial
  tokens.
