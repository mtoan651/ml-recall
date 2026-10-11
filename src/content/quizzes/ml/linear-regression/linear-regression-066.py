"""Three residual plots (prediction error y - yhat against x), redrawn from MIT OCW 6.867
Machine Learning (Fall 2006), mid-term exam Fall 2004, Problem 1 (CC BY-NC-SA 4.0).

A: noise with zero mean, uncorrelated with 1, x and x^2.
B: a centred parabola: zero mean and uncorrelated with x, but correlated with x^2.
C: a parabola with a positive mean.
"""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, save

rng = np.random.default_rng(6867)
x = np.sort(rng.uniform(-1, 1, 400))
basis = np.stack([np.ones_like(x), x, x**2], axis=1)


def orthogonalize(r, cols):
    """Remove the least-squares projection of r onto the given basis columns."""
    q = basis[:, cols]
    return r - q @ np.linalg.lstsq(q, r, rcond=None)[0]


noise = 0.04 * rng.standard_normal(x.size)
a = orthogonalize(noise, [0, 1, 2])
b = orthogonalize(x**2 + noise, [0, 1])
c = x**2 + noise
# A is compatible with linear and quadratic least squares, B only with linear, C with neither.
assert np.allclose(basis.T @ a, 0, atol=1e-9)
assert np.allclose(basis[:, :2].T @ b, 0, atol=1e-9) and abs(x**2 @ b) > 1
assert c.mean() > 0.2

fig, axes = plt.subplots(1, 3, figsize=(8.4, 2.9), sharey=True)
for ax, r, name in zip(axes, [a, b, c], "ABC", strict=True):
    ax.scatter(x, r, s=4, color=BLUE, zorder=3)
    ax.axhline(0, color="#5f6368", lw=0.8, zorder=2)
    ax.axvline(0, color="#5f6368", lw=0.8, zorder=2)
    ax.set(xlim=(-1, 1), ylim=(-1, 1.1), xticks=[-1, 0, 1], yticks=[-1, 0, 1], xlabel="$x$")
    ax.set_title(name)
    ax.grid(True, zorder=0)
axes[0].set_ylabel("prediction error $y - \\hat{y}$")
save(fig, __file__)
