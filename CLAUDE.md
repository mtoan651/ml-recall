# CLAUDE.md

ml-recall: an active-recall question bank for AI/ML/DL (YAML in git) with Python data tooling;
a static Astro quiz site comes in v0.2. Start with `docs/overview.md`.

## Commands

```bash
uv sync                          # install tooling
uv run mlr check                 # validate bank + quality report (must pass before committing)
uv run mlr import <source|all> [--dry-run]
uv run mlr stats                 # Markdown stats table (README)
uv run mlr schema                # re-export schema/*.schema.json after editing schema.py
uv run pytest && uv run ruff check . && uv run ruff format --check .
```

## Where things are

- Questions: `src/content/quizzes/<domain>/<topic>.yaml`; taxonomy and source registry next to them.
- Schema (source of truth): `tools/mlrecall/schema.py` → spec in `docs/data-format.md`.
- Importers: `tools/mlrecall/importers/`; per-item curation: `tools/curation/<source>.yaml`.
- Raw/private materials: `materials/` (git-ignored — never commit or quote it verbatim).

## Rules

- Follow `docs/conventions.md` (naming, ids, versioning) and `docs/git-workflow.md`
  (branch `<type>/<desc>`, squash merge, Conventional Commit titles).
- Question ids are permanent: never renumber/reuse/delete — use `status: retired`.
- New or generated questions are `draft`. Only mark `reviewed` when the user has verified them;
  reviewed questions need `difficulty` and an explanation that cites `[^n]` references.
- Never use a `reference`-only source as `source.id`; write an original question and cite it.
- When generating questions, follow `prompts/generate-questions.md` and
  `docs/content-pipeline.md#writing-good-questions`. Verify facts against the cited source.
- Run `uv run mlr check` after every data change and fix all errors.
