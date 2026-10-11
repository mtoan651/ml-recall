"""Factor tree over five binary variables, factors phi_A..phi_F. Redrawn from the TikZ source of
Gutmann, Pen and Paper Exercises in Machine Learning (CC BY 4.0), Ex. 6.2/6.4.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, Rectangle

from mlrecall.figstyle import INK, LIGHT, save

R = 0.3  # node radius (data units)
PANELS = [
    {
        "nodes": {
            "x1": (1.5, 0, "$x_1$"),
            "x2": (3, 1, "$x_2$"),
            "x3": (4.5, 0, "$x_3$"),
            "x4": (7, 1, "$x_4$"),
            "x5": (7, -1, "$x_5$"),
        },
        "factors": {
            "A": (0, 0, "$\\phi_A$", "above"),
            "C": (3, 0, "$\\phi_C$", "below"),
            "B": (3, 2, "$\\phi_B$", "left"),
            "D": (5.5, 1, "$\\phi_D$", "above"),
            "E": (5.5, -1, "$\\phi_E$", "below"),
            "F": (8.5, -1, "$\\phi_F$", "above"),
        },
        "edges": [
            ("A", "x1", "u", 0.0),
            ("x1", "C", "u", 0.0),
            ("C", "x2", "u", 0.0),
            ("x2", "B", "u", 0.0),
            ("C", "x3", "u", 0.0),
            ("x3", "D", "u", 0.0),
            ("x3", "E", "u", 0.0),
            ("D", "x4", "u", 0.0),
            ("E", "x5", "u", 0.0),
            ("x5", "F", "u", 0.0),
        ],
    }
]


def draw(ax, panel):
    nodes, patches = panel["nodes"], {}
    for name, (x, y, label) in nodes.items():
        shaded = name in panel.get("shaded", ())
        c = Circle((x, y), R, fc=LIGHT if shaded else "white", ec=INK, lw=1.4, zorder=3)
        ax.add_patch(c)
        patches[name] = c
        ax.text(x, y, label, ha="center", va="center", fontsize=12, color=INK, zorder=4)
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
        ax.text(x + dx, y + dy, label, ha=ha, va=va, fontsize=12 - 1, color=INK)
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
        ys = [y for x, y, _ in nodes.values()] + [
            y for x, y, *_ in panel.get("factors", {}).values()
        ]
        xs = [x for x, y, _ in nodes.values()] + [
            x for x, y, *_ in panel.get("factors", {}).values()
        ]
        ax.text(
            (min(xs) + max(xs)) / 2,
            min(ys) - R - 0.35,
            panel["title"],
            ha="center",
            va="top",
            fontsize=12,
            color=INK,
            fontweight="bold",
        )
    ax.set_aspect("equal")
    ax.axis("off")
    ax.autoscale_view()


fig, axes = plt.subplots(1, len(PANELS), figsize=(5.6, 2.6), squeeze=False)
for ax, panel in zip(axes[0], PANELS, strict=False):
    draw(ax, panel)
    xs = [x for x, y, _ in panel["nodes"].values()] + [
        x for x, y, *_ in panel.get("factors", {}).values()
    ]
    ys = [y for x, y, _ in panel["nodes"].values()] + [
        y for x, y, *_ in panel.get("factors", {}).values()
    ]
    pad = 0.5
    bottom = 0.75 if panel.get("title") else 0
    ax.set_xlim(min(xs) - pad, max(xs) + pad)
    ax.set_ylim(min(ys) - pad - bottom, max(ys) + pad + panel.get("top", 0))
save(fig, __file__)
