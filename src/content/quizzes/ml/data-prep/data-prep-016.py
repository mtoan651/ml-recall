"""Histogram of a roughly bell-shaped feature between 0 and 200,000 (redrawn from Google MLCC)."""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, histogram_from_density, save

edges = np.arange(-20_000, 240_001, 12_500)
fig, ax = plt.subplots(figsize=(4.6, 3.4))
histogram_from_density(ax, edges, lambda c: np.exp(-0.5 * ((c - 95_000) / 40_000) ** 2), 500, BLUE)
ax.set(xlabel="Feature value", ylabel="Number of instances", xticks=[0, 100_000, 200_000])
ax.ticklabel_format(axis="x", style="plain")
save(fig, __file__)
