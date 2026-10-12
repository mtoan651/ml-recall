"""Three scatterplots, each with one unusual point and the least-squares line fitted to all points.

Redrawn after OpenIntro Statistics (4th ed.), Exercise 8.27 "Outliers, Part I" (CC BY-SA 3.0),
with synthetic data. Panel A: a point far to the right and far above the trend of the others (the
line is pulled toward it). Panel B: a point far to the right that lies on the trend. Panel C: a
point in the middle of the x range, far above the others.
"""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, INK, RED, save

rng = np.random.default_rng(8)
x = rng.uniform(0, 3, 30)
y = 9 - 2 * x + rng.normal(0, 0.45, 30)


def fit(xs, ys):
    slope, intercept = np.polyfit(xs, ys, 1)
    return slope, intercept


bulk_slope, _ = fit(x, y)
special = {"A": (10.0, 4.0), "B": (10.0, 9 - 2 * 10.0), "C": (1.5, 13.0)}
slopes = {k: fit(np.append(x, px), np.append(y, py))[0] for k, (px, py) in special.items()}
# A: the point drags the slope far from the bulk's; B and C barely move it.
assert abs(slopes["A"] - bulk_slope) > 1.0
assert abs(slopes["B"] - bulk_slope) < 0.1
assert abs(slopes["C"] - bulk_slope) < 0.1

fig, axes = plt.subplots(1, 3, figsize=(10.5, 3.3))
for ax, (name, (px, py)) in zip(axes, special.items(), strict=True):
    xs = np.append(x, px)
    ys = np.append(y, py)
    slope, intercept = fit(xs, ys)
    grid = np.linspace(-0.5, 10.5, 2)
    ax.plot(grid, intercept + slope * grid, color=BLUE, zorder=2)
    ax.scatter(x, y, color=INK, s=14, zorder=3)
    ax.scatter([px], [py], color=RED, s=40, zorder=4)
    ax.set(xlim=(-0.5, 10.5), ylim=(-13, 14), title=name, xlabel="x", ylabel="y")
    ax.grid(True, zorder=0)
fig.tight_layout()
save(fig, __file__)
