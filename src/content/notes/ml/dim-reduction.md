---
topic: dim-reduction
summary: Fewer features with little information lost - PCA via eigendecomposition or SVD, explained variance, LSA and NMF, and non-linear maps such as kernel PCA, t-SNE and autoencoders.
status: reviewed
reviewed_by: claude
references:
  - title: 'scikit-learn User Guide: Decomposing signals in components'
    url: https://scikit-learn.org/stable/modules/decomposition.html#principal-component-analysis-pca
    locator: Sec. 2.5.1 PCA; 2.5.2 Kernel PCA; 2.5.3 Truncated SVD and latent semantic analysis; 2.5.5 Factor Analysis; 2.5.6 ICA; 2.5.7 NMF
  - title: 'scikit-learn API: sklearn.decomposition.PCA'
    url: https://scikit-learn.org/stable/modules/generated/sklearn.decomposition.PCA.html
    locator: Parameters n_components, whiten; attributes components_, explained_variance_, explained_variance_ratio_, singular_values_
  - title: 'Wikipedia: Principal component analysis'
    url: https://en.wikipedia.org/wiki/Principal_component_analysis
    locator: Overview; Intuition (scree plot); Details (First component, Covariances, Dimensionality reduction, Singular value decomposition); Further considerations; Properties and limitations; Computation using the covariance method (cumulative energy)
  - title: 'Wikipedia: Dimensionality reduction'
    url: https://en.wikipedia.org/wiki/Dimensionality_reduction
    locator: Introduction; Feature selection; Feature projection (Kernel PCA, Graph-based kernel PCA, t-SNE, UMAP)
  - title: Wattenberg, Viégas & Johnson, How to Use t-SNE Effectively (Distill, 2016)
    url: https://distill.pub/2016/misread-tsne/
    locator: Sections 1–4 (hyperparameters, cluster sizes, distances between clusters, random noise)
  - title: 'Wikipedia: Autoencoder'
    url: https://en.wikipedia.org/wiki/Autoencoder
    locator: Applications — Dimensionality reduction — Principal component analysis
---
## Key ideas

- **Why reduce**: fewer features to store and learn from, visualisation in 2-D/3-D, noise removal, and relief from the curse of dimensionality (in high dimensions the data are sparse) [^4]. Example: the fraction of the cube $[-1, 1]^d$ inside the inscribed ball is $0.785$ for $d = 2$, $0.524$ for $d = 3$ and $0.164$ for $d = 5$, and it keeps shrinking towards 0.
- **Feature selection** keeps a subset of the original columns (variance threshold, univariate tests, RFE). **Feature extraction** builds new features from all of them (PCA, NMF, autoencoders) [^4].
- **PCA** finds orthonormal directions (principal axes) in feature space. The first maximises the variance of the projected data; each next one maximises the remaining variance while staying orthogonal to the earlier ones [^3]. They are the eigenvectors of the covariance matrix, and each eigenvalue is the variance along its axis [^3]. The new coordinates (scores) are uncorrelated [^3].
- PCA must work on **centred** data; scikit-learn centres each feature but does not scale it [^2]. With features in different units (dollars vs years), the high-variance one dominates PC1, so standardise first [^3].
- Equivalently, PCA keeps the $k$-dimensional hyperplane through the mean that best reconstructs the data in squared error, which is the truncated SVD of the centred matrix (Eckart–Young) [^3]. With $k = d$ the reconstruction is exact; the scores are still rotated coordinates, not the original $X$.
- **Choosing $k$**: keep the smallest $k$ whose cumulative explained-variance ratio reaches a target such as 90–95%, or look for the bend in a scree plot [^3]. In scikit-learn, `PCA(n_components=0.95, svd_solver="full")` does this for you [^2].
- **Loadings** (the weights in each component) show which original features drive it: same signs mean the features rise together, opposite signs a contrast.
- PCA is unsupervised: it ignores labels and need not keep the directions that separate the classes [^3]. Its components are nested: the first component is the same whether you keep 1 or 4.
- `whiten=True` rescales each score to unit variance, so after whitening all components have the same variance [^2].
- **Related linear methods** [^1]: Truncated SVD skips centring and works on sparse term–document matrices, which is latent semantic analysis (LSA). In $X \approx ZW$, a row of $Z$ gives a document's topic weights and a row of $W$ a topic's word weights. **NMF** factorises non-negative data into non-negative, additive parts; its components are fitted jointly, so unlike PCA's they can all change when you change how many you keep. **Factor analysis** allows a different noise variance per feature; **ICA** separates independent non-Gaussian sources after whitening.
- **Non-linear methods**: kernel PCA (PCA with the kernel trick), Isomap (geodesic distances on a neighbourhood graph), t-SNE and UMAP for visualisation [^1][^4]. A linear autoencoder with a $k$-unit bottleneck trained on squared error spans the same subspace as the top $k$ principal components, but its weights need not be orthogonal [^6].
- **t-SNE** matches neighbour distributions. Its **perplexity** is roughly the number of close neighbours each point has (typical 5–50); low values emphasise local structure [^5]. Run it until the layout is stable. Cluster sizes and gaps between clusters in the plot carry little meaning, and pure noise can look clustered at low perplexity [^5]. Use it to look, not to cluster [^4].

## Formulas

- Centred data $X$ ($n \times d$), covariance $C = X^\top X/(n-1) = V \Lambda V^\top$. Explained-variance ratio of component $i$: $\lambda_i / \sum_j \lambda_j$ [^3].
- SVD $X = U\Sigma V^\top$: the columns of $V$ are the principal axes and $\lambda_i = \sigma_i^2/(n-1)$, so variance ratios can be computed from squared singular values [^2][^3].
- Scores $Z = X W^\top$ with $W$ the $k \times d$ matrix of axes (scikit-learn's `components_`, shape `(n_components, n_features)`); reconstruction $\hat X = Z W$ (plus the mean) [^2].
- Best rank-$k$ approximation error: $\lVert X - X_k \rVert_F = \sqrt{\sum_{i > k} \sigma_i^2}$ [^3].
- A covariance matrix is symmetric positive semi-definite, so it always has real eigenvalues $\ge 0$ and an orthonormal eigenbasis. Perfectly collinear features give an eigenvalue of 0: one component carries no variance.

## Worked example

Centred 2-D data with covariance $C = \begin{bmatrix} 5 & 2 \\ 2 & 2 \end{bmatrix}$.

- $\det(C - \lambda I) = \lambda^2 - 7\lambda + 6 = 0$, so $\lambda_1 = 6$, $\lambda_2 = 1$; PC1 explains $6/7 \approx 0.857$ of the variance.
- $(C - 6I)\mathbf{v} = 0$ gives $\mathbf{v}_1 = (2, 1)/\sqrt5$, and $\mathbf{v}_2 = (1, -2)/\sqrt5$.
- Point $\mathbf{x} = (1, 2)$: score $z_1 = \mathbf{x}^\top\mathbf{v}_1 = 4/\sqrt5 \approx 1.789$; rank-1 reconstruction $z_1 \mathbf{v}_1 = (1.6, 0.8)$; squared error $0.6^2 + 1.2^2 = 1.8 = z_2^2$, the part along PC2.

## In code

```python
import numpy as np
from sklearn.decomposition import PCA

rng = np.random.default_rng(0)
X = rng.multivariate_normal([0, 0], [[5, 2], [2, 2]], size=500)
pca = PCA().fit(X)
print(pca.components_.round(2))             # [[ 0.9   0.44] [-0.44  0.9 ]]  rows = axes
print(pca.explained_variance_.round(2))     # [5.83 0.94]
print(np.linalg.eigvalsh(np.cov(X.T))[::-1].round(2))       # [5.83 0.94]  covariance eigenvalues
print((pca.singular_values_**2 / (len(X) - 1)).round(2))    # [5.83 0.94]  sigma^2 / (n - 1)
print(pca.explained_variance_ratio_.round(3))               # [0.861 0.139]
```

The sample estimates are close to the exact values $(2, 1)/\sqrt5 \approx (0.89, 0.45)$, 6 and 1.

## Common pitfalls

- PCA without centring is not PCA; on raw features with different units, PC1 just follows the feature with the largest numbers.
- A principal component is a direction (a mix of all features), not the original feature with the largest variance.
- PCA does not assume uncorrelated inputs; it exploits correlation and outputs uncorrelated scores. Collinear features do not make it fail.
- Keeping as many components as possible defeats the purpose; pick $k$ from the explained-variance curve.
- PCA is not regression: it minimises perpendicular distances to a subspace and treats all features alike, with no target.
- In a t-SNE plot, do not read cluster sizes or distances between clusters as real quantities [^5].
