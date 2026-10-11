"""A DAG with x3->x2 reversed and an undirected chain HMM. Redrawn from the TikZ source of Gutmann, Pen and Paper Exercises in Machine Learning (CC BY 4.0), Ex. 5.3 (c)."""

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, Rectangle

from mlrecall.figstyle import INK, LIGHT, save

R = 0.28  # node radius (data units)
PANELS = [{'title': 'Directed',
  'nodes': {'x1': (0, 2, '$x_1$'),
            'x2': (2, 2, '$x_2$'),
            'x3': (4, 2, '$x_3$'),
            'x4': (6, 2, '$x_4$'),
            'y1': (0, 0, '$y_1$'),
            'y2': (2, 0, '$y_2$'),
            'y3': (4, 0, '$y_3$'),
            'y4': (6, 0, '$y_4$')},
  'edges': [('x1', 'x2', 'd', 0.0),
            ('x3', 'x2', 'd', 0.0),
            ('x3', 'x4', 'd', 0.0),
            ('x1', 'y1', 'd', 0.0),
            ('x2', 'y2', 'd', 0.0),
            ('x3', 'y3', 'd', 0.0),
            ('x4', 'y4', 'd', 0.0)]},
 {'title': 'Undirected',
  'nodes': {'x1': (0, 2, '$x_1$'),
            'x2': (2, 2, '$x_2$'),
            'x3': (4, 2, '$x_3$'),
            'x4': (6, 2, '$x_4$'),
            'y1': (0, 0, '$y_1$'),
            'y2': (2, 0, '$y_2$'),
            'y3': (4, 0, '$y_3$'),
            'y4': (6, 0, '$y_4$')},
  'edges': [('x1', 'x2', 'u', 0.0),
            ('x2', 'x3', 'u', 0.0),
            ('x3', 'x4', 'u', 0.0),
            ('x1', 'y1', 'u', 0.0),
            ('x2', 'y2', 'u', 0.0),
            ('x3', 'y3', 'u', 0.0),
            ('x4', 'y4', 'u', 0.0)]}]


def draw(ax, panel):
    nodes, patches = panel["nodes"], {}
    for name, (x, y, label) in nodes.items():
        shaded = name in panel.get("shaded", ())
        c = Circle((x, y), R, fc=LIGHT if shaded else "white", ec=INK, lw=1.4, zorder=3)
        ax.add_patch(c)
        patches[name] = c
        ax.text(x, y, label, ha="center", va="center", fontsize=13, color=INK, zorder=4)
    for name, (x, y, label, side) in panel.get("factors", {}).items():
        s = 0.16
        sq = Rectangle((x - s / 2, y - s / 2), s, s, fc=INK, ec=INK, zorder=3)
        ax.add_patch(sq)
        patches[name] = sq
        dx, dy, ha, va = {
            "above": (0, 0.2, "center", "bottom"),
            "below": (0, -0.2, "center", "top"),
            "left": (-0.2, 0, "right", "center"),
            "right": (0.2, 0, "left", "center"),
        }[side]
        ax.text(x + dx, y + dy, label, ha=ha, va=va, fontsize=13 - 1, color=INK)
    centers = {k: v[:2] for k, v in {**nodes, **panel.get("factors", {})}.items()}
    for a, b, kind, rad in panel["edges"]:
        ax.add_patch(
            FancyArrowPatch(
                posA=centers[a],
                posB=centers[b],
                patchA=patches[a],
                patchB=patches[b],
                arrowstyle="-|>" if kind == "d" else "-",
                mutation_scale=14,
                connectionstyle=f"arc3,rad={rad}",
                color=INK,
                lw=1.5,
                zorder=2,
            )
        )
    if panel.get("title"):
        ys = [y for x, y, _ in nodes.values()] + [y for x, y, *_ in panel.get("factors", {}).values()]
        xs = [x for x, y, _ in nodes.values()] + [x for x, y, *_ in panel.get("factors", {}).values()]
        ax.text((min(xs) + max(xs)) / 2, min(ys) - R - 0.35, panel["title"], ha="center",
                va="top", fontsize=13, color=INK, fontweight="bold")
    ax.set_aspect("equal")
    ax.axis("off")
    ax.autoscale_view()


fig, axes = plt.subplots(1, len(PANELS), figsize=(10.0, 2.6), squeeze=False)
for ax, panel in zip(axes[0], PANELS):
    draw(ax, panel)
    xs = [x for x, y, _ in panel["nodes"].values()] + [x for x, y, *_ in panel.get("factors", {}).values()]
    ys = [y for x, y, _ in panel["nodes"].values()] + [y for x, y, *_ in panel.get("factors", {}).values()]
    pad = 0.45
    bottom = 0.75 if panel.get("title") else 0
    ax.set_xlim(min(xs) - pad, max(xs) + pad)
    ax.set_ylim(min(ys) - pad - bottom, max(ys) + pad + panel.get("top", 0))
save(fig, __file__)
