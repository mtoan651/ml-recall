"""Loss that converges, then shows repeating jagged bumps (redrawn from Google MLCC, Figure 24)."""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, save, schematic_axes

steps = np.linspace(0, 1, 900)
base = 0.2 + 0.55 * np.exp(-steps / 0.1)
# The same burst pattern repeats every 0.2 steps once training has converged.
period = 0.2
phase = (steps % period) / period
burst = np.where(phase < 0.7, np.sin(np.pi * phase / 0.7), 0.0)
wiggle = 0.55 + 0.45 * np.sin(2 * np.pi * 7 * phase) * np.cos(2 * np.pi * 3 * phase)
loss = base + (steps > 0.28) * 0.15 * burst * wiggle
fig, ax = plt.subplots(figsize=(5, 3))
ax.plot(steps, loss, color=BLUE)
ax.set_xlim(-0.05, 1.05)
ax.set_ylim(0, 1)
schematic_axes(ax)
save(fig, __file__)
