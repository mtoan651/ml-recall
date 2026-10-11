"""Two linear models with the same line, fitted to two point sets (redrawn from Google MLCC).

Left: 6 of 10 points on the line, 4 points 1 unit off (MSE 0.4).
Right: 8 of 10 points on the line, 2 points 2 units off (MSE 0.8).
"""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, RED, save

x = np.arange(1, 11)
line = 2 + 0.5 * x
left = line + np.array([0, 1, 0, -1, 0, -1, 0, 1, 0, 0])
right = line + np.array([0, 0, 0, 2, 0, 0, 0, -2, 0, 0])
assert np.mean((left - line) ** 2) == 0.4 and np.mean((right - line) ** 2) == 0.8

fig, axes = plt.subplots(1, 2, figsize=(8.4, 3.4), sharey=True)
for ax, y, title in zip(axes, [left, right], ["Left model", "Right model"], strict=True):
    xs = np.linspace(0, 11, 2)
    ax.plot(xs, 2 + 0.5 * xs, color=BLUE, zorder=2)
    ax.scatter(x, y, color=RED, s=36, zorder=3)
    ax.set(xlim=(0, 11), ylim=(1, 8), xticks=range(0, 11, 2), title=title)
    ax.grid(True, zorder=0)
save(fig, __file__)
