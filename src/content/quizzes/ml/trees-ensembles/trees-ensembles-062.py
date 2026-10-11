"""Cyclic cosine learning-rate schedule of a snapshot ensemble with four marked points.

Drawn for ml-recall after the schedule in Deep Learning Interviews (arXiv 2201.00650v2), Ch. 6,
PRB-156, Fig. 6.10, using Eq. (2) of Huang et al. (2017), Snapshot Ensembles: alpha_0 = 0.1,
T = 200 epochs, M = 4 cycles of 50 epochs. Not copied from the book.
"""

import math

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, INK, save

A0, T, M = 0.1, 200, 4
L = math.ceil(T / M)


def lr(t: float) -> float:
    return A0 / 2 * (math.cos(math.pi * ((t - 1) % L) / L) + 1)


fig, ax = plt.subplots(figsize=(6.0, 2.8))
for k in range(M):  # one smooth cosine arc per cycle, dotted jumps at the restarts
    ts = np.linspace(k * L + 1, (k + 1) * L, 200)
    ax.plot(ts, [lr(t) for t in ts], color=BLUE)
    if k:
        ax.plot([k * L, k * L + 1], [lr(k * L), A0], color=BLUE, lw=1.2, ls=":")
points = {"A": 1, "B": 26, "C": 50, "D": 51}
for name, t in points.items():
    y = lr(t)
    ax.plot(t, y, "o", color=INK, markersize=5, zorder=3)
    dx, dy = {"A": (4, 0.004), "B": (3, 0.006), "C": (-4, -0.012), "D": (4, 0.004)}[name]
    ax.text(t + dx, y + dy, name, fontsize=11, color=INK, fontweight="bold")
assert abs(lr(26) - 0.05) < 1e-12 and lr(50) < 1e-3 and lr(51) == A0
ax.set(xlabel="epoch", ylabel="learning rate", xlim=(0, T + 2), ylim=(-0.015, 0.115))
ax.set_xticks([0, 50, 100, 150, 200])
ax.set_yticks([0, 0.05, 0.1])
ax.grid(True, zorder=0)
save(fig, __file__)
