"""Fourteen-node DAG made of two linked blocks. Redrawn from the TikZ source of Gutmann, Pen and
Paper Exercises in Machine Learning (CC BY 4.0), Ex. 3.11.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, Rectangle

from mlrecall.figstyle import INK, LIGHT, save

R = 0.34  # node radius (data units)
PANELS = [
    {
        "nodes": {
            "m1": (0, 0, "$m_1$"),
            "s1": (2, 0, "$s_1$"),
            "u1": (0, -1.5, "$u_1$"),
            "v1": (2, -1.5, "$v_1$"),
            "x1": (0, -3, "$x_1$"),
            "y1": (2, -3, "$y_1$"),
            "t1": (1, -4, "$\\theta_1$"),
            "m2": (4, 0, "$m_2$"),
            "s2": (6, 0, "$s_2$"),
            "u2": (4, -1.5, "$u_2$"),
            "v2": (6, -1.5, "$v_2$"),
            "x2": (4, -3, "$x_2$"),
            "y2": (6, -3, "$y_2$"),
            "t2": (5, -4, "$\\theta_2$"),
        },
        "edges": [
            ("m1", "u1", "d", 0.0),
            ("m1", "v1", "d", 0.0),
            ("s1", "u1", "d", 0.0),
            ("s1", "v1", "d", 0.0),
            ("u1", "x1", "d", 0.0),
            ("v1", "y1", "d", 0.0),
            ("t1", "x1", "d", 0.0),
            ("t1", "y1", "d", 0.0),
            ("m2", "u2", "d", 0.0),
            ("m2", "v2", "d", 0.0),
            ("s2", "u2", "d", 0.0),
            ("s2", "v2", "d", 0.0),
            ("u2", "x2", "d", 0.0),
            ("v2", "y2", "d", 0.0),
            ("t2", "x2", "d", 0.0),
            ("t2", "y2", "d", 0.0),
            ("t1", "t2", "d", 0.0),
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


fig, axes = plt.subplots(1, len(PANELS), figsize=(5.0, 3.6), squeeze=False)
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
