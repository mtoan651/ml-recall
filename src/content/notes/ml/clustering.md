---
topic: clustering
summary: Grouping unlabeled data - k-means and its inertia, choosing k, Gaussian mixtures fitted by EM, density-based DBSCAN, hierarchical clustering, similarity measures and cluster evaluation.
status: reviewed
reviewed_by: claude
references:
  - title: 'scikit-learn User Guide: Clustering'
    url: https://scikit-learn.org/stable/modules/clustering.html#k-means
    locator: Sec. 2.3.1 Overview of clustering methods; 2.3.2 K-means; 2.3.5 Spectral clustering; 2.3.6 Hierarchical clustering; 2.3.7 DBSCAN; 2.3.11.1 Rand index; 2.3.11.5 Silhouette Coefficient
  - title: 'scikit-learn API: sklearn.cluster.DBSCAN'
    url: https://scikit-learn.org/stable/modules/generated/sklearn.cluster.DBSCAN.html
    locator: Parameters eps and min_samples; attribute labels_
  - title: 'Wikipedia: k-means clustering'
    url: https://en.wikipedia.org/wiki/K-means_clustering
    locator: Description; History; Algorithms — Standard algorithm (naive k-means), Complexity, Optimal number of clusters, Variations; Discussion
  - title: 'Wikipedia: Expectation–maximization algorithm'
    url: https://en.wikipedia.org/wiki/Expectation%E2%80%93maximization_algorithm#Gaussian_mixture
    locator: Examples — Gaussian mixture (E step, M step); Properties
  - source: google-ml-courses
    url: https://developers.google.com/machine-learning/clustering/dnn-clustering/supervised-similarity
    locator: 'Clustering: Measuring similarity from embeddings — Choosing a similarity measure'
  - title: 'Wikipedia: Cluster analysis'
    url: https://en.wikipedia.org/wiki/Cluster_analysis#External_evaluation
    locator: Evaluation and assessment — External evaluation — Purity
---
## Key ideas

Clustering is **unsupervised**: there are no labels, and the algorithm groups points by similarity. Uses include customer segmentation, compression and anomaly detection (points far from every cluster).

**k-means** minimises the **inertia** (within-cluster sum of squares) for a fixed, user-chosen $k$ [^1][^3].

- Lloyd's algorithm: initialise $k$ centroids; **assign** every point to its nearest centroid; **update** each centroid to the mean of its points; repeat until the centroids stop moving or a maximum number of iterations is reached [^1]. Every point belongs to exactly one cluster at every step.
- Inertia never increases, so the algorithm always converges, but only to a **local** optimum that depends on the initialisation. Finding the global optimum is NP-hard [^1][^3]. Use several restarts and k-means++ seeding [^1].
- The centroids cut the space into **Voronoi cells**, so k-means suits convex, isotropic, similar-sized ("flat geometry") clusters and fails on curved or elongated ones [^1][^3].
- It works on Euclidean distances: **scale the features first**, or the one with the largest range dominates. Do not rescale features whose units are already comparable and meaningful, such as latitude and longitude: scaling them separately would distort real distances.
- k-means came from signal processing (vector quantization): each value is replaced by the nearest of $k$ representatives [^3]. **k-medoids** uses an actual data point as centre and works with any distance [^3]; a medoid is much less pulled by an outlier than a mean.

**Choosing $k$.** The best achievable inertia never increases with $k$ and is 0 when every distinct point is its own cluster, so "smallest inertia" is not a criterion. The **elbow** method looks for a bend in inertia versus $k$, which is often unclear [^3]. The **silhouette** of a point compares $a$, its mean distance to its own cluster, with $b$, its mean distance to the nearest other cluster. It lies in $[-1, 1]$, near 0 for overlapping clusters, and it does not need cluster centres [^1]. It favours convex clusters over density-based ones [^1].

**Gaussian mixture models** are a soft, probabilistic generalisation: each component has a weight $\pi_k$, mean and covariance, so clusters can be elliptical and of different sizes, and each point gets a probability for every component [^3]. They are fitted with **EM**, which is also sensitive to initialisation [^4].

**DBSCAN** (density-based) needs `eps` (neighbourhood radius) and `min_samples`. scikit-learn's code and API page count the point itself in `min_samples` [^2], although its user guide speaks of "other" samples [^1]; the code below confirms the first reading.

- A **core** point has at least `min_samples` points (itself included) within distance `eps`. Clusters are chains of core points plus their **border** points, which are within `eps` of a core point but are not core themselves. Everything else is **noise**, labelled $-1$ [^1][^2].
- No $k$ to choose; finds clusters of arbitrary shape and uneven size; robust to outliers ("non-flat geometry") [^1]. Lower `eps` or higher `min_samples` demands higher density: too small an `eps` labels most points as noise, too large an `eps` merges nearby clusters [^1].

**Hierarchical (agglomerative)** clustering starts with singletons and repeatedly merges the closest pair of clusters (Ward, complete, average or single linkage). The **dendrogram** records the merges; cutting it at different heights gives coarser or finer clusterings, with no random initialisation [^1]. **Spectral clustering** clusters the eigenvectors of a similarity graph and handles non-flat shapes [^1].

**Similarity.** Cosine similarity ignores vector length; the dot product grows with it. Switching from cosine to dot product therefore makes long vectors (for example, popular items) more similar to everything [^5].

## Formulas

- Inertia: $\sum_i \min_j \lVert \mathbf{x}_i - \boldsymbol\mu_j \rVert^2$ [^1].
- Silhouette: $s = \dfrac{b - a}{\max(a, b)}$ [^1].
- GMM E-step (responsibilities): $w_{ik} = \dfrac{\pi_k\,\mathcal{N}(\mathbf{x}_i; \boldsymbol\mu_k, \Sigma_k)}{\sum_j \pi_j\,\mathcal{N}(\mathbf{x}_i; \boldsymbol\mu_j, \Sigma_j)}$ [^4].
- M-step: $\pi_k = \frac1n \sum_i w_{ik}$, $\;\boldsymbol\mu_k = \dfrac{\sum_i w_{ik}\mathbf{x}_i}{\sum_i w_{ik}}$, $\;\Sigma_k = \dfrac{\sum_i w_{ik}(\mathbf{x}_i - \boldsymbol\mu_k)(\mathbf{x}_i - \boldsymbol\mu_k)^\top}{\sum_i w_{ik}}$ [^4].
- Example: equal weights, components $\mathcal{N}(0, 1)$ and $\mathcal{N}(3, 1)$, point $x = 1$: $w_1 = 1/(1 + e^{-1.5}) \approx 0.818$.
- Dot product $\mathbf{a}^\top\mathbf{b} = \lVert\mathbf{a}\rVert\,\lVert\mathbf{b}\rVert\cos\theta$.

## Worked example

k-means with $k = 2$ on $1, 2, 4, 7, 9, 10$, starting from centroids $1$ and $4$.

- Assign: $\{1, 2\}$ to centroid 1 and $\{4, 7, 9, 10\}$ to centroid 4. Update: $1.5$ and $7.5$.
- Assign again: $4$ is now closer to $1.5$ (distance 2.5) than to $7.5$ (3.5), so the clusters become $\{1, 2, 4\}$ and $\{7, 9, 10\}$. Update: $2.333$ and $8.667$. Nothing changes after that: converged.
- Inertia $= 4.667 + 4.667 = 9.333$.
- Silhouette of the point 4: $a = (3 + 2)/2 = 2.5$, $b = (3 + 5 + 6)/3 = 4.667$, $s = (4.667 - 2.5)/4.667 = 0.464$.

## In code

```python
import numpy as np
from sklearn.cluster import DBSCAN, KMeans
from sklearn.metrics import silhouette_score

X = np.array([1, 2, 4, 7, 9, 10], dtype=float).reshape(-1, 1)
km = KMeans(n_clusters=2, init=np.array([[1.0], [4.0]]), n_init=1).fit(X)
print(km.labels_, km.cluster_centers_.ravel().round(3))  # [0 0 0 1 1 1] [2.333 8.667]
print(round(km.inertia_, 3))                        # 9.333
print(round(silhouette_score(X, km.labels_), 3))   # 0.659
P = np.array([1, 2, 3, 6, 8, 9, 10, 15], dtype=float).reshape(-1, 1)
print(DBSCAN(eps=1, min_samples=3).fit(P).labels_)  # [ 0  0  0 -1  1  1  1 -1]
```

Only 2 and 9 are core points; 1, 3, 8 and 10 are border points; 6 and 15 are noise.

## Common pitfalls

- k-means does not find the same clusters on every run, and it is not guaranteed to find the optimum; it also does not decide $k$ for you.
- The best $k$ is not the one with the smallest inertia (that is always $k = n$).
- In DBSCAN, border points belong to a cluster without having `min_samples` neighbours themselves; only core points need that.
- k-means is more affected by outliers than DBSCAN, which labels isolated points as noise.
- The $k$ in k-means (number of clusters) has nothing to do with the $k$ in $k$-NN (number of neighbours).
- A good silhouette score says clusters are compact and separated, not that they mean what you care about.
- Purity against reference labels rewards tiny clusters: one point per cluster gives purity 1 [^6]. Prefer chance-adjusted scores such as the adjusted Rand index [^1].
