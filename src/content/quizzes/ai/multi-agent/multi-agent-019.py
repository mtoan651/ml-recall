"""Game tree with static values at the leaves. Redrawn from MIT OCW 6.034 (Fall 2010),
Quiz 2 (2007), Problem 1 (CC BY-NC-SA 4.0)."""

from mlrecall.figstyle import INK, MUTED, graph_figure, save

def tree(children, values, xs, levels, figsize, radius=0.3, fontsize=12, labels=None):
    """children {node: [kids]}; values {leaf: static value}; xs {node: x}; levels ["MAX", "MIN", ...]
    (depth 0 first). Leaf values are printed under the leaves."""
    depth = {}
    root = next(n for n in children if all(n not in k for k in children.values()))
    stack = [(root, 0)]
    while stack:
        n, d = stack.pop()
        depth[n] = d
        stack += [(k, d + 1) for k in children.get(n, [])]
    nodes = {n: (xs[n], -1.3 * d, (labels or {}).get(n, n)) for n, d in depth.items()}
    edges = [(a, b, "u", 0.0) for a, ks in children.items() for b in ks]
    fig = graph_figure([{"nodes": nodes, "edges": edges}], figsize=figsize, node_radius=radius,
                       fontsize=fontsize, pad=0.6)
    ax = fig.axes[0]
    for n, v in values.items():
        x, y, _ = nodes[n]
        ax.text(x, y - radius - 0.22, str(v), ha="center", va="center", fontsize=fontsize, color=INK,
                fontweight="bold")
    left = min(x for x, _, _ in nodes.values()) - 1.0
    for d, name in enumerate(levels):
        ax.text(left, -1.3 * d, name, ha="center", va="center", fontsize=fontsize - 2, color=MUTED)
    ax.set_xlim(left - 0.5, max(x for x, _, _ in nodes.values()) + 0.6)
    ax.set_ylim(-1.3 * (len(levels) - 1) - 0.9, 0.6)
    return fig

CH = {"A": ["B", "C", "D"], "B": ["E", "F"], "F": ["K", "L"], "C": ["G", "H"], "G": ["M", "N"],
      "M": ["Q", "R"], "D": ["I", "J"], "J": ["O", "P"]}
VAL = {"E": 2, "K": 3, "L": 0, "H": 6, "N": 7, "Q": 1, "R": 10, "I": 1, "O": 2, "P": 20}
XS = {"A": 4.4, "B": 1.4, "C": 4.4, "D": 7.4, "E": 0.8, "F": 2.0, "G": 3.8, "H": 5.0, "I": 6.8,
      "J": 8.0, "K": 1.4, "L": 2.6, "M": 3.2, "N": 4.4, "O": 7.4, "P": 8.6, "Q": 2.6, "R": 3.8}
save(tree(CH, VAL, XS, ["MAX", "MIN", "MAX", "MIN", "MAX"], figsize=(5.6, 4.0)), __file__)
