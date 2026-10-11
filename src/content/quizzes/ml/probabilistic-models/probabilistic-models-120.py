"""Undirected graph to be triangulated, redrawn from MIT OCW 6.438 Algorithms for Inference
(Fall 2014), Quiz 1 (2014), Problem 1(f), Figure 1 (CC BY-NC-SA 4.0).
An 8-cycle 1-2-3-4-5-6-7-8-1 plus a hub 9 joined to 2, 4, 6 and 8.
"""

import math

from mlrecall.figstyle import graph_figure, save

ring = {}
for k in range(8):
    angle = math.pi / 2 + math.pi / 8 - k * math.pi / 4  # node 1 at upper left, clockwise
    ring[str(k + 1)] = (round(1.6 * math.cos(angle), 3), round(1.6 * math.sin(angle), 3), str(k + 1))
PANELS = [
    {
        "nodes": {**ring, "9": (0.25, -0.1, "9")},
        "edges": [(str(k), str(k % 8 + 1), "u", 0.0) for k in range(1, 9)]
        + [("9", v, "u", 0.0) for v in ("2", "4", "6", "8")],
    }
]

save(graph_figure(PANELS, figsize=(3.2, 3.2)), __file__)
