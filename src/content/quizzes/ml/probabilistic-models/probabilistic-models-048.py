"""Fourteen-node DAG made of two linked blocks. Redrawn from the TikZ source of Gutmann, Pen and
Paper Exercises in Machine Learning (CC BY 4.0), Ex. 3.11.
"""

from mlrecall.figstyle import graph_figure, save

PANELS = [
    {
        "nodes": {
            "m1": (0, 0, "$m_1$"),
            "s1": (2, 0, "$s_1$"),
            "u1": (0, -1.5, "$u_1$"),
            "v1": (2, -1.5, "$v_1$"),
            "x1": (0, -3, "$x_1$"),
            "y1": (2, -3, "$y_1$"),
            "t1": (1, -4, "$\\theta_1$"),
            "m2": (4, 0, "$m_2$"),
            "s2": (6, 0, "$s_2$"),
            "u2": (4, -1.5, "$u_2$"),
            "v2": (6, -1.5, "$v_2$"),
            "x2": (4, -3, "$x_2$"),
            "y2": (6, -3, "$y_2$"),
            "t2": (5, -4, "$\\theta_2$"),
        },
        "edges": [
            ("m1", "u1", "d", 0.0),
            ("m1", "v1", "d", 0.0),
            ("s1", "u1", "d", 0.0),
            ("s1", "v1", "d", 0.0),
            ("u1", "x1", "d", 0.0),
            ("v1", "y1", "d", 0.0),
            ("t1", "x1", "d", 0.0),
            ("t1", "y1", "d", 0.0),
            ("m2", "u2", "d", 0.0),
            ("m2", "v2", "d", 0.0),
            ("s2", "u2", "d", 0.0),
            ("s2", "v2", "d", 0.0),
            ("u2", "x2", "d", 0.0),
            ("v2", "y2", "d", 0.0),
            ("t2", "x2", "d", 0.0),
            ("t2", "y2", "d", 0.0),
            ("t1", "t2", "d", 0.0),
        ],
    }
]

save(graph_figure(PANELS, figsize=(5.0, 3.6), node_radius=0.34, pad=0.45), __file__)
