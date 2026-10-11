"""Loss that decreases, then suddenly explodes (redrawn from Google MLCC, Figure 22)."""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, save, schematic_axes

steps = np.linspace(0, 1, 800)
smooth = 0.12 + 0.6 * np.exp(-steps / 0.18)
jump = 1 / (1 + np.exp(-(steps - 0.62) * 120))  # near-instant rise at step ≈ 0.62
noisy_top = 0.82 + 0.07 * np.sin(2 * np.pi * 14 * steps) + 0.04 * np.sin(2 * np.pi * 31 * steps)
loss = (1 - jump) * smooth + jump * noisy_top
fig, ax = plt.subplots(figsize=(5, 3))
ax.plot(steps[steps < 0.85], loss[steps < 0.85], color=BLUE)
ax.set_xlim(-0.05, 1.05)
ax.set_ylim(0, 1)
schematic_axes(ax)
save(fig, __file__)
