"""Three empirical ROC curves (informative scores, random scores, inverted scores) on a balanced
synthetic test set; redrawn after the ROC question in UBC CPSC 330 (2025W1) midterm prep, Q16
(CC BY 4.0). Panel B is the classifier whose scores are coin flips."""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, auc, roc_axes, save

rng = np.random.default_rng(16)
n = 500
y = np.r_[np.ones(n), np.zeros(n)]  # balanced classes


def roc(scores):
    idx = np.argsort(-scores, kind="stable")
    ys = y[idx]
    tpr = np.r_[0, np.cumsum(ys) / ys.sum()]
    fpr = np.r_[0, np.cumsum(1 - ys) / (1 - ys).sum()]
    return fpr, tpr


good = y * 2.4 + rng.normal(size=2 * n)
coin = rng.random(2 * n)
bad = -(y * 1.2) + rng.normal(size=2 * n)
curves = {"A": roc(good), "B": roc(coin), "C": roc(bad)}
aucs = {k: auc(*v) for k, v in curves.items()}
assert aucs["A"] > 0.9 and abs(aucs["B"] - 0.5) < 0.04 and aucs["C"] < 0.25, aucs

fig, axes = plt.subplots(1, 3, figsize=(10.5, 3.7))
for ax, (name, (fpr, tpr)) in zip(axes, curves.items(), strict=True):
    roc_axes(ax)
    ax.plot(fpr, tpr, color=BLUE, linewidth=2.4, zorder=3)
    ax.set_title(name, fontsize=14, fontweight="bold")
for ax in axes[1:]:
    ax.set_ylabel("")
save(fig, __file__)
