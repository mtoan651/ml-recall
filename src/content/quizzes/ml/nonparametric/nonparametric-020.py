"""Decision regions of three k-NN classifiers (k = 7, 61, 1) on one synthetic 2-D dataset;
redrawn after the decision-boundary question in UBC CPSC 330 (2025W1) midterm prep, Q8
(CC BY 4.0). Panel B uses the largest k."""

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import ListedColormap

from mlrecall.figstyle import BLUE, ORANGE, save

rng = np.random.default_rng(330)
n = 120
X = rng.uniform(0, 10, size=(n, 2))
boundary = 5 + 1.6 * np.sin(X[:, 0] / 1.3)
y = (X[:, 1] > boundary).astype(int)
flip = rng.random(n) < 0.12  # label noise
y[flip] = 1 - y[flip]

gx, gy = np.meshgrid(np.linspace(0, 10, 220), np.linspace(0, 10, 220))
grid = np.c_[gx.ravel(), gy.ravel()]
dist = ((grid[:, None, :] - X[None, :, :]) ** 2).sum(-1)
order = np.argsort(dist, axis=1)


def knn_predict(k):
    votes = y[order[:, :k]].mean(axis=1)
    return (votes > 0.5).astype(int).reshape(gx.shape)


def roughness(pred):
    """Number of neighbouring grid cells with different labels (boundary length proxy)."""
    return int((pred[1:, :] != pred[:-1, :]).sum() + (pred[:, 1:] != pred[:, :-1]).sum())


PANELS = {"A": 7, "B": 61, "C": 1}
preds = {name: knn_predict(k) for name, k in PANELS.items()}
r = {name: roughness(p) for name, p in preds.items()}
assert r["B"] < r["A"] < r["C"], r  # the largest k gives the smoothest boundary
assert 0.2 < preds["B"].mean() < 0.8  # k = 61 still predicts both classes

cmap = ListedColormap(["#c9daf0", "#f6dcc0"])
fig, axes = plt.subplots(1, 3, figsize=(10.5, 3.6), sharey=True)
for ax, (name, pred) in zip(axes, preds.items(), strict=True):
    ax.contourf(gx, gy, pred, levels=[-0.5, 0.5, 1.5], cmap=cmap)
    ax.scatter(*X[y == 0].T, marker="o", s=22, color=BLUE, edgecolor="white", linewidth=0.5,
               label="class 0", zorder=3)
    ax.scatter(*X[y == 1].T, marker="^", s=26, color=ORANGE, edgecolor="white", linewidth=0.5,
               label="class 1", zorder=3)
    ax.set_title(name, fontsize=14, fontweight="bold")
    ax.set_xlabel("feature 1")
    ax.set_xticks([0, 5, 10])
    ax.set_yticks([0, 5, 10])
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
axes[0].set_ylabel("feature 2")
axes[2].legend(loc="upper right", frameon=True, fontsize=9)
save(fig, __file__)
