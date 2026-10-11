"""Median home value per 0.2° of latitude in "Freedonia" (redrawn from Google MLCC, Fig. 11)."""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, save

latitude = np.round(np.arange(41.0, 44.81, 0.2), 1)
value = [350, 327, 378, 382, 386, 488, 692, 712, 653, 411,
         407, 429, 432, 521, 619, 712, 653, 558, 509, 572]  # fmt: skip
fig, ax = plt.subplots(figsize=(5.6, 3.6))
ax.scatter(latitude, value, color=BLUE, s=34, zorder=3)
ax.set(xlabel="latitude", ylabel="median house value", xticks=np.arange(41, 45.01, 0.5))
ax.grid(True, zorder=0)
save(fig, __file__)
