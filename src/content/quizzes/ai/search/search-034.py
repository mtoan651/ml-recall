"""Undirected graph with link costs and heuristic values. Redrawn from MIT OCW 6.034
(Fall 2010), Quiz 1 (2007), Question 2, Fig 2 (CC BY-NC-SA 4.0)."""

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
    "S": (2, 4.4),
    "A": (0.6, 3.3),
    "B": (3.4, 3.3),
    "C": (2, 2.2),
    "D": (0.6, 1.1),
    "E": (3.4, 1.1),
    "G": (2, 0),
}
EDGES = [
    ("S", "A", 10),
    ("S", "C", 8),
    ("S", "B", 3),
    ("A", "C", 3),
    ("B", "C", 3),
    ("C", "D", 3),
    ("C", "G", 12),
    ("C", "E", 4),
    ("D", "G", 10),
    ("E", "G", 4),
]
H = {"S": 0, "A": 5, "B": 10, "C": 7, "D": 0, "E": 9, "G": 0}
SIDE = {
    "S": (0.75, 0.1),
    "A": (-0.8, 0),
    "B": (0.85, 0),
    "C": (0.75, 0.15),
    "D": (-0.8, 0),
    "E": (0.8, 0),
    "G": (0.75, -0.1),
}
save(draw(NODES, EDGES, H, figsize=(3.8, 4.4), hside=SIDE), __file__)
