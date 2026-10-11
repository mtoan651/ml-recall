"""Game tree with static values at the leaves. Redrawn from MIT OCW 6.034 (Fall 2010),
Quiz 2 (2009), Problem 1 Parts B2-B3 (CC BY-NC-SA 4.0)."""

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

CH = {"a": ["b", "c", "d"], "b": ["e", "f", "g"], "g": ["m", "n"], "c": ["h", "i"], "h": ["o", "p"],
      "d": ["j", "k"], "k": ["q", "r"]}
VAL = {"e": 2, "f": 6, "m": 4, "n": 5, "o": 1, "p": 3, "i": 8, "j": 2, "q": 9, "r": 1}
XS = {"a": 4.6, "b": 1.6, "c": 4.6, "d": 7.4, "e": 0.4, "f": 1.6, "g": 2.8, "h": 4.0, "i": 5.2,
      "j": 6.8, "k": 8.0, "m": 2.2, "n": 3.4, "o": 3.4, "p": 4.6, "q": 7.4, "r": 8.6}
save(tree(CH, VAL, XS, ["MAX", "MIN", "MAX", "MIN"], figsize=(5.8, 3.2)), __file__)
