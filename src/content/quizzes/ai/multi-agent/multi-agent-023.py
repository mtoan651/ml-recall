"""Game tree with static values at the leaves. Redrawn from MIT OCW 6.034 (Fall 2010),
Quiz 2 (2010), Problem 1 Part A (CC BY-NC-SA 4.0)."""

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

CH = {"A": ["B", "C", "D"], "B": ["E", "F"], "E": ["e1", "H"], "H": ["h1", "h2"], "F": ["f1", "I"],
      "I": ["i1", "i2"], "C": ["c1", "c2"], "D": ["G", "d2"], "G": ["J", "K"], "J": ["j1", "j2"],
      "K": ["k1", "k2"]}
VAL = {"e1": 1, "h1": 18, "h2": 10, "f1": 9, "i1": 7, "i2": 11, "c1": 0, "c2": 15, "d2": 4,
       "j1": 6, "j2": 13, "k1": 12, "k2": 19}
XS = {"A": 5.6, "B": 2.0, "C": 5.6, "D": 8.6, "E": 1.0, "F": 3.0, "c1": 5.0, "c2": 6.2, "G": 8.0,
      "d2": 9.6, "e1": 0.4, "H": 1.6, "f1": 2.6, "I": 3.6, "J": 7.4, "K": 8.8, "h1": 1.0, "h2": 2.2,
      "i1": 3.2, "i2": 4.4, "j1": 6.8, "j2": 7.9, "k1": 8.9, "k2": 10.0}
LAB = {n: "" for n in VAL}
save(tree(CH, VAL, XS, ["MAX", "MIN", "MAX", "MIN", "MAX"], figsize=(6.6, 4.0), labels=LAB), __file__)
