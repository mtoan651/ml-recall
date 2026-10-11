"""Hidden Markov model DAG with four time steps. Redrawn from the TikZ source of Gutmann, Pen and
Paper Exercises in Machine Learning (CC BY 4.0), Ex. 3.7.
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "nodes": {
            "x1": (0, 2, "$x_1$"),
            "x2": (2, 2, "$x_2$"),
            "x3": (4, 2, "$x_3$"),
            "x4": (6, 2, "$x_4$"),
            "y1": (0, 0, "$y_1$"),
            "y2": (2, 0, "$y_2$"),
            "y3": (4, 0, "$y_3$"),
            "y4": (6, 0, "$y_4$"),
        },
        "edges": [
            ("x1", "x2", "d", 0.0),
            ("x2", "x3", "d", 0.0),
            ("x3", "x4", "d", 0.0),
            ("x1", "y1", "d", 0.0),
            ("x2", "y2", "d", 0.0),
            ("x3", "y3", "d", 0.0),
            ("x4", "y4", "d", 0.0),
        ],
    }
]

save(graph_figure(PANELS, figsize=(5.4, 2.4), fontsize=13, node_radius=0.28, pad=0.45), __file__)
