"""Game tree with static values at the leaves. Redrawn from MIT OCW 6.034 (Fall 2010),
Quiz 2 (2007), Problem 1 (CC BY-NC-SA 4.0)."""

from mlrecall.figstyle import game_tree, save

CH = {
    "A": ["B", "C", "D"],
    "B": ["E", "F"],
    "F": ["K", "L"],
    "C": ["G", "H"],
    "G": ["M", "N"],
    "M": ["Q", "R"],
    "D": ["I", "J"],
    "J": ["O", "P"],
}
VAL = {"E": 2, "K": 3, "L": 0, "H": 6, "N": 7, "Q": 1, "R": 10, "I": 1, "O": 2, "P": 20}
XS = {
    "A": 4.4,
    "B": 1.4,
    "C": 4.4,
    "D": 7.4,
    "E": 0.8,
    "F": 2.0,
    "G": 3.8,
    "H": 5.0,
    "I": 6.8,
    "J": 8.0,
    "K": 1.4,
    "L": 2.6,
    "M": 3.2,
    "N": 4.4,
    "O": 7.4,
    "P": 8.6,
    "Q": 2.6,
    "R": 3.8,
}
save(game_tree(CH, VAL, XS, ["MAX", "MIN", "MAX", "MIN", "MAX"], figsize=(5.6, 4.0)), __file__)
