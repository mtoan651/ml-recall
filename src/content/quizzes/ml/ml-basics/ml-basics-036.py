"""A dataset split 70/15/15 into training, validation and test sets (redrawn from Google MLCC)."""

import matplotlib.pyplot as plt

from mlrecall.figstyle import BLUE, GREEN, ORANGE, save

parts = [("Training", 0.70, BLUE), ("Validation", 0.15, ORANGE), ("Test", 0.15, GREEN)]
fig, ax = plt.subplots(figsize=(8, 1.3))
left = 0.0
for name, share, color in parts:
    ax.barh(0, share, left=left, color=color, edgecolor="white", linewidth=2, height=0.7)
    ax.text(left + share / 2, 0, f"{name}\n{share:.0%}", ha="center", va="center",
            color="white", fontsize=10.5, fontweight="bold")  # fmt: skip
    left += share
ax.set_xlim(0, 1)
ax.axis("off")
save(fig, __file__)
