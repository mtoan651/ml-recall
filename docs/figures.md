# Figures: diagrams and plots

Principle: **text if possible → figure generated from code → static image last.** Generated
figures are editable, diffable, and their answers are correct by construction (you know the data).

## What to use

| Kind | Examples | Tool | Served as |
| --- | --- | --- | --- |
| Tables, small matrices | confusion matrix, conv input/kernel | Markdown table or `\begin{bmatrix}` | no image |
| Plots | loss curves, decision boundaries, activations, ROC/PR, GD contours | matplotlib script | SVG |
| Structured graphs | computational graph (backprop), decision tree, small MLP | Graphviz DOT | SVG |
| Free-form architecture | CNN blocks, transformer block, attention | Excalidraw → export SVG with *Embed scene* (`.excalidraw.svg`, re-editable) | SVG |
| Real images | MNIST samples, feature maps | PNG/JPG (converted to WebP by the app) | WebP |
| Figures from slides/papers | — | **redraw**, or reuse openly licensed SVGs (e.g. d2l `img/*.svg`, CC BY-SA, cite it) | — |

## Schema

```yaml
- id: training-031
  question: Given the loss curves below, what is the most likely problem?
  figure:
    src: ./training/training-031.svg      # relative to the YAML file; checked by mlr check
    alt: Train loss keeps decreasing; validation loss bottoms out around epoch 25–30, then rises.
  options: ...
  explanation_figure:                      # optional, shown after answering
    src: ./training/training-031-annotated.svg
    alt: Same curves with the early-stopping point marked.
```

Options can carry `image:` too (e.g. "Which plot shows a learning rate that is too high?").

## Layout

```text
src/content/quizzes/dl/
├── training.yaml
└── training/
    ├── training-031.py          # generator (matplotlib)
    ├── training-031.svg         # committed output — the site build needs no Python
    ├── training-040.dot
    ├── training-040.svg
    └── training-052.excalidraw.svg
```

A generator script imports the shared style helper `tools/mlrecall/figstyle.py`: a common
matplotlib style (colour-blind-safe palette, light grid, no top/right spines) and `save()`, which
writes deterministic SVG (fixed `svg.hashsalt`, no date) so re-running produces no git diff. It also
has helpers for ROC curves (`plot_roc`, `roc_with_auc` hits an exact AUC), schematic loss-curve axes,
noise-free histograms, boxes/arrows, depth-two decision trees and equations with numbered,
underlined parts (`equation_parts`). Other `.py` files next to the generators (e.g. shared shapes)
are helpers.

```bash
uv run mlr figs            # re-render generators newer than their SVG (or whose helpers changed)
uv run mlr figs --force    # re-render everything
uv run mlr figs --check    # list stale figures, exit 1 if any
FIGSTYLE_PREVIEW=/tmp/prev uv run mlr figs --force   # also write PNG previews to look at
```

matplotlib is a dev dependency (`uv sync`); the site build only needs the committed SVGs.

```python
import numpy as np
import matplotlib.pyplot as plt
from mlrecall.figstyle import save

ep = np.arange(1, 101)
train = 2 * np.exp(-ep / 8) + 0.05
val = 2 * np.exp(-ep / 8) + 0.15 + 0.008 * np.maximum(ep - 20, 0)
fig, ax = plt.subplots(figsize=(5, 3))
ax.plot(ep, train, label="train")
ax.plot(ep, val, label="validation")
ax.set(xlabel="epoch", ylabel="loss")
ax.legend()
save(fig, __file__)  # → training-031.svg next to this file
```

## Rules

- **Don't leak the answer**: file names use the question id (not `overfitting.svg`); `alt`
  describes what is visible, never the conclusion; legends/titles don't name the answer.
- `alt` is required (≥ 10 chars).
- Questions that require reading values need gridlines/ticks.
- In the app, figures sit on a white card in both themes (dark-mode safe), are lazy-loaded and
  zoomable; image options render as a 2×2 grid.

## Redrawing upstream pictures

Imported questions whose stem or options show a picture are **kept and redrawn**, not dropped:

1. Look at the original (it may only be cited, never committed) and write a generator that redraws
   the same content: same data, shapes, labels and layout, in our style. Put the source in the
   docstring ("redrawn from Google MLCC, Figure 21"). Construct data so the key holds by
   construction and `assert` it (e.g. both MSEs, an exact AUC, vector angles).
2. Rewrite the stem so it points at "the figure below" instead of "Figure 7 above", and move values
   that were only on the page into the stem or the figure.
3. Name files after the question id: `<id>.svg` for the stem figure, `<id>-a.svg`, `<id>-b.svg` …
   for option images (in option order). Write `alt` that describes what is visible.
4. Record everything in the source's curation `fix` (`question`, `figure`, `images`,
   `explanation_figure`, and `answer.model` when the upstream solution was a picture), so a fresh
   import reproduces the question; then `mlr import --dry-run` adds nothing.

Equations that upstream showed as annotated images become `equation_parts` figures plus a written
model answer. `mlr check` treats questions with different figures as distinct, even when the stems
match.

## From course materials

Render slide pages to PNG (PyMuPDF), let Claude Code read the image and write the question plus a
figure generator that **redraws** the idea; never commit the original slide image.
