# Conventions

Naming, versioning and style rules. They are enforced by `mlr check`, ruff and review — when a
rule here and the tooling disagree, fix one of them in the same PR.

## Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Repository | `ml-recall` (the local folder name may differ) | `github.com/mtoan651/ml-recall` |
| Directories, data files, docs | `kebab-case` | `docs/content-pipeline.md` |
| Python modules | `snake_case` (PEP 8) | `tools/mlrecall/hf_course.py` |
| TypeScript (web app) | components `PascalCase.tsx`, everything else `kebab-case.ts` | `QuestionCard.tsx`, `shuffle.ts` |
| Domain id | short lowercase slug | `dl`, `ml`, `llm` |
| Topic id | `kebab-case`, ≤ 3 words, **globally unique, never renamed** | `cnn`, `trees-ensembles` |
| Quiz file | `src/content/quizzes/<domain>/<topic>.yaml` | `quizzes/dl/cnn.yaml` |
| Question id | `<topic>-<NNN>`, 3 digits, allocated by tooling, **permanent** | `cnn-009` |
| Source id | `kebab-case`, `<publisher>-<work>`; exam archives end in `-exams` | `hf-llm-course`, `cs189-exams` |
| Source ref | stable locator inside the source, unique per source | `chapter1/7#q3`, `quiz-10/q2`, `machine_learning/34`, `lecture-05/slide-14` |
| Tag | `kebab-case`, singular | `output-shape`, `softmax` |
| Figure | `<topic>/<question-id>[-annotated].<ext>` next to the YAML; generator script has the same basename | `dl/cnn/cnn-007.svg`, `cnn-007.py` |
| Curation file | `tools/curation/<source-id>.yaml` | `tools/curation/mmlu-redux.yaml` |
| Branch | `<type>/<short-kebab-description>` — see [git-workflow.md](git-workflow.md) | `content/cnn-lecture-5` |
| Commit / PR title | Conventional Commits: `<type>(<scope>): <imperative summary>` | `content(cnn): add 20 questions from lecture 5` |
| Release tag | `v<MAJOR>.<MINOR>.<PATCH>` | `v0.1.0` |

### Ids are forever

Progress (scores, spaced-repetition state) is stored by question id, so:

- Never renumber, reuse or delete an id. To remove a question set `status: retired`.
- A question moved to another topic **keeps its id** (the prefix then shows where it was born).
- New ids are allocated by `mlr import` / by taking the highest number used for that prefix + 1.
- Topic ids are never renamed — add a new topic and move questions instead.

### Commit types

| Type | Use for |
| --- | --- |
| `content` | adding/editing questions, figures, curation, source registry |
| `feat` | new capability in the app or tooling |
| `fix` | bug fix in code, or a wrong answer key / factual error in content |
| `docs` | documentation only |
| `refactor`, `test`, `ci`, `chore` | as usual; `chore(release)` for releases |

Scope = topic id for content (`content(cnn)`), area for code (`feat(tools)`, `feat(web)`).

## Versioning

The repository has **one version**, following [SemVer](https://semver.org), shared by the
tooling (`pyproject.toml`), the web app (`package.json`, from v0.2) and the question bank.

| Bump | When | Examples |
| --- | --- | --- |
| **MAJOR** | breaking change for users or data consumers | `schema_version` bump, progress-storage format change, removing a domain |
| **MINOR** | new capability or a substantial content batch | new app feature, new importer/source, new topic, ≥ 20 new or newly-reviewed questions |
| **PATCH** | fixes and small additions | wrong answer key, typo, < 20 questions, dependency bump, docs |

While `0.x`, MINOR may include breaking changes (called out in the changelog).

**Data format version.** Every data file starts with `schema_version: 1`. Bump it only for a
breaking format change, together with a migration script in `tools/` and a MAJOR (or 0.x MINOR)
release. Additive optional fields do not bump it.

### Release checklist

1. Branch `chore/release-vX.Y.Z` from `main`.
2. Update the version in `pyproject.toml` (and `package.json` once it exists).
3. Move `Unreleased` entries in `CHANGELOG.md` under the new version, with the date and the
   bank summary from `uv run mlr check`.
4. Refresh the stats table in `README.md` with `uv run mlr stats`.
5. PR title `chore(release): vX.Y.Z` → squash merge → tag `vX.Y.Z` on `main`
   (`gh release create vX.Y.Z --generate-notes` once on GitHub).

## Code style

- **Python** (`tools/`): ruff lint + format, line length 100, Python ≥ 3.12, type hints on public
  functions. Pure logic in small modules, tests in `tools/tests/`. Dependencies via `uv add`.
- **TypeScript** (web app, v0.2+): Biome defaults, `strict` TypeScript, no `any`. Quiz logic
  (shuffle, grading, storage) as pure functions in `src/lib/` with Vitest tests; components render only.
- **YAML**: 2-space indent, no line folding, multi-line text as literal blocks (`|`). Let the
  tooling write files when possible (`mlr import`) so the style stays uniform.
- **Markdown/LaTeX in questions**: see [data-format.md](data-format.md#text-markdown-and-math).

## Repository rules

1. Never commit raw course materials (kept outside the repo) or anything derived from them;
   upstream downloads and extracted text live in git-ignored `.cache/`.
2. Every question has a `source`; every reviewed question has a cited explanation.
3. AI-generated questions start as `draft` and are reviewed by a human before `reviewed`.
4. `main` is always releasable: `uv run mlr check` and `uv run pytest` pass.
