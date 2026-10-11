"""A Bayesian network and a Markov random field over x1..x3, y1..y3, redrawn from MIT OCW 6.867
Machine Learning (Fall 2006), final exam Fall 2003, Problem 5, Figure 2 (CC BY-NC-SA 4.0).
(a) x1->y1, x1->y2, x2->y1, x2->y2, x2->y3, x3->y2, x3->y3.
(b) x1-x2, x2-x3, x1-y1, x1-y2, x2-y1, x2-y2, x2-y3, x3-y2, x3-y3.
"""

from mlrecall.figstyle import graph_figure, save

NODES = {
    "x1": (0, 1.4, "$x_1$"),
    "x2": (1.4, 1.4, "$x_2$"),
    "x3": (2.8, 1.4, "$x_3$"),
    "y1": (0, 0, "$y_1$"),
    "y2": (1.4, 0, "$y_2$"),
    "y3": (2.8, 0, "$y_3$"),
}
PANELS = [
    {
        "nodes": NODES,
        "edges": [
            ("x1", "y1", "d", 0.0),
            ("x1", "y2", "d", 0.0),
            ("x2", "y1", "d", 0.0),
            ("x2", "y2", "d", 0.0),
            ("x2", "y3", "d", 0.0),
            ("x3", "y2", "d", 0.0),
            ("x3", "y3", "d", 0.0),
        ],
        "title": "(a) Bayesian network",
    },
    {
        "nodes": NODES,
        "edges": [
            ("x1", "x2", "u", 0.0),
            ("x2", "x3", "u", 0.0),
            ("x1", "y1", "u", 0.0),
            ("x1", "y2", "u", 0.0),
            ("x2", "y1", "u", 0.0),
            ("x2", "y2", "u", 0.0),
            ("x2", "y3", "u", 0.0),
            ("x3", "y2", "u", 0.0),
            ("x3", "y3", "u", 0.0),
        ],
        "title": "(b) Markov random field",
    },
]

save(graph_figure(PANELS, figsize=(6.4, 2.6)), __file__)
