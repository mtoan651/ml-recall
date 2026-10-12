---
topic: nlp-tasks
summary: Framing NLP tasks as sequence classification, token classification (BIO tags), extractive QA or seq2seq, and scoring them with entity F1, exact match, BLEU, ROUGE and chrF.
status: reviewed
reviewed_by: claude
references:
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter7/2
    locator: Ch. 7, Token classification (Processing the data, Metrics)
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter7/7
    locator: Ch. 7, Question answering (Processing the training data, Post-processing)
  - title: 'Jurafsky & Martin, Speech and Language Processing, 3rd ed. draft (Aug 2026), Ch. 18 Sequence Labeling for Parts of Speech and Named Entities'
    url: https://web.stanford.edu/~jurafsky/slp3/18.pdf
    locator: Sec. 18.2 Part-of-Speech Tagging, 18.3 Named Entities and Named Entity Tagging, 18.6 Evaluation of Named Entity Recognition
  - title: 'Jurafsky & Martin, Speech and Language Processing, 3rd ed. draft (Aug 2026), Ch. 13 Machine Translation'
    url: https://web.stanford.edu/~jurafsky/slp3/13.pdf
    locator: Sec. 13.1 Language Divergences and Typology, 13.6.2 Automatic Evaluation (chrF, BLEU)
  - title: 'Papineni et al. (2002), BLEU: a Method for Automatic Evaluation of Machine Translation'
    url: https://aclanthology.org/P02-1040.pdf
    locator: Sec. 2.1 Modified n-gram precision, 2.2.2 Sentence brevity penalty, 2.3 BLEU details
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter7/5
    locator: Ch. 7, Summarization (Metrics for text summarization)
  - title: 'Wikipedia: Named-entity recognition'
    url: https://en.wikipedia.org/wiki/Named-entity_recognition
    locator: Problem, Definition (names as contiguous spans with no nesting, "Bank of America")
---
## Key ideas

How a task is framed decides the model's output head:

| framing | output | examples |
| --- | --- | --- |
| sequence classification | one label per text (or text pair) | sentiment, topic, natural language inference |
| token classification | one label per token | POS tagging, NER, chunking |
| extractive QA | start and end position of a span | SQuAD-style reading comprehension |
| sequence-to-sequence | a new text of its own length | translation, summarization, generative QA |

- **Why translation is not tagging.** Input and output can differ in length and word order
  (Japanese puts the verb after the object, English before it), so there is no one-to-one
  alignment of tokens [^4].
- **POS tagging** gives each word a tag; only about 14–15% of word types are ambiguous, but
  they are frequent words, so 55–67% of the tokens in running text are. The most-frequent-tag
  baseline already scores about 92%; good taggers and human agreement reach about 97% [^3].
- **NER and BIO tags** [^3]. An entity can span several tokens, so labels mark *B*eginning,
  *I*nside or *O*utside a span: "New York City" = B-LOC I-LOC I-LOC. Every B starts a new
  entity, so "Ana Ben" tagged B-PER B-PER is two people. IO tagging drops B and cannot separate
  adjacent same-type entities; BIOES adds End and Single tags. One label per token cannot
  express nested entities ("America" inside "Bank of America") [^7].
- **Labels vs. subwords** [^1]. Datasets label words, but a subword tokenizer may split a word
  into several tokens. Align with `word_ids()`: special tokens get label $-100$ (ignored by the
  cross-entropy loss), and later pieces of a word copy its label with B- turned into I-. Pad
  the labels exactly like the inputs.
- **Extractive QA** [^2]. The model outputs start and end logits per token. A long context is
  split into overlapping windows (`stride`), so one example gives several features; the
  answer is the best-scoring valid (start, end) pair over all features, mapped back to the
  original text with the offset mapping. An extractive answer is always a contiguous span of
  the context; a generative model may paraphrase.
- **Evaluation.**
  - NER is scored per *entity*: a prediction counts only if span and type match exactly; then
    precision, recall, F1 [^3]. Token accuracy is misleading because most tokens are O.
  - QA uses exact match and token-level F1 [^2].
  - BLEU: clipped n-gram precision (n = 1…4), geometric mean, times a brevity penalty for short
    outputs [^5]. Being word-based, it depends on tokenization, so compare scores only with
    standardized tokenization such as SacreBLEU [^4].
  - ROUGE (summarization) is recall-oriented: how much of the reference's n-grams the output
    recovers (libraries also report precision and F1); ROUGE-2 uses bigrams [^6].
  - chrF is a character n-gram F-score, more robust to morphology [^4].

## Formulas

- BIO label set for $k$ entity types: $2k + 1$; BIOES: $4k + 1$ (one shared O).
- Entity-level $F_1 = \dfrac{2PR}{P + R}$ with $P = \dfrac{\text{correct}}{\text{predicted}}$,
  $R = \dfrac{\text{correct}}{\text{gold}}$.
- chrF [^4]: $\mathrm{chrF}_\beta = (1 + \beta^2)\,\dfrac{\mathrm{chrP} \cdot \mathrm{chrR}}{\beta^2\,\mathrm{chrP} + \mathrm{chrR}}$,
  usually $\beta = 2$ (recall weighted more).

**BLEU** [^5] clips each candidate n-gram count at its maximum count in a single reference,
giving modified precisions $p_n$, and combines them with a brevity penalty ($c$ = candidate
length, $r$ = reference length):

$$
\mathrm{BLEU} = \mathrm{BP} \cdot \exp\Big(\sum_{n=1}^{N} w_n \log p_n\Big), \qquad \mathrm{BP} = \begin{cases} 1 & c > r \\ e^{1 - r/c} & c \le r \end{cases}
$$

## Worked example

BLEU with $N = 2$, $w_1 = w_2 = \tfrac12$. Reference: "the quick brown fox jumps" ($r = 5$);
candidate: "the the fox jumps" ($c = 4$).

- Unigrams: "the" appears twice but only once in the reference, so it is clipped to 1;
  $p_1 = (1 + 1 + 1)/4 = 0.75$ (unclipped it would be $4/4$).
- Bigrams: "the the", "the fox", "fox jumps"; only "fox jumps" matches, $p_2 = 1/3$.
- $\mathrm{BP} = e^{1 - 5/4} = e^{-0.25} \approx 0.779$.
- $\mathrm{BLEU} = 0.779 \cdot \sqrt{0.75 \cdot 1/3} = 0.779 \cdot 0.5 \approx 0.389$.

## In code

```python
def spans(tags):                                        # BIO tags -> set of (start, end, type)
    out, start, label = set(), None, None
    for i, t in enumerate(tags + ["O"]):
        if start is not None and t != "I-" + label:     # the current span ends before i
            out.add((start, i, label)); start = None
        if t.startswith("B-") or (t.startswith("I-") and start is None):
            start, label = i, t[2:]
    return out

gold = ["B-PER", "I-PER", "O", "B-LOC", "O", "B-ORG", "I-ORG"]
pred = ["B-PER", "O",     "O", "B-LOC", "O", "B-PER", "I-PER"]
g, p = spans(gold), spans(pred)
P, R = len(g & p) / len(p), len(g & p) / len(g)
print(sorted(p))                    # [(0, 1, 'PER'), (3, 4, 'LOC'), (5, 7, 'PER')]
print(round(P, 3), round(R, 3), round(2 * P * R / (P + R), 3))  # 0.333 0.333 0.333
```

Token accuracy of the same prediction is $4/7 \approx 0.57$, but only one of three entities is
right (the PER has a wrong boundary, the ORG a wrong type).

## Common pitfalls

- An entity is not always one token, and adjacent same-type entities need separate B tags.
- A model that tags everything O can have over 90% token accuracy and entity-level F1 of 0.
- A 93% POS tagger is barely above the most-frequent-tag baseline (~92%).
- Special tokens and extra subword pieces must be labelled ($-100$ or the word's label);
  otherwise labels and tokens have different lengths.
- QA contexts are split *with overlap*, and window scores are not averaged: the single best
  span over all windows wins.
- BLEU is precision-based (with a brevity penalty), ROUGE is recall-oriented; clipping stops
  "the the the" from scoring well.
- BLEU scores computed with different tokenizers cannot be compared.
