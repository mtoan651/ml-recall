---
topic: logistic-regression
summary: Linear classifiers that output probabilities — sigmoid and log-odds, odds ratios, thresholds and decision boundaries, log loss, regularization, softmax regression and numerically stable softmax.
status: reviewed
reviewed_by: claude
references:
  - source: google-mlcc
    url: https://developers.google.com/machine-learning/crash-course/logistic-regression/sigmoid-function
    locator: 'Logistic regression: Calculating a probability with the sigmoid function'
  - source: d2l
    url: https://d2l.ai/chapter_linear-classification/softmax-regression.html
    locator: Sec. 4.1 Softmax Regression (4.1.1.2 The Softmax, 4.1.2 Loss Function, 4.1.3 Information Theory Basics)
  - source: d2l
    url: https://d2l.ai/chapter_linear-classification/softmax-regression-concise.html#softmax-revisited
    locator: Sec. 4.5.2 Softmax Revisited
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression
    locator: Sec. 1.1.11 Logistic regression (intro notes on regularization and GLM; 1.1.11.1 Binary Case; 1.1.11.2 Multinomial Case)
  - title: 'Wikipedia: Logistic regression'
    url: https://en.wikipedia.org/wiki/Logistic_regression
    locator: Background (Definition of the odds, The odds ratio); Interpretations (As a generalized linear model); Model fitting; Extensions
  - title: 'Wikipedia: Loss functions for classification'
    url: https://en.wikipedia.org/wiki/Loss_functions_for_classification
    locator: Logistic loss
---
## Key ideas

**The model** [^1]. Despite its name, logistic regression is a *classifier* [^4]: it predicts a category (ripe or not, spam or not) from a linear score $z = b + \mathbf{w}^\top\mathbf{x}$. The sigmoid $\sigma(z) = 1/(1 + e^{-z})$ turns the score into a probability strictly between 0 and 1. Solving for $z$ gives $z = \ln\frac{p}{1 - p}$: the linear part is the **log-odds** (logit) [^1]. Useful values: $\sigma(0) = 0.5$ and $\sigma(-z) = 1 - \sigma(z)$. Pick it over linear regression because the *target* is a category, not because the features correlate weakly with it.

**Odds and coefficients** [^5]. The odds are $p/(1 - p) = e^{z}$. One more unit of $x_j$ adds $w_j$ to $z$, so it *multiplies* the odds by $e^{w_j}$ — the odds ratio; the change in $p$ itself depends on where you start. With an interaction term $\beta_3 XZ$, one more unit of $X$ adds $\beta_1 + \beta_3 Z$ to the log-odds. Statistically it is a generalized linear model: Bernoulli response, linear predictor, logit link [^5].

**Decisions.** Predict class 1 when $p \ge t$. Since $\sigma$ is increasing, that is the same as $z \ge \ln\frac{t}{1 - t}$, so the decision boundary $\mathbf{w}^\top\mathbf{x} + b = \ln\frac{t}{1-t}$ is a hyperplane (a line for 2 features) — a *linear* classifier, even though $p$ is a nonlinear function of $\mathbf{x}$. Changing $t$ shifts the boundary in parallel and changes decisions, not probabilities. Points near the boundary get $p \approx 0.5$; points far away get confident probabilities that can still be wrong. When a missed positive costs $c_{FN}$ and a false alarm $c_{FP}$, the expected cost is lowest if you predict positive whenever $p > c_{FP}/(c_{FP} + c_{FN})$ — far below 0.5 when misses are expensive.

**Training.** Maximum likelihood means minimizing the log loss (binary cross-entropy) [^2]. There is no closed-form solution [^5], but the log loss is the convex *logistic loss* of the margin [^6], and $z$ is linear in $\mathbf{w}$, so the objective is convex in the weights: gradient descent reaches the global minimum from any start — no bad local minima. The gradient per example is $(p - y)\,\mathbf{x}$: prediction error times input. With the squared error $(p - y)^2$ the gradient is $2(p - y)\,p(1 - p)\,\mathbf{x}$; the extra factor $2p(1 - p)$ nearly vanishes exactly when the model is confidently wrong (at $z = -5$, $y = 1$ the gradient is about 75 times smaller than with log loss).

**Regularization** [^4]. scikit-learn's `LogisticRegression` is regularized by default, and `C` is the *inverse* strength: smaller `C` → stronger penalty, smaller weights, simpler model; a very large `C` means effectively none. An $\ell_2$ penalty shrinks weights; an $\ell_1$ penalty sets some exactly to zero [^4]. On linearly separable data the unpenalized loss keeps falling as the weights grow, so some penalty (or early stopping) keeps them finite.

**More than two classes** [^2]. *Softmax regression* (multinomial logistic regression [^4]) computes one score $o_k$ per class and normalizes with the softmax. The softmax keeps the order of the logits, so the predicted class is $\operatorname*{arg\,max}_k o_k$. The loss is the cross-entropy $-\ln \hat y_{\text{true}}$, and its gradient with respect to the logits is simply $\hat{\mathbf{y}} - \mathbf{y}$ [^2]. With two classes, softmax over $(o_1, o_2)$ equals $\sigma(o_1 - o_2)$: binary logistic regression on the score difference. The ratio of two class probabilities, $e^{o_i - o_j}$, does not depend on the other classes. Dividing logits by a temperature $T$ flattens the distribution (higher entropy) for $T > 1$ and sharpens it toward the arg max as $T \to 0$. Alternatives are one-vs-rest binary models, and *ordinal* logistic regression for ordered categories [^5].

**Numerics** [^3]. $e^{o}$ overflows for large logits (above about 88.7 in float32, about 11.09 in float16), and `inf / inf` is `nan`. Subtracting the largest logit leaves the softmax unchanged and prevents overflow; combining softmax and log into one log-sum-exp step avoids $\log 0$ as well. That is why framework cross-entropy losses (e.g. PyTorch's `F.cross_entropy`) take raw logits and apply log-softmax themselves [^3].

## Formulas

$$
\sigma(z) = \frac{1}{1 + e^{-z}}, \qquad z = b + \mathbf{w}^\top\mathbf{x} = \ln\frac{p}{1 - p}
$$

$$
L = -\frac{1}{N}\sum_{i=1}^{N}\big[y_i \ln p_i + (1 - y_i)\ln(1 - p_i)\big], \qquad \frac{\partial L_i}{\partial \mathbf{w}} = (p_i - y_i)\,\mathbf{x}_i
$$

$$
\hat y_k = \frac{e^{o_k}}{\sum_j e^{o_j}} = \frac{e^{o_k - m}}{\sum_j e^{o_j - m}} \ (m = \max_j o_j), \qquad \frac{\partial(-\ln \hat y_{\text{true}})}{\partial o_k} = \hat y_k - y_k
$$

Threshold on the logit scale: $t = 0.8$ gives $z \ge \ln 4 \approx 1.386$. Log-sum-exp: $\ln\sum_i e^{x_i + c} = c + \ln\sum_i e^{x_i}$ — it shifts by $c$; only the softmax is shift-invariant.

## Worked example

$\mathbf{w} = (0.8, -0.5)$, $b = -1$, $\mathbf{x} = (3, 2)$:

- $z = -1 + 0.8 \cdot 3 - 0.5 \cdot 2 = 0.4$, so $p = \sigma(0.4) \approx 0.599$ and the odds are $e^{0.4} \approx 1.492$.
- One more unit of $x_1$: $z = 1.2$, $p \approx 0.769$, odds $\approx 3.320 = 1.492 \times e^{0.8}$. The odds were multiplied by 2.23; the probability rose by only 0.17.
- With threshold 0.8 ($z \ge 1.386$) neither input is flagged.
- If the label is 1, the log loss is $-\ln 0.599 \approx 0.513$ and the gradient is $(p - 1)\,\mathbf{x} \approx (-1.204, -0.803)$.

Softmax of the logits $(3, 1, 0)$ is about $(0.844, 0.114, 0.042)$. If the true class is the second one, the loss is $-\ln 0.114 \approx 2.170$ and the gradient is $(0.844, -0.886, 0.042)$: the true logit is pushed up, the others down.

## In code

```python
import numpy as np

def softmax(o):
    e = np.exp(o - o.max())                  # shift by the largest logit: same result
    return e / e.sum()

o = np.array([3.0, 1.0, 0.0])                # logits
print(softmax(o).round(4))                   # [0.8438 0.1142 0.042 ]
print(softmax(o + 1000).round(4))            # [0.8438 0.1142 0.042 ]  shift-invariant
with np.errstate(over="ignore", invalid="ignore"):
    print(np.exp(o + 1000) / np.exp(o + 1000).sum())   # [nan nan nan]  naive overflow
lse = o.max() + np.log(np.exp(o - o.max()).sum())       # stable log-sum-exp
print(round(lse - o[1], 4))                  # 2.1698 = cross-entropy, true class = 2nd
print((softmax(o) - [0, 1, 0]).round(4))     # [ 0.8438 -0.8858  0.042 ] = gradient wrt o
```

## Common pitfalls

- $z$ is a log-odds, not a probability; apply the sigmoid. The sigmoid never outputs exactly 0 or 1.
- A weight multiplies the *odds* by $e^{w_j}$; it does not add to or multiply the probability.
- Moving the threshold changes decisions, not predicted probabilities, and the boundary stays a straight line (shifted in parallel). 0.5 is a poor threshold when the two errors cost very differently.
- Smaller `C` means *stronger* regularization — the opposite direction from ridge's `alpha`.
- Passing softmax probabilities to a loss that expects logits (PyTorch's `F.cross_entropy`) applies the softmax twice and cripples training.
- A naive `exp` softmax overflows to `nan` for large logits; subtract the maximum first.
- The log loss of logistic regression is convex: no spurious local optima, but also no closed-form solution.
- A two-class softmax is not a different model: it is the sigmoid of the score difference.
