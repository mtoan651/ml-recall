"""Derivative of the log partition function, f(theta) = d log Z / d theta = E_theta[x1 x2], for the
two-variable Ising model p(x1, x2) ~ exp(theta x1 x2 + x1 + x2), x_i in {-1, 1}. Redrawn from the
figure "Ising-MLE" in Gutmann, Pen and Paper Exercises in Machine Learning, Ex. 8.12 (CC BY 4.0).
The curve crosses -1/3 at theta = -1.009 (asserted)."""

import matplotlib.pyplot as plt
import numpy as np

from mlrecall.figstyle import BLUE, save


def f(t):
    a, b, c = 2 * np.exp(-t), np.exp(t + 2), np.exp(t - 2)
    return (-a + b + c) / (a + b + c)


t = np.linspace(-4, 2, 601)
grid = np.linspace(-1.2, -0.8, 40001)
root = grid[np.argmin(np.abs(f(grid) + 1 / 3))]
assert abs(root + 1.009) < 0.002, root

fig, ax = plt.subplots(figsize=(5.2, 3.4))
ax.plot(t, f(t), color=BLUE)
ax.set_xticks(np.arange(-4, 2.01, 1.0))
ax.set_xticks(np.arange(-4, 2.01, 0.25), minor=True)
ax.set_yticks([-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1])
ax.set_yticklabels(["−1", "−2/3", "−1/3", "0", "1/3", "2/3", "1"])
ax.set_xlim(-4, 2)
ax.set_ylim(-1.05, 1.05)
ax.grid(True, which="both")
ax.set_xlabel(r"$\theta$")
ax.set_ylabel(r"$f(\theta) = \partial \log Z(\theta) / \partial \theta$")
save(fig, __file__)
