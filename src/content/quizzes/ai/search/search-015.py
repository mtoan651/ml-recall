"""Undirected graph with link costs and heuristic values. Redrawn from MIT OCW 6.034
(Spring 2005), Quiz 1 review solutions: Quiz 1 Spring 2004, Problem 2 (CC BY-NC-SA 4.0)."""

from mlrecall.figstyle import INK, MUTED, graph_figure, save

def draw(nodes, edges, h=None, figsize=(5, 4), hside=None, kind="u", radius=0.3, fontsize=12):
    """nodes {n: (x, y)}; edges [(a, b, cost)]; h {n: value} printed next to the node."""
    panel = {"nodes": {n: (x, y, n) for n, (x, y) in nodes.items()},
             "edges": [(a, b, kind, 0.0) for a, b, _ in edges]}
    fig = graph_figure([panel], figsize=figsize, node_radius=radius, fontsize=fontsize, pad=0.7)
    ax = fig.axes[0]
    for a, b, c in edges:
        (x1, y1), (x2, y2) = nodes[a], nodes[b]
        ax.text((x1 + x2) / 2, (y1 + y2) / 2, str(c), ha="center", va="center", fontsize=fontsize - 1,
                color=INK, bbox={"fc": "white", "ec": "none", "pad": 0.5}, zorder=5)
    for n, v in (h or {}).items():
        dx, dy = (hside or {}).get(n, (0, 0.5))
        x, y = nodes[n]
        ax.text(x + dx, y + dy, f"h={v}", ha="center", va="center", fontsize=fontsize - 2, color=MUTED)
    return fig

NODES = {"A": (2, 3), "B": (0, 1.8), "C": (3.2, 1.8), "G": (1.6, 0), "H": (3.6, 0)}
EDGES = [("A", "B", 1), ("A", "C", 3), ("B", "C", 1), ("B", "G", 9), ("C", "G", 5), ("C", "H", 2), ("G", "H", 1)]
H = {"A": 5, "B": 4, "C": 1, "G": 0, "H": 1}
SIDE = {"A": (0.75, 0), "B": (-0.75, 0), "C": (0.75, 0), "G": (-0.75, 0), "H": (0.75, 0)}
save(draw(NODES, EDGES, H, figsize=(4.6, 3.2), hside=SIDE), __file__)
