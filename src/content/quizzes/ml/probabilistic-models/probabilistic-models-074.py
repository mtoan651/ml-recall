"""Factor tree over five binary variables, factors phi_A..phi_F. Redrawn from the TikZ source of
Gutmann, Pen and Paper Exercises in Machine Learning (CC BY 4.0), Ex. 6.2/6.4.
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "nodes": {
            "x1": (1.5, 0, "$x_1$"),
            "x2": (3, 1, "$x_2$"),
            "x3": (4.5, 0, "$x_3$"),
            "x4": (7, 1, "$x_4$"),
            "x5": (7, -1, "$x_5$"),
        },
        "factors": {
            "A": (0, 0, "$\\phi_A$", "above"),
            "C": (3, 0, "$\\phi_C$", "below"),
            "B": (3, 2, "$\\phi_B$", "left"),
            "D": (5.5, 1, "$\\phi_D$", "above"),
            "E": (5.5, -1, "$\\phi_E$", "below"),
            "F": (8.5, -1, "$\\phi_F$", "above"),
        },
        "edges": [
            ("A", "x1", "u", 0.0),
            ("x1", "C", "u", 0.0),
            ("C", "x2", "u", 0.0),
            ("x2", "B", "u", 0.0),
            ("C", "x3", "u", 0.0),
            ("x3", "D", "u", 0.0),
            ("x3", "E", "u", 0.0),
            ("D", "x4", "u", 0.0),
            ("E", "x5", "u", 0.0),
            ("x5", "F", "u", 0.0),
        ],
    }
]

save(graph_figure(PANELS, figsize=(5.6, 2.6)), __file__)
