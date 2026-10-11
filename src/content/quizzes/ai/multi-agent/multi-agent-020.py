"""Game tree with static values at the leaves. Redrawn from MIT OCW 6.034 (Fall 2010),
Quiz 2 (2009), Problem 1 Parts B2-B3 (CC BY-NC-SA 4.0)."""

from mlrecall.figstyle import game_tree, save

CH = {
    "a": ["b", "c", "d"],
    "b": ["e", "f", "g"],
    "g": ["m", "n"],
    "c": ["h", "i"],
    "h": ["o", "p"],
    "d": ["j", "k"],
    "k": ["q", "r"],
}
VAL = {"e": 2, "f": 6, "m": 4, "n": 5, "o": 1, "p": 3, "i": 8, "j": 2, "q": 9, "r": 1}
XS = {
    "a": 4.6,
    "b": 1.6,
    "c": 4.6,
    "d": 7.4,
    "e": 0.4,
    "f": 1.6,
    "g": 2.8,
    "h": 4.0,
    "i": 5.2,
    "j": 6.8,
    "k": 8.0,
    "m": 2.2,
    "n": 3.4,
    "o": 3.4,
    "p": 4.6,
    "q": 7.4,
    "r": 8.6,
}
save(game_tree(CH, VAL, XS, ["MAX", "MIN", "MAX", "MIN"], figsize=(5.8, 3.2)), __file__)
