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

- [x] Astro + React + Tailwind scaffold, Zod mirror of the schema, GitHub Pages deploy
- [x] Topic pages and tag pages; **practice** mode (instant feedback) — see [web-app](web-app.md)
- [ ] **Exam** mode (timer ≈ 1 min/question) with a results page and explanations → moved to v0.3.0 (timed tests)
- [x] Shuffle questions and options (respect `shuffle: false`)
- [x] All four question types incl. short-answer grading (normalized text, numeric tolerance, self-grade)
- [x] KaTeX + code highlighting at build time; references rendered as footnotes
- [x] Figures (`figure`, `explanation_figure`, option `image`), white card in dark mode
- [x] End-of-session summary (score, missed questions, retry missed); "unreviewed" badge + filter; dark mode; mobile
- [x] Progress per question id in `localStorage`; answered / total per topic on the index

## v0.3.0 — Content I

- [x] Timed tests per topic and tag (N questions, 1 min/question, max 20) — see [web-app](web-app.md#timed-tests)
- [x] Explanations with citations for imported drafts (all 395 imported drafts)
- [ ] Review the first topics → `reviewed`
- [ ] NCU Intro to DL lecture questions (Path B: extract → generate → review)
- [x] Google MLCC and Google ML courses quizzes; numpy-100 exercises
- [x] d2l exercises → auto-graded questions for the thin topics (information theory, logistic
  regression, learning theory, dimensionality reduction: 36 from d2l + 31 original); Deep Learning
  Interviews not used (its in-book licence forbids reuse)
- [x] Full audit of the bank (every key re-solved; 283 + 48 fixes) and re-review of all dropped
  upstream items under keep-and-fix (+287 kept)
- [x] `figstyle.py` and `mlr figs`; picture questions from Google MLCC, Google ML courses and HF Deep RL kept and redrawn (21 questions, 30 SVGs)
- [ ] `mlr extract` (markitdown/docling)

## v0.4.0 — Review features

- [ ] Mixed exams: N random questions across topics/difficulty/tags
- [ ] "My mistakes" deck, score history per topic (keyboard shortcuts 1–9 / Enter shipped in v0.2)
- [ ] Image options (2×2 grid), zoomable figures
- [ ] Code-reading questions from Tensor Puzzles / LLMs-from-scratch / numpy-100

## v0.5.0 — Retention

- [ ] Spaced repetition (FSRS) over question ids
- [ ] Topic notes / cheat sheets (MDX), Pagefind search
- [ ] Export/import progress; PWA offline; Vietnamese UI
