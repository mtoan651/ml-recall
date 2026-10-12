# ml-recall

Active-recall quiz bank for AI/ML/DL: exam-style questions with LaTeX, cited explanations, timed
mock exams and spaced repetition. Free static site on GitHub Pages.

> **Status: v0.3.0 — 2626 questions, all reviewed, live at <https://mtoan651.github.io/ml-recall/>.**
> Next: review features — mixed exams across topics and a "my mistakes" deck ([roadmap](docs/roadmap.md)).

## What's inside

- **2897 questions** across 10 domains — 985 imported from open-licensed quiz sets, 1110 adapted
  from open-licensed exercises, courses, books and code (d2l, Gutmann, Deep Learning Interviews,
  UBC, Neuromatch, Kaggle Learn, forall x, LLMs-from-scratch, Tensor Puzzles, …), 374 adapted
  from non-commercial course material (MIT OpenCourseWare, NPTEL), 132 paraphrased from the
  CE6146 course exercises and lectures, 296 original. All are reviewed: 56 by the owner and 2841
  by Claude at the owner's request (shown as "AI-checked").
- Four question types: `single`, `multiple` (select all), `true_false`, `short_answer`
  (auto-graded fill-in: a number, a word or phrase, or a gap-fill with several blanks).
- **Timed tests** for every topic and tag: up to 20 random questions, one minute each, scored and
  explained at the end. **Mixed tests** draw 10–50 questions from any topics and difficulties.
- **My mistakes** collects every question you last answered wrong, to practice until it is right;
  **Progress** shows answered / correct per topic and your test scores over time (all stored in
  the browser).
- Every question records its **source**; reviewed explanations **cite** references (`[^1]`).
- Imports are reproducible: pinned upstream revisions + per-item curation with drop reasons.

| Domain | Topics | Questions | Reviewed |
| --- | ---: | ---: | ---: |
| Artificial Intelligence | 6 | 303 | 303 |
| Mathematics for ML | 5 | 372 | 372 |
| Machine Learning | 14 | 864 | 864 |
| Deep Learning | 8 | 474 | 474 |
| Computer Vision | 3 | 119 | 119 |
| Natural Language Processing | 5 | 212 | 212 |
| Generative Models | 3 | 92 | 92 |
| Large Language Models | 4 | 138 | 138 |
| Reinforcement Learning | 3 | 93 | 93 |
| Practical Tools | 3 | 230 | 230 |
| **Total** | | **2897** | **2897** |

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
