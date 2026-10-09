# Changelog

All notable changes are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org) as defined in [docs/conventions.md](docs/conventions.md#versioning).

## [Unreleased]

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
