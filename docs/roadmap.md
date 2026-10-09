# Roadmap

Versions follow [conventions.md#versioning](conventions.md#versioning).

## v0.1.0 — Foundation ✅

- [x] Docs: overview, conventions (naming, versioning), data format, pipeline, sources, git workflow, figures
- [x] Data schema (pydantic → JSON Schema): `single`, `multiple`, `true_false`, `short_answer`; citations; statuses
- [x] `mlr` CLI: `check`, `import`, `schema`, `stats`
- [x] Source registry: 20 external sources with licenses and usage rules
- [x] 328 curated questions imported from 4 open sources + 5 original reviewed examples
- [x] CI: lint, tests, bank validation

## v0.2.0 — Web MVP

- [ ] Astro + React + Tailwind scaffold, Zod mirror of the schema, GitHub Pages deploy
- [ ] Topic pages; **practice** mode (instant feedback) and **exam** mode (timer ≈ 1 min/question)
- [ ] Shuffle questions and options (respect `shuffle: false`)
- [ ] All four question types incl. short-answer grading (normalized text, numeric tolerance, self-grade)
- [ ] KaTeX + code highlighting at build time; references rendered as footnotes
- [ ] Figures (`figure`, `explanation_figure`), white card in dark mode
- [ ] Results page with explanations; "unreviewed" badge + filter; dark mode; mobile

## v0.3.0 — Content I

- [ ] Explanations with citations for imported drafts; review the first topics → `reviewed`
- [ ] NCU Intro to DL lecture questions (Path B: extract → generate → review)
- [ ] d2l exercises → MCQ / short answer; Deep Learning Interviews; Google MLCC
- [ ] `mlr extract` (markitdown/docling), `figstyle.py`, `mlr figs`

## v0.4.0 — Review features

- [ ] Mixed exams: N random questions across topics/difficulty/tags
- [ ] "My mistakes" deck, score history per topic, keyboard shortcuts (1–4, Enter)
- [ ] Image options (2×2 grid), zoomable figures
- [ ] Code-reading questions from Tensor Puzzles / LLMs-from-scratch / numpy-100

## v0.5.0 — Retention

- [ ] Spaced repetition (FSRS) over question ids
- [ ] Topic notes / cheat sheets (MDX), Pagefind search
- [ ] Export/import progress; PWA offline; Vietnamese UI
