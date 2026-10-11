"""Undirected street graph with travel times and oracle estimates. Redrawn from MIT OCW 6.034
(Fall 2010), Quiz 1 (2009), Problem 2 Parts B-C (CC BY-NC-SA 4.0)."""

from mlrecall.figstyle import INK, MUTED, graph_figure, save


def draw(nodes, edges, h=None, figsize=(5, 4), hside=None, kind="u", radius=0.3, fontsize=12):
    """nodes {n: (x, y)}; edges [(a, b, cost)]; h {n: value} printed next to the node."""
    panel = {
        "nodes": {n: (x, y, n) for n, (x, y) in nodes.items()},
        "edges": [(a, b, kind, 0.0) for a, b, _ in edges],
    }
    fig = graph_figure([panel], figsize=figsize, node_radius=radius, fontsize=fontsize, pad=0.7)
    ax = fig.axes[0]
    for a, b, c in edges:
        (x1, y1), (x2, y2) = nodes[a], nodes[b]
        ax.text(
            (x1 + x2) / 2,
            (y1 + y2) / 2,
            str(c),
            ha="center",
            va="center",
            fontsize=fontsize - 1,
            color=INK,
            bbox={"fc": "white", "ec": "none", "pad": 0.5},
            zorder=5,
        )
    for n, v in (h or {}).items():
        dx, dy = (hside or {}).get(n, (0, 0.5))
        x, y = nodes[n]
        ax.text(
            x + dx, y + dy, f"h={v}", ha="center", va="center", fontsize=fontsize - 2, color=MUTED
        )
    return fig


NODES = {
    "S": (0, 2.2),
    "A": (1.4, 1.4),
    "B": (2.8, 3.6),
    "F": (2.8, 2.2),
    "C": (4.4, 4.6),
    "E": (6.0, 3.8),
    "D": (2.8, 0.6),
    "H": (4.4, 0),
    "J": (6.6, 2.2),
    "K": (6.6, 0.6),
    "L": (8.0, 3.2),
    "T": (9.4, 2.2),
}
EDGES = [
    ("S", "B", 10),
    ("S", "A", 2),
    ("A", "F", 4),
    ("B", "F", 2),
    ("B", "C", 5),
    ("C", "E", 5),
    ("C", "J", 12),
    ("J", "L", 4),
    ("L", "T", 5),
    ("J", "K", 1),
    ("K", "T", 7),
    ("F", "H", 8),
    ("D", "H", 3),
    ("H", "K", 5),
]
H = {
    "S": 10,
    "A": 6,
    "B": 5,
    "C": 2,
    "E": 1,
    "F": 100,
    "J": 3,
    "L": 4,
    "T": 0,
    "D": 5,
    "H": 2,
    "K": 100,
}
SIDE = {
    "S": (0, 0.55),
    "A": (0, -0.55),
    "B": (-0.35, 0.5),
    "F": (0.75, 0.25),
    "C": (0, 0.55),
    "E": (0, 0.55),
    "D": (0, 0.55),
    "H": (0.75, 0),
    "J": (0.6, -0.35),
    "K": (0.75, -0.3),
    "L": (0, 0.55),
    "T": (0, -0.55),
}
save(draw(NODES, EDGES, H, figsize=(6.6, 3.8), hside=SIDE), __file__)
