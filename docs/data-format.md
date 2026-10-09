# Data format

The question bank is plain YAML under `src/content/`. The authoritative definition is the
pydantic model in [`tools/mlrecall/schema.py`](../tools/mlrecall/schema.py), exported to
`schema/*.schema.json` (`uv run mlr schema`) for editor autocompletion — VS Code picks it up via
`.vscode/settings.json` with the YAML extension.

```text
src/content/
├── taxonomy.yaml                 # domains → topics
├── sources.yaml                  # source registry (licenses, usage rules)
└── quizzes/<domain>/<topic>.yaml # one file per topic
    └── <topic>/                  # optional: figures for that topic
```

## Quiz file

```yaml
schema_version: 1
domain: dl
topic: cnn                 # must match the file name and taxonomy.yaml
title: Convolutional Neural Networks
description: Optional one-liner.
questions:
  - ...
```

## Question

| Field | Required | Notes |
| --- | --- | --- |
| `id` | ✓ | `<topic>-<NNN>`, permanent — see [conventions](conventions.md#ids-are-forever) |
| `type` | ✓ | `single` · `multiple` · `true_false` · `short_answer` |
| `difficulty` | reviewed | `easy` · `medium` · `hard` |
| `tags` | | kebab-case keywords |
| `shuffle` | | default `true`; `false` keeps option order (set automatically when an option says "both of the above", "(a) and (b)", …) |
| `question` | ✓ | Markdown + math |
| `figure` | | see [figures.md](figures.md) |
| `options` | choice types | 2–8 options: `text`, `correct: true`, `why` (per-option feedback), `image` |
| `answer` | `short_answer` | see below |
| `explanation` | reviewed | Markdown; **must cite** with `[^n]` when reviewed |
| `explanation_figure` | | shown after answering |
| `references` | reviewed | citations, numbered from 1 in list order |
| `source` | ✓ | provenance: `id` (registry), `ref` (locator inside it), `url` |
| `status` | ✓ | `draft` · `reviewed` · `retired` |

### Question types

| Type | Answer key | Grading |
| --- | --- | --- |
| `single` | exactly one option `correct: true` | auto |
| `multiple` | one or more options `correct: true` ("select all that apply") | auto, all-or-nothing |
| `true_false` | two options (True/False), one correct | auto |
| `short_answer` | `answer:` block, no `options` | auto if `accept`/`numeric` set, otherwise self-graded against `model` |

```yaml
# numeric, auto-graded
type: short_answer
answer:
  numeric: 760
  tolerance: 0          # absolute
  model: $10 \times 3 \times 5 \times 5 + 10 = 760$

# text, auto-graded: matched ignoring case, spaces and punctuation
answer:
  accept: [batch normalization, batchnorm, BN]
  model: Batch normalization

# open question, self-graded: the learner compares with the model answer
answer:
  model: |
    Softmax is invariant to adding a constant to all logits ...
```

### Citations

Two separate things:

- **`source`** — where the *question* comes from (provenance). Required. `source.id` must exist
  in `sources.yaml` and must not be a `reference`-only source.
- **`references`** — works that *support* the question or the explanation. Cite them inline with
  Markdown-footnote markers `[^1]`, `[^2]`, … in `question`, `explanation`, `answer.model` or an
  option's `why`. Markers inside code or math are ignored.

```yaml
explanation: |
  The kernel tensor has shape $c_o \times c_i \times k_h \times k_w$ [^1], plus one bias per
  output channel. Pooling layers add no parameters [^2].
references:
  - source: d2l                       # registry id, or `title:` for works not in the registry
    locator: Sec. 7.4 Multiple Input and Multiple Output Channels
    url: https://d2l.ai/chapter_convolutional-neural-networks/channels.html
    quote: the shape of the convolution kernel is c_o × c_i × k_h × k_w   # optional, ≤ 300 chars
  - source: d2l
    locator: Sec. 7.5 Pooling
```

Rules: every marker must point to an existing reference; a `reviewed` question needs at least one
marker in its explanation. Prefer precise locators (section, page, slide) over a bare URL.

### Status

| Status | Meaning | Shown in the app |
| --- | --- | --- |
| `draft` | imported or AI-generated, not yet checked by a human | yes, with an "unreviewed" badge (filter available) |
| `reviewed` | checked; has `difficulty` and a cited `explanation` | yes |
| `retired` | removed from rotation; id kept forever | no |

## Text: Markdown and math

- CommonMark + GFM (tables, code fences). Raw HTML is not rendered — write `\<mask>` for a
  literal `<mask>`.
- Math with KaTeX: `$...$` inline, `$$...$$` display. Escape a literal dollar as `\$`.
- Use KaTeX-supported commands only: `\operatorname*{arg\,min}` instead of `\argmin`,
  `\lVert x \rVert` instead of `\norm{x}`.
- In YAML, prefer literal blocks (`|`) or single quotes for text containing `\` — no escaping
  needed. Double-quoted strings need `\\`.

## Taxonomy and source registry

- `taxonomy.yaml`: `domains[].topics[]` with `id`, `title`, optional `description`.
- `sources.yaml`: `id`, `title`, `author`, `kind`, `url`, `repo`, `license` (SPDX), `license_url`,
  `usage` (`adapt` · `reference` · `original` · `private`), `pinned` (upstream revision used by the
  importer), `covers`, `plan`, `notes`. See [sources.md](sources.md).

## Validation

`uv run mlr check` fails on: schema errors, path/topic mismatch, unknown topic or source,
reference-only provenance, duplicate ids or source refs, missing figure files, citation markers
without references. It warns on: options that break shuffling, unbalanced `$`, near-duplicate
questions; and reports answer-position and "longest option is correct" bias.
