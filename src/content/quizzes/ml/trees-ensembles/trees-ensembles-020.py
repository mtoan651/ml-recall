"""Prediction map over (x1, x2) plus three candidate decision trees, one per option.

Redrawn from Google's Decision Forests course. Map: blue square where x1 < 1; for x1 ≥ 1,
orange triangle where x2 ≥ 0.5 and green circle below.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

from mlrecall.figstyle import BLUE, GREEN, INK, ORANGE, decision_tree, save

TINT = {"blue ■": "#d6e6f4", "orange ▲": "#f9e3cc", "green ●": "#d5ebdd"}

fig, ax = plt.subplots(figsize=(4.8, 3.0))
for (x, y, w, h), color in [
    ((0, 0, 1, 1), BLUE),
    ((1, 0.5, 1, 0.5), ORANGE),
    ((1, 0, 1, 0.5), GREEN),
]:
    ax.add_patch(Rectangle((x, y), w, h, color=color, alpha=0.85, lw=0))
for x, y, marker in [(0.55, 0.52, "s"), (1.55, 0.76, "^"), (1.55, 0.27, "o")]:
    ax.plot(x, y, marker, color=INK, markersize=10)
ax.set(xlim=(0, 2), ylim=(0, 1), xlabel="$x_1$", ylabel="$x_2$")
ax.set_xticks([0, 0.5, 1.0, 1.5, 2.0])
save(fig, __file__)

TREES = {  # option index → tree (root condition, yes branch, no branch)
    "a": ("x1 ≥ 1", ("x2 ≥ 0.5", "orange ▲", "green ●"), "blue ■"),
    "b": ("x2 ≥ 0.5", ("x1 ≥ 1", "orange ▲", "green ●"), "blue ■"),
    "c": ("x1 ≥ 1", ("x2 ≥ 0.5", "green ●", "blue ■"), "orange ▲"),
}
for letter, (root, yes, no) in TREES.items():
    fig, ax = plt.subplots(figsize=(4.8, 2.9))
    decision_tree(ax, root, yes, no, leaf_style=TINT)
    save(fig, __file__, f"-{letter}")
