"""Negative and positive predictions as circles coloured by group, with pairs A, B, C labelled.

Redrawn from Google MLCC (Fairness: counterfactual fairness, exercise figure). Pair A: majority
and minority example both predicted negative; pair B: both predicted positive; pair C: two
majority examples, one negative and one positive.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle

from mlrecall.figstyle import BLUE, INK, ORANGE, save

GRAY = "#cfd2d6"
NEGATIVE = {  # (row, col) 1-based in a 5 × 10 grid → (colour, label)
    (1, 1): (BLUE, ""), (1, 8): (BLUE, ""), (1, 10): (ORANGE, "A"), (2, 5): (BLUE, ""),
    (3, 2): (ORANGE, ""), (3, 7): (BLUE, "A"), (3, 9): (ORANGE, ""), (4, 4): (BLUE, "C"),
    (4, 10): (BLUE, ""), (5, 3): (BLUE, ""), (5, 7): (BLUE, ""),
}  # fmt: skip
POSITIVE = {  # 3 × 5 grid
    (1, 4): (BLUE, "C"), (2, 2): (ORANGE, "B"), (3, 1): (BLUE, ""), (3, 3): (BLUE, "B"),
    (3, 5): (ORANGE, ""),
}  # fmt: skip


def grid(ax, x0, rows, cols, marked):
    for r in range(1, rows + 1):
        for c in range(1, cols + 1):
            color, label = marked.get((r, c), (GRAY, ""))
            x, y = x0 + (c - 1) * 1.1, -(r - 1) * 1.1
            ax.add_patch(Circle((x, y), 0.48, fc=color, ec="#80868b", lw=0.8))
            if label:
                ax.text(x, y, label, ha="center", va="center", fontsize=15, fontweight="bold",
                        color=INK)  # fmt: skip


fig, ax = plt.subplots(figsize=(11, 4.2))
grid(ax, 0, 5, 10, NEGATIVE)
grid(ax, 13.2, 3, 5, POSITIVE)
ax.text(4.95, 1.1, "Negative predictions", ha="center", fontsize=15, fontweight="bold")
ax.text(15.4, 1.1, "Positive predictions", ha="center", fontsize=15, fontweight="bold")
ax.add_patch(Rectangle((12.9, -5.0), 5.4, 2.2, fc="white", ec="#80868b", lw=0.8))
for i, (color, name) in enumerate(
    [(BLUE, "Majority group"), (ORANGE, "Minority group"), (GRAY, "Group membership unknown")]
):
    y = -3.25 - i * 0.6
    ax.add_patch(Rectangle((13.15, y - 0.2), 0.4, 0.4, fc=color, ec="#80868b", lw=0.8))
    ax.text(13.75, y, name, va="center", fontsize=10.5)
ax.set(xlim=(-0.7, 18.6), ylim=(-5.2, 1.7), aspect="equal")
ax.axis("off")
save(fig, __file__)
