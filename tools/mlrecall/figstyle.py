"""Shared style and helpers for question figures (docs/figures.md).

A figure generator lives next to its topic file, named after the question id
(`src/content/quizzes/ml/metrics/metrics-021.py`), and calls `save(fig, __file__)` to write the
SVG beside it. Output is deterministic (fixed hash salt, no date), so re-running a generator
produces no diff. Figures are drawn for a white background; the app shows them on a white card
in both themes.
"""

from __future__ import annotations

import os
from collections.abc import Sequence
from pathlib import Path

import matplotlib

matplotlib.use("svg")

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.backends.backend_agg import FigureCanvasAgg  # noqa: E402
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Rectangle  # noqa: E402

# Colour-blind-safe palette (Okabe–Ito inspired), darker shades for lines on white.
BLUE = "#1f6fb5"
ORANGE = "#e08a2c"
GREEN = "#2e8b57"
RED = "#c8453b"
PURPLE = "#7b4fa3"
TEAL = "#2a8c8c"
GRAY = "#9aa0a6"
INK = "#202124"
MUTED = "#5f6368"
LIGHT = "#e8eaed"

PALETTE = [BLUE, ORANGE, GREEN, RED, PURPLE, TEAL]

plt.rcParams.update(
    {
        "svg.hashsalt": "ml-recall",
        "svg.fonttype": "path",
        "font.family": "DejaVu Sans",
        "font.size": 11,
        "axes.titlesize": 12,
        "axes.labelsize": 11,
        "axes.edgecolor": INK,
        "axes.labelcolor": INK,
        "axes.linewidth": 1.0,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.prop_cycle": plt.cycler(color=PALETTE),
        "xtick.color": INK,
        "ytick.color": INK,
        "grid.color": LIGHT,
        "grid.linewidth": 0.8,
        "legend.frameon": False,
        "lines.linewidth": 2.0,
        "figure.dpi": 100,
        "savefig.bbox": "tight",
        "savefig.pad_inches": 0.08,
        "savefig.facecolor": "white",
        "mathtext.fontset": "dejavusans",
    }
)


def save(fig: plt.Figure, script: str, suffix: str = "") -> Path:
    """Write `<script stem><suffix>.svg` next to the generator and close the figure.

    With FIGSTYLE_PREVIEW=<dir>, also write a PNG preview there (for reviewing, not committed).
    """
    path = Path(script).with_suffix("")
    out = path.with_name(f"{path.name}{suffix}.svg")
    fig.savefig(out, format="svg", metadata={"Date": None, "Creator": None})
    preview = os.environ.get("FIGSTYLE_PREVIEW")
    if preview:
        Path(preview).mkdir(parents=True, exist_ok=True)
        fig.savefig(Path(preview) / f"{out.stem}.png", format="png", dpi=110)
    plt.close(fig)
    return out


# --------------------------------------------------------------------------- plots


def roc_axes(ax: plt.Axes) -> None:
    """Unit square ROC axes: FPR on x, TPR on y, light grid, no chart junk."""
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1.02)
    ax.set_aspect("equal")
    ax.set_xticks([0, 0.5, 1.0])
    ax.set_yticks([0, 0.5, 1.0])
    ax.set_xlabel("False positive rate (FPR)")
    ax.set_ylabel("True positive rate (TPR)")
    ax.grid(True, zorder=0)


def auc(fpr: Sequence[float], tpr: Sequence[float]) -> float:
    """Area under a piecewise-linear curve (trapezoid rule)."""
    x, y = np.asarray(fpr, float), np.asarray(tpr, float)
    return float(np.sum((x[1:] - x[:-1]) * (y[1:] + y[:-1]) / 2))


def roc_with_auc(fpr: Sequence[float], tpr: Sequence[float], target: float) -> np.ndarray:
    """Blend a curve with the chance diagonal so its AUC equals `target` exactly.

    Mixing TPR with FPR keeps the end points and scales the area around 0.5:
    AUC(λ·tpr + (1-λ)·fpr) = λ·AUC + (1-λ)·0.5.
    """
    x, y = np.asarray(fpr, float), np.asarray(tpr, float)
    base = auc(x, y)
    lam = (target - 0.5) / (base - 0.5)
    if not 0 < lam <= 1:
        raise ValueError(f"base AUC {base:.3f} must be further from 0.5 than the target {target}")
    return lam * y + (1 - lam) * x


def plot_roc(
    ax: plt.Axes,
    fpr: Sequence[float],
    tpr: Sequence[float],
    color: str,
    linestyle: str = "-",
    label_auc: bool = True,
    label_xy: tuple[float, float] = (0.6, 0.2),
) -> None:
    roc_axes(ax)
    ax.fill_between(fpr, tpr, color=color, alpha=0.18, linewidth=0, zorder=1)
    ax.plot(fpr, tpr, color=color, linestyle=linestyle, linewidth=2.4, zorder=3)
    if label_auc:
        ax.text(
            *label_xy,
            f"AUC = {_auc_label(auc(fpr, tpr))}",
            fontsize=12,
            color=INK,
            ha="center",
            zorder=4,
            bbox={"boxstyle": "round,pad=0.25", "fc": "white", "ec": "none", "alpha": 0.85},
        )


def _auc_label(value: float) -> str:
    """0.77 → "0.77", 0.5 → "0.5", 1 → "1.0" (as on the course's figures)."""
    text = f"{value:.3f}".rstrip("0")
    return text + "0" if text.endswith(".") else text


def schematic_axes(ax: plt.Axes, xlabel: str = "Training steps", ylabel: str = "Loss") -> None:
    """Axes for a qualitative curve: arrows instead of ticks, labels only."""
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    for side in ("left", "bottom"):
        ax.spines[side].set_linewidth(1.4)
    ax.plot(1, 0, ">", color=INK, transform=ax.transAxes, clip_on=False, markersize=7)
    ax.plot(0, 1, "^", color=INK, transform=ax.transAxes, clip_on=False, markersize=7)


def histogram_from_density(
    ax: plt.Axes,
    edges: np.ndarray,
    density,
    total: int,
    color: str = BLUE,
) -> np.ndarray:
    """Bars whose heights follow `density` exactly (no sampling noise), `total` examples."""
    centers = (edges[:-1] + edges[1:]) / 2
    weights = np.maximum(density(centers), 0)
    counts = np.round(total * weights / weights.sum())
    ax.bar(
        centers,
        counts,
        width=np.diff(edges),
        color=color,
        edgecolor="white",
        linewidth=0.6,
        zorder=2,
    )
    ax.grid(True, axis="y", zorder=0)
    return counts


# --------------------------------------------------------------------------- diagrams


def box(
    ax: plt.Axes,
    xy: tuple[float, float],
    text: str,
    *,
    rounded: bool = False,
    fc: str = "white",
    ec: str = INK,
    width: float | None = None,
    height: float = 0.5,
    fontsize: float = 11,
) -> tuple[float, float, float, float]:
    """A labelled box centred at `xy`; returns (x, y, w, h) of its outline."""
    w = width if width is not None else 0.13 * len(text) + 0.35
    x, y = xy[0] - w / 2, xy[1] - height / 2
    style = "round,pad=0.02,rounding_size=0.18" if rounded else "square,pad=0.02"
    ax.add_patch(FancyBboxPatch((x, y), w, height, boxstyle=style, fc=fc, ec=ec, lw=1.3, zorder=3))
    ax.text(*xy, text, ha="center", va="center", fontsize=fontsize, color=INK, zorder=4)
    return x, y, w, height


def arrow(
    ax: plt.Axes,
    start: tuple[float, float],
    end: tuple[float, float],
    color: str = INK,
    label: str | None = None,
    label_side: float = 1.0,
) -> None:
    """A straight arrow, optionally labelled at its midpoint (offset to one side)."""
    ax.add_patch(
        FancyArrowPatch(
            start, end, arrowstyle="-|>", mutation_scale=12, color=color, lw=1.6, zorder=2
        )
    )
    if label:
        mx, my = (start[0] + end[0]) / 2, (start[1] + end[1]) / 2
        ax.text(
            mx + 0.12 * label_side,
            my,
            label,
            color=color,
            fontsize=10,
            ha="left" if label_side > 0 else "right",
            va="center",
        )


def decision_tree(
    ax: plt.Axes,
    root: str,
    yes: str | tuple[str, str, str],
    no: str | tuple[str, str, str],
    leaf_style: dict[str, str] | None = None,
) -> None:
    """A depth-two binary tree: `yes`/`no` are leaves or (condition, yes-leaf, no-leaf).

    Conditions are square boxes, leaves rounded; Yes arrows go left (green), No right (red).
    """
    leaf_style = leaf_style or {}

    def leaf(xy, name):
        box(ax, xy, name, rounded=True, fc=leaf_style.get(name, "white"), width=1.35)

    def node(xy, spec, spread):
        if isinstance(spec, str):
            leaf(xy, spec)
            return
        cond, y_leaf, n_leaf = spec
        box(ax, xy, cond, width=1.45)
        left, right = (xy[0] - spread, xy[1] - 1.25), (xy[0] + spread, xy[1] - 1.25)
        arrow(ax, (xy[0] - 0.2, xy[1] - 0.27), (left[0] + 0.15, left[1] + 0.3), GREEN, "Yes", -1)
        arrow(ax, (xy[0] + 0.2, xy[1] - 0.27), (right[0] - 0.15, right[1] + 0.3), RED, "No", 1)
        node(left, y_leaf, spread / 2)
        node(right, n_leaf, spread / 2)

    node((0, 0), (root, yes, no), 1.5)
    ax.set_xlim(-3.1, 3.1)
    ax.set_ylim(-3.0, 0.45)
    ax.set_aspect("equal")
    ax.axis("off")


def equation_parts(
    ax: plt.Axes,
    parts: Sequence[tuple],
    *,
    y: float = 0.62,
    fontsize: float = 26,
) -> list[tuple[float, float]]:
    """Typeset an equation from mathtext `parts`, underlining and numbering the coloured ones.

    Each part is `(tex, colour)` or `(tex, colour, label)`. Coloured parts get a bar underneath
    with a numbered badge; the number counts up unless an explicit `label` repeats an earlier one
    (e.g. the same term appearing twice). Returns each coloured part's (x0, x1) in axes units.
    """
    # Measure with an Agg renderer at the figure's dpi (the SVG canvas cannot measure text).
    renderer = FigureCanvasAgg(ax.figure).get_renderer()
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    x, placed = 0.0, []
    for part in parts:
        tex, color, *rest = part
        t = ax.text(x, y, f"${tex}$", fontsize=fontsize, color=INK, ha="left", va="baseline")
        bb = t.get_window_extent(renderer).transformed(ax.transAxes.inverted())
        placed.append((t, bb, color, rest[0] if rest else None))
        x = bb.x1 + 0.008
    shift = (1 - x) / 2  # centre the whole equation
    # One bar height for all parts, clear of the deepest descender (e.g. the subscript of max).
    bar_y = min(y - 0.13, min(bb.y0 for _t, bb, _c, _l in placed) - 0.05)
    spans, number = [], 0
    for t, bb, color, label in placed:
        t.set_x(bb.x0 + shift)
        if not color:
            continue
        x0, x1 = bb.x0 + shift + 0.004, bb.x1 + shift - 0.004
        ax.plot(
            [x0, x1],
            [bar_y, bar_y],
            color=color,
            linewidth=5,
            solid_capstyle="butt",
            clip_on=False,  # a long equation may overflow the axes; the tight bbox keeps it
        )
        if label is None:
            number += 1
            label = str(number)
        ax.text(
            (x0 + x1) / 2,
            bar_y - 0.19,
            label,
            fontsize=13,
            color="white",
            ha="center",
            va="center",
            fontweight="bold",
            bbox={"boxstyle": "circle,pad=0.3", "fc": color, "ec": "none"},
            clip_on=False,
        )
        spans.append((x0, x1))
    return spans


# --------------------------------------------------------------------------- graphs

_FACTOR_LABEL = {
    "above": (0, 0.2, "center", "bottom"),
    "below": (0, -0.2, "center", "top"),
    "left": (-0.2, 0, "right", "center"),
    "right": (0.2, 0, "left", "center"),
}


def graph_figure(
    panels: Sequence[dict],
    figsize: tuple[float, float],
    fontsize: int = 12,
    node_radius: float = 0.3,
    pad: float = 0.5,
) -> plt.Figure:
    """Graphical-model diagrams, one panel per dict, side by side.

    A panel has `nodes` {name: (x, y, label)} drawn as circles (names in `shaded` are filled, i.e.
    observed), optional `factors` {name: (x, y, label, side)} drawn as small black squares with
    the label above/below/left/right, and `edges` [(a, b, kind, rad)] where kind "d" is an arrow
    and "u" a line, bent by `rad` (0 = straight). Optional `title` (under the panel) and `top`
    (extra headroom). Coordinates are data units; give them as in the source figure. `pad` is the
    margin around the outermost nodes.
    """
    fig, axes = plt.subplots(1, len(panels), figsize=figsize, squeeze=False)
    for ax, panel in zip(axes[0], panels, strict=False):
        _draw_graph(ax, panel, fontsize, node_radius)
        points = [v[:2] for v in [*panel["nodes"].values(), *panel.get("factors", {}).values()]]
        xs, ys = [x for x, _ in points], [y for _, y in points]
        bottom = 0.75 if panel.get("title") else 0
        ax.set_xlim(min(xs) - pad, max(xs) + pad)
        ax.set_ylim(min(ys) - pad - bottom, max(ys) + pad + panel.get("top", 0))
    return fig


def _draw_graph(ax: plt.Axes, panel: dict, fontsize: int, radius: float) -> None:
    nodes, patches = panel["nodes"], {}
    for name, (x, y, label) in nodes.items():
        shaded = name in panel.get("shaded", ())
        c = Circle((x, y), radius, fc=LIGHT if shaded else "white", ec=INK, lw=1.4, zorder=3)
        ax.add_patch(c)
        patches[name] = c
        ax.text(x, y, label, ha="center", va="center", fontsize=fontsize, color=INK, zorder=4)
    for name, (x, y, label, side) in panel.get("factors", {}).items():
        s = 0.16
        sq = Rectangle((x - s / 2, y - s / 2), s, s, fc=INK, ec=INK, zorder=3)
        ax.add_patch(sq)
        patches[name] = sq
        dx, dy, ha, va = _FACTOR_LABEL[side]
        ax.text(x + dx, y + dy, label, ha=ha, va=va, fontsize=fontsize - 1, color=INK)
    centers = {k: v[:2] for k, v in {**nodes, **panel.get("factors", {})}.items()}
    for a, b, kind, rad in panel["edges"]:
        ax.add_patch(
            FancyArrowPatch(
                posA=centers[a],
                posB=centers[b],
                patchA=patches[a],
                patchB=patches[b],
                arrowstyle="-|>" if kind == "d" else "-",
                mutation_scale=14,
                connectionstyle=f"arc3,rad={rad}",
                color=INK,
                lw=1.5,
                zorder=2,
            )
        )
    if panel.get("title"):
        points = [v[:2] for v in [*nodes.values(), *panel.get("factors", {}).values()]]
        xs, ys = [x for x, _ in points], [y for _, y in points]
        ax.text(
            (min(xs) + max(xs)) / 2,
            min(ys) - radius - 0.35,
            panel["title"],
            ha="center",
            va="top",
            fontsize=fontsize,
            color=INK,
            fontweight="bold",
        )
    ax.set_aspect("equal")
    ax.axis("off")
    ax.autoscale_view()
