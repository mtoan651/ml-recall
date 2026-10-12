---
topic: learning-theory
summary: Why and when models generalize - training vs. test error, bias-variance, honest evaluation (test sets, cross-validation), VC dimension and its limits for deep networks.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_linear-regression/generalization.html
    locator: Sec. 3.6 Generalization (3.6.1 Training Error and Generalization Error; 3.6.2 Underfitting or Overfitting?, incl. 3.6.2.1 Polynomial Curve Fitting and 3.6.2.2 Dataset Size; 3.6.3 Model Selection; 3.6.3.1 Cross-Validation; 3.6.4 Summary)
  - source: d2l
    url: https://d2l.ai/chapter_linear-classification/generalization-classification.html
    locator: Sec. 4.6 Generalization in Classification (4.6.1 The Test Set; 4.6.2 Test Set Reuse; 4.6.3 Statistical Learning Theory)
  - source: d2l
    url: https://d2l.ai/chapter_multilayer-perceptrons/generalization-deep.html
    locator: Sec. 5.5 Generalization in Deep Learning (5.5.1 Revisiting Overfitting and Regularization; 5.5.2 Inspiration from Nonparametrics; 5.5.3 Early Stopping)
  - title: 'Wikipedia: Vapnik–Chervonenkis dimension'
    url: https://en.wikipedia.org/wiki/Vapnik%E2%80%93Chervonenkis_dimension
    locator: Definitions; Examples; Uses — In statistical learning theory; Bounds
  - title: 'Wikipedia: Bias–variance tradeoff'
    url: https://en.wikipedia.org/wiki/Bias%E2%80%93variance_tradeoff
    locator: Bias–variance decomposition of mean squared error; Approaches
  - title: Blum, Hopcroft & Kannan, Foundations of Data Science (draft of 4 Jan 2018)
    url: https://www.cs.cornell.edu/jeh/book.pdf
    locator: Sec. 5.2 The Perceptron algorithm, Theorem 5.1, pp. 130–131; Sec. 5.11.1 Definitions and Key Theorems (axis-parallel rectangles), p. 149; Sec. 5.11.2 Examples, p. 151
---
## Key ideas

- **Training error** is computed on the data the model was fitted to, so it is optimistically biased. **Generalization error** is the expected error on new data from the same distribution and can only be estimated, on data the model never saw [^1]. All guarantees assume **IID** data [^1]. Dependent examples (several scans per patient, consecutive time steps) must therefore be split by group or by time, or the test error is misleading.
- **Underfitting**: training and validation error both high, with a small gap (model too simple). **Overfitting**: training error far below validation error [^1]. With a fixed model, less data makes overfitting more likely; more data almost never hurts [^1]. To check whether more data would help, retrain on growing subsets and see if validation error is still falling (a learning curve).
- Zero training error is cheap: a polynomial of high enough degree fits any training set [^1] (degree $n-1$ already passes through $n$ points with distinct $x$, since the Vandermonde system is invertible), and 1-NN memorises any labelling [^3]. Zero *test* error is possible only if the labels are a noise-free function of the input and the model has learned it.
- **Bias–variance**: expected squared error = squared bias + variance + irreducible noise [^5]. Simple models have high bias; flexible ones have high variance. Regularisation and larger $k$ in $k$-NN trade variance for bias; bagging cuts variance, boosting cuts bias [^5].
- **Honest evaluation.** Choose models on a validation set or by $K$-fold cross-validation, and touch the test set as rarely as possible [^1]. Designing a new model after looking at test results leaks information (**adaptive overfitting**). Scoring many models on one test set makes a lucky winner likely (**false discovery**) [^2].
- **$K$-fold CV** trains $K$ fresh models, each on $K-1$ folds, and averages the $K$ validation scores [^1]. Each model sees only $(K-1)n/K$ examples, so the estimate is slightly pessimistic for the final model trained on all $n$. Leave-one-out ($K = n$) is nearly unbiased but costly. A grid of $g$ settings costs $gK$ fits before the final refit.
- **VC dimension**: the largest $m$ such that some set of $m$ points can be **shattered**, i.e. labelled in all $2^m$ ways by functions of the class [^2][^4]. One shattered set of $m$ points proves VC $\ge m$, but showing that VC is exactly $m$ also needs an argument that *no* set of $m+1$ points can be shattered.
- VC bounds give test error $\le$ training error $+ O\big(\sqrt{(\text{VC} + \ln(1/\delta))/n}\big)$, useful only when VC $\ll n$ [^2][^4]. Structural risk minimisation picks the model with the smallest such bound. VC dimension only looks at the sign of $f$, not the size of weights or the margin.
- **Deep networks** can fit random labels, so VC-type bounds are vacuous for them, yet they generalize well [^3]. Test error versus model size can show **double descent**: down, up near the point where the model just fits the training data, then down again [^3].
- **Early stopping** limits the number of epochs instead of the weights: stop when validation error has not improved by more than a small $\epsilon$ for a set number of epochs ("patience"). It matters with label noise; on clean, realizable data it helps little [^3].

## Formulas

- Bias–variance at input $x$: $\mathbb{E}\big[(y - \hat f(x))^2\big] = \mathrm{Bias}[\hat f(x)]^2 + \mathrm{Var}[\hat f(x)] + \sigma^2$ [^5].
- Test-set error on $n$ fresh examples, true error $\epsilon$: standard deviation $\sqrt{\epsilon(1-\epsilon)/n} \le \sqrt{0.25/n}$ [^2].
- Hoeffding: $P(\hat\epsilon_n - \epsilon \ge t) \le e^{-2nt^2}$, so $n = \ln(1/\delta)/(2t^2)$ examples give tolerance $t$ with confidence $1 - \delta$ [^2]. That bounds one direction; a guarantee for $\lvert \hat\epsilon_n - \epsilon \rvert$ needs $\ln(2/\delta)$.
- $k$ independent evaluations, each misleading with probability $\delta$: at least one is misleading with probability $1 - (1-\delta)^k$.
- VC dimensions: threshold on $\mathbb{R}$: 1; interval: 2; linear classifier with offset in $\mathbb{R}^d$: $d + 1$ (a line in the plane: 3) [^2][^4]; $\operatorname{sign}(p(x))$ with $\deg p \le k$ on $\mathbb{R}$: $k + 1$ (linear on $x, \dots, x^k$); axis-aligned rectangles: 4 (a diamond of 4 points is shattered; of any 5 points, at most 4, one extreme per side, fix the bounding box, and a remaining point inside it cannot be excluded) [^6]; 1-NN (it memorises any labelling [^3]) and $\operatorname{sign}(\sin \theta x)$ [^4]: infinite; a finite class: at most $\log_2 \lvert H \rvert$ [^4].
- Perceptron on data separable through the origin with margin $\gamma$, all $\lVert \mathbf{x} \rVert \le R$: at most $(R/\gamma)^2$ updates, whichever misclassified point is used at each step [^6].

## Worked example

How big must a test set be to know a classifier's error within $\pm 0.02$ with 95% confidence?

- Hoeffding, with d2l's recipe ($e^{-2nt^2} = 0.05$): $n = \ln 20 / (2 \cdot 0.02^2) = 2.996/0.0008 \approx 3745$. Covering both directions, $\ln 40$ instead of $\ln 20$, gives about 4612.
- CLT, worst case $\epsilon = 0.5$, two standard deviations: $2\sqrt{0.25/n} = 0.02$ gives $n = 2500$. The finite-sample Hoeffding bound is the more conservative of the two.
- If you then compare 10 models on that test set, the chance that at least one score is off by more than $0.02$ is up to $1 - 0.95^{10} \approx 0.40$ (treating the evaluations as independent).

## In code

```python
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures

rng = np.random.default_rng(0)
x = rng.uniform(-3, 3, size=(30, 1))
y = np.sin(x[:, 0]) + rng.normal(0, 0.3, size=30)
for d in [1, 3, 12]:
    model = make_pipeline(PolynomialFeatures(d), LinearRegression())
    train = model.fit(x, y).score(x, y)                  # R^2 on the training data
    cv = cross_val_score(model, x, y, cv=5).mean()       # 5 fresh fits, mean R^2
    print(d, round(train, 2), round(cv, 2))  # 1 0.54 -0.29 / 3 0.87 0.56 / 12 0.91 -33.57
```

Degree 1 underfits, degree 3 fits, degree 12 overfits: its training score is the best and its cross-validated score the worst.

## Common pitfalls

- An infinite VC dimension (RBF SVM, 1-NN) does not make a model worse in practice; the bound is only an upper bound.
- Zero training error does not imply zero test error, and a high VC dimension does not imply poor generalization.
- Cross-validation must refit a fresh model in every fold; continuing to train one model across folds leaks the later validation folds into training.
- Shuffling dependent data (time series, repeated measurements of one subject) before splitting inflates the score.
- Early stopping is not a cure-all: on noise-free, separable data it brings little [^3].
- Reusing the test set for model choice turns it into a validation set; its score is then optimistic.
