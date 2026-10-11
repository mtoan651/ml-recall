"""Six-node undirected graph over x1..x6. Redrawn from the TikZ source of Gutmann, Pen and Paper
Exercises in Machine Learning (CC BY 4.0), Ex. 4.2.
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "nodes": {
            "1": (0, 0, "$x_1$"),
            "2": (0, -2, "$x_2$"),
            "3": (2, 0, "$x_3$"),
            "4": (2, -2, "$x_4$"),
            "5": (3, -1, "$x_5$"),
            "6": (5, -2, "$x_6$"),
        },
        "edges": [
            ("1", "3", "u", 0.0),
            ("1", "2", "u", 0.0),
            ("2", "4", "u", 0.0),
            ("1", "4", "u", 0.0),
            ("3", "4", "u", 0.0),
            ("3", "5", "u", 0.0),
            ("4", "5", "u", 0.0),
            ("5", "6", "u", 0.0),
            ("4", "6", "u", 0.0),
        ],
    }
]

save(graph_figure(PANELS, figsize=(4.0, 2.6), node_radius=0.32, pad=0.45), __file__)
