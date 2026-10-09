# Changelog

All notable changes are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org) as defined in [docs/conventions.md](docs/conventions.md#versioning).

## [Unreleased]

### Changed

- Course materials are kept outside the repository (`../materials/`); upstream downloads are
  cached in the git-ignored `.cache/upstream/` instead of `materials/external/`.

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

[Unreleased]: https://github.com/mtoan65/ml-recall/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mtoan65/ml-recall/releases/tag/v0.1.0
