"""Five predicted boxes A-E with confidence scores, for a step-by-step NMS question.

Boxes (x1, y1, x2, y2): A (0, 0, 40, 40) 0.90, B (8, 2, 48, 42) 0.80, C (16, 4, 56, 44) 0.70,
D (64, 56, 104, 96) 0.65, E (66, 54, 106, 94) 0.60. Image coordinates, y grows downwards.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

from mlrecall.figstyle import BLUE, GREEN, ORANGE, PURPLE, RED, save

BOXES = [
    ("A", (0, 0, 40, 40), 0.90, BLUE, "-", (1, -1.5), "left"),
    ("B", (8, 2, 48, 42), 0.80, ORANGE, "--", (24, -1.5), "left"),
    ("C", (16, 4, 56, 44), 0.70, GREEN, "-.", (55, 47), "right"),
    ("D", (64, 56, 104, 96), 0.65, PURPLE, "-", (65, 99), "left"),
    ("E", (66, 54, 106, 94), 0.60, RED, "--", (105, 51.5), "right"),
]

fig, ax = plt.subplots(figsize=(6.0, 5.2))
for name, (x1, y1, x2, y2), score, color, style, (tx, ty), ha in BOXES:
    w, h = x2 - x1, y2 - y1
    ax.add_patch(Rectangle((x1, y1), w, h, fill=False, ec=color, lw=2.2, ls=style, zorder=3))
    label = f"{name} ({score:.2f})"
    ax.text(tx, ty, label, color=color, fontsize=11, fontweight="bold", ha=ha, va="center")
ax.set_xlim(-6, 112)
ax.set_ylim(104, -6)  # image coordinates: y grows downwards
ax.set_xticks(range(0, 111, 10))
ax.set_yticks(range(0, 101, 10))
ax.set_aspect("equal")
ax.set_axisbelow(True)
ax.grid(True)
ax.xaxis.tick_top()
ax.spines["top"].set_visible(True)
ax.spines["bottom"].set_visible(False)
save(fig, __file__)
