"""A fully connected network: 3 inputs, a hidden layer of 4 neurons, 1 output (Google MLCC)."""

import matplotlib.pyplot as plt
from matplotlib.patches import Circle

from mlrecall.figstyle import BLUE, GREEN, INK, LIGHT, ORANGE, save

layers = [  # (x, labels, colour)
    (0.0, ["$x_1$", "$x_2$", "$x_3$"], ORANGE),
    (2.4, ["", "", "", ""], BLUE),
    (4.8, ["output"], GREEN),
]
ys = {i: [(n - 1) / 2 - k for k in range(n)] for i, (_, labels, _) in enumerate(layers)
      for n in [len(labels)]}  # fmt: skip

fig, ax = plt.subplots(figsize=(5.4, 3.6))
for i in range(len(layers) - 1):
    for y0 in ys[i]:
        for y1 in ys[i + 1]:
            ax.plot([layers[i][0], layers[i + 1][0]], [y0, y1], color="#b0b5ba", lw=1, zorder=1)
for i, (x, labels, color) in enumerate(layers):
    for y, label in zip(ys[i], labels, strict=True):
        ax.add_patch(Circle((x, y), 0.3, fc=color, ec="white", lw=1.5, zorder=2))
        if label:
            ax.text(x - 0.45 if i == 0 else x + 0.42, y, label, va="center",
                    ha="right" if i == 0 else "left", fontsize=12, color=INK)  # fmt: skip
for x, name in [(0.0, "Input layer"), (2.4, "Hidden layer"), (4.8, "Output layer")]:
    ax.text(x, -2.35, name, ha="center", fontsize=10.5, color=INK,
            bbox={"boxstyle": "round,pad=0.25", "fc": LIGHT, "ec": "none"})  # fmt: skip
ax.set(xlim=(-1.1, 6.3), ylim=(-2.7, 2.0), aspect="equal")
ax.axis("off")
save(fig, __file__)
