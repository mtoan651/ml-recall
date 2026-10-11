"""Game tree with static values at the leaves. Redrawn from MIT OCW 6.034 (Fall 2010),
Quiz 2 (2008), Problem 1 (CC BY-NC-SA 4.0)."""

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

CH = {"A": ["B", "C", "D"], "B": ["E", "F"], "C": ["G", "H", "I"], "D": ["J", "K"], "E": ["L", "M"],
      "G": ["N", "O"], "I": ["P", "Q"], "K": ["R", "S"], "M": ["T", "U"], "N": ["V", "W"],
      "Q": ["X", "Y"], "R": ["Z", "Om"]}
VAL = {"F": 7, "H": 3, "J": 4, "L": 5, "O": 7, "P": 6, "S": 6, "T": 2, "U": 10, "V": 4, "W": 9,
       "X": 2, "Y": 8, "Z": 7, "Om": 3}
XS = {"A": 6.0, "B": 1.2, "C": 5.8, "D": 10.2, "E": 0.6, "F": 2.0, "G": 4.4, "H": 5.8, "I": 7.2,
      "J": 9.4, "K": 11.0, "L": 0.0, "M": 1.2, "N": 3.8, "O": 5.0, "P": 6.6, "Q": 7.8, "R": 10.4,
      "S": 11.6, "T": 0.6, "U": 1.8, "V": 3.2, "W": 4.4, "X": 7.2, "Y": 8.4, "Z": 9.8, "Om": 11.0}
fig = tree(CH, VAL, XS, ["MAX", "MIN", "MAX", "MIN", "MAX"], figsize=(7.2, 4.0), radius=0.32,
           labels={"Om": "Ω"})
save(fig, __file__)
