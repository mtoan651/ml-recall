---
topic: svm
summary: Support vector machines fit the maximum-margin hyperplane, allow margin errors through slack and C, depend only on their support vectors, and use kernels for non-linear boundaries.
status: reviewed
reviewed_by: claude
references:
  - title: 'Wikipedia: Support vector machine'
    url: https://en.wikipedia.org/wiki/Support_vector_machine#Dual
    locator: Linear SVM (Hard-margin, Soft-margin); Nonlinear kernels; Computing the SVM classifier (Dual, Kernel trick, Sub-gradient descent); Properties — Issues; Extensions — Regression
  - title: 'scikit-learn User Guide: Support Vector Machines'
    url: https://scikit-learn.org/stable/modules/svm.html#mathematical-formulation
    locator: Sec. 1.4.7 Mathematical formulation (1.4.7.1 SVC, 1.4.7.2 SVR); Sec. 1.4.2 Regression
  - title: 'scikit-learn User Guide: Support Vector Machines'
    url: https://scikit-learn.org/stable/modules/svm.html#kernel-functions
    locator: Sec. 1.4.6 Kernel functions; Sec. 1.4.6.1 Parameters of the RBF Kernel; Sec. 1.4.5 Tips on Practical Use
  - title: 'scikit-learn User Guide: Support Vector Machines'
    url: https://scikit-learn.org/stable/modules/svm.html#scores-and-probabilities
    locator: Sec. 1.4.1.2 Scores and probabilities
  - title: 'Wikipedia: Kernel method'
    url: https://en.wikipedia.org/wiki/Kernel_method#Mathematics:_the_kernel_trick
    locator: 'Mathematics: the kernel trick'
---
## Key ideas

- An SVM is a linear classifier $h(\mathbf{x}) = \mathbf{w}^\top \mathbf{x} + b$ that predicts $\operatorname{sign}(h)$ and picks, among all separating hyperplanes, the one with the **widest margin** ("street") to the nearest training points [^1]. In 2-D the hyperplane is a line.
- **Hard margin**: every point must satisfy $y_i h(\mathbf{x}_i) \ge 1$. This only has a solution when the data are linearly separable [^1].
- **Soft margin**: slack variables $\xi_i \ge 0$ let points enter the street or cross it, at a cost $C\sum_i \xi_i$. Large $C$ punishes violations hard (close to hard margin, risk of overfitting); small $C$ allows more violations and gives a smoother, more regularised boundary [^1][^3].
- Training is a convex quadratic program, so the optimum found is the global one; there are no bad local minima as in neural networks [^1].
- **Support vectors** are the training points with a non-zero dual weight $\alpha_i$: the points on the gutters, inside the street, or misclassified. All other points have $\alpha_i = 0$ and can be deleted without changing the solution [^1][^2]. Because a non-support vector left out is still classified correctly, the leave-one-out error is at most (number of support vectors)/$n$.
- **Kernel trick**: the dual uses the data only through inner products, so $\mathbf{x}_i^\top \mathbf{x}_j$ can be replaced by $K(\mathbf{x}_i, \mathbf{x}_j) = \phi(\mathbf{x}_i)^\top \phi(\mathbf{x}_j)$. The SVM then fits a linear boundary in feature space, which is non-linear in input space, without ever computing $\phi$ [^1][^5]. A valid kernel must give a positive semi-definite Gram matrix [^5].
- **SVR** (support vector regression) fits a function with an $\varepsilon$-tube around it: errors smaller than $\varepsilon$ cost nothing, and only points outside the tube are penalised. So SVMs do both classification and regression [^1][^2].
- An SVM outputs a **score**, not a probability. scikit-learn's `probability=True` fits a logistic model on the scores (Platt scaling) with an extra internal cross-validation. That step is expensive, and its probabilities can disagree with `predict` [^4].

## Formulas

Primal (soft margin) and dual [^1][^2]:

$$
\min_{\mathbf{w}, b, \boldsymbol{\xi}} \tfrac12 \lVert \mathbf{w} \rVert^2 + C\sum_i \xi_i \quad \text{s.t. } y_i(\mathbf{w}^\top\mathbf{x}_i + b) \ge 1 - \xi_i,\ \xi_i \ge 0
$$

$$
\max_{\boldsymbol\alpha} \sum_i \alpha_i - \tfrac12 \sum_{i,j} \alpha_i \alpha_j y_i y_j K(\mathbf{x}_i, \mathbf{x}_j) \quad \text{s.t. } \sum_i \alpha_i y_i = 0,\ 0 \le \alpha_i \le C
$$

- Hard margin = no upper bound on $\alpha_i$ (the limit $C \to \infty$).
- $\mathbf{w} = \sum_i \alpha_i y_i \mathbf{x}_i$ and $f(\mathbf{x}) = \sum_{i \in SV} \alpha_i y_i K(\mathbf{x}_i, \mathbf{x}) + b$ [^2].
- Street width $= 2/\lVert \mathbf{w} \rVert$; the distance from the boundary to the closest point (geometric margin) is $1/\lVert \mathbf{w} \rVert$ [^1].
- KKT conditions: $\alpha_i = 0 \Rightarrow y_i f(\mathbf{x}_i) \ge 1$; $0 < \alpha_i < C \Rightarrow y_i f(\mathbf{x}_i) = 1$ (on a gutter); $\alpha_i = C \Rightarrow y_i f(\mathbf{x}_i) \le 1$ (inside the street, and misclassified only if $y_i f < 0$).

Kernels in scikit-learn [^3]:

| Kernel | $K(\mathbf{x}, \mathbf{x}')$ | Notes |
|---|---|---|
| linear | $\mathbf{x}^\top\mathbf{x}'$ | plain linear SVM |
| polynomial | $(\gamma\,\mathbf{x}^\top\mathbf{x}' + r)^d$ | all monomials up to degree $d$ if $r > 0$ (only degree $d$ if $r = 0$) |
| RBF (Gaussian) | $\exp(-\gamma \lVert \mathbf{x} - \mathbf{x}' \rVert^2)$ | infinite-dimensional $\phi$; $\gamma = 1/(2\sigma^2)$ |
| sigmoid | $\tanh(\gamma\,\mathbf{x}^\top\mathbf{x}' + r)$ | |

- $(1 + xz)^2 = 1 + 2xz + x^2z^2$ is the dot product of $\phi(x) = (1, \sqrt2\,x, x^2)$ with $\phi(z)$.
- A degree-2 kernel such as $(1 + \mathbf{x}^\top\mathbf{x}')^2$ spans all monomials of degree $\le 2$, so it can reproduce the boundary of a Gaussian class-conditional model (quadratic in general, linear with a shared covariance).
- RBF $\gamma$ sets how far one training point's influence reaches: large $\gamma$ (small $\sigma$) gives narrow bumps and a wiggly, overfit-prone boundary; small $\gamma$ gives a smoother one. Tune $C$ and $\gamma$ together by cross-validated grid search on a log scale [^3].
- Far from all training points every RBF term vanishes, so $f(\mathbf{x}) \to b$.

## Worked example

Negatives $(-1, 0), (0, -1), (0, 0)$; positives $(2, 1), (3, 1), (2, 2)$. The closest opposite pair is $(0,0)$ and $(2,1)$, so they are the support vectors and $\mathbf{w}$ points along their difference, $\mathbf{w} = c\,(2, 1)$.

- Gutter conditions: $h(0,0) = b = -1$ and $h(2,1) = 5c + b = 1$, so $c = 0.4$, $\mathbf{w} = (0.8, 0.4)$, $b = -1$.
- Check the others: $y_i h(\mathbf{x}_i) = 1.8, 1.4, 1.8, 1.4 \ge 1$, so they lie outside the street and have $\alpha_i = 0$.
- Duals: $\mathbf{w} = \alpha(2,1) - \alpha(0,0)$ gives $\alpha = 0.4$ for both support vectors, and $\sum_i \alpha_i y_i = 0$ holds.
- Street width $2/\lVert\mathbf{w}\rVert = 2/\sqrt{0.8} = \sqrt5 \approx 2.236$, the distance between the two support vectors.
- New point $(1, 2)$: $h = 0.8 + 0.8 - 1 = 0.6$, so it is classified $+1$ but lies inside the street.

## In code

```python
import numpy as np
from sklearn.svm import SVC

X = np.array([[-1, 0], [0, -1], [0, 0], [2, 1], [3, 1], [2, 2]])
y = np.array([-1, -1, -1, 1, 1, 1])
clf = SVC(kernel="linear", C=1e6).fit(X, y)   # huge C ~ hard margin
print(clf.coef_, clf.intercept_)   # [[0.8 0.4]] [-1.]
print(clf.support_vectors_)        # [[0. 0.] [2. 1.]]
print(clf.dual_coef_)              # [[-0.4  0.4]]  = y_i * alpha_i
print(clf.decision_function([[1, 2]]))  # [0.6]
```

## Common pitfalls

- Support vectors are the points **closest** to the boundary (or violating the margin), not the farthest ones; they alone determine $f$.
- An SVM does not output a probability distribution; Platt scaling is an add-on fitted afterwards [^4].
- "$\alpha_i = C$" means the point lies on or inside the margin ($y_i f \le 1$), not necessarily that it is misclassified.
- An RBF SVM that fits the training set perfectly but generalises badly needs a **larger** $\sigma$ (smaller $\gamma$) and/or a smaller $C$, chosen by cross-validation, not a higher $C$.
- Margins measured in different kernels' feature spaces are not comparable: scaling $\phi$ by 2 doubles the margin without changing the boundary. A larger margin also does not guarantee the lowest test error among linear classifiers.
- Support vectors generally change when you switch kernels, since the feature space changes.
- SVMs are not scale invariant: standardise the features first, with the same scaling on test data [^3].
