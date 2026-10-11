"""Q-learning update with its parts underlined and numbered (redrawn from the HF Deep RL course)."""

import matplotlib.pyplot as plt

from mlrecall.figstyle import BLUE, GREEN, ORANGE, PURPLE, RED, equation_parts, save

fig, ax = plt.subplots(figsize=(11, 1.9))
equation_parts(
    ax,
    [
        (r"Q(S_t, A_t)", GREEN),
        (r"\leftarrow", None),
        (r"Q(S_t, A_t)", BLUE),
        (r"+", None),
        (r"\alpha", RED),
        (r"[", None),
        (r"R_{t+1}", ORANGE),
        (r"+", None),
        (r"\gamma\, \max_{a}\, Q(S_{t+1}, a)", PURPLE),
        (r"-", None),
        (r"Q(S_t, A_t)", BLUE, "2"),
        (r"]", None),
    ],
    fontsize=24,
)
save(fig, __file__)
