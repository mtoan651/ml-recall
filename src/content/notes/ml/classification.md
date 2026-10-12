---
topic: classification
summary: Predicting categories — binary, multiclass and multilabel tasks, one-vs-rest, decisions from probabilities and costs, generative classifiers (naive Bayes, LDA/QDA) and how to compare classifiers.
status: reviewed
reviewed_by: claude
references:
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/multiclass.html
    locator: Sec. 1.12 Multiclass and multioutput algorithms (1.12.1 Multiclass classification, 1.12.1.2 OneVsRestClassifier, 1.12.1.3 OneVsOneClassifier, 1.12.2 Multilabel classification)
  - source: d2l
    url: https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/naive-bayes.html
    locator: Sec. 22.9 Naive Bayes (22.9.3 The Naive Bayes Classifier, 22.9.4 Training)
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/naive_bayes.html
    locator: Sec. 1.9 Naive Bayes (intro; 1.9.2 Multinomial Naive Bayes; 1.9.4 Bernoulli Naive Bayes)
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/lda_qda.html
    locator: Sec. 1.2.2 Mathematical formulation of the LDA and QDA classifiers
  - title: 'Wikipedia: Bayes estimator'
    url: https://en.wikipedia.org/wiki/Bayes_estimator
    locator: Definition (minimizing the posterior expected loss)
---
## Key ideas

**Kinds of tasks** [^1]. Classification is supervised learning with a categorical label: like regression it learns $\mathbf{x} \mapsto y$ from labelled examples, but it answers "which one?" instead of "how much?". *Binary*: two classes. *Multiclass*: more than two classes, each example gets exactly one (a recipe's cuisine). *Multilabel*: each example may get any number of labels at once (the topics of an article) [^1].

**Binary classifiers for many classes** [^1]. *One-vs-rest* (one-vs-all) trains one classifier per class, that class against all others — $K$ models, highest score wins; it is the usual default. *One-vs-one* trains one classifier per pair, $K(K-1)/2$ models, and takes a vote. Both are *strategies* that wrap a binary learner such as logistic regression, not algorithms of their own. Trees, $k$-NN, naive Bayes and softmax regression handle many classes directly, and every scikit-learn classifier accepts multiclass targets out of the box [^1].

**From probabilities to decisions** [^5]. A probabilistic classifier gives $P(y \mid \mathbf{x})$. If predicting $y'$ when the truth is $y$ costs $l(y, y')$, the best decision minimizes the posterior expected loss $\sum_y l(y, y')P(y \mid \mathbf{x})$ [^5]. With the 0–1 loss (every mistake costs 1) that is simply the most probable class; unequal costs can make a less probable class the better bet. For two classes the rule becomes a threshold: predict positive when $P(1 \mid \mathbf{x}) > c_{FP}/(c_{FP} + c_{FN})$. The Bayes classifier — this rule applied to the *true* distribution — has the lowest possible error; naive Bayes is only an approximation of it.

**Generative vs discriminative.** Generative classifiers model $P(\mathbf{x} \mid y)$ and $P(y)$ and apply Bayes' rule (naive Bayes, LDA, QDA); discriminative ones model $P(y \mid \mathbf{x})$ or the boundary directly (logistic regression, SVMs, trees). With Gaussian class densities [^4], a covariance shared by all classes (LDA) makes the quadratic terms cancel, leaving a *linear* boundary; class-specific covariances (QDA) give a *quadratic* boundary — an ellipse, parabola or hyperbola in 2-D. The prior enters each class score only as an additive $\log P(y = k)$, so a larger prior lifts that class's score by the same constant everywhere [^4]. QDA with diagonal covariances is Gaussian naive Bayes [^4]. Only where the posteriors cross matters for decisions, so even wrong densities can give the right boundary.

**Naive Bayes** [^2][^3]. Assume the features are conditionally independent given the class: $P(\mathbf{x} \mid y) = \prod_j P(x_j \mid y)$. For $d$ binary features this replaces $2^d$ probabilities per class by $d$ [^2]. Estimation is counting: priors are class frequencies, $P(x_j = 1 \mid y)$ is the fraction of class-$y$ examples with feature $j$ on. $P(\mathbf{x})$ is the same for every class, so it can be dropped when comparing. A Bernoulli model with $d$ words and 2 classes has $2d + 1$ free parameters, and absent words count too, through $1 - P(x_j = 1 \mid y)$ [^3].

- *Zero counts*: one feature value never seen with a class makes that class's product 0, whatever the other features say. Laplace smoothing adds pseudo-counts: $(n_{jy} + 1)/(n_y + 2)$ for a binary feature [^2]; multinomial NB uses $(N_{yj} + \alpha)/(N_y + \alpha n)$ with $\alpha = 1$ [^3].
- *Underflow*: products of hundreds of small probabilities round to 0, so sum log-probabilities instead [^2].
- *Missing feature* at prediction time: leave its factor out (summing it out gives a factor of 1).
- *Variants*: Gaussian NB for continuous features, multinomial for counts, Bernoulli for presence/absence [^3].
- The independence assumption is usually false — on XOR data NB outputs 0.5 everywhere — yet NB often classifies well (spam filtering); its `predict_proba` values should not be taken at face value [^3].

**Choosing a classifier.** Shortlist candidates that fit the data, then compare them on validation data, never by training accuracy. For wide, sparse bag-of-words text, linear models and naive Bayes are strong, cheap first choices; naive Bayes is fast and has a long record in document classification and spam filtering [^3]. Two examples with identical features and different labels make zero training error impossible for any classifier.

## Formulas

$$
P(y \mid \mathbf{x}) = \frac{P(\mathbf{x} \mid y)\,P(y)}{P(\mathbf{x})}, \qquad \hat y_{\text{NB}} = \operatorname*{arg\,max}_y \Big[\ln P(y) + \sum_j \ln P(x_j \mid y)\Big]
$$

$$
\hat y = \operatorname*{arg\,min}_{y'} \sum_y l(y, y')\,P(y \mid \mathbf{x}) \quad \text{(0–1 loss: } \hat y = \operatorname*{arg\,max}_y P(y \mid \mathbf{x})\text{)}
$$

LDA class score [^4]: $\mathbf{w}_k^\top\mathbf{x} + w_{k0}$ with $\mathbf{w}_k = \Sigma^{-1}\boldsymbol\mu_k$ and $w_{k0} = -\tfrac12\boldsymbol\mu_k^\top\Sigma^{-1}\boldsymbol\mu_k + \log P(y = k)$. Classifier counts for $K = 5$: one-vs-rest 5, one-vs-one 10.

## Worked example

Bernoulli naive Bayes with features (free, meeting, link). Spam: $(1,0,1), (1,0,0), (0,0,1)$; ham: $(0,1,0), (1,1,0), (0,1,1), (0,0,0)$. New message $(1, 0, 1)$:

- *Plain counting*: spam $\frac37 \cdot \frac23 \cdot \frac33 \cdot \frac23 = \frac{4}{21} \approx 0.190$; ham $\frac47 \cdot \frac14 \cdot \frac14 \cdot \frac14 = \frac{1}{112} \approx 0.0089$; so $P(\text{spam} \mid \mathbf{x}) \approx 0.955$.
- *Laplace smoothing*: spam $\frac37 \cdot \frac35 \cdot \frac45 \cdot \frac35 \approx 0.123$; ham $\frac47 \cdot \frac13 \cdot \frac13 \cdot \frac13 \approx 0.0212$; so $P(\text{spam} \mid \mathbf{x}) \approx 0.854$.
- Message $(1, 1, 0)$: "meeting" never occurs in spam, so without smoothing spam scores exactly 0; with smoothing $P(\text{spam} \mid \mathbf{x}) \approx 0.195$.

*Costs.* $P(y \mid \mathbf{x}) = (0.6, 0.25, 0.15)$ for classes A, B, C; predicting A when the truth is C costs 8, every other mistake 1. Expected costs: A $0.25 + 0.15 \cdot 8 = 1.45$, B $0.6 + 0.15 = 0.75$, C $0.6 + 0.25 = 0.85$. Predict B, although A is the most probable class.

## In code

```python
import numpy as np
from sklearn.naive_bayes import BernoulliNB

X = [[1, 0, 1], [1, 0, 0], [0, 0, 1],               # spam   (free, meeting, link)
     [0, 1, 0], [1, 1, 0], [0, 1, 1], [0, 0, 0]]    # ham
y = [1, 1, 1, 0, 0, 0, 0]
nb = BernoulliNB(alpha=1.0).fit(X, y)               # alpha = 1: Laplace smoothing
print(np.exp(nb.class_log_prior_).round(3))         # [0.571 0.429]  P(ham), P(spam)
print(np.exp(nb.feature_log_prob_).round(3).tolist())  # [[0.333, 0.667, 0.333], [0.6, 0.2, 0.6]]
print(nb.predict_proba([[1, 0, 1]]).round(4))       # [[0.1464 0.8536]]
```

The middle line holds $P(x_j = 1 \mid \text{ham})$ and $P(x_j = 1 \mid \text{spam})$, and the last line matches the smoothed hand computation.

## Common pitfalls

- Multiclass (exactly one of $K$ classes) is not multilabel (several labels at once).
- One-vs-rest and one-vs-one are ways to combine binary classifiers, not classification algorithms.
- Choosing the most probable class is optimal only when all mistakes cost the same.
- Without smoothing a single unseen feature value vetoes a class; Laplace smoothing changes the conditional estimates, not only the priors.
- Naive Bayes is not the Bayes-optimal classifier: its independence assumption is usually wrong, and its probabilities are poorly calibrated even when its decisions are good.
- LDA's boundary is linear only because the covariance is shared; with different covariances the Bayes boundary is quadratic.
- Compare classifiers on held-out data; the highest training accuracy usually belongs to the most overfit model.
- No classifier reaches zero training error when identical inputs carry different labels.
