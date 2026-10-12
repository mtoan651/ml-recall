# Roadmap

Versions follow [conventions.md#versioning](conventions.md#versioning).

## v0.1.0 — Foundation ✅

- [x] Docs: overview, conventions (naming, versioning), data format, pipeline, sources, git workflow, figures
- [x] Data schema (pydantic → JSON Schema): `single`, `multiple`, `true_false`, `short_answer`; citations; statuses
- [x] `mlr` CLI: `check`, `import`, `schema`, `stats`
- [x] Source registry: 20 external sources with licenses and usage rules
- [x] 328 curated questions imported from 4 open sources + 5 original reviewed examples
- [x] CI: lint, tests, bank validation

## v0.2.0 — Web MVP ✅

- [x] Astro + React + Tailwind scaffold, Zod mirror of the schema, GitHub Pages deploy
- [x] Topic pages and tag pages; **practice** mode (instant feedback) — see [web-app](web-app.md)
- [x] **Exam** mode (timer ≈ 1 min/question) with a results page and explanations — shipped in
  v0.3.0 as timed tests
- [x] Shuffle questions and options (respect `shuffle: false`)
- [x] All four question types incl. short-answer grading (normalized text, numeric tolerance;
  open answers were self-graded until v0.3.0 turned them into fill-ins)
- [x] Keyboard shortcuts in practice: 1–9 pick an option, Enter checks / goes on
- [x] KaTeX + code highlighting at build time; references rendered as footnotes
- [x] Figures (`figure`, `explanation_figure`, option `image`), white card in dark mode
- [x] End-of-session summary (score, missed questions, retry missed); "unreviewed" badge + filter; dark mode; mobile
- [x] Progress per question id in `localStorage`; answered / total per topic on the index

## v0.3.0 — Content I ✅

- [x] Timed tests per topic and tag (N questions, 1 min/question, max 20) — see [web-app](web-app.md#timed-tests)
- [x] Explanations with citations for imported drafts (all 395 imported drafts)
- [x] Review every question → `reviewed` (2626: 56 by the owner, 2570 AI-checked with
  `reviewed_by: claude`); `mlr sync-curation` keeps imported edits reproducible
- [x] NCU Intro to DL lecture questions (Path B: extract → generate → review) — shipped in v0.4.0
- [x] Google MLCC and Google ML courses quizzes; numpy-100 exercises
- [x] d2l exercises → auto-graded questions for the thin topics (information theory, logistic
  regression, learning theory, dimensionality reduction: 36 from d2l + 31 original); Deep Learning
  Interviews not used at first (its in-book licence conflicts with arXiv's); later adapted under
  the arXiv v2 CC BY 4.0 licence (114 questions)
- [x] Full audit of the bank (every key re-solved; 283 + 48 fixes) and re-review of all dropped
  upstream items under keep-and-fix (+287 kept)
- [x] `figstyle.py` and `mlr figs`; picture questions from Google MLCC, Google ML courses and HF Deep RL kept and redrawn (21 questions, 30 SVGs)
- [x] Source survey (Hugging Face, open courses, a user-supplied list of 88 links) and new
  sources: HF Audio Course, UBC CPSC 330 and DSCI 575, forall x, Gutmann's pen-and-paper
  exercises, ML-InterviewQs, dlbook_exercises, and every convertible d2l exercise (+575
  questions); MMLU expansion paused for provenance
- [x] Second survey round under the non-commercial licence policy: MIT OCW, NPTEL, Neuromatch,
  Kaggle Learn, smaller open courses, MMLU keep-lists and original questions for the remaining
  thin topics (+879 questions, 2520 in all); `graph_figure` helper
- [x] `mlr extract` — shipped in v0.4.0 (pdfminer.six instead of markitdown/docling)
- [x] Maintenance: KaTeX 0.19, CI checks that every figure re-renders byte-identical

## v0.4.0 — Review features ✅

- [x] NCU Intro to DL lecture questions via `mlr extract` (pdfminer.six, page markers, `--colors`
  for answers printed in red): 81 questions from Lectures 1–3
- [x] Mixed exams: N random questions across topics, tags and difficulties (`/exam/`; tags
  added in v0.4.1)
- [x] "My mistakes" deck (`/mistakes/`), score history per topic (`/progress/`)
- [x] Image options (2×2 grid), zoomable figures
- [x] Code-reading questions from Tensor Puzzles / LLMs-from-scratch / NumPy (55)
- [x] Thin topics: computer vision 51 → 119, AI intro 12 → 34, NLP 162 → 212
- [x] Every topic fills a 20-question test: Deep Learning Frameworks 18 → 30 (v0.4.1)
- [x] CI checked on `ubuntu-26.04` before `ubuntu-latest` moves (2026-10-19)

## v0.5.0 — Retention ✅

- [x] OpenIntro Statistics exercises (59 questions)
- [x] Hands-On ML notebook exercises (57 questions)
- [x] Spaced repetition (FSRS) over question ids (`/review/`)
- [x] Topic notes / cheat sheets for all 54 topics (`/topics/<topic>/notes/`)
- [x] Pagefind search (`/search/`) and a page per question (`/q/<id>/`)
- [x] Export/import progress (merging, on `/progress/`)
- [x] PWA offline (service worker generated at build, installable)
- [x] Vietnamese UI (EN | VI switch; questions stay in English, topic titles in both languages)
- [x] English–Vietnamese glossary from d2l-vi (`/glossary/`, 458 terms)

## v0.6.0 — CE6146 exam prep

- [x] CE6146 page (`/ce6146/`): per-lecture and per-exercise practice and tests, later weeks mapped to topics
- [x] Tests draw CE6146 course questions more often (As often / 4× / 16×)
- [x] Every content slide of Lectures 1–3 tested (+177 questions)
- [x] A twin question for every exercise question (+60)
- [x] New topics for the syllabus: Graph Neural Networks (31), Explainable AI (34), with notes

## Next

- [ ] CE6146 lecture questions for lectures 4+ (Path B, as the slides are published)
