# ml-recall

Active-recall quiz bank for AI/ML/DL: exam-style questions with LaTeX, cited explanations, timed
mock exams and spaced repetition. Free static site on GitHub Pages.

> **Status: v0.6.0 — 3327 questions, all reviewed, with CE6146 exam prep (every lecture slide and
> exercise covered, course questions drawn more often in tests), spaced repetition, topic notes,
> search, offline use and a Vietnamese interface; live at <https://mtoan651.github.io/ml-recall/>.**
> Next: CE6146 lectures 4+ as the course publishes them ([roadmap](docs/roadmap.md)).

## What's inside

- **3327 questions** across 10 domains — 985 imported from open-licensed quiz sets, 1226 adapted
  from open-licensed exercises, courses, books and code (d2l, OpenIntro, Hands-On ML notebooks, Gutmann, Deep Learning Interviews,
  UBC, Neuromatch, Kaggle Learn, forall x, LLMs-from-scratch, Tensor Puzzles, …), 374 adapted
  from non-commercial course material (MIT OpenCourseWare, NPTEL), 369 paraphrased from the
  CE6146 course exercises and lectures, 373 original. All are reviewed: 56 by the owner and 3271
  by Claude at the owner's request (shown as "AI-checked").
- Four question types: `single`, `multiple` (select all), `true_false`, `short_answer`
  (auto-graded fill-in: a number, a word or phrase, or a gap-fill with several blanks).
- **Timed tests** for every topic and tag: up to 20 random questions, one minute each, scored and
  explained at the end. **Mixed tests** draw 10–50 questions from any topics, tags and difficulties.
- **CE6146 exam prep** (`/ce6146/`): every content slide of Lectures 1–3 and every in-class
  exercise has questions (plus a "twin" per exercise question), practised per lecture or as one
  test; tests draw these course questions 4× (or 16×) as often as others.
- **Review** brings questions back with spaced repetition (FSRS): each one returns just before
  you would forget it, sooner after a wrong answer.
- **My mistakes** collects every question you last answered wrong, to practice until it is right;
  **Progress** shows answered / correct per topic and your test scores over time (all stored in
  the browser; export it to a file and import it on another device).
- **Topic notes**: a cited cheat sheet for every topic (key ideas, formulas, pitfalls).
- **Search** every question by its words, with filters; each question has its own page.
- **Vietnamese interface** (EN | VI in the header): menus, buttons and messages in Vietnamese,
  topic titles in both languages, questions in English; plus an English–Vietnamese glossary.
- Installs as an app and **works offline** for every page you have opened.
- Every question records its **source**; reviewed explanations **cite** references (`[^1]`).
- Imports are reproducible: pinned upstream revisions + per-item curation with drop reasons.

| Domain | Topics | Questions | Reviewed |
| --- | ---: | ---: | ---: |
| Artificial Intelligence | 6 | 307 | 307 |
| Mathematics for ML | 5 | 481 | 481 |
| Machine Learning | 14 | 963 | 963 |
| Deep Learning | 10 | 677 | 677 |
| Computer Vision | 3 | 121 | 121 |
| Natural Language Processing | 5 | 213 | 213 |
| Generative Models | 3 | 95 | 95 |
| Large Language Models | 4 | 138 | 138 |
| Reinforcement Learning | 3 | 96 | 96 |
| Practical Tools | 3 | 236 | 236 |
| **Total** | | **3327** | **3327** |

Questions come from 54 external sources: importers for the Hugging Face LLM, Deep RL, AI Agents
and Audio courses, Microsoft AI, ML and Data Science for Beginners, Google's ML Crash Course and
ML courses, MMLU-Redux and 100 NumPy exercises; exercises adapted from *Dive into Deep Learning*,
Gutmann's pen-and-paper exercises, *Deep Learning Interviews*, MIT OpenCourseWare, NPTEL,
Neuromatch Academy, Kaggle Learn, UBC courses, LLMs-from-scratch, Tensor Puzzles and more; and the
CE6146 course exercises and lectures. See [docs/sources.md](docs/sources.md) for all 66
registered external sources and their licenses.

## Quick start

Data tooling — requires [uv](https://docs.astral.sh/uv/):

```bash
uv sync
uv run mlr check                  # validate the bank + quality report
uv run mlr import all --dry-run   # re-run importers (idempotent)
uv run mlr stats --topics         # per-topic counts
```

Quiz website — requires Node 24 and [pnpm](https://pnpm.io/):

```bash
pnpm install
pnpm dev                          # http://localhost:4321/ml-recall/
pnpm build                        # static site in dist/
pnpm lint && pnpm test && pnpm check
```

See [docs/web-app.md](docs/web-app.md) for how the YAML becomes pages and how answers are graded.

A question looks like this (`src/content/quizzes/dl/cnn.yaml`):

```yaml
- id: cnn-009
  type: short_answer
  difficulty: medium
  question: A convolutional layer maps a $32 \times 32 \times 3$ input to 10 output channels
    using $5 \times 5$ kernels with bias. How many learnable parameters does the layer have?
  answer:
    numeric: 760
    model: $10 \times 3 \times 5 \times 5 + 10 = 760$
  explanation: The kernel tensor has shape $c_o \times c_i \times k_h \times k_w$ ... [^1]
  references:
    - source: d2l
      locator: Sec. 7.4 Multiple Input and Multiple Output Channels
      url: https://d2l.ai/chapter_convolutional-neural-networks/channels.html
  source: {id: original, ref: cnn-009}
  status: reviewed
  reviewed_by: owner
```

## Repository layout

```text
src/content/            question bank: taxonomy.yaml, sources.yaml, quizzes/<domain>/<topic>.yaml
src/pages, components/  Astro pages and the React quiz island
src/lib/                build-time data loading + Markdown, quiz logic (grading, shuffle, storage)
schema/                 JSON Schemas exported from the pydantic model (editor autocompletion)
tools/mlrecall/         `mlr` CLI: schema, validation, importers
tools/curation/         per-source curation decisions
prompts/                prompt templates for generating questions with Claude Code
docs/                   project handbook
.cache/                 git-ignored: upstream downloads, extracted course material
```

## Documentation

| Doc | Contents |
| --- | --- |
| [overview](docs/overview.md) | goals, lessons from the reference project, branding, decision log |
| [tech-stack](docs/tech-stack.md) | stack and rationale |
| [data-format](docs/data-format.md) | YAML schema, question types, citations, statuses, math |
| [web-app](docs/web-app.md) | the Astro site: data flow, rendering, grading rules, deploy |
| [content-pipeline](docs/content-pipeline.md) | importing, generating, curation, quality bar, review checklist |
| [sources](docs/sources.md) | 20 exercise sources with licenses and plans |
| [figures](docs/figures.md) | diagrams and plots |
| [conventions](docs/conventions.md) | naming, ids, versioning, code style, release checklist |
| [git-workflow](docs/git-workflow.md) | branches, PRs, GitHub setup, CI |
| [roadmap](docs/roadmap.md) | v0.1 → v0.5 |

## License

Code: [MIT](LICENSE). Content: each question under its source's license (some non-commercial); original questions
CC BY-SA 4.0 — see [LICENSE-CONTENT.md](LICENSE-CONTENT.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
