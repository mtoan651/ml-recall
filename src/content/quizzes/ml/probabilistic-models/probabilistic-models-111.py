"""Bayesian network for the two-bus-routes problem, redrawn from MIT OCW 6.867 Machine Learning
(Fall 2006), final exam Fall 2004, Problem 6 (solution graph; CC BY-NC-SA 4.0).
Edges: T_B -> T_N1, T_B -> T_N2, C1 -> T_N1, C2 -> T_N2, T_N1 -> F, T_N2 -> F.
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "nodes": {
            "TB": (2, 2.6, "$T_B$"),
            "C1": (0.6, 2, "$C_1$"),
            "C2": (3.4, 2, "$C_2$"),
            "TN1": (0.6, 0.8, "$T_{N1}$"),
            "TN2": (3.4, 0.8, "$T_{N2}$"),
            "F": (2, 0, "$F$"),
        },
        "edges": [
            ("TB", "TN1", "d", 0.0),
            ("TB", "TN2", "d", 0.0),
            ("C1", "TN1", "d", 0.0),
            ("C2", "TN2", "d", 0.0),
            ("TN1", "F", "d", 0.0),
            ("TN2", "F", "d", 0.0),
        ],
    }
]

save(graph_figure(PANELS, figsize=(3.8, 2.9), node_radius=0.32), __file__)
