"""Loss curve that oscillates and never flattens out (redrawn from Google MLCC, Figure 21)."""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, save, schematic_axes

steps = np.linspace(0, 1, 600)
loss = (
    0.55
    + 0.24 * np.sin(2 * np.pi * (5.5 * steps + 1.6 * steps**2))
    + 0.06 * np.sin(2 * np.pi * 17 * steps)
    - 0.08 * steps
)
fig, ax = plt.subplots(figsize=(5, 3))
ax.plot(steps, loss, color=BLUE)
ax.set_xlim(-0.05, 1.05)
ax.set_ylim(0, 1)
schematic_axes(ax)
save(fig, __file__)
