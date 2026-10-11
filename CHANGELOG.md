# Changelog

All notable changes are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org) as defined in [docs/conventions.md](docs/conventions.md#versioning).

## [Unreleased]

### Changed

- Dropped upstream questions were re-reviewed under a keep-and-fix rule: an item is dropped only
  for a content reason (off-scope, trivial, tool-specific, duplicate, dated trivia), while
  ambiguous, inaccurate and lesson-specific ones are fixed. 287 more upstream questions kept
  (942 of 1139): numpy-100 +34, MS Data Science +55, MS AI +49, MS ML +52, MMLU-Redux +53, HF
  LLM/Agents/Deep RL +29, Google +15. Every fix is a curation `fix`, so a fresh import
  reproduces the bank.
- Deep Learning Interviews is no longer an `adapt` source: arXiv lists CC BY 4.0, but the
  book's own copyright page reserves all rights and forbids quoting or paraphrasing. d2l
  (pinned at d2l-en 23d7a5a) is used instead.
- Practice and timed tests share one question bank: tests draw from every question of the
  topic or tag (e.g. NumPy: 1 → 64 questions to draw from, Q-learning: 8 → 20).
- Short answers are always fill-ins, graded automatically: one number or word/phrase, or a
  **gap-fill** with blanks `{{1}}`, `{{2}}`… inside the question (an input in place of each
  blank; correct when every blank is). The 85 open, self-graded questions (63 numpy-100, 21 HF
  Deep RL, 1 original) were converted — none retired — and self-grading is gone from practice
  and tests. Schema: `AnswerKey`, `ShortAnswer.blanks`, optional `model`; `mlr check` and the
  build reject open short answers and misplaced or misnumbered blanks.
- `openstax-intro-stats` is now `reference` and not used: OpenStax moved to CC BY-NC-SA 4.0 and
  forbids ingestion into LLMs/generative AI (checked 2026-10-11). CLAUDE.md and docs/sources.md say not to
  fetch or cite such sources.

### Added

- 67 questions for the thinnest topics, from d2l exercises (36) and original questions citing
  d2l, scikit-learn, Distill and Wikipedia (31): information theory 1 → 17, logistic
  regression 6 → 20, learning theory 3 → 22, dimensionality reduction 1 → 19.
- Picture questions are kept and redrawn: 20 questions that had been dropped as image-only or
  page-dependent are restored (Google MLCC 11, Google ML courses 4, HF Deep RL 5), and 21
  questions (17 restored + 4 already kept) now show 30 SVG figures generated from code — ROC curves with exact AUCs, loss curves, histograms,
  scatter plots, a fairness prediction grid, similarity vectors, decision trees with their
  prediction map, a network diagram, and the Bellman/TD/Monte Carlo/Q-learning equations with
  numbered parts (with written model answers). `tools/mlrecall/figstyle.py` (shared style and
  helpers, deterministic SVG), `mlr figs` (re-render stale figures), curation fixes for `figure`,
  `images`, `explanation_figure` and `answer`; `mlr check` no longer flags same-stem questions
  about different figures as duplicates.
- 129 draft questions from three new sources: Google Machine Learning Crash Course (44), Google's
  Decision Forests, Clustering, GANs and Problem Framing courses (22) — page quizzes with
  per-option feedback, CC BY 4.0 — and numpy-100 (63 NumPy exercises, MIT). Stems that
  relied on a picture or an interactive widget were rewritten to stand alone; weak upstream
  feedback was replaced by cited explanations. New importers `google_ml` and `numpy_100`;
  curation `fix.why` edits or removes option feedback.
- Timed tests for every topic and tag (`/topics/<topic>/exam/`, `/tags/<tag>/exam/`): up to 20
  random auto-graded questions, 1 minute each, one question per screen or all on one page. The
  clock runs from the start time, a reload resumes the test, it is submitted at 00:00, and the
  results page explains every question. Best score and history per topic/tag.
- Regex-graded short answers: `pattern` (full match, case-insensitive, NFKC, ASCII semantics,
  checked in Python and JavaScript) and `hint` (format guidance under the input).
- "No explanation yet" notice for questions without any explanation.
- 178 draft questions from four new importers (pinned upstream revisions, per-item curation):
  Hugging Face Deep RL Course (36), Hugging Face AI Agents Course
  (19), Microsoft Data Science for Beginners (15) and MMLU-Redux `high_school_statistics` (75, 2
  answer keys corrected) and `college_mathematics` (33). Topics with ≥ 20 questions: 4 → 7;
  `rag-agents` and `policy-gradient` are no longer empty.
- Source registry: `hf-deep-rl-course`, `hf-agents-course`, `ms-ds-for-beginners`,
  `openintro-stats` (CC BY-SA 3.0) and `openstax-intro-stats` (reference only, see Changed) — 25
  external sources.
- Cited explanations for all 395 imported questions that had none (all still `draft`):
  each answer key re-solved first, every `[^n]` reference opened and checked, `difficulty` set,
  lesson references narrowed to the section that covers the point. Main sources: d2l, the
  course lessons, OpenIntro *Introduction to Modern Statistics*, Penn State STAT notes, Sutton &
  Barto, scikit-learn, CS229, Interactive Linear Algebra, Active Calculus.
- Curation: `default_drop` keep-lists, per-item overrides of `exclude_prefixes`, `keep: true` for
  flagged items.

### Fixed

- Audit of all 712 questions: every key re-solved, numbers recomputed. 2 wrong keys
  (training-004 had two valid loop orders; huggingface-021 relied on `as_target_tokenizer`,
  removed in Transformers v5), about 80 major issues (second defensible options, missing
  context, misleading or pasted-together upstream explanations, chapter-intro citations,
  fill-in keys that accepted wrong code such as unbracketed shapes or einsum strings without
  commas) and about 250 minor ones (plain-text math → KaTeX, typos, options named by letter,
  "all of the above", length giveaways). Longest-option bias 37% → 30%.
- Equation figures put the underline below the deepest descender (q-learning-019).
- Penn State STAT links point at the current URLs (without `.html`).
- `trees-ensembles-006`: the MMLU key "weak classifiers" contradicted how bagging works; the
  question is reworded with a new key (bootstrap samples + averaging). `statistics-005`: the
  distractor "a class of data" was also correct and is replaced. `statistics-021`: restored the
  missing ≠ in $H_a$. `policy-gradient-007`: "n strategies" → "n trajectories". All four are
  recorded as curation fixes.
- Dollar amounts in imported statistics questions are escaped (`\$`) so KaTeX does not treat them
  as math.

## [0.2.0] — 2026-10-10

### Added

- Quiz website (Astro 7 + React + Tailwind), live at <https://mtoan651.github.io/ml-recall/>:
  topic and tag practice pages, all four question types (short answers auto- or self-graded),
  option shuffling that respects `shuffle: false`, per-option feedback, explanations with
  footnoted references and source/license, reviewed-only filter, end-of-session summary with
  "retry missed", keyboard shortcuts, progress in the browser. Build-time Markdown + KaTeX + Shiki;
  the build fails on schema, reference or LaTeX errors (Zod mirror of the pydantic schema).
- CI builds and tests the web app; a `deploy` job publishes `main` to GitHub Pages.
- 51 questions paraphrased from CE6146 Exercises 1–3 (`ncu-intro-dl`; tags `ce6146`,
  `ce6146-ex01`…`ex03`), each citing lecture slides and *Dive into Deep Learning*, reviewed by the
  maintainer. The answer key of Exercise 2 Q1 is corrected (regression, not clustering).
- `docs/web-app.md`; new topic file `dl/frameworks.yaml`.

### Changed

- Published as `github.com/mtoan651/ml-recall`; `main` is protected (PR + CI required, squash only).
- Course materials are kept outside the repository (`../materials/`); upstream downloads are
  cached in the git-ignored `.cache/upstream/` instead of `materials/external/`.

### Fixed

- Stray escaped quotes (`\"`) in the `ncu-intro-dl` notes in `sources.yaml`.

Bank: 384 questions (56 reviewed, 328 draft) — ml 111, dl 104, nlp 47, practice 27, math 22, ai 21,
llm 20, rl 12, cv 10, gen 10.

## [0.1.0] — 2026-10-09

### Added

- Question bank schema (`schema_version: 1`): types `single`, `multiple`, `true_false`,
  `short_answer`; `references` with `[^n]` citation markers; `source` provenance; statuses
  `draft` / `reviewed` / `retired`; figures. Exported to `schema/*.schema.json`.
- `mlr` CLI: `check` (integrity errors, quality warnings, bias report), `import`, `schema`, `stats`.
- Taxonomy: 10 domains, 54 topics. Source registry: 20 external sources + `original`, `ncu-intro-dl`.
- Importers with pinned revisions and per-item curation for 4 sources:
  HF LLM Course (86 of 132), Microsoft AI for Beginners (92 of 145),
  Microsoft ML for Beginners (60 of 156), MMLU-Redux `machine_learning` (90 of 100;
  2 answer keys corrected, 4 flagged rows repaired).
- 5 original reviewed questions (4 `short_answer`, 1 `multiple`) citing *Dive into Deep Learning*.
- Project handbook in `docs/`, `CLAUDE.md`, question-generation prompt, CI workflow.

Bank: 333 questions (328 draft, 5 reviewed) — ml 97, dl 77, nlp 47, practice 27, ai 20, llm 20,
math 13, rl 12, cv 10, gen 10.

[Unreleased]: https://github.com/mtoan651/ml-recall/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/mtoan651/ml-recall/releases/tag/v0.2.0
[0.1.0]: https://github.com/mtoan651/ml-recall/releases/tag/v0.1.0
