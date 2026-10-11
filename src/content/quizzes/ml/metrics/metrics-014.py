"""Four ROC curves, one per option (AUC 0.77, 0.508, 0.623, 0.31), redrawn from Google MLCC."""

import sys
from pathlib import Path

import matplotlib.pyplot as plt

sys.path.insert(0, str(Path(__file__).parent))
from roc_shapes import BAD, GOOD, NEAR_CHANCE, STAIRS, xy  # noqa: E402

from mlrecall.figstyle import BLUE, GREEN, ORANGE, RED, plot_roc, roc_with_auc, save  # noqa: E402

OPTIONS = [  # option index → (shape, AUC, colour, line style)
    (GOOD, 0.77, GREEN, "--"),
    (NEAR_CHANCE, 0.508, BLUE, "-."),
    (STAIRS, 0.623, RED, ":"),
    (BAD, 0.31, ORANGE, "-"),
]
for letter, (shape, target, color, style) in zip("abcd", OPTIONS, strict=True):
    fpr, tpr = xy(shape)
    fig, ax = plt.subplots(figsize=(3.4, 3.4))
    label_xy = (0.74, 0.1) if target < 0.5 else (0.6, 0.2)
    plot_roc(ax, fpr, roc_with_auc(fpr, tpr, target), color, style, label_xy=label_xy)
    save(fig, __file__, f"-{letter}")
