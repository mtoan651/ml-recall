# ml-recall

Active-recall quiz bank for AI/ML/DL: exam-style questions with LaTeX, cited explanations, timed
mock exams and spaced repetition. Free static site on GitHub Pages.

> **Status: v0.1.0 — data foundation.** The question bank, its schema and tooling are in place;
> the quiz website arrives in v0.2 ([roadmap](docs/roadmap.md)).

## What's inside

- **333 questions** across 10 domains — 328 curated from open-licensed sources, 5 original examples.
- Four question types: `single`, `multiple` (select all), `true_false`, `short_answer`
  (auto-graded text/numeric, or self-graded against a model answer).
- Every question records its **source**; reviewed explanations **cite** references (`[^1]`).
- Imports are reproducible: pinned upstream revisions + per-item curation with drop reasons.

| Domain | Topics | Questions | Reviewed |
| --- | ---: | ---: | ---: |
| Artificial Intelligence | 5 | 20 | 0 |
| Mathematics for ML | 5 | 13 | 0 |
| Machine Learning | 14 | 97 | 0 |
| Deep Learning | 7 | 77 | 5 |
| Computer Vision | 3 | 10 | 0 |
| Natural Language Processing | 5 | 47 | 0 |
| Generative Models | 2 | 10 | 0 |
| Large Language Models | 3 | 20 | 0 |
| Reinforcement Learning | 2 | 12 | 0 |
| Practical Tools | 2 | 27 | 0 |
| **Total** | | **333** | **5** |

Sources so far: Hugging Face LLM Course, Microsoft AI/ML for Beginners, MMLU-Redux — see
[docs/sources.md](docs/sources.md) for all 20 registered sources and their licenses.

## Quick start

Requires [uv](https://docs.astral.sh/uv/).

```bash
uv sync
uv run mlr check                  # validate the bank + quality report
uv run mlr import all --dry-run   # re-run importers (idempotent)
uv run mlr stats --topics         # per-topic counts
```

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
```

## Repository layout

```text
src/content/            question bank: taxonomy.yaml, sources.yaml, quizzes/<domain>/<topic>.yaml
schema/                 JSON Schemas exported from the pydantic model (editor autocompletion)
tools/mlrecall/         `mlr` CLI: schema, validation, importers
tools/curation/         per-source curation decisions
prompts/                prompt templates for generating questions with Claude Code
docs/                   project handbook
materials/              git-ignored: course slides and upstream downloads
```

## Documentation

| Doc | Contents |
| --- | --- |
| [overview](docs/overview.md) | goals, lessons from the reference project, branding, decision log |
| [tech-stack](docs/tech-stack.md) | stack and rationale |
| [data-format](docs/data-format.md) | YAML schema, question types, citations, statuses, math |
| [content-pipeline](docs/content-pipeline.md) | importing, generating, curation, quality bar, review checklist |
| [sources](docs/sources.md) | 20 exercise sources with licenses and plans |
| [figures](docs/figures.md) | diagrams and plots |
| [conventions](docs/conventions.md) | naming, ids, versioning, code style, release checklist |
| [git-workflow](docs/git-workflow.md) | branches, PRs, GitHub setup, CI |
| [roadmap](docs/roadmap.md) | v0.1 → v0.5 |

## License

Code: [MIT](LICENSE). Content: each question under its source's license; original questions
CC BY-SA 4.0 — see [LICENSE-CONTENT.md](LICENSE-CONTENT.md) and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
