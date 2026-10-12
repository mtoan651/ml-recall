---
topic: linear-algebra
summary: The linear algebra deep learning uses — shapes and products, norms and angles, rank and null space, determinants, eigenvalues, singular values and the cost of matrix products.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_preliminaries/linear-algebra.html
    locator: Sec. 2.3.10 Matrix–Matrix Multiplication; Sec. 2.3.11 Norms
  - source: d2l
    url: https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/geometry-linear-algebraic-ops.html
    locator: Sec. 22.1.2 Dot Products and Angles; 22.1.6 Rank; 22.1.7 Invertibility; 22.1.8 Determinant; 22.1.9 Tensors and Common Linear Algebra Operations
  - source: d2l
    url: https://d2l.ai/chapter_appendix-mathematics-for-deep-learning/eigendecomposition.html
    locator: Sec. 22.2.3 Operations on Eigendecompositions; 22.2.4 Eigendecompositions of Symmetric Matrices; 22.2.6 A Useful Application — The Growth of Iterated Maps; 22.2.7 Discussion
  - title: Margalit & Rabinoff, Interactive Linear Algebra
    url: https://textbooks.math.gatech.edu/ila/rank-thm.html
    locator: Sec. 2.9 The Rank Theorem
  - title: 'Wikipedia: Matrix chain multiplication'
    url: https://en.wikipedia.org/wiki/Matrix_chain_multiplication
    locator: Introduction
  - title: 'Wikipedia: Singular value decomposition'
    url: https://en.wikipedia.org/wiki/Singular_value_decomposition
    locator: SVD and spectral decomposition (Relation to eigenvalue decomposition); Norms (Ky Fan norms)
  - title: Vershynin, Introduction to the non-asymptotic analysis of random matrices (2010), arXiv:1011.3027
    url: https://arxiv.org/abs/1011.3027
    locator: Sec. 5.3.1 Limit laws and Gaussian matrices (Theorem 5.31 Bai–Yin's law; Theorem 5.32 Gordon's theorem)
  - title: 'Wikipedia: Parallelogram law'
    url: https://en.wikipedia.org/wiki/Parallelogram_law
    locator: Normed vector spaces satisfying the parallelogram law
---
## Key ideas

**Objects and shapes.** A vector is a 1-D array (one example's features), a matrix a 2-D array
(a dense layer's weights), a tensor any $k$-D array. With one example per row, a mini-batch of $n$
examples with $d$ features is $X\in\mathbb{R}^{n\times d}$. A product $AB$ needs matching inner
sizes: $(n\times k)(k\times m)\to n\times m$, and entry $(i,j)$ is row $i$ of $A$ dotted with column $j$
of $B$ [^1]. A batch of 32 examples with 10 features times a $10\times64$ weight matrix gives
$32\times64$: one row of 64 outputs per example.

**Norms** [^1]: $\lVert x\rVert_1=\sum|x_i|$ (Manhattan, city-block distance),
$\lVert x\rVert_2=\sqrt{\sum x_i^2}$, $\lVert x\rVert_\infty=\max|x_i|$. Every norm satisfies
$\lVert\alpha x\rVert=|\alpha|\lVert x\rVert$ and the triangle *inequality*
$\lVert x+y\rVert\le\lVert x\rVert+\lVert y\rVert$ — equality is not guaranteed. Among the $p$-norms only
$\ell_2$ comes from an inner product, since only it satisfies the parallelogram law [^7].
$\lVert x\rVert_1$ is the walking distance on a grid (no diagonals).

**Dot products and angles** [^2]: $x^\top y=\lVert x\rVert\lVert y\rVert\cos\theta$; orthogonal
means $x^\top y=0$; cosine similarity ignores length. For unit vectors
$\lVert u-v\rVert^2=2-2u^\top v$. The closest point to $x$ on the line through a unit vector $u$ is
$(x^\top u)\,u$. Entry $(i,j)$ of $HH^\top$ is the dot product of rows $i$ and $j$ — a cosine only if the rows are normalised.

**Rank, null space, invertibility.** Rank = number of linearly independent columns
[^2]; rank + nullity = number of columns [^4]. The solutions of $Ax=0$ form a subspace (the null
space) of dimension $n-\operatorname{rank}A$: sums and multiples of solutions are solutions, and a
nullity of 2 or more means they are *not* all multiples of one vector. For a square $A$ these are
equivalent: $A$ invertible, $\det A\ne0$, full rank, columns independent, null space
$\{0\}$, $Ax=b$ uniquely solvable for every $b$, 0 not an eigenvalue [^2]. Pairwise independence of
columns is weaker and not enough. A column times a row ($cr^\top$) has rank 1, so its determinant
is 0; a set of vectors containing $0$ is always dependent. For $2\times2$,
$\begin{bmatrix}a&b\\c&d\end{bmatrix}^{-1}=\frac1{ad-bc}\begin{bmatrix}d&-b\\-c&a\end{bmatrix}$.

**Linear maps and subspaces.** A linear map is fixed by its values on a basis: write the new input
as a combination of inputs you know and combine their images the same way. For a linear map
$T:V\to W$, $\dim V=\dim\ker T+\dim\operatorname{im}T$ (the rank theorem again) [^4]. Two subspaces
of a space $X$ satisfy $\dim(V\cap W)\ge\dim V+\dim W-\dim X$, because $\dim(V+W)\le\dim X$.

**Determinant** = signed factor by which $A$ scales area/volume [^2]; for $2\times2$,
$ad-bc$. $\det(AB)=\det A\det B$, $\det A^{-1}=1/\det A$. If $y=Ax$, densities rescale:
$p_y(y)=p_x(x)/|\det A|$.

**Eigenvalues.** $Av=\lambda v$, $v\ne0$; eigenvalues are roots of $\det(A-\lambda I)$. Then
$\det A=\prod\lambda_i$, $\operatorname{tr}A=\sum\lambda_i$ — read them off the characteristic
polynomial: its constant term is $\det A$ and the coefficient of $\lambda^{n-1}$ is
$(-1)^{n-1}\operatorname{tr}A$. $A^k$, $A^{-1}$, $cA$ keep the eigenvectors
with eigenvalues $\lambda^k$, $1/\lambda$, $c\lambda$ [^3]. Symmetric matrices have real eigenvalues
and orthogonal eigenvectors, $A=W\Sigma W^\top$ [^3]. Similar matrices ($B=P^{-1}AP$) share
eigenvalues, trace and determinant. A projection ($P^2=P$) has eigenvalues 0 and 1 only, is
diagonalizable, and its trace equals its rank. $A+A^\top$ and $A^\top A$ are always symmetric;
$A$ maps orthogonal $e_1, e_2$ to orthogonal vectors exactly when its columns are orthogonal, i.e.
$A^\top A$ is diagonal.

**Power iteration.** Repeatedly multiplying a random vector by $A$ (and normalising) aligns it with
the eigenvector of the largest $|\lambda|$; the other components shrink like
$(\lambda_i/\lambda_1)^k$ [^3].

**Singular values.** $A=U\Sigma V^\top$; the singular values are the square roots of the
eigenvalues of $A^\top A$, and the spectral norm $\lVert A\rVert_2$ is the largest one [^6]. Power
iteration on $AA^\top$ therefore estimates $\sigma_{\max}^2$ from below: a ratio
$\lVert AA^\top u\rVert/\lVert u\rVert$ can never exceed $\lVert AA^\top\rVert_2=\sigma_{\max}^2$.

**Random matrices.** Take a $d\times d$ matrix with independent entries of mean 0 and variance 1
(e.g. standard normal). Its largest $|\text{eigenvalue}|$ is about $\sqrt d$ (circular law) [^3],
but its spectral norm is $2\sqrt d\,(1+o(1))$ as $d\to\infty$ (Bai–Yin law, needs a finite fourth
moment); for Gaussian entries $\mathbb{E}\lVert G\rVert_2\le2\sqrt d$ for every $d$ [^8]. So a matrix of
size-1 entries stretches some vector by about $2\sqrt d$ — why initial weights are scaled by
$1/\sqrt d$.

**Cost of products.** $(p\times q)(q\times r)$ costs $pqr$ multiplications. Matrix multiplication is
associative, so choose the parenthesisation that keeps intermediate results small [^5]. For a tall
$A\in\mathbb{R}^{n\times d}$ ($n\gg d$), $A(A^\top A)$ costs $2nd^2$ but $(AA^\top)A$ costs $2n^2d$,
because it builds an $n\times n$ intermediate.

**Einsum.** Repeated indices are summed: $\operatorname{tr}(A)=a_{ii}$, $(AB)_{ik}=a_{ij}b_{jk}$; in code
`torch.einsum('ij,jk->ik', A, B)` [^2].

## Formulas

$$
\cos\theta=\frac{x^\top y}{\lVert x\rVert_2\lVert y\rVert_2},\qquad \operatorname{rank}A+\dim\operatorname{Nul}A=n,\qquad \sigma_i(A)=\sqrt{\lambda_i(A^\top A)}
$$

## Worked example

$A=\begin{bmatrix}2&1\\1&2\end{bmatrix}$: $\det(A-\lambda I)=(2-\lambda)^2-1=0$ gives $\lambda=3,1$
with eigenvectors $(1,1)$ and $(1,-1)$. Check: trace $4=3+1$, determinant $3=3\cdot1$, so $A$
triples areas. $A^{-1}$ has eigenvalues $1/3$ and $1$; power iteration on $A$ approaches $(1,1)/\sqrt2$,
with the error shrinking by $\lambda_2/\lambda_1=1/3$ per step.

Chain cost with $A_{10\times100}$, $B_{100\times5}$, $C_{5\times50}$: $(AB)C$ costs
$10\cdot100\cdot5+10\cdot5\cdot50=7{,}500$; $A(BC)$ costs $100\cdot5\cdot50+10\cdot100\cdot50=75{,}000$.

## In code

```python
import numpy as np

A = np.array([[2.0, 1.0], [1.0, 2.0]])
print(np.linalg.eigvalsh(A))                    # [1. 3.]
print(np.trace(A), round(np.linalg.det(A), 6))  # 4.0 3.0
B = np.array([[1.0, 2.0], [0.0, 2.0]])
print(np.linalg.svd(B, compute_uv=False))       # [2.92080963 0.68474165]
rng = np.random.default_rng(0)
d = 1000
G = rng.standard_normal((d, d))
print(round(np.linalg.norm(G, 2) / np.sqrt(d), 3))                # 1.998
print(round(np.abs(np.linalg.eigvals(G)).max() / np.sqrt(d), 3))  # 1.014
```

## Common pitfalls

- **Shapes**: with examples as rows, $X$ is (batch × features), not the transpose.
- **$|x+y|=|x|+|y|$ is false in general**; only the triangle inequality holds [^1].
- **Determinant 0 ⇔ not invertible**; a large determinant does not mean "well-conditioned".
- **Eigenvectors are shared by $A$, $A^2$, $A^{-1}$, $2A$** — the eigenvalues change [^3].
- **$\operatorname{tr}(AB)\ne\operatorname{tr}A\cdot\operatorname{tr}B$**, and $\operatorname{tr}(A^2)$ can
  be negative; but $\operatorname{tr}(AB)=\operatorname{tr}(BA)$.
- **Singular values ≠ eigenvalues** unless $A$ is symmetric positive semidefinite [^6].
- **Matrix products are associative but not commutative**; order of evaluation changes the cost,
  not the result [^5].
