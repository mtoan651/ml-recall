"""Five-node DAG a->q<-z, z->h, q->e. Redrawn from the TikZ source of Gutmann, Pen and Paper
Exercises in Machine Learning (CC BY 4.0), Ex. 5.2.
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "nodes": {
            "a": (0, 2, "$a$"),
            "z": (2, 2, "$z$"),
            "q": (1, 1, "$q$"),
            "e": (1, -0.4, "$e$"),
            "h": (3, 1, "$h$"),
        },
        "edges": [
            ("a", "q", "d", 0.0),
            ("z", "h", "d", 0.0),
            ("z", "q", "d", 0.0),
            ("q", "e", "d", 0.0),
        ],
    }
]

save(graph_figure(PANELS, figsize=(3.2, 2.9), fontsize=13, node_radius=0.28, pad=0.45), __file__)
