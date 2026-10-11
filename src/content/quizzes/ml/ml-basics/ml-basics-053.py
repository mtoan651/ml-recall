"""Training loss keeps falling while test loss turns up (redrawn from Google MLCC, Figure 23)."""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, RED, save, schematic_axes

steps = np.linspace(0.02, 1, 400)
train = 0.08 + 0.75 * np.exp(-steps / 0.16) + 0.1 * (1 - steps)
test = 0.24 + 0.68 * np.exp(-steps / 0.15) + 0.22 * np.maximum(steps - 0.45, 0) ** 1.4
fig, ax = plt.subplots(figsize=(5, 3))
ax.plot(steps, train, color=BLUE)
ax.plot(steps, test, color=RED)
ax.text(1.03, train[-1], "Training", color=BLUE, va="center", fontsize=11)
ax.text(1.03, test[-1], "Test", color=RED, va="center", fontsize=11)
ax.set_xlim(-0.05, 1.0)
ax.set_ylim(0, 1)
schematic_axes(ax)
save(fig, __file__)
