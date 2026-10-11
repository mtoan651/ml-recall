"""Three DAGs over v, w, x, y, z with the same skeleton. Redrawn from the TikZ source of Gutmann,
Pen and Paper Exercises in Machine Learning (CC BY 4.0), Ex. 5.1 (a).
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "title": "Graph 1",
        "nodes": {
            "v": (0, 0, "$v$"),
            "x": (1.6, 0, "$x$"),
            "z": (3.2, 0, "$z$"),
            "w": (0.8, -1.1, "$w$"),
            "y": (2.4, -1.1, "$y$"),
        },
        "edges": [
            ("v", "w", "d", 0.0),
            ("w", "x", "d", 0.0),
            ("x", "y", "d", 0.0),
            ("z", "y", "d", 0.0),
        ],
    },
    {
        "title": "Graph 2",
        "nodes": {
            "v": (0, 0, "$v$"),
            "x": (1.6, 0, "$x$"),
            "z": (3.2, 0, "$z$"),
            "w": (0.8, -1.1, "$w$"),
            "y": (2.4, -1.1, "$y$"),
        },
        "edges": [
            ("w", "v", "d", 0.0),
            ("x", "w", "d", 0.0),
            ("x", "y", "d", 0.0),
            ("z", "y", "d", 0.0),
        ],
    },
    {
        "title": "Graph 3",
        "nodes": {
            "v": (0, 0, "$v$"),
            "x": (1.6, 0, "$x$"),
            "z": (3.2, 0, "$z$"),
            "w": (0.8, -1.1, "$w$"),
            "y": (2.4, -1.1, "$y$"),
        },
        "edges": [
            ("w", "v", "d", 0.0),
            ("x", "w", "d", 0.0),
            ("y", "x", "d", 0.0),
            ("z", "y", "d", 0.0),
        ],
    },
]

save(graph_figure(PANELS, figsize=(9.0, 2.2), fontsize=13, node_radius=0.28, pad=0.45), __file__)
