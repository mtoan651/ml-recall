"""Factor graph over four binary variables, factors phi_a..phi_e. Redrawn from the TikZ source of
Gutmann, Pen and Paper Exercises in Machine Learning (CC BY 4.0), Ex. 6.3.
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "nodes": {
            "x1": (0, 0, "$x_1$"),
            "x2": (-1.5, 1.5, "$x_2$"),
            "x3": (3, 1.5, "$x_3$"),
            "x4": (3, -1.5, "$x_4$"),
        },
        "factors": {
            "a": (-1.5, 0, "$\\phi_a$", "above"),
            "b": (0, 1.5, "$\\phi_b$", "above"),
            "c": (1.5, 0, "$\\phi_c$", "above"),
            "d": (4.5, 1.5, "$\\phi_d$", "above"),
            "e": (4.5, -1.5, "$\\phi_e$", "above"),
        },
        "edges": [
            ("a", "x1", "u", 0.0),
            ("b", "x1", "u", 0.0),
            ("b", "x2", "u", 0.0),
            ("x1", "c", "u", 0.0),
            ("c", "x3", "u", 0.0),
            ("c", "x4", "u", 0.0),
            ("x3", "d", "u", 0.0),
            ("x4", "e", "u", 0.0),
        ],
    }
]

save(graph_figure(PANELS, figsize=(4.4, 2.8)), __file__)
