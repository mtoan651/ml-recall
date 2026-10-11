"""Directed graph over x1..x6, redrawn from MIT OCW 6.438 Algorithms for Inference (Fall 2014),
Quiz 1 (2014), Problem 2, Figure 2 (CC BY-NC-SA 4.0).
Edges: x1->x3, x1->x4, x2->x3, x2->x4, x3->x5, x4->x5, x4->x6.
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "nodes": {
            "1": (0, 2, "$x_1$"),
            "2": (1.6, 2, "$x_2$"),
            "3": (0, 1, "$x_3$"),
            "4": (1.6, 1, "$x_4$"),
            "5": (0, 0, "$x_5$"),
            "6": (1.6, 0, "$x_6$"),
        },
        "edges": [
            ("1", "3", "d", 0.0),
            ("1", "4", "d", 0.0),
            ("2", "3", "d", 0.0),
            ("2", "4", "d", 0.0),
            ("3", "5", "d", 0.0),
            ("4", "5", "d", 0.0),
            ("4", "6", "d", 0.0),
        ],
    }
]

save(graph_figure(PANELS, figsize=(2.6, 3.0)), __file__)
