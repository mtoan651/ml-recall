"""ROC curve (AUC 0.84) with three labelled thresholds A, B, C, redrawn from Google MLCC."""

import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from roc_shapes import xy  # noqa: E402

from mlrecall.figstyle import PURPLE, plot_roc, roc_with_auc, save  # noqa: E402

SHAPE = [
    (0, 0), (0.02, 0.25), (0.12, 0.55), (0.2, 0.72), (0.27, 0.86), (0.32, 0.9),
    (0.39, 0.93), (0.6, 0.95), (0.9, 0.97), (1, 1),
]  # fmt: skip
fpr, tpr = xy(SHAPE)
tpr = roc_with_auc(fpr, tpr, 0.84)
fig, ax = plt.subplots(figsize=(4.2, 4.2))
plot_roc(ax, fpr, tpr, PURPLE, "-.")
for name, x in [("A", 0.2), ("B", 0.27), ("C", 0.39)]:
    y = float(np.interp(x, fpr, tpr))
    ax.plot(x, y, "o", color=PURPLE, markersize=11, markeredgecolor="white", mew=1.5, zorder=5)
    ax.annotate(name, (x, y), xytext=(-14, 6), textcoords="offset points", fontsize=13,
                color=PURPLE, fontweight="bold", ha="right")  # fmt: skip
save(fig, __file__)
