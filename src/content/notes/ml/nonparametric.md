---
topic: nonparametric
summary: Methods that keep the training data instead of a fixed set of weights — k-nearest neighbours, kernel (Nadaraya–Watson) regression, kernels, Gaussian processes and fast similarity search.
status: reviewed
reviewed_by: claude
references:
  - title: scikit-learn User Guide
    url: https://scikit-learn.org/stable/modules/neighbors.html
    locator: Sec. 1.6 Nearest Neighbors (1.6.2 Classification, 1.6.3 Regression, 1.6.4 Nearest Neighbor Algorithms)
  - title: 'Wikipedia: k-nearest neighbors algorithm'
    url: https://en.wikipedia.org/wiki/K-nearest_neighbors_algorithm
    locator: Parameter selection; Dimension reduction; Data reduction
  - source: d2l
    url: https://d2l.ai/chapter_attention-mechanisms-and-transformers/attention-pooling.html
    locator: Sec. 11.2 Attention Pooling by Similarity (11.2.1 Kernels and Data, 11.2.2 Attention Pooling via Nadaraya–Watson Regression)
  - title: 'Wikipedia: Positive-definite kernel'
    url: https://en.wikipedia.org/wiki/Positive-definite_kernel
    locator: Definition (Some general properties; Examples of p.d. kernels)
  - source: d2l
    url: https://d2l.ai/chapter_gaussian-processes/gp-inference.html
    locator: Sec. 18.3 Gaussian Process Inference (18.3.1 Posterior Inference for Regression; 18.3.2 Equations for Making Predictions and Learning Kernel Hyperparameters in GP Regression; 18.3.3 Interpreting Equations for Learning and Predictions)
  - title: 'Wikipedia: Locality-sensitive hashing'
    url: https://en.wikipedia.org/wiki/Locality-sensitive_hashing
    locator: Definitions; Methods (Min-wise independent permutations, Random projection); Algorithm for nearest neighbor search
---
## Key ideas

**Nonparametric** methods have no fixed-size weight vector: the model is (part of) the training data, so its capacity — and its memory and prediction cost — grow with the data.

**$k$-nearest neighbours** [^1]. `fit` only stores the training set; to predict, find the $k$ training points closest to the query (usually Euclidean distance) and take a majority vote of their labels (classification) or the mean of their targets (regression). With uniform weights, `predict_proba` is the fraction of neighbours in each class; `weights="distance"` gives closer neighbours more say [^1]. It needs labels, so the classifier is supervised (plain neighbour search is not).

- *$k$ is the complexity knob* [^1][^2]. $k = 1$ copies the nearest training label: zero training error (each training point is its own neighbour, unless identical inputs carry different labels) and a jagged boundary made of Voronoi cell walls — high variance. Larger $k$ suppresses noise and smooths the boundary, so training error usually rises; with uniform weights, $k = N$ predicts the majority class everywhere. Choose $k$ by cross-validation; an odd $k$ avoids ties for two classes [^2].
- *Distances need care* [^2]. Without scaling, a feature measured in dollars swamps one measured in years; irrelevant features add noise to every distance, and $k$-NN gives every feature equal weight — it selects none. In high dimension, neighbourhoods stop being local: the curse of dimensionality [^2].
- *Cost* [^1]. Training is almost free, but a brute-force query computes $N$ distances in $d$ dimensions, $O(dN)$, and barely depends on $k$. k-d and ball trees cut a query to about $O(d\log N)$ in low dimension (k-d trees below roughly 20 features) and degrade toward $O(dN)$ as $d$ grows [^1]. Removing training points whose removal changes no prediction (condensed nearest neighbour) shrinks the stored set [^2].
- *When to use*: low dimension, plenty of data, few queries, irregular boundaries. Wide sparse data such as word counts favour trees, naive Bayes or linear models.

**Kernel (Nadaraya–Watson) regression** [^3]. Predict a weighted average of *all* training labels, with weights from a kernel of the distance, normalized to sum to 1; nothing is trained. The **bandwidth** $\sigma$ is the knob: a narrow kernel follows local variation (wiggly, high variance), a wide one smooths (high bias), and as $\sigma \to \infty$ the prediction becomes the global mean of $y$. The kernel's shape (Gaussian, boxcar, Epanechnikov) matters much less, and its height cancels in the normalization [^3]. Tuning $\sigma$ on training error drives it to 0, because each point then predicts its own label — use leave-one-out or cross-validation. The estimator is consistent if the kernel is narrowed suitably as data grow [^3]. A kernel *density* estimate sums the same kernels without dividing by their total.

**Kernels** [^4]. A (positive semidefinite) kernel $k(\mathbf{x}, \mathbf{x}')$ is a similarity whose Gram matrix on every finite set of points is positive semidefinite. Nonnegative combinations, products and limits of kernels are again kernels [^4]; hence so are $\exp$ of a kernel (a limit of sums of products) and $g(\mathbf{x})g(\mathbf{x}')$ (its Gram matrix is $\mathbf{g}\mathbf{g}^\top$). A *difference* of kernels need not be one: $k - 2k = -k$. The kernel encodes assumptions — the RBF kernel lets correlation fade steadily with distance, so data with a cycle (hourly demand repeating every 24 hours) calls for a periodic kernel. Kernel ridge regression predicts $k(\mathbf{x}_*, X)(K + \lambda I)^{-1}\mathbf{y}$, the same form as the GP mean below; for distinct inputs the RBF Gram matrix $K$ is invertible, so as $\lambda \to 0$ the fit interpolates the training data — zero training error, overfitting. The perceptron has a kernel form too: starting from zero, its weight vector is a sum of the misclassified inputs, so $f(\mathbf{x}) = \sum_i m_i y_i\, k(\mathbf{x}_i, \mathbf{x})$ with $m_i$ the number of mistakes made on $\mathbf{x}_i$.

**Gaussian processes** [^5]. A GP is a prior over functions: any finite set of function values is jointly Gaussian, with mean function $m(\mathbf{x})$ and covariance given by a kernel [^5]. Read the RBF kernel (Formulas): $k(\mathbf{x}, \mathbf{x}) = a^2$ is the prior variance, so the **amplitude** $a$ sets the vertical scale; the correlation fades over distances of order $\ell$, so the **length-scale** $\ell$ sets the wiggliness — small $\ell$ gives fast variation, large $\ell$ slowly varying functions. Predictive uncertainty grows as the query moves away from the training inputs [^5], and the faster the smaller $\ell$ is. With observation noise $\sigma^2$, the posterior mean is a kernel-weighted combination of the training targets; a large $\sigma^2$ lets it pass farther from the points, a tiny one makes it nearly interpolate. Exact inference solves a linear system and a log-determinant with the $n \times n$ matrix $K + \sigma^2 I$: $O(n^3)$ time and $O(n^2)$ memory, historically limiting exact GPs to about 10,000 points [^5]. After that factorization, each test point costs $O(n)$ for the mean and $O(n^2)$ for the variance. Sums of independent GPs are GPs with summed kernels (scaling a GP by $c$ scales its kernel by $c^2$).

**Similarity search at scale** [^6]. Locality-sensitive hashing *wants* collisions, but only between similar items, so a query is compared with the items in its buckets only. MinHash is such a hash for sets: two sets get the same min-hash with probability equal to their Jaccard similarity; random hyperplanes give such a hash for the angle between vectors (cosine similarity) [^6].

## Formulas

$$
\hat y_{k\text{NN}}(\mathbf{x}) = \frac{1}{k}\sum_{i \in N_k(\mathbf{x})} y_i, \qquad \hat y_{\text{NW}}(\mathbf{x}) = \frac{\sum_i y_i\,K(\mathbf{x} - \mathbf{x}_i)}{\sum_j K(\mathbf{x} - \mathbf{x}_j)}
$$

$$
k_{\text{RBF}}(\mathbf{x}, \mathbf{x}') = a^2\exp\!\Big(-\frac{\lVert\mathbf{x} - \mathbf{x}'\rVert^2}{2\ell^2}\Big), \qquad \mu(\mathbf{x}_*) = k(\mathbf{x}_*, X)\,[K + \sigma^2 I]^{-1}\mathbf{y}
$$

Curse of dimensionality: in the unit cube $[0, 1]^p$ with uniform data, a sub-cube holding a fraction $r$ of the points needs edge length $r^{1/p}$.

## Worked example

Training data $x = (1, 2, 4, 7)$, $y = (1, 3, 2, 6)$; query $x = 3$.

- $k = 2$: neighbours $x = 2$ and $x = 4$ (both at distance 1), prediction $(3 + 2)/2 = 2.5$. $k = 3$ adds $x = 1$: $(3 + 2 + 1)/3 = 2.0$. $k = 4$: the global mean, 3.0.
- Nadaraya–Watson, Gaussian kernel, $\sigma = 1$: unnormalized weights $e^{-2}, e^{-0.5}, e^{-0.5}, e^{-8}$, normalized $\approx (0.100, 0.450, 0.450, 0.0002)$, prediction $\approx 2.350$. With $\sigma = 0.5$ it is $\approx 2.498$ (close to 2-NN); with $\sigma = 100$, $3.000$ (the global mean).
- Curse of dimensionality: a sub-cube holding 10% of uniform data has edge 0.1 in 1-D, 0.316 in 2-D and 0.891 in 20-D — hardly "local".

## In code

```python
from sklearn.datasets import load_wine
from sklearn.model_selection import cross_validate
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_wine(return_X_y=True)        # 13 features on very different scales
res = {}
for scaled in [False, True]:
    for k in [1, 15]:
        knn = KNeighborsClassifier(n_neighbors=k)
        model = make_pipeline(StandardScaler(), knn) if scaled else knn
        cv = cross_validate(model, X, y, cv=5, return_train_score=True)
        res[scaled, k] = (float(cv["train_score"].mean().round(2)), float(cv["test_score"].mean().round(2)))
print(res)  # {(False, 1): (1.0, 0.73), (False, 15): (0.73, 0.71), (True, 1): (1.0, 0.95), (True, 15): (0.97, 0.96)}
```

Keys are (scaled?, $k$), values (training accuracy, validation accuracy): 1-NN is always perfect on its training folds; scaling lifts validation accuracy from about 0.7 to 0.95.

## Common pitfalls

- The neighbours come from the *training* set; test examples are only queries.
- A larger $k$ gives a simpler model and usually a *higher* training error; $k = 1$ has zero training error.
- $k$-NN needs scaled features and suffers from irrelevant ones; it neither selects nor weights features.
- Prediction, not training, is the slow part: cost grows with $N \cdot d$, while $k$ barely matters for brute force.
- In kernel regression the bandwidth matters far more than the kernel's shape; never pick it by training error.
- A GP's amplitude rescales the functions vertically ($a^2$ from 1 to 9 triples their spread) without changing how fast they wiggle; that is the length-scale's job.
- Exact GP training is cubic in $n$: three times the data costs 27 times the time and 9 times the memory.
- Sums and products of valid kernels are valid kernels; differences are not guaranteed to be.
