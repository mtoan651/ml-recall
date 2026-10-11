"""Four ROC curves, one per option (AUC 0.32, 0.508, 0.5, 1.0), redrawn from Google MLCC."""

import sys
from pathlib import Path

import matplotlib.pyplot as plt

sys.path.insert(0, str(Path(__file__).parent))
from roc_shapes import BAD, CHANCE, NEAR_CHANCE, PERFECT, xy  # noqa: E402

from mlrecall.figstyle import BLUE, GRAY, PURPLE, TEAL, plot_roc, roc_with_auc, save  # noqa: E402

OPTIONS = [  # option index → (shape, AUC or None to keep the shape, colour, line style)
    (BAD, 0.32, PURPLE, "-"),
    (NEAR_CHANCE, 0.508, BLUE, "-."),
    (CHANCE, None, GRAY, "--"),
    (PERFECT, None, TEAL, "-"),
]
for letter, (shape, target, color, style) in zip("abcd", OPTIONS, strict=True):
    fpr, tpr = xy(shape)
    if target is not None:
        tpr = roc_with_auc(fpr, tpr, target)
    fig, ax = plt.subplots(figsize=(3.4, 3.4))
    label_xy = (0.74, 0.1) if target is not None and target < 0.5 else (0.6, 0.2)
    plot_roc(ax, fpr, tpr, color, style, label_xy=label_xy)
    save(fig, __file__, f"-{letter}")
