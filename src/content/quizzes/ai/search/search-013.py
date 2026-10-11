"""Search tree with arc lengths (edges point downward). Redrawn from MIT OCW 6.034 (Spring 2005),
Quiz 1 review
solutions: Quiz 1 Spring 2004, Problem 1 (CC BY-NC-SA 4.0)."""

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
    "A": (3, 5.2),
    "B": (1.6, 3.9),
    "C": (4.4, 3.9),
    "D": (0.8, 2.6),
    "E": (2.4, 2.6),
    "G": (3.6, 2.6),
    "H": (5.2, 2.6),
    "F": (0.8, 1.3),
    "I": (4.5, 1.3),
    "J": (5.9, 1.3),
    "K": (0, 0),
    "L": (1.6, 0),
}
EDGES = [
    ("A", "B", 1),
    ("A", "C", 3),
    ("B", "D", 1),
    ("B", "E", 1),
    ("C", "G", 1),
    ("C", "H", 2),
    ("D", "F", 1),
    ("H", "I", 1),
    ("H", "J", 1),
    ("F", "K", 2),
    ("F", "L", 2),
]
save(draw(NODES, EDGES, figsize=(4.6, 4.2), kind="u", radius=0.28), __file__)
