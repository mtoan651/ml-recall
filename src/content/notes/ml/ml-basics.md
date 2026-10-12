---
topic: ml-basics
summary: How models learn from data and how to check that they generalize — learning paradigms, train/validation/test splits, over- and underfitting, bias–variance, cross-validation and tuning.
status: reviewed
reviewed_by: claude
references:
  - title: 'Google for Developers: Machine Learning Glossary'
    url: https://developers.google.com/machine-learning/glossary
    locator: 'Entries: supervised machine learning; unsupervised machine learning; self-supervised learning; reinforcement learning (RL); overfitting; underfitting; early stopping; baseline; heuristic; proxy labels; static; dynamic; offline inference; online inference; feedback loop; recommendation system; candidate generation; collaborative filtering; permutation variable importances'
  - source: d2l
    url: https://d2l.ai/chapter_linear-regression/generalization.html
    locator: Sec. 3.6 Generalization (3.6.1 Training Error and Generalization Error, 3.6.2 Underfitting or Overfitting?, 3.6.3 Model Selection, 3.6.3.1 Cross-Validation)
  - title: 'Wikipedia: Bias–variance tradeoff'
    url: https://en.wikipedia.org/wiki/Bias%E2%80%93variance_tradeoff
    locator: Bias–variance decomposition of mean squared error; Approaches
  - source: google-mlcc
    url: https://developers.google.com/machine-learning/crash-course/overfitting/dividing-datasets
    locator: 'Datasets: Dividing the original dataset (Training, validation, and test sets; Additional problems with test sets)'
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/cross_validation.html
    locator: 'Sec. 3.1 Cross-validation: evaluating estimator performance (3.1.2 Cross validation iterators, 3.1.3 A note on shuffling)'
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/grid_search.html
    locator: 'Sec. 3.2 Tuning the hyper-parameters of an estimator (3.2.1 Exhaustive Grid Search, 3.2.2 Randomized Parameter Optimization, 3.2.4.4 Model selection: development and evaluation)'
---
## Key ideas

**Learning paradigms** [^1]

- *Supervised*: every example has features $\mathbf{x}$ and a known label $y$; learn the map $\mathbf{x} \mapsto y$. **Regression** predicts a number ("how much / how many?": rent, travel time, rainfall); **classification** predicts a category ("which one?": spam or not, blood type). A numeric target can be binned into classes (low / average / high) if a class is what you need.
- *Unsupervised*: only $\mathbf{x}$; find structure, e.g. clustering (customer segments) or PCA.
- *Self-supervised*: the targets are cut out of unlabeled data itself — the next word, a masked word, a hidden image region.
- *Reinforcement learning*: an agent takes actions in an environment and learns a policy that maximizes its return (cumulative reward).

**Parameters vs hyperparameters.** Parameters (weights, biases) are fitted by training. Hyperparameters (learning rate, batch size, tree depth, $k$ in $k$-NN, regularization strength) are not learned by the estimator; you set them and pick them by validation [^6].

**Generalization** [^2]. Training error is the average loss on the data the model was fitted to; generalization error is the expected loss on new data from the same distribution. The usual argument that one predicts the other assumes training and test examples are drawn i.i.d. from one distribution. A flexible enough model can drive the training error to zero and still generalize badly, so the training error alone proves nothing.

**Three splits** [^4]

| split | used for | rule |
| --- | --- | --- |
| training | fitting the parameters | usually the largest part |
| validation | choosing hyperparameters, features, stopping point | reusable, but wears out with reuse |
| test | one final estimate of quality | look at it once; never tune on it |

A good test set is large enough for a statistically meaningful result, representative of the data the model will meet, and contains no duplicates of training examples [^4]. Splitting a fixed dataset is a trade-off: every test example is one less training example. Shuffle before splitting so the parts share one distribution — except for time-ordered data: shuffled, the model is validated on samples artificially close in time to its training samples and the score is inflated, so split by time [^5].

**Diagnosing a fit** [^2]

- *Underfitting (high bias)*: training and validation errors are both high and close together. Add capacity (features, depth, weaker regularization) — but first rule out a poor optimization: too few epochs or an unsuitable learning rate cause the same symptom [^1].
- *Overfitting (high variance)*: training error much lower than validation error (say 99% training vs 70% validation accuracy), or validation accuracy falling while training accuracy keeps rising. Remedies: more data, a simpler model, stronger regularization, less label noise, early stopping [^1]. A better optimizer is *not* a remedy: it only fits the training data more closely.

**Bias–variance** [^3]. Bias is error from wrong assumptions (a model family too simple to express the truth); variance is sensitivity to the particular training sample; the noise term is irreducible. Flexibility (higher polynomial degree, more features, smaller $k$ in $k$-NN) lowers bias and raises variance; regularization such as ridge adds bias to cut variance; a larger training set mainly lowers variance [^3]. Small training sets make overfitting more likely, and too simple a model class makes underfitting more likely [^2].

**Cross-validation** [^5]. $k$-fold CV splits the training data into $k$ folds, trains $k$ models (each on $k-1$ folds), scores each on its held-out fold and averages [^2]. It gives a more robust estimate than one split at $k$ times the cost — linear in $k$ — and adds no data. Leave-one-out is $k = n$; stratified folds keep the class proportions; group folds keep all samples of one patient or device on one side; time series use forward-chaining splits [^5]. Preprocessing goes inside the CV loop (a pipeline).

**Hyperparameter search** [^6]. Grid search evaluates every combination, so its cost multiplies with each hyperparameter (10 hyperparameters with 4 values each: $4^{10} = 1{,}048{,}576$ settings). Random search samples a fixed budget (`n_iter`) of settings; the budget does not grow with the number of hyperparameters, and adding ones that don't matter wastes no trials. Neither method guarantees the optimum, and different random-search runs can return different winners.

**Around the model** [^1]

- *When to use ML*: when the rules are hard to write down but many examples exist; clear, fixed rules are simpler to code directly. A model is worth its cost only if it beats a simple non-ML heuristic used as a *baseline*.
- *Proxy labels*: when the real target (well-being, bicycle ownership) is not recorded, train on a measurable stand-in and remember that proxies are imperfect.
- *Static vs dynamic*: a static (offline) model is trained once and used for a while, so in a changing world (spam, fraud, fashion) it goes stale; a dynamic (online) model is retrained frequently and keeps adapting. Static inference computes a batch of predictions ahead and serves them from a cache — fast, and checkable before use, but only for inputs known in advance; dynamic inference runs the model on demand for any input.
- *Feedback loop*: a model's predictions shape its own future training data (a recommender that boosts what it recommends).
- *Recommender systems* pick a few items per user from a huge corpus, typically in three stages: candidate generation, scoring, re-ranking. Collaborative filtering predicts one user's interests from those of many other users; content-based filtering uses item features such as genre or director.
- *Permutation importance* is the increase in a model's error when one feature's values are shuffled; it works for any model and says how much the model relies on the feature, not in which direction.

## Formulas

Bias–variance decomposition of the expected squared error at $x$, for $y = f(x) + \varepsilon$ with $\operatorname{Var}(\varepsilon) = \sigma^2$ [^3]:

$$
\mathbb{E}\big[(y - \hat f(x))^2\big] = \big(\mathbb{E}[\hat f(x)] - f(x)\big)^2 + \operatorname{Var}\big[\hat f(x)\big] + \sigma^2
$$

Grid search with $m_1, \dots, m_h$ values per hyperparameter and $k$-fold CV: $k \prod_j m_j$ fits, plus one final refit on all training data.

## Worked example

*Optimization bias.* Answer a 20-question true/false quiz at random: the expected score is 50%. Take 5 attempts and keep only the best: the expected best score is about 62.9%; the best of 50 attempts, about 74.6%. On a fresh quiz each "winner" still scores 50%. Picking the best of many hyperparameter settings on one small validation set inflates the winning score in the same way — which is why the reported number comes from held-out data that the search never saw [^2][^6].

*Cost.* A grid of $4 \times 5 \times 3 = 60$ settings with 5-fold CV costs $60 \times 5 = 300$ fits, plus 1 refit: 301 calls to `fit`.

## In code

```python
from sklearn.datasets import load_breast_cancer
from sklearn.model_selection import cross_validate
from sklearn.tree import DecisionTreeClassifier

X, y = load_breast_cancer(return_X_y=True)
scores = []
for depth in [1, 4, None]:                       # None: grow the tree fully
    cv = cross_validate(DecisionTreeClassifier(max_depth=depth, random_state=0),
                        X, y, cv=5, return_train_score=True)
    scores.append((depth, float(cv["train_score"].mean().round(3)),
                   float(cv["test_score"].mean().round(3))))
print(scores)  # [(1, 0.924, 0.9), (4, 0.985, 0.916), (None, 1.0, 0.917)]
```

(depth, mean training accuracy, mean validation accuracy): the one-split stump scores lower on both with a small gap; the fully grown tree is perfect on its training folds and has the largest gap.

## Common pitfalls

- Using test results to tune hyperparameters or features: after many rounds the model fits the test set's quirks and the test score is optimistic. Tune on validation data or CV, test once.
- Shuffling a dataset with duplicates puts copies of training examples into the test set — a test loss that is too good to be true. Deduplicate, and split by group or by time when examples are related.
- A larger $\ell_2$ coefficient raises bias and lowers variance; it never lowers both.
- More data lowers variance, not bias: a model that is too simple stays too simple.
- $k$-fold CV is $k$ fits: a less noisy estimate, not more training data and not faster training.
- Overfitting shows as a train–validation *gap*. A training accuracy near 100% does not prove it, and equal training and validation scores are not overfitting (they may be underfitting).
- PCA and clustering are unsupervised; decision trees, linear regression and naive Bayes are supervised.
- High training loss can also come from a bad learning rate or too few epochs, not only from a model that is too small.
