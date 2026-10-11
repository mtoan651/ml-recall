"""Vectors a, b, c from a common origin: a is long, b and c are short with a small angle between
them (redrawn from Google's Clustering course). Chosen so that cos(b, c) > cos(a, b),
|b - c| < |a - b|, but a·b > b·c.
"""

import matplotlib.pyplot as plt
import numpy as np
from matplotlib.patches import Arc

from mlrecall.figstyle import GREEN, INK, ORANGE, RED, save

a, b, c = np.array([-0.15, 6.0]), np.array([1.26, 2.24]), np.array([1.96, 2.45])
cos = lambda u, v: u @ v / np.linalg.norm(u) / np.linalg.norm(v)  # noqa: E731
assert cos(b, c) > cos(a, b) and np.linalg.norm(b - c) < np.linalg.norm(a - b) and a @ b > b @ c

fig, ax = plt.subplots(figsize=(3.6, 5.2))
for vec, name, color, marker, dx in [
    (a, "a", RED, "o", -0.35),
    (b, "b", ORANGE, "s", -0.35),
    (c, "c", GREEN, "^", 0.35),
]:
    ax.annotate("", vec, (0, 0), arrowprops={"arrowstyle": "-", "color": INK, "lw": 1.6})
    ax.plot(*vec, marker, color=color, markersize=13, zorder=3)
    ax.text(vec[0] + dx, vec[1] + 0.1, name, fontsize=16, color=INK,
            ha="right" if dx < 0 else "left", va="center")  # fmt: skip


def angle(v):
    return np.degrees(np.arctan2(v[1], v[0]))


def arc_label(r, degrees, text):
    rad = np.radians(degrees)
    ax.text(r * np.cos(rad), r * np.sin(rad), text, fontsize=13, ha="center", va="center")


ax.add_patch(Arc((0, 0), 2.4, 2.4, theta1=angle(b), theta2=angle(a), color=INK, lw=1.3))
ax.add_patch(Arc((0, 0), 1.6, 1.6, theta1=angle(c), theta2=angle(b), color=INK, lw=1.3))
arc_label(1.55, (angle(a) + angle(b)) / 2, r"$\theta_{ab}$")
arc_label(1.05, angle(c) - 16, r"$\theta_{bc}$")  # outside the narrow angle, below c
ax.set(xlim=(-1.2, 3.0), ylim=(-0.3, 6.6), aspect="equal")
ax.axis("off")
save(fig, __file__)
