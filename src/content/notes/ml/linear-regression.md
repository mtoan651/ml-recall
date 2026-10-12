---
topic: linear-regression
summary: Least-squares linear models — the normal equations, reading coefficients and residuals, basis functions, ridge/lasso regularization, collinearity and the classical OLS assumptions.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_linear-regression/linear-regression.html
    locator: Sec. 3.1 Linear Regression (3.1.1 Basics, 3.1.3 The Normal Distribution and Squared Loss)
  - source: d2l
    url: https://d2l.ai/chapter_linear-regression/weight-decay.html
    locator: Sec. 3.7 Weight Decay (3.7.1 Norms and Weight Decay, 3.7.2 High-Dimensional Linear Regression)
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/linear_model.html
    locator: Sec. 1.1 Linear Models (1.1.1 Ordinary Least Squares, 1.1.2 Ridge regression and classification, 1.1.3 Lasso, 1.1.5 Elastic-Net)
  - title: 'Wikipedia: Simple linear regression'
    url: https://en.wikipedia.org/wiki/Simple_linear_regression
    locator: Formulation and computation; Interpretation; Numerical properties
  - title: 'Wikipedia: Gauss–Markov theorem'
    url: https://en.wikipedia.org/wiki/Gauss%E2%80%93Markov_theorem
    locator: Statement; Gauss–Markov theorem as stated in econometrics
  - title: 'Wikipedia: Lasso (statistics)'
    url: https://en.wikipedia.org/wiki/Lasso_(statistics)
    locator: Basic form (Orthonormal covariates); Interpretations (Bayesian interpretation); Generalizations (Elastic net)
---
## Key ideas

**Model** [^1]. $\hat y = \mathbf{w}^\top\mathbf{x} + b$: with $d$ features the model learns $d$ weights plus one bias (2 features → 3 parameters). Training changes $\mathbf{w}$ and $b$, never the features. Appending a constant feature 1 to every $\mathbf{x}$ folds the bias into $\mathbf{w}$ as its last weight; without a bias the fit is forced through the origin.

**Least squares** [^1]. Each residual $y_i - \hat y_i$ is squared — so errors above and below the line cannot cancel — and the squares are added up; the best $\mathbf{w}$ minimizes that sum. Setting the gradient to zero gives the normal equations, with a unique solution when the design matrix $X$ has full column rank. The loss is a convex quadratic, so gradient descent with a small enough step reaches the global minimum from any start (even all-zero weights); the closed form and gradient descent differ in cost, not in the model.

**Probabilistic view** [^1]. If $y = \mathbf{w}^\top\mathbf{x} + b + \varepsilon$ with Gaussian $\varepsilon$, maximum likelihood is exactly least squares, whatever the noise variance. Laplace noise instead gives the absolute loss $\sum_i |y_i - \hat y_i|$. For a single constant, squared loss is minimized by the mean and absolute loss by the median — which is why squared loss is sensitive to outliers [^1]. The absolute loss has a gradient of constant size, so SGD with a fixed step keeps bouncing around the optimum; the Huber loss (quadratic near 0, linear beyond a threshold) combines the two.

**Reading a fit** [^4]. The slope is the predicted change in $y$ per unit of $x$, in the units of both (price in \$1000 and a slope of $-1.25$ per year of age: about \$1,250 less per year); the intercept is the prediction at $x = 0$. With an intercept, the least-squares line passes through $(\bar x, \bar y)$ and the residuals sum to zero; for one feature, $R^2 = r^2$, so $r$ near $\pm 1$ means a good straight-line fit [^4]. Regression on observational data shows association, not causation. A coefficient's size depends on its feature's units and on correlated features, so compare coefficients only for standardized features — and even then correlated features blur the comparison.

**Basis functions.** Adding powers $x^2, x^3, \dots$ or products $x_ix_j$ gives polynomial regression: nonlinear in $x$, still linear in $\mathbf{w}$, so the same least-squares machinery applies. The degree is the complexity knob — too low underfits, too high overfits — and with more features than examples a linear model can fit its training data almost perfectly yet generalize badly [^2].

**Regularization** [^2][^3]

- *Ridge* (weight decay, $\ell_2$): adds $\alpha\lVert\mathbf{w}\rVert_2^2$. Weights shrink toward 0 but stay non-zero; the solution is unique and stable even with collinear features; correlated or duplicated features share the weight evenly.
- *Lasso* ($\ell_1$): adds $\alpha\lVert\mathbf{w}\rVert_1$ and sets some coefficients exactly to zero, so it selects features [^3]. Among correlated features it tends to keep one; elastic net mixes both penalties and tends to keep the group [^3][^6]. $\ell_0$ counts the non-zero weights directly.
- A larger $\alpha$ means a simpler model: more bias, less variance, a training error that can only stay the same or rise [^2], and a validation error that typically falls at first and rises again once the model underfits. $\alpha = 0$ is ordinary least squares. scikit-learn's `alpha` (Ridge, Lasso) is the *strength*; `C` in `LogisticRegression` and SVMs is its *inverse*.
- The bias is usually left unpenalized [^2]; then a huge $\alpha$ flattens the fit to the horizontal line $y = \bar y$.
- The penalty depends on coefficient size, hence on units: rescaling a feature leaves OLS predictions unchanged but changes ridge and lasso fits, so standardize first. In Bayesian terms, ridge corresponds to a zero-mean Gaussian prior on the weights and lasso to a Laplace prior [^6].

**Collinearity** [^3]. If one feature is an exact combination of others ($z = x + y$), $X$ loses rank, $X^\top X$ is singular and OLS has infinitely many solutions. Near-collinearity makes $X^\top X$ nearly singular, so the coefficients get large variances and can flip sign [^3]; predictions within the range of the training data are much less affected. Forming $X^\top X$ also squares the condition number, $\kappa(X^\top X) = \kappa(X)^2$, so solvers work with QR or SVD factorizations of $X$.

**Classical assumptions** [^5]. With a model linear in its parameters, full column rank, and errors of zero mean, equal variance and no correlation with each other, OLS is the best linear unbiased estimator (Gauss–Markov). Normal errors are *not* needed for that — only for exact small-sample $t$ and $F$ tests. Correlated features are allowed; only perfect collinearity is excluded.

## Formulas

$$
X^\top X\,\hat{\mathbf{w}} = X^\top\mathbf{y} \quad\Rightarrow\quad \hat{\mathbf{w}} = (X^\top X)^{-1}X^\top\mathbf{y}, \qquad \hat{\mathbf{w}}_{\text{ridge}} = (X^\top X + \alpha I)^{-1}X^\top\mathbf{y}
$$

(The ridge formula assumes centered data, so that the intercept, $\bar y$, is not penalized.)

One feature [^4]: $b_1 = \dfrac{\sum_i (x_i - \bar x)(y_i - \bar y)}{\sum_i (x_i - \bar x)^2}$, $\ b_0 = \bar y - b_1\bar x$.

Gradient of $\tfrac12\lVert X\mathbf{w} - \mathbf{y}\rVert^2 + \tfrac{\lambda}{2}\lVert\mathbf{w}\rVert^2$ is $X^\top X\mathbf{w} - X^\top\mathbf{y} + \lambda\mathbf{w}$, so each gradient step first multiplies $\mathbf{w}$ by $(1 - \eta\lambda)$ — weight decay [^2]. An $\ell_1$ step instead moves every non-zero weight toward 0 by the same $\eta\lambda$. With orthonormal features, the lasso soft-thresholds the OLS coefficients [^6]; for $\tfrac12\lVert\mathbf{y} - X\boldsymbol\beta\rVert^2 + \lambda\lVert\boldsymbol\beta\rVert_1$ this gives $\beta_j = \operatorname{sign}(\hat\beta_j)\max(|\hat\beta_j| - \lambda, 0)$.

## Worked example

Points $(0, 1), (1, 3), (2, 4), (3, 8)$: $\bar x = 1.5$, $\bar y = 4$, $\sum (x_i - \bar x)(y_i - \bar y) = 11$ and $\sum (x_i - \bar x)^2 = 5$, so the slope is $2.2$ and the intercept $4 - 2.2 \cdot 1.5 = 0.7$. The fitted values $0.7, 2.9, 5.1, 7.3$ leave residuals $0.3, 0.1, -1.1, 0.7$, which sum to 0 (and $\sum_i r_ix_i = 0$). With residual sum of squares 1.8 and total sum of squares 26, $R^2 = 1 - 1.8/26 \approx 0.931$, equal to $r^2$.

Ridge with $\alpha = 5$ and an unpenalized intercept: the slope becomes $11/(5 + 5) = 1.1$ and the intercept $4 - 1.1 \cdot 1.5 = 2.35$. The slope is halved, and the line still passes through $(\bar x, \bar y)$.

## In code

```python
import numpy as np
from sklearn.datasets import make_regression
from sklearn.linear_model import Lasso, LinearRegression, Ridge

X, y = make_regression(n_samples=60, n_features=8, n_informative=3,   # informative:
                       noise=5.0, random_state=0)                     # features 0, 2, 5
ols = LinearRegression().fit(X, y).coef_
ridge = Ridge(alpha=10.0).fit(X, y).coef_
lasso = Lasso(alpha=5.0).fit(X, y).coef_
print(ols.round(1))                      # [76.6 -0.7 88.1 -0.7  0.5 96.8  0.3  1.2]
print(ridge.round(1))                    # [64.   0.7 76.3 -3.9  0.1 81.1  1.4  3.4]
print(lasso.round(1) + 0.0)              # [70.1  0.  84.   0.   0.  91.8  0.   0. ]
print(np.sum(ridge == 0), np.sum(lasso == 0))   # 0 5  (exact zeros)
```

OLS gives the five useless features small non-zero weights, ridge shrinks all weights but keeps them non-zero, and lasso sets exactly those five to zero.

## Common pitfalls

- $\ell_2$ regularization never removes a feature; only $\ell_1$ (or $\ell_0$) produces exact zeros.
- Larger `alpha` = stronger penalty = simpler model; larger `C` = weaker penalty. Don't mix up the two directions.
- A large (or negative) coefficient alone says nothing about importance: units and correlated features change it.
- Increasing $\lambda$ cannot lower the training error; it can lower or raise the test error.
- Polynomial regression is still linear regression. Its fit is governed by the degree, not by the solver or by the assumed noise variance.
- Near-collinearity inflates the variance of the coefficients but leaves OLS unbiased and predictions largely intact.
- Squared loss chases outliers (mean); absolute loss resists them (median).
- For an OLS fit with an intercept (no perfectly collinear features), a training $R^2 = 0$ means every slope is 0 and the fitted line is $y = \bar y$; the intercept need not be 0.
