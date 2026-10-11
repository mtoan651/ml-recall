"""Three DAGs over v, w, x, y, z. Redrawn from the TikZ source of Gutmann, Pen and Paper Exercises
in Machine Learning (CC BY 4.0), Ex. 5.1 (b).
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "title": "Graph 1",
        "nodes": {
            "v": (0, 0, "$v$"),
            "x": (1.6, 0, "$x$"),
            "w": (1.6, -1.4, "$w$"),
            "y": (3.2, -1.4, "$y$"),
            "z": (3.2, -2.8, "$z$"),
        },
        "edges": [
            ("v", "x", "d", 0.0),
            ("v", "w", "d", 0.0),
            ("x", "w", "d", 0.0),
            ("w", "z", "d", 0.0),
            ("y", "z", "d", 0.0),
        ],
    },
    {
        "title": "Graph 2",
        "nodes": {
            "v": (0, 0, "$v$"),
            "x": (1.6, 0, "$x$"),
            "w": (1.6, -1.4, "$w$"),
            "y": (3.2, -1.4, "$y$"),
            "z": (3.2, -2.8, "$z$"),
        },
        "edges": [
            ("x", "v", "d", 0.0),
            ("w", "v", "d", 0.0),
            ("x", "w", "d", 0.0),
            ("w", "z", "d", 0.0),
            ("y", "z", "d", 0.0),
        ],
    },
    {
        "title": "Graph 3",
        "nodes": {
            "v": (0, 0, "$v$"),
            "x": (1.6, 0, "$x$"),
            "w": (1.6, -1.4, "$w$"),
            "y": (3.2, -1.4, "$y$"),
            "z": (3.2, -2.8, "$z$"),
        },
        "edges": [
            ("v", "w", "d", 0.0),
            ("x", "w", "d", 0.0),
            ("w", "z", "d", 0.0),
            ("y", "z", "d", 0.0),
        ],
    },
]

save(graph_figure(PANELS, figsize=(9.0, 3.2), fontsize=13, node_radius=0.28, pad=0.45), __file__)
