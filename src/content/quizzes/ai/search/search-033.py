"""Undirected graph with jump lengths and heuristic counts. Redrawn from MIT OCW 6.034
(Fall 2010), Quiz 1 (2008), Problem 2 Part B (CC BY-NC-SA 4.0)."""

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
    "A": (1.6, 4.4),
    "B": (4.4, 4.2),
    "C": (-0.4, 3.2),
    "S": (3, 3.2),
    "D": (5.8, 3.0),
    "E": (1.6, 2.0),
    "F": (4.4, 2.0),
    "H": (3, 1.0),
    "I": (3, -0.4),
    "G": (3, -1.6),
}
EDGES = [
    ("S", "A", 100),
    ("A", "C", 4),
    ("C", "I", 50),
    ("S", "B", 3),
    ("B", "D", 4),
    ("D", "I", 50),
    ("S", "E", 14),
    ("E", "H", 16),
    ("S", "F", 4),
    ("F", "H", 16),
    ("H", "I", 30),
    ("I", "G", 10),
]
H = {"S": 0, "A": 60, "B": 50, "C": 55, "D": 50, "E": 56, "F": 50, "H": 39, "I": 0, "G": 0}
SIDE = {
    "S": (0, 0.55),
    "A": (0, 0.5),
    "B": (0, 0.5),
    "C": (-0.3, 0.5),
    "D": (0.3, 0.5),
    "E": (-0.55, 0.45),
    "F": (0.8, 0),
    "H": (0.8, 0),
    "I": (0.7, 0),
    "G": (0.7, 0),
}
save(draw(NODES, EDGES, H, figsize=(5.0, 5.0), hside=SIDE), __file__)
