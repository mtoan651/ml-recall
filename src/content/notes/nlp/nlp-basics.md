---
topic: nlp-basics
summary: The classic text pipeline before deep learning — tokens and types, normalization, stemming vs. lemmatization, regular expressions, edit distance, word statistics and tf-idf vectors.
status: reviewed
reviewed_by: claude
references:
  - title: 'Jurafsky & Martin, Speech and Language Processing, 3rd ed. draft (Aug 2026), Ch. 2 Words and Tokens'
    url: https://web.stanford.edu/~jurafsky/slp3/2.pdf
    locator: Sec. 2.1 Words, 2.6 Regular Expressions, 2.8.1 Sentence Segmentation, 2.9 Minimum Edit Distance
  - title: 'Manning, Raghavan & Schütze, Introduction to Information Retrieval'
    url: https://nlp.stanford.edu/IR-book/html/htmledition/stemming-and-lemmatization-1.html
    locator: Sec. 2.2.4 Stemming and lemmatization
  - title: 'Manning, Raghavan & Schütze, Introduction to Information Retrieval'
    url: https://nlp.stanford.edu/IR-book/html/htmledition/zipfs-law-modeling-the-distribution-of-terms-1.html
    locator: "Sec. 5.1.2 Zipf's law: Modeling the distribution of terms"
  - title: 'Manning, Raghavan & Schütze, Introduction to Information Retrieval'
    url: https://nlp.stanford.edu/IR-book/html/htmledition/inverse-document-frequency-1.html
    locator: Sec. 6.2.1 Inverse document frequency (Eq. 21)
  - title: 'scikit-learn User Guide: Text feature extraction'
    url: https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction
    locator: Sec. 8.2.3 Text feature extraction (8.2.3.1 The Bag of Words representation, 8.2.3.4 Using stop words, 8.2.3.5 Tf–idf term weighting)
  - title: 'Python documentation: re — Regular expression operations'
    url: https://docs.python.org/3/library/re.html#regular-expression-syntax
    locator: Regular expression syntax, the `|` (alternation) operator
  - title: 'Manning, Raghavan & Schütze, Introduction to Information Retrieval'
    url: https://nlp.stanford.edu/IR-book/html/htmledition/capitalizationcase-folding-1.html
    locator: Sec. 2.2.3 Normalization, Capitalization/case-folding
  - title: 'Wikipedia: CYK algorithm'
    url: https://en.wikipedia.org/wiki/CYK_algorithm
    locator: Introduction; Standard form; Probabilistic CYK; Parsing weighted context-free grammars
---
## Key ideas

- **The pipeline.** Classic NLP turns raw text into countable units: sentence segmentation →
  tokenization (words and punctuation) → normalization (case folding, accents) → optional
  stop-word removal and stemming or lemmatization → features such as bag of words and tf-idf.
  Tagging (part of speech, named entities) and parsing build on these tokens.
- **Types vs. tokens.** A *token* (word instance) is one running occurrence, a *type* is a
  distinct word: "a rose is a rose is a rose" has 8 tokens but 3 types. Whether "They" and
  "they" count as one type depends on the task [^1].
- **Words are not always marked.** Chinese, Japanese and Thai are written without spaces, so
  whitespace splitting cannot find words; use a segmenter, characters or learned subwords [^1].
- **Sentence segmentation.** "?" and "!" are fairly reliable sentence ends, but a period also
  ends abbreviations ("Dr.", "p.m.") and appears inside numbers, so splitting after every
  period over-segments [^1].
- **Regular expressions** do rule-based tokenization. `[tT]he` handles case, and `\b` marks a
  word boundary, so `\bthe\b` no longer matches inside "other". Counters (`* + ?`) bind
  tighter than sequences, sequences tighter than `|`, and matching is greedy [^1]. In
  Python, the branches of `A|B` are tried from left to right and the first branch that matches
  wins, even if a later one would match more text [^6].
- **Stemming vs. lemmatization.** Both reduce word forms to a common base. Stemming chops
  affixes with heuristic rules (Porter's algorithm is the standard English stemmer), so stems
  need not be words; lemmatization uses a vocabulary and morphological analysis to return the
  dictionary form (the lemma), e.g. "saw" → "see" as a verb but "saw" as a noun [^2]. In
  search, stemming tends to raise recall and lower precision [^2].
- **Stop words** are frequent words such as "the", "and", "is" that are presumed to carry
  little content and are often removed [^5]. Lists are blunt: scikit-learn's built-in English
  list also contains "not".
- **Case folding** (lowercasing) lets "Apple" at the start of a sentence match the query
  "apple", but it also merges names with common words ("General Motors", "Bush") [^7]; for
  tasks where capitalization is a useful feature, such as finding names, keep it [^1].
- **Parsing with a PCFG.** A probabilistic context-free grammar gives each rule a
  probability, and probabilistic CKY multiplies them: a parse tree's probability is the
  product of the probabilities of its rules, so two parses built from the same rules tie. CKY
  needs binary rules (Chomsky normal form), e.g. $\mathrm{NP} \to \mathrm{DT}\ \mathrm{NN}\ \mathrm{NN}$
  with probability $p$ becomes $\mathrm{NP} \to \mathrm{DT}\ Z$ ($p$) and $Z \to \mathrm{NN}\ \mathrm{NN}$ (1),
  and it fills a chart over all spans in $O(n^3 \cdot |G|)$ time [^8].

## Formulas

- A text of $T$ tokens has $T - n + 1$ $n$-gram occurrences ("a rose is …": 7 bigram tokens,
  3 bigram types).
- **Zipf's law:** the $i$-th most frequent term has frequency $\mathrm{cf}_i \propto 1/i$ [^3].
- **Heaps' (Herdan's) law:** vocabulary size $|V| = kN^{\beta}$ with $0 < \beta < 1$, often
  about 0.44–0.56, so the vocabulary never stops growing [^1].
- **Bag of words:** one dimension per vocabulary word holding its count; word order is
  lost [^5]. Dividing by the document length $|D|$ gives the averaged version.
- **tf-idf:** $\mathrm{idf}_t = \log \frac{N}{\mathrm{df}_t}$ and
  $\textrm{tf-idf}_{t,d} = \mathrm{tf}_{t,d} \cdot \mathrm{idf}_t$, so a term that occurs in
  every document gets weight 0 [^4][^5]. scikit-learn's default uses the smoothed
  $\mathrm{idf}(t) = \ln\frac{1 + n}{1 + \mathrm{df}(t)} + 1$ and then L2-normalizes each row [^5].
- **Cosine similarity:** $\cos(\mathbf{x}, \mathbf{y}) = \frac{\mathbf{x}^\top\mathbf{y}}{\lVert\mathbf{x}\rVert\,\lVert\mathbf{y}\rVert}$.

**Minimum edit distance** is computed by dynamic programming over prefixes [^1]:

$$
D(i, j) = \min\big(D(i-1, j) + 1,\; D(i, j-1) + 1,\; D(i-1, j-1) + \mathrm{sub}(a_i, b_j)\big)
$$

with $\mathrm{sub} = 0$ for equal letters. Levenshtein distance charges 1 for every insertion,
deletion and substitution (intention → execution: 5); the textbook variant charges 2 for a
substitution, the price of a deletion plus an insertion (intention → execution: 8) [^1].

## Worked example

Corpus of $N = 4$ documents: d1 "the cat sat on the mat", d2 "the dog sat", d3 "the cat ran",
d4 "a dog barked". Weights for d1 with raw counts and $\log_{10}$:

| term | count in d1 | df | idf $= \log_{10}(4/\mathrm{df})$ | tf-idf |
| --- | --- | --- | --- | --- |
| the | 2 | 3 | 0.125 | 0.250 |
| cat, sat | 1 | 2 | 0.301 | 0.301 |
| on, mat | 1 | 1 | 0.602 | 0.602 |

The words unique to d1 ("on", "mat") get the highest weight; "the" is damped by its idf.

## In code

```python
from sklearn.feature_extraction.text import TfidfVectorizer

docs = ["the cat sat on the mat", "the dog sat", "the cat ran", "a dog barked"]
vec = TfidfVectorizer()                  # smooth_idf=True, norm="l2" by default
X = vec.fit_transform(docs)
idf = dict(zip(vec.get_feature_names_out(), vec.idf_.round(3)))
print(idf["the"], idf["cat"], idf["mat"])  # 1.223 1.511 1.916
print("a" in idf)                          # False: default token_pattern needs 2+ characters
print(X[0].toarray().round(2))             # [[0. 0.36 0. 0.45 0.45 0. 0.36 0.58]]
```

With the smoothed idf, "the" (count 2) gets the *largest* weight in d1, unlike the textbook
table above.

## Common pitfalls

- Tokenizing is more than splitting on punctuation: "U.S.A.", "3.50", "don't" and URLs need
  rules, and a period is not always a sentence end.
- `[tT]he` without `\b` also matches inside "other" and "there" (false positives), while
  `the` alone misses "The" (a false negative).
- Stems are not dictionary words ("located" → "locat"), and unrelated words can collide:
  Porter maps both "generous" and "general" to "gener" (overstemming). Irregular forms such as
  "better" → "good" need a lemmatizer, not a stemmer.
- Removing stop words can remove meaning: "The food was not good" and "The food was good" give
  the same vector with scikit-learn's English list.
- Bag of words ignores order: "this is interesting" and "is this interesting" have cosine
  similarity 1.
- idf variants differ: textbook $\log(N/\mathrm{df})$ gives 0 to a word found in every
  document, scikit-learn's smoothed idf gives it 1; check the log base too.
- For equal-length words, the number of differing positions (Hamming distance) is only an
  upper bound on the Levenshtein distance: "stop" → "tops" differs in 4 positions but needs
  2 edits.
