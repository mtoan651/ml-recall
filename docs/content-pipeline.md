# Content pipeline

How questions get into the bank, and the quality bar they must meet.

```text
                       ┌─ open-licensed quiz sets ──▶ mlr import <source> ─▶ curation ─┐
sources.yaml ──────────┤                                                               ├─▶ draft ─▶ review ─▶ reviewed
                       └─ materials/ (slides, PDFs) ─▶ extract ─▶ generate (Claude) ───┘      (mlr check at every step)
```

## Path A — import an open-licensed quiz set

For sources with `usage: adapt` that already contain questions (v0.1: HF LLM Course,
Microsoft AI/ML for Beginners, MMLU-Redux).

1. **Pin** the upstream revision in `sources.yaml` (`pinned:` commit SHA / dataset revision).
2. **Importer** in `tools/mlrecall/importers/` turns upstream data into items with a stable
   `ref` and a default topic. Downloads are cached in `materials/external/<source>/<pinned>/`.
3. **Curation** in `tools/curation/<source>.yaml` decides per item (see below).
4. **Merge**: `uv run mlr import <source> [--dry-run]` appends new items to topic files, allocates
   ids and sets `status: draft`. Re-running is idempotent (existing `source.ref`s are skipped).
5. `uv run mlr check`, review the diff, commit on a `content/...` branch.

### Curation

```yaml
exclude_prefixes:            # drop whole groups
  "chapter9/": tool-specific
items:
  "quiz-12/q2": {drop: inaccurate}         # reason code + optional comment
  "quiz-16/q2": {topic: metrics}            # re-topic
  "machine_learning/8":                     # fix upstream errors
    topic: ml-basics
    fix:
      correct: [2]                          # 0-based option indices
      explanation: ... [^1]
      references: [{source: mmlu-redux, locator: "row 8 — wrong_groundtruth"}]
```

Fix keys: `question`, `options` (`{index: new text}`), `correct`, `type`, `shuffle`,
`explanation`, `references`. Unlisted items are kept with the default topic; items flagged upstream
(e.g. MMLU-Redux error labels) are dropped unless they get a `fix`.

**Drop reasons:** `trivial` (obvious answer, joke distractors) · `lesson-specific` (needs the
lesson's code/dataset) · `tool-trivia` / `tool-specific` (library API trivia) · `inaccurate`
(wrong or misleading key) · `ambiguous` (several defensible answers, vague wording) ·
`off-scope` · `dated-trivia` (facts about specific papers/datasets) · `upstream-error`.

v0.1 result: 533 upstream questions → 328 kept (HF 86/132, AI4B 92/145, ML4B 60/156,
MMLU-Redux 90/100).

## Path B — generate from course materials

For lecture slides, PDFs and notes (`ncu-intro-dl`, and `adapt` books such as d2l). Planned to be
scripted in v0.3; the manual flow works today:

1. Put files in `materials/<source-id>/` (git-ignored).
2. **Extract** to Markdown — `markitdown` for PDF/PPTX/DOCX; `docling` when slides are
   formula/table heavy; render pages to PNG (PyMuPDF) when diagrams matter (Claude can read images).
3. **Generate** with Claude Code using [`prompts/generate-questions.md`](../prompts/generate-questions.md):
   one lecture/section per run, output appended to the right topic files as `draft`, with
   `source: {id: <source>, ref: lecture-05/slide-14}` and precise `references`.
4. **Validate** with `uv run mlr check` until clean.
5. **Review** (below), then PR.

Private materials (`usage: private`) are paraphrased into original questions — never copied
verbatim, never committed.

## Writing good questions

- **One idea per question.** The stem is answerable without looking at the options.
- **4 options** for new single/multiple questions; plausible distractors built from real
  misconceptions; similar length and grammar (the correct answer must not be the longest —
  `mlr check` reports the bias, aim < 40%).
- **No "all/none of the above"** in new questions; if unavoidable, set `shuffle: false`.
- **Mix per topic** (rough target): 40% concept · 30% calculation (shapes, parameter counts,
  gradients, complexity — prefer `short_answer` with `numeric`) · 20% code reading (PyTorch) ·
  10% true/false traps.
- **Explain why**, not just what: the explanation says why the key is right; `why` on options says
  why each distractor is wrong.
- **Cite** every factual claim in the explanation with `[^n]` and a precise locator. Prefer
  `adapt` sources (d2l, HF course, MLCC) and the course slides.
- **Exam style:** look at `reference` sources (CS189/CS230 exams) for the style of real exams,
  then write original questions.

## Review checklist (draft → reviewed)

- [ ] Key is correct (verify against the cited source, not memory).
- [ ] Stem is unambiguous; exactly the intended options are correct.
- [ ] Explanation present, cites `[^n]`, references resolve to the right section/page.
- [ ] `difficulty` set; tags meaningful.
- [ ] Math renders (balanced `$`, KaTeX-supported commands).
- [ ] No verbatim copying from `reference`/`private` sources.
- [ ] Then set `status: reviewed`; `mlr check` passes.

## Copyright rules

| `usage` | What you may do |
| --- | --- |
| `adapt` | import/adapt with attribution; keep the upstream license notice (THIRD_PARTY_NOTICES.md) |
| `reference` | read and cite; write original questions (`source: original`) |
| `private` | paraphrase into original questions; never commit the material |
| `original` | written for this repo, CC BY-SA 4.0 |

`mlr check` rejects questions whose `source` is a `reference`-only source.
