"""Two cross-validation schemes on ten examples: one example per fold, and five folds of two.

Drawn for ml-recall after the idea of Deep Learning Interviews (arXiv 2201.00650v2), Ch. 8,
PRB-177, Fig. 8.1. Each row is one training run; dark cells are the validation examples. Not
copied from the book.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

from mlrecall.figstyle import BLUE, INK, LIGHT, save

N = 10
schemes = {
    "Scheme 1": [[i] for i in range(N)],
    "Scheme 2": [[2 * k, 2 * k + 1] for k in range(5)],
}
fig, axes = plt.subplots(1, 2, figsize=(7.2, 3.4))
for ax, (title, rows) in zip(axes, schemes.items(), strict=True):
    for r, val in enumerate(rows):
        for c in range(N):
            ax.add_patch(
                Rectangle((c, -r - 1), 0.9, 0.8, fc=BLUE if c in val else LIGHT, ec="none")
            )
    ax.set(xlim=(-0.2, N), ylim=(-len(rows) - 0.4, 0.9), aspect="equal")
    ax.set_title(title, fontsize=11, color=INK)
    for c in range(N):
        ax.text(c + 0.45, 0.35, str(c + 1), ha="center", fontsize=8, color=INK)
    ax.axis("off")
# legend
axes[1].add_patch(Rectangle((0, -7.0), 0.9, 0.8, fc=BLUE, ec="none", clip_on=False))
axes[1].text(1.2, -6.75, "validation", fontsize=9, color=INK, va="center")
axes[1].add_patch(Rectangle((5, -7.0), 0.9, 0.8, fc=LIGHT, ec="none", clip_on=False))
axes[1].text(6.2, -6.75, "training", fontsize=9, color=INK, va="center")
save(fig, __file__)
