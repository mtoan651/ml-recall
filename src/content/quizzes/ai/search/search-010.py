"""Directed search graph with link costs. Redrawn from MIT OCW 6.034 (Spring 2005), Quiz 1
solutions, Problem 5 "Search traces" (CC BY-NC-SA 4.0)."""

from mlrecall.figstyle import INK, graph_figure, save

NODES = {
    "A": (2, 4, "A"),
    "B": (0, 2.6, "B"),
    "D": (4, 2.6, "D"),
    "C": (2, 1.6, "C"),
    "G": (2, 0, "G"),
}
EDGES = [  # (from, to, cost, rad, label offset along/perp)
    ("A", "B", 1, 0.25),
    ("B", "A", 2, 0.25),
    ("A", "D", 3, 0.0),
    ("B", "D", 4, 0.0),
    ("B", "C", 5, 0.0),
    ("B", "G", 6, 0.0),
    ("D", "C", 1, 0.0),
    ("C", "G", 1, 0.0),
    ("D", "G", 3, 0.0),
]
LABEL_POS = {
    ("A", "B"): (0.75, 3.7),
    ("B", "A"): (1.25, 2.9),
    ("A", "D"): (3.15, 3.45),
    ("B", "D"): (2.0, 2.85),
    ("B", "C"): (1.05, 2.25),
    ("B", "G"): (0.85, 1.1),
    ("D", "C"): (3.05, 2.25),
    ("C", "G"): (2.2, 0.8),
    ("D", "G"): (3.15, 1.1),
}
panel = {"nodes": NODES, "edges": [(a, b, "d", r) for a, b, _, r in EDGES]}
fig = graph_figure([panel], figsize=(4.2, 4.0), node_radius=0.32)
ax = fig.axes[0]
for a, b, c, _ in EDGES:
    x, y = LABEL_POS[(a, b)]
    ax.text(
        x,
        y,
        str(c),
        ha="center",
        va="center",
        fontsize=12,
        color=INK,
        bbox={"fc": "white", "ec": "none", "pad": 1},
    )
save(fig, __file__)
