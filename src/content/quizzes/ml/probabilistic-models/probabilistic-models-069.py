"""Undirected five-cycle H over x1..x5. Redrawn from the TikZ source of Gutmann, Pen and Paper
Exercises in Machine Learning (CC BY 4.0), Ex. 5.7 (a).
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "nodes": {
            "1": (0, 0, "$x_1$"),
            "2": (2, 0, "$x_2$"),
            "3": (0, -1.5, "$x_3$"),
            "4": (2, -1.5, "$x_4$"),
            "5": (1, -3, "$x_5$"),
        },
        "edges": [
            ("1", "2", "u", 0.0),
            ("1", "3", "u", 0.0),
            ("3", "5", "u", 0.0),
            ("2", "4", "u", 0.0),
            ("4", "5", "u", 0.0),
        ],
    }
]

save(graph_figure(PANELS, figsize=(2.6, 3.0), fontsize=13, node_radius=0.28, pad=0.45), __file__)
