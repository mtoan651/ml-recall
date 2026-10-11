"""TD(0) update with its parts underlined and numbered (redrawn from the HF Deep RL course)."""

import matplotlib.pyplot as plt

from mlrecall.figstyle import BLUE, GREEN, ORANGE, PURPLE, RED, equation_parts, save

fig, ax = plt.subplots(figsize=(10, 1.9))
equation_parts(
    ax,
    [
        (r"V(S_t)", GREEN),
        (r"\leftarrow", None),
        (r"V(S_t)", BLUE),
        (r"+", None),
        (r"\alpha", RED),
        (r"[", None),
        (r"R_{t+1}", ORANGE),
        (r"+", None),
        (r"\gamma\, V(S_{t+1})", PURPLE),
        (r"-", None),
        (r"V(S_t)", BLUE, "2"),
        (r"]", None),
    ],
)
save(fig, __file__)
