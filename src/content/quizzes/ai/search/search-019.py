"""Search tree with arc lengths (edges point downward); heuristic values at B, C, D (others 0). Redrawn from MIT OCW
6.034 (Spring 2005), Quiz 1 review solutions: Quiz 1 Spring 2003, Problem 1 (CC BY-NC-SA 4.0)."""

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

NODES = {"A": (3, 3), "B": (0.9, 1.6), "C": (3, 1.6), "D": (5.1, 1.6),
         "E": (-0.1, 0), "F": (0.9, 0), "G": (1.9, 0), "H": (3, 0), "I": (4.5, 0), "J": (5.7, 0)}
EDGES = [("A", "B", 5), ("A", "C", 2), ("A", "D", 4), ("B", "E", 6), ("B", "F", 3), ("B", "G", 4),
         ("C", "H", 9), ("D", "I", 6), ("D", "J", 3)]
H = {"B": 1, "C": 6, "D": 3}
SIDE = {"B": (-0.75, 0.1), "C": (-0.75, 0.1), "D": (0.75, 0.1)}
save(draw(NODES, EDGES, H, figsize=(5.6, 3.2), hside=SIDE, kind="u", radius=0.28), __file__)
