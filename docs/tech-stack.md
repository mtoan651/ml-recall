# Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Data | YAML files in git, one file per topic | diffable, reviewable in PRs; LaTeX needs no escaping in literal blocks (JSON would need `\\frac`) |
| Data tooling | Python ≥ 3.12, [uv](https://docs.astral.sh/uv/), pydantic, ruamel.yaml | schema validation, importers, quality report (`mlr`); the maintainer's home language |
| Extraction (v0.3) | markitdown (PDF/PPTX/DOCX → Markdown), docling (formula/table-heavy slides), PyMuPDF (page → PNG) | feed course materials to Claude |
| Question generation | Claude Code + [`prompts/generate-questions.md`](../prompts/generate-questions.md) | no API key; output reviewed in PRs |
| Web framework (v0.2) | **Astro** (static output) + **React** islands for the quiz engine | content-heavy static site; content collections validate the YAML at build time; per-topic pages for SEO; JS only where interactive |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS | |
| Math & code | KaTeX + Shiki, rendered at build time (remark-math / rehype-katex) | the browser only loads KaTeX CSS |
| Progress | `localStorage`; [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) for spaced repetition (v0.5) | no backend |
| Search (v0.5) | Pagefind | static search |
| Lint / format / test | ruff + pytest (Python); Biome + Vitest (TypeScript) | one tool per job, minimal config |
| Runtime / packages | Node 24 LTS + pnpm (via fnm) for the web app | |
| Hosting | GitHub Pages via GitHub Actions | free, deploys on merge to `main` |
| Figures | matplotlib (plots), Graphviz DOT (graphs), Excalidraw (free-form), committed as SVG | see [figures.md](figures.md) |

## Alternatives considered

- **Vanilla HTML/JS** (like the reference repo): zero setup, but no schema validation, no
  build-time math, and it does not scale past a few hundred questions.
- **Next.js**: heavier than needed for a static site.
- **MkDocs Material**: Python-native and good for notes, but awkward for an interactive quiz engine.
- **Mermaid** for diagrams: build-time rendering needs a headless browser; Graphviz does not.

## Architecture (v0.2 target)

```text
YAML bank ──(Astro content collections + Zod mirror of the pydantic schema)──▶ static pages
           ──(build-time Markdown → HTML with KaTeX/Shiki)──▶ JSON props ──▶ React quiz island
                                                                   └─▶ localStorage (progress by question id)
```

The pydantic model in `tools/mlrecall/schema.py` stays the single source of truth; the Zod schema
in the web app mirrors it and the build fails on any mismatch.
