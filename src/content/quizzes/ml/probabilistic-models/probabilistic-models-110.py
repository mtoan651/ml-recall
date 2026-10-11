"""Bayesian network of two decision makers A and B and six binary context variables, redrawn from
MIT OCW 6.867 Machine Learning (Fall 2006), final exam Fall 2001, Problem 5, Figure 1
(CC BY-NC-SA 4.0). Edges: x1->x3, x1->x5, x2->x5, x2->x4, x3->A, x5->A, x5->B, x4->B, A->x6, B->x6.
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "nodes": {
            "x1": (1, 3, "$x_1$"),
            "x2": (3, 3, "$x_2$"),
            "x3": (0, 2, "$x_3$"),
            "x5": (2, 2, "$x_5$"),
            "x4": (4, 2, "$x_4$"),
            "A": (1, 1, "$A$"),
            "B": (3, 1, "$B$"),
            "x6": (2, 0, "$x_6$"),
        },
        "edges": [
            ("x1", "x3", "d", 0.0),
            ("x1", "x5", "d", 0.0),
            ("x2", "x5", "d", 0.0),
            ("x2", "x4", "d", 0.0),
            ("x3", "A", "d", 0.0),
            ("x5", "A", "d", 0.0),
            ("x5", "B", "d", 0.0),
            ("x4", "B", "d", 0.0),
            ("A", "x6", "d", 0.0),
            ("B", "x6", "d", 0.0),
        ],
    }
]

save(graph_figure(PANELS, figsize=(4.0, 3.2)), __file__)
