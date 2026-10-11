"""A symmetric, bell-shaped distribution (redrawn from Google's Clustering course)."""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, histogram_from_density, save

edges = np.arange(-20, 20.1, 0.8)
fig, ax = plt.subplots(figsize=(4.4, 3.2))
histogram_from_density(ax, edges, lambda c: np.exp(-0.5 * (c / 5.2) ** 2), 4000, BLUE)
ax.set(xlabel="Feature value", ylabel="Count", yticklabels=[])
save(fig, __file__)
