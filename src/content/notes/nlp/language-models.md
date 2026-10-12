---
topic: language-models
summary: Language models assign probabilities to token sequences — n-gram counting and smoothing, perplexity, neural causal and masked LMs, and decoding by greedy, temperature, top-k and top-p sampling.
status: reviewed
reviewed_by: claude
references:
  - title: 'Jurafsky & Martin, Speech and Language Processing, 3rd ed. draft (Aug 2026), Ch. 3 N-gram Language Models'
    url: https://web.stanford.edu/~jurafsky/slp3/3.pdf
    locator: 'Sec. 3.1 N-Grams, 3.3 Evaluating Language Models: Perplexity, 3.6 Smoothing, Interpolation, and Backoff'
  - title: 'Wikipedia: Kneser–Ney smoothing'
    url: https://en.wikipedia.org/wiki/Kneser%E2%80%93Ney_smoothing
    locator: Introduction (absolute discounting, the "San Francisco" example); Method (continuation probability)
  - source: d2l
    url: https://d2l.ai/chapter_recurrent-neural-networks/language-model.html
    locator: Sec. 9.3 Language Models (9.3.1.1 Markov Models and n-grams, 9.3.2 Perplexity, 9.3.3 Partitioning Sequences)
  - title: 'Jurafsky & Martin, Speech and Language Processing, 3rd ed. draft (Aug 2026), Ch. 7 Transformers and Pretraining'
    url: https://web.stanford.edu/~jurafsky/slp3/7.pdf
    locator: Sec. 7.5 The Language Modeling Head, 7.6 Decoding, 7.7 Pretraining Transformer LLMs
  - title: 'Jurafsky & Martin, Speech and Language Processing, 3rd ed. draft (Aug 2026), Ch. 9 Masked Language Models'
    url: https://web.stanford.edu/~jurafsky/slp3/9.pdf
    locator: Sec. 9.1 Three architectures for language models, 9.3.1 Masking Words
  - source: hf-llm-course
    url: https://huggingface.co/learn/llm-course/chapter7/6
    locator: Ch. 7, Training a causal language model from scratch (Initializing a new model, data collator with mlm=False)
  - title: 'Wikipedia: Good–Turing frequency estimation'
    url: https://en.wikipedia.org/wiki/Good%E2%80%93Turing_frequency_estimation
    locator: The method (Calculation, Smoothing)
---
## Key ideas

- **Goal.** A language model gives the probability of the next token given the previous ones,
  and by the chain rule the probability of a whole sequence:
  $P(w_1, \dots, w_N) = \prod_t P(w_t \mid w_{<t})$.
- **Self-supervised.** The targets (the next token, or a masked token) come from raw text,
  so no human labels are needed; that is why LMs can be pretrained on huge corpora [^4].
- **n-gram models** make a Markov assumption: an $n$-gram model conditions on the last
  $n - 1$ words, so it is a Markov model of order $n - 1$ (bigram = first order) [^1]. Its
  probabilities are maximum-likelihood count ratios, with `<s>` and `</s>` marking sentence
  start and end [^1].
- **Sparsity.** There are $|V|^n$ possible $n$-grams, so the tables become huge and mostly
  zero; longer contexts help only with enough data [^3]. An unseen n-gram gets probability 0
  and zeroes out the whole sentence, hence smoothing [^1]:
  - *Laplace (add-one)*: add 1 to every count;
  - *interpolation*: mix trigram, bigram and unigram estimates with weights summing to 1;
  - *backoff*: use the shorter context only when the longer one has no counts;
  - *Good–Turing*: unseen words together get probability $N_1/N$ ($N_1$ = number of types
    seen once, $N$ = tokens), and a count $r$ becomes $(r + 1)N_{r+1}/N_r$; the $N_r$ must be
    smoothed first, since $N_{r+1} = 0$ for the largest counts [^7].
- **Kneser–Ney** [^2] subtracts a fixed discount $d$ from every seen count (absolute
  discounting) and gives the freed mass to a *continuation* probability: how many different
  words $w$ follows, not how often $w$ occurs. "Kong" is frequent but follows almost only
  "Hong" (like "Francisco" after "San"), so it gets little mass in new contexts.
- **Neural LMs** replace counts with learned functions of embeddings. A Transformer *decoder*
  with a causal mask (each position attends only to earlier ones) is the standard
  left-to-right LM; it is trained by teacher forcing, predicting every next token of a text in
  one parallel pass, and the LM head turns each hidden state into logits over the
  vocabulary [^4]. In Hugging Face, `DataCollatorForLanguageModeling(mlm=False)` copies the inputs as
  labels and the model shifts them by one [^6].
- **Masked LMs** (BERT, an *encoder*) see both sides and predict tokens hidden at random,
  15% of positions in BERT, mostly replaced by `[MASK]`; only those positions enter the loss,
  which makes training less sample-efficient [^5]. They are not used to generate text left
  to right [^5].
- **RNN LMs** are often trained on windows of `num_steps` tokens cut from a long text [^3];
  if each window starts from a zero state, a training prediction can use at most `num_steps`
  tokens of context.
- **Decoding** [^4]: *greedy* takes the argmax every step (deterministic, repetitive);
  *temperature* divides the logits by $\tau$ ($\tau < 1$ sharpens, $\tau > 1$ flattens);
  *top-k* keeps the $k$ most likely tokens and renormalizes; *top-p* (nucleus) keeps the
  smallest set whose probabilities sum to at least $p$. Generation is sequential: one forward
  pass per new token.

## Formulas

- Bigram MLE [^1]: $P(w_i \mid w_{i-1}) = \dfrac{c(w_{i-1} w_i)}{c(w_{i-1})}$; add-one:
  $\dfrac{c(w_{i-1} w_i) + 1}{c(w_{i-1}) + |V|}$.
- Interpolation [^1]: $\hat{P} = \lambda_1 P(w_n \mid w_{n-2} w_{n-1}) + \lambda_2 P(w_n \mid w_{n-1}) + \lambda_3 P(w_n)$, $\sum_i \lambda_i = 1$.
- Temperature [^4]: $\mathbf{p} = \operatorname{softmax}(\mathbf{z} / \tau)$.
- MLM loss: $-\sum_{t \in \text{masked}} \log P(x_t \mid \text{context})$, unmasked positions
  contribute nothing [^5].

**Perplexity** is the inverse probability of the test text normalized by its length, i.e. the
exponential of the average negative log-likelihood per token [^1][^3]:

$$
\mathrm{PPL} = P(w_1, \dots, w_N)^{-1/N} = \exp\Big(-\frac{1}{N}\sum_{t=1}^{N} \log P(w_t \mid w_{\lt t})\Big)
$$

Lower is better: a perfect model scores 1, and a uniform guess over $|V|$ tokens scores
$|V|$ [^3].

## Worked example

Train a bigram model on three sentences: `<s> I like green tea </s>`, `<s> I like tea </s>`,
`<s> you like green tea </s>`.

- $P(\text{I} \mid \texttt{<s>}) = 2/3$, $P(\text{like} \mid \text{I}) = 2/2$,
  $P(\text{green} \mid \text{like}) = 2/3$, $P(\text{tea} \mid \text{green}) = 2/2$,
  $P(\texttt{</s>} \mid \text{tea}) = 3/3$.
- $P(\texttt{<s>}\ \text{I like green tea}\ \texttt{</s>}) = \frac23 \cdot 1 \cdot \frac23 \cdot 1 \cdot 1 = \frac49 \approx 0.444$.
- Perplexity over the $N = 5$ predicted tokens (including `</s>`): $(9/4)^{1/5} \approx 1.176$.
- "you like tea": $\frac13 \cdot 1 \cdot \frac13 \cdot 1 = \frac19$, perplexity $9^{1/4} \approx 1.732$.
- Add-one with $|V| = 6$ (I, like, green, tea, you, `</s>`):
  $P(\text{tea} \mid \text{like}) = (1 + 1)/(3 + 6) = 2/9$, down from the MLE $1/3$.

## In code

```python
import torch

logits = torch.tensor([2.0, 1.0, 0.0, -1.0])
for T in (1.0, 0.5, 2.0):     # 1.0: [0.644 0.237 0.087 0.032]  0.5: [0.865 0.117 0.016 0.002]
    print(T, torch.softmax(logits / T, dim=-1).numpy().round(3))   # 2.0: [0.455 0.276 0.167 0.102]
p = torch.softmax(logits, dim=-1)
topk = torch.where(p >= p.topk(2).values[-1], p, 0)            # keep the 2 most likely tokens
print("top-k:", (topk / topk.sum()).numpy().round(3))           # [0.731 0.269 0.    0.   ]
s, idx = p.sort(descending=True)
keep = (s.cumsum(0) - s) < 0.9                                   # smallest prefix with mass >= 0.9
nucleus = torch.zeros_like(p).scatter(0, idx[keep], s[keep])
print("top-p:", (nucleus / nucleus.sum()).numpy().round(3))     # [0.665 0.245 0.09  0.   ]
print(torch.argmax(logits / 0.2) == torch.argmax(logits))       # tensor(True)
```

## Common pitfalls

- A 5-gram model conditions on 4 previous words; to use a word 10 positions back you need an
  11-gram.
- A longer n-gram context is not automatically better: on small data most long n-grams occur
  once, and held-out perplexity can rise.
- Perplexity depends on the tokenization and on whether `</s>` is counted, so only compare
  models evaluated the same way.
- Temperature changes the distribution but never the argmax: greedy decoding is unaffected
  by it. Low temperature is for precise text, higher temperature or top-p for creative text.
- The masked-LM loss ignores unmasked positions, so with the same data BERT gets targets at
  only about 15% of positions, while a causal LM gets one at every position.
- Causal LM labels are the inputs shifted by one; MLM labels are the original tokens at the
  masked positions, not shifted.
- Training is parallel over positions (teacher forcing), but generating $T$ tokens takes $T$
  sequential forward passes.
