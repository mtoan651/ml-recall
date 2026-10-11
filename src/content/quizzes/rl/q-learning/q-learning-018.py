"""Monte Carlo update with its parts underlined and numbered (redrawn from HF Deep RL)."""

import matplotlib.pyplot as plt

from mlrecall.figstyle import BLUE, GREEN, ORANGE, RED, equation_parts, save

fig, ax = plt.subplots(figsize=(8, 1.9))
equation_parts(
    ax,
    [
        (r"V(S_t)", GREEN),
        (r"\leftarrow", None),
        (r"V(S_t)", BLUE),
        (r"+", None),
        (r"\alpha", RED),
        (r"[", None),
        (r"G_t", ORANGE),
        (r"-", None),
        (r"V(S_t)", BLUE, "2"),
        (r"]", None),
    ],
)
save(fig, __file__)
