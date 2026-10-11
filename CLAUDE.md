# CLAUDE.md

ml-recall: an active-recall question bank for AI/ML/DL (YAML in git) with Python data tooling
and a static Astro quiz site (`docs/web-app.md`). Start with `docs/overview.md`.

## Commands

```bash
uv sync                          # install tooling
uv run mlr check                 # validate bank + quality report (must pass before committing)
uv run mlr import <source|all> [--dry-run]
uv run mlr sync-curation [--check]  # record bank edits of imported questions as curation fixes
uv run mlr stats                 # Markdown stats table (README)
uv run mlr schema                # re-export schema/*.schema.json after editing schema.py
uv run mlr figs                  # re-render question figures from their generator scripts
uv run pytest && uv run ruff check . && uv run ruff format --check .

pnpm install && pnpm dev         # web app at http://localhost:4321/ml-recall/ (Node 24 + pnpm)
pnpm lint && pnpm test && pnpm check && pnpm build   # must pass before committing web changes
```

## Where things are

- Questions: `src/content/quizzes/<domain>/<topic>.yaml`; taxonomy and source registry next to them.
- Schema (source of truth): `tools/mlrecall/schema.py` → spec in `docs/data-format.md`;
  mirrored in Zod for the web build (`src/lib/schema.ts`) — change both together.
- Web app: `src/pages/`, `src/components/` (React quiz island), pure logic in `src/lib/`.
- Importers: `tools/mlrecall/importers/`; per-item curation: `tools/curation/<source>.yaml`.
- Raw course materials: `../materials/` (outside the repo — never commit or quote verbatim).
  Upstream downloads and extracted text: `.cache/` (git-ignored).

## Rules

- Follow `docs/conventions.md` (naming, ids, versioning) and `docs/git-workflow.md`
  (branch `<type>/<desc>`, squash merge, Conventional Commit titles).
- Question ids are permanent: never renumber/reuse/delete — use `status: retired`.
- New or generated questions are `draft`. A question becomes `reviewed` with `reviewed_by: owner`
  when the user has verified it, or `reviewed_by: claude` when Claude reviewed it at the user's
  request (key re-derived, explanation cited); reviewed questions need `difficulty`, an
  explanation that cites `[^n]` references, and `reviewed_by`.
- Never use a `reference`-only source as `source.id`; write an original question and cite it.
- The project is non-commercial (study and research). Sources under NonCommercial licences
  without ND (e.g. CC BY-NC-SA) may be adapted; each question keeps its source's licence. ND,
  all-rights-reserved and unlicensed material stays reference-only (the repo and site are public).
- When generating questions, follow `prompts/generate-questions.md` and
  `docs/content-pipeline.md#writing-good-questions`. Verify facts against the cited source.
- Do not fetch pages whose terms forbid ingestion by LLMs/AI (e.g. all OpenStax books, checked
  2026-10-11; see `docs/sources.md`), and do not cite them. Bans on *training* models only don't
  apply — we don't train.
- Keep imported questions that show pictures: redraw them from code (`docs/figures.md`), don't drop them.
- Keep and fix rather than drop or retire: drop an upstream item only for a content reason
  (`docs/content-pipeline.md#curation`), and record every bank edit of an imported question
  as a curation `fix` so a fresh import reproduces it (`uv run mlr sync-curation` does this).
- Run `uv run mlr check` after every data change and fix all errors.
