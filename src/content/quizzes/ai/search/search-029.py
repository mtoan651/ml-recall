"""Undirected graph with link costs and heuristic estimates. Redrawn from MIT OCW 6.034
(Fall 2010), Quiz 1 (2010), Problem 2 Part B (CC BY-NC-SA 4.0)."""

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

NODES = {"H": (3, 4), "D": (4.2, 2.7), "F": (0.4, 2.2), "C": (3, 2.2), "B": (6, 2.2),
         "A": (0.4, 0.6), "E": (3, 0.6), "G": (5.2, 0.6)}
EDGES = [("H", "F", 4), ("H", "C", 3), ("H", "D", 3), ("H", "B", 2), ("D", "C", 4), ("D", "B", 3),
         ("F", "C", 3), ("C", "B", 3), ("F", "A", 3), ("F", "E", 3), ("A", "E", 3), ("E", "G", 3)]
H = {"H": 5, "F": 5, "C": 4, "D": 5, "B": 2, "A": 5, "E": 3, "G": 0}
SIDE = {"H": (0, 0.55), "D": (-0.6, 0.15), "F": (-0.1, 0.55), "C": (-0.2, -0.55), "B": (0, 0.55),
        "A": (0, -0.55), "E": (0, -0.55), "G": (0, -0.55)}
save(draw(NODES, EDGES, H, figsize=(5.4, 4.0), hside=SIDE), __file__)
