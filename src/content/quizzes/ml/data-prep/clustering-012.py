"""A right-skewed distribution, not a clean power law (redrawn from Google's Clustering course)."""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, histogram_from_density, save

edges = np.arange(0, 35.1, 0.75)
fig, ax = plt.subplots(figsize=(4.4, 3.2))
histogram_from_density(ax, edges, lambda c: c**1.3 * np.exp(-c / 2.6), 4000, BLUE)
ax.set(xlabel="Feature value", ylabel="Count", yticklabels=[])
save(fig, __file__)
