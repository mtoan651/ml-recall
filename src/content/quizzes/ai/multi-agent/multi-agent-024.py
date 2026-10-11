"""Game tree with static values at the leaves. Redrawn from MIT OCW 6.034 (Fall 2010),
Quiz 2 (2010), Problem 1 Part A (CC BY-NC-SA 4.0)."""

from mlrecall.figstyle import game_tree, save

CH = {
    "A": ["B", "C", "D"],
    "B": ["E", "F"],
    "E": ["e1", "H"],
    "H": ["h1", "h2"],
    "F": ["f1", "I"],
    "I": ["i1", "i2"],
    "C": ["c1", "c2"],
    "D": ["G", "d2"],
    "G": ["J", "K"],
    "J": ["j1", "j2"],
    "K": ["k1", "k2"],
}
VAL = {
    "e1": 1,
    "h1": 18,
    "h2": 10,
    "f1": 9,
    "i1": 7,
    "i2": 11,
    "c1": 0,
    "c2": 15,
    "d2": 4,
    "j1": 6,
    "j2": 13,
    "k1": 12,
    "k2": 19,
}
XS = {
    "A": 5.6,
    "B": 2.0,
    "C": 5.6,
    "D": 8.6,
    "E": 1.0,
    "F": 3.0,
    "c1": 5.0,
    "c2": 6.2,
    "G": 8.0,
    "d2": 9.6,
    "e1": 0.4,
    "H": 1.6,
    "f1": 2.6,
    "I": 3.6,
    "J": 7.4,
    "K": 8.8,
    "h1": 1.0,
    "h2": 2.2,
    "i1": 3.2,
    "i2": 4.4,
    "j1": 6.8,
    "j2": 7.9,
    "k1": 8.9,
    "k2": 10.0,
}
LAB = {n: "" for n in VAL}
save(
    game_tree(CH, VAL, XS, ["MAX", "MIN", "MAX", "MIN", "MAX"], figsize=(6.6, 4.0), labels=LAB),
    __file__,
)
