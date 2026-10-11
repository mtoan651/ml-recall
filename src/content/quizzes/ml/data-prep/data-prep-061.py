"""Overlapping histograms of one feature for two classes; redrawn with synthetic data after the
danceability histogram in UBC CPSC 330 (2025W1) midterm prep, Q4 (CC BY 4.0)."""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, ORANGE, save

edges = np.linspace(0.1, 1.0, 37)
centers = (edges[:-1] + edges[1:]) / 2


def density(x, mean, sd):
    return np.exp(-0.5 * ((x - mean) / sd) ** 2)


# Noise-free bar heights (normalized to a density), so the figure is deterministic.
wiggle = 0.12 * np.sin(23 * centers)
d0 = density(centers, 0.58, 0.14) * (1 + wiggle)
d1 = density(centers, 0.68, 0.15) * (1 - wiggle)
width = np.diff(edges)
d0 = d0 / (d0 * width).sum()
d1 = d1 / (d1 * width).sum()

# The class distributions overlap heavily but are not identical (the means differ by 0.1).
assert abs((centers * d0 * width).sum() - (centers * d1 * width).sum()) > 0.05
assert (np.minimum(d0, d1) * width).sum() > 0.6  # more than 60% overlap

fig, ax = plt.subplots(figsize=(5.2, 3.4))
ax.bar(centers, d0, width=width, color=BLUE, alpha=0.5, label="0 (not liked)", zorder=2)
ax.bar(centers, d1, width=width, color=ORANGE, alpha=0.5, label="1 (liked)", zorder=2)
ax.set(xlabel="danceability", ylabel="density", title="Histogram of danceability by class")
ax.set_xlim(0.1, 1.0)
ax.grid(True, axis="y", zorder=0)
ax.legend(title="target", loc="upper left")
save(fig, __file__)
