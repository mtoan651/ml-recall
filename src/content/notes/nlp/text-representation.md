---
topic: text-representation
summary: Turning words into vectors — one-hot and bag-of-words counts, embedding layers, word2vec (skip-gram, CBOW, negative sampling), GloVe, fastText subwords and contextual embeddings.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_natural-language-processing-pretraining/word2vec.html
    locator: Sec. 15.1 Word Embedding (word2vec)
  - source: d2l
    url: https://d2l.ai/chapter_natural-language-processing-pretraining/approx-training.html
    locator: Sec. 15.2 Approximate Training (15.2.1 Negative Sampling, 15.2.2 Hierarchical Softmax)
  - source: d2l
    url: https://d2l.ai/chapter_natural-language-processing-pretraining/word-embedding-dataset.html
    locator: Sec. 15.3.2 Subsampling and 15.3.4 Negative Sampling
  - source: d2l
    url: https://d2l.ai/chapter_natural-language-processing-pretraining/glove.html
    locator: Sec. 15.5 Word Embedding with Global Vectors (GloVe)
  - source: d2l
    url: https://d2l.ai/chapter_natural-language-processing-pretraining/subword-embedding.html
    locator: Sec. 15.6.1 The fastText Model
  - source: d2l
    url: https://d2l.ai/chapter_natural-language-processing-pretraining/bert.html
    locator: Sec. 15.8.1 From Context-Independent to Context-Sensitive
  - title: 'PyTorch documentation: torch.nn.EmbeddingBag'
    url: https://docs.pytorch.org/docs/stable/generated/torch.nn.EmbeddingBag.html
    locator: Class description (mode "sum", "mean" or "max"; input = indices into the embedding matrix)
  - source: trusthlt-nlp
    url: https://github.com/trusthlt/nlp-with-deep-learning-lectures/blob/751182ea7a6a6f2246bbd8313329ecd09d270dbc/lectures/lecture05/pdf/nlpwdl2025-lecture05-handout.pdf
    locator: Lecture 5 handout, frames 'Distributional hypothesis' and 'Limitations of word embeddings (1)' (antonyms)
---
## Key ideas

- **Sparse representations.** Character-level text gives one one-hot column per character
  (small alphabet, long sequences); word-level gives one per word (more meaning, but vectors
  as long as the vocabulary). Summing the one-hot vectors of a text gives a bag-of-words count
  vector, which loses word order; adding n-gram features restores some local order but makes
  the vocabulary explode. Any two different one-hot vectors have cosine similarity 0, so they
  cannot express that two words are similar [^1].
- **Dense embeddings.** Each word gets a learned real vector of a small, fixed size $d$
  (typically a few hundred, far below $|V|$). An embedding layer (`nn.Embedding`) takes integer
  token ids and returns rows of a $|V| \times d$ weight matrix: exactly one-hot $\times$
  $\mathbf{W}$, without building the one-hot vector. An *embedding bag* aggregates (sum, mean or
  max) the embeddings of all words into one fixed-size vector for a text classifier [^7].
- **word2vec is self-supervised** [^1]: the "labels" are words of the raw text itself.
  *Skip-gram* predicts each context word from the center word; *CBOW* predicts the center word
  from the average of its context-word vectors. Every word gets two vectors, one for its role
  as center word and one for its role as context word; skip-gram typically keeps the
  center-word vectors as embeddings, CBOW the context-word vectors (in both cases the input
  side). The prediction task is only a means to learn them.
- **Why similar words get similar vectors.** Words that occur in similar contexts are pushed
  toward high dot products with the same context vectors (the distributional hypothesis), so
  their vectors align. This also pulls antonyms such as "hot" and "cold" together, because
  they occur in the same kinds of contexts [^8].
- **Approximate training** [^2]. The softmax normalizes over the whole vocabulary, so one
  gradient costs $O(|V|\,d)$. *Negative sampling* turns it into $K + 1$ binary
  decisions (true pair vs. $K$ noise words), a cost linear in $K$; *hierarchical softmax*
  walks a binary tree, about $\log_2 |V|$ steps.
- **Data tricks** [^3]: frequent words are *subsampled* (randomly dropped), and noise words are
  drawn with probability proportional to frequency$^{0.75}$, which flattens the unigram
  distribution so rarer words are drawn more often.
- **GloVe** [^4] fits global co-occurrence counts $x_{ij}$ with a weighted squared loss on
  $\log x_{ij}$. Because $x_{ij} = x_{ji}$, center and context vectors play symmetric roles,
  and the final vector of a word is the sum of the two.
- **fastText** [^5] adds `<` and `>` to a word and represents it by the sum of the vectors of
  its character $n$-grams ($3 \le n \le 6$) plus the whole word, so rare and unseen words get
  vectors built from shared pieces ("where" → `<wh`, `whe`, …, `where>`, `<where>`).
- **Static vs. contextual** [^6]. word2vec, GloVe and fastText give a word the same vector in
  every sentence, so the senses of "bank" or "crane" are blended. ELMo, GPT and BERT compute
  context-sensitive representations from the whole sequence; only a bidirectional model sees
  clues that come *after* the word.

## Formulas

- Skip-gram [^1]: $P(w_o \mid w_c) = \dfrac{\exp(\mathbf{u}_o^\top \mathbf{v}_c)}{\sum_{i \in \mathcal{V}} \exp(\mathbf{u}_i^\top \mathbf{v}_c)}$
- Negative sampling loss for one pair [^2]:
  $-\log \sigma(\mathbf{u}_o^\top \mathbf{v}_c) - \sum_{k=1}^{K} \log \sigma(-\mathbf{u}_{h_k}^\top \mathbf{v}_c)$
- Subsampling [^3]: discard each occurrence of $w_i$ with probability
  $\max\big(1 - \sqrt{t / f(w_i)},\ 0\big)$, $t = 10^{-4}$, $f$ = share of all tokens.
- GloVe [^4]: $\sum_{i,j} h(x_{ij})\,\big(\mathbf{u}_j^\top \mathbf{v}_i + b_i + c_j - \log x_{ij}\big)^2$
- fastText [^5]: $\mathbf{v}_w = \sum_{g \in \mathcal{G}_w} \mathbf{z}_g$
- Cosine similarity lies in $[-1, 1]$ [^1]; for unit vectors
  $\lVert \mathbf{u} - \mathbf{v} \rVert^2 = 2 - 2\cos\theta$, so nearest by distance equals
  nearest by cosine.

## Worked example

Subsampling with $t = 10^{-4}$: "the" makes up $f = 1\%$ of the tokens, so each occurrence is
dropped with probability $1 - \sqrt{10^{-4}/10^{-2}} = 1 - 0.1 = 0.9$; a word with
$f \le 10^{-4}$ is never dropped.

Noise distribution: two words with counts 81 and 1 get weights $81^{0.75} = 27$ and $1$, so the
frequent word is drawn with probability $27/28 \approx 0.964$ instead of $81/82 \approx 0.988$.

## In code

```python
import torch
import torch.nn as nn

torch.manual_seed(0)
emb = nn.Embedding(num_embeddings=5, embedding_dim=3)       # |V| = 5, d = 3
ids = torch.tensor([2, 4])                                  # token ids, not strings
one_hot = nn.functional.one_hot(ids, num_classes=5).float()
print(torch.allclose(emb(ids), one_hot @ emb.weight))       # True: lookup = one-hot @ W
bag = nn.EmbeddingBag.from_pretrained(emb.weight, mode="mean")
print(bag(ids.unsqueeze(0)).shape)                          # torch.Size([1, 3]) for any length
print(torch.allclose(bag(ids.unsqueeze(0)), emb(ids).mean(0)))  # True
```

## Common pitfalls

- The embedding size is a small hyperparameter, not the vocabulary size; a 20,000-word
  vocabulary does not mean 20,000-dimensional word2vec vectors.
- CBOW: context → center word; skip-gram: center → context words. Don't swap them.
- A trained CBOW or skip-gram model is not a text generator or classifier; what you keep is
  the embedding matrix.
- word2vec has no vector for a word outside its training vocabulary; fastText can compose one
  from character n-grams.
- One static vector per word type: "model" (fashion, statistical, scale) has a single blended
  vector. A left-to-right model cannot disambiguate a word whose clue comes later in the
  sentence.
- High similarity does not mean synonymy: antonyms share contexts and end up close.
- Cosine similarity can be negative; embedding entries have both signs.
- In CBOW with negative sampling, the noise words replace the *center* word, scored against the
  averaged context vector.
