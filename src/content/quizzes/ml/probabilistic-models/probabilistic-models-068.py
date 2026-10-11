"""A DAG G and a proposed moral graph. Redrawn from the TikZ source of Gutmann, Pen and Paper
Exercises in Machine Learning (CC BY 4.0), Ex. 5.6.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, Rectangle

from mlrecall.figstyle import INK, LIGHT, save

R = 0.3  # node radius (data units)
PANELS = [
    {
        "title": "DAG G",
        "nodes": {
            "y": (0, 0, "$y$"),
            "z1": (-1.75, 1.5, "$z_1$"),
            "z2": (1.75, 1.5, "$z_2$"),
            "x1": (-3, 3, "$x_1$"),
            "x2": (-1.75, 3, "$x_2$"),
            "x3": (-0.5, 3, "$x_3$"),
            "x4": (0.5, 3, "$x_4$"),
            "x5": (1.75, 3, "$x_5$"),
            "x6": (3, 3, "$x_6$"),
        },
        "top": 0.9,
        "edges": [
            ("z1", "y", "d", 0.0),
            ("z2", "y", "d", 0.0),
            ("x1", "z1", "d", 0.0),
            ("x2", "z1", "d", 0.0),
            ("x3", "z1", "d", 0.0),
            ("x4", "z2", "d", 0.0),
            ("x5", "z2", "d", 0.0),
            ("x6", "z2", "d", 0.0),
        ],
    },
    {
        "title": "Proposed moral graph",
        "nodes": {
            "y": (0, 0, "$y$"),
            "z1": (-1.75, 1.5, "$z_1$"),
            "z2": (1.75, 1.5, "$z_2$"),
            "x1": (-3, 3, "$x_1$"),
            "x2": (-1.75, 3, "$x_2$"),
            "x3": (-0.5, 3, "$x_3$"),
            "x4": (0.5, 3, "$x_4$"),
            "x5": (1.75, 3, "$x_5$"),
            "x6": (3, 3, "$x_6$"),
        },
        "top": 0.9,
        "edges": [
            ("z1", "y", "u", 0.0),
            ("z2", "y", "u", 0.0),
            ("x1", "z1", "u", 0.0),
            ("x2", "z1", "u", 0.0),
            ("x3", "z1", "u", 0.0),
            ("x4", "z2", "u", 0.0),
            ("x5", "z2", "u", 0.0),
            ("x6", "z2", "u", 0.0),
            ("x1", "x2", "u", 0.0),
            ("x2", "x3", "u", 0.0),
            ("x4", "x5", "u", 0.0),
            ("x5", "x6", "u", 0.0),
            ("z1", "z2", "u", 0.0),
            ("x1", "x6", "u", -0.25),
        ],
    },
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


fig, axes = plt.subplots(1, len(PANELS), figsize=(10.0, 3.4), squeeze=False)
for ax, panel in zip(axes[0], PANELS, strict=False):
    draw(ax, panel)
    xs = [x for x, y, _ in panel["nodes"].values()] + [
        x for x, y, *_ in panel.get("factors", {}).values()
    ]
    ys = [y for x, y, _ in panel["nodes"].values()] + [
        y for x, y, *_ in panel.get("factors", {}).values()
    ]
    pad = 0.45
    bottom = 0.75 if panel.get("title") else 0
    ax.set_xlim(min(xs) - pad, max(xs) + pad)
    ax.set_ylim(min(ys) - pad - bottom, max(ys) + pad + panel.get("top", 0))
save(fig, __file__)
