"""Bellman equation with its four parts underlined and numbered (redrawn from HF Deep RL)."""

import matplotlib.pyplot as plt

from mlrecall.figstyle import BLUE, GREEN, PURPLE, RED, equation_parts, save

fig, ax = plt.subplots(figsize=(9, 1.9))
equation_parts(
    ax,
    [
        (r"V_{\pi}(s)", GREEN),
        (r"=", None),
        (r"\mathbb{E}_{\pi}[R_{t+1}", RED),
        (r"+", None),
        (r"\gamma\, V_{\pi}(S_{t+1})", PURPLE),
        (r"|", None),
        (r"S_t = s\,]", BLUE),
    ],
)
save(fig, __file__)
