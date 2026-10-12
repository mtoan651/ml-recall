"""Two boxes on a pixel grid (image coordinates, y down): A = (0, 0, 6, 4), B = (2, 1, 8, 5)."""

import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

from mlrecall.figstyle import BLUE, INK, ORANGE, save

BOXES = [
    ("A", (0, 0, 6, 4), BLUE, "-", (0.25, 0.3), "left", "top"),
    ("B", (2, 1, 8, 5), ORANGE, "--", (7.75, 4.7), "right", "bottom"),
]

fig, ax = plt.subplots(figsize=(5.2, 3.6))
for name, (x1, y1, x2, y2), color, style, label_xy, ha, va in BOXES:
    w, h = x2 - x1, y2 - y1
    ax.add_patch(Rectangle((x1, y1), w, h, fc=color, alpha=0.15, lw=0, zorder=2))
    ax.add_patch(Rectangle((x1, y1), w, h, fill=False, ec=color, lw=2.4, ls=style, zorder=3))
    ax.text(*label_xy, name, color=color, fontsize=15, fontweight="bold", ha=ha, va=va)
ax.set_xlim(-0.5, 9)
ax.set_ylim(6, -0.5)  # image coordinates: y grows downwards
ax.set_xticks(range(0, 10))
ax.set_yticks(range(0, 7))
ax.set_aspect("equal")
ax.set_axisbelow(True)
ax.grid(True)
ax.set_xlabel("x (pixels)")
ax.set_ylabel("y (pixels)")
ax.xaxis.set_label_position("top")
ax.xaxis.tick_top()
ax.spines["top"].set_visible(True)
ax.spines["bottom"].set_visible(False)
ax.tick_params(colors=INK)
save(fig, __file__)
