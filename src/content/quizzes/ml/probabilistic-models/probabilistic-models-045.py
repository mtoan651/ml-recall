"""Nine-node DAG over x1..x9. Redrawn from the TikZ source of Gutmann, Pen and Paper Exercises in
Machine Learning (CC BY 4.0), Ex. 3.10.
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "nodes": {
            "1": (0, 0, "$x_1$"),
            "2": (0, -2, "$x_2$"),
            "3": (0, -4, "$x_3$"),
            "4": (2, -1.5, "$x_4$"),
            "5": (2, -3, "$x_5$"),
            "6": (2, -4.5, "$x_6$"),
            "7": (4, 0, "$x_7$"),
            "8": (4, -2, "$x_8$"),
            "9": (6, -1, "$x_9$"),
        },
        "edges": [
            ("1", "2", "d", 0.0),
            ("2", "3", "d", 0.0),
            ("1", "4", "d", 0.0),
            ("4", "5", "d", 0.0),
            ("5", "6", "d", 0.0),
            ("7", "4", "d", 0.0),
            ("7", "8", "d", 0.0),
            ("3", "6", "d", 0.0),
            ("8", "6", "d", 0.0),
            ("7", "9", "d", 0.0),
        ],
    }
]

save(graph_figure(PANELS, figsize=(4.6, 3.8), node_radius=0.34, pad=0.45), __file__)
