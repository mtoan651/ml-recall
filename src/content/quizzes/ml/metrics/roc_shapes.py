"""ROC curve shapes shared by the metrics figures (not a generator: no question id)."""

# Above the diagonal: a curve that rises steeply, then flattens (like a decent classifier).
GOOD = [
    (0, 0), (0.05, 0.12), (0.08, 0.33), (0.15, 0.6), (0.23, 0.64), (0.4, 0.82),
    (0.53, 0.85), (0.63, 0.95), (0.88, 0.97), (1, 1),
]  # fmt: skip
# A zig-zag staircase hugging the diagonal (blended down to "barely better than chance").
NEAR_CHANCE = [
    (0, 0), (0.08, 0.02), (0.1, 0.15), (0.2, 0.17), (0.22, 0.3), (0.33, 0.31), (0.35, 0.45),
    (0.47, 0.46), (0.49, 0.6), (0.6, 0.61), (0.62, 0.74), (0.74, 0.75), (0.76, 0.88),
    (0.88, 0.89), (0.9, 1.0), (1, 1),
]  # fmt: skip
# A staircase that stays above the diagonal.
STAIRS = [
    (0, 0), (0.02, 0.11), (0.1, 0.16), (0.14, 0.32), (0.25, 0.34), (0.31, 0.53), (0.42, 0.55),
    (0.48, 0.68), (0.58, 0.73), (0.68, 0.84), (0.8, 0.87), (0.87, 0.99), (1, 1),
]  # fmt: skip
# Below the diagonal: GOOD with TPR and FPR swapped (arcs right, then up); AUC = 1 - AUC(GOOD).
BAD = [(y, x) for x, y in GOOD]
CHANCE = [(0, 0), (1, 1)]
PERFECT = [(0, 0), (0, 1), (1, 1)]


# Blending with the diagonal (figstyle.roc_with_auc) keeps a curve monotone only when it moves
# the curve towards the diagonal, so every base shape is further from 0.5 than its target AUC.


def xy(points):
    xs, ys = zip(*points, strict=True)
    return list(xs), list(ys)
