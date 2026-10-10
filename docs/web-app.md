# Web app

A static [Astro](https://astro.build) site that turns the YAML bank into practice pages, served
from GitHub Pages at <https://mtoan651.github.io/ml-recall/>. No backend: progress lives in the
browser's `localStorage`.

## Run it

Requires Node 24 and pnpm (see [tech-stack](tech-stack.md)); the pnpm version is pinned by
`packageManager` in `package.json`.

```bash
pnpm install
pnpm dev          # http://localhost:4321/ml-recall/ — reloads on YAML edits
pnpm build        # static site in dist/ (fails on any schema / Markdown / math error)
pnpm preview      # serve dist/ locally
pnpm lint         # Biome (lint + format check); `pnpm format` fixes what it can
pnpm test         # Vitest: grading, shuffle, citations, session, exam, storage, schema mirror
pnpm check        # astro check (TypeScript, strict)
```

`pnpm dev` is the review tool for content PRs: open the topic, answer the new questions, and
flip the ones you verified to `reviewed` in the YAML.

## How data flows

```text
src/content/quizzes/<domain>/<topic>.yaml ─┐
src/content/taxonomy.yaml ─────────────────┼─▶ content collections (src/content.config.ts)
src/content/sources.yaml ──────────────────┘     validated by the Zod mirror (src/lib/schema.ts)
                                                     │
                                                     ▼
                         src/lib/bank.ts — joins collections, checks cross-references,
                         drops retired questions, renders Markdown (src/lib/markdown.ts)
                                                     │  QuizQuestion props (src/lib/types.ts)
                                                     ▼
              pages: /  ·  /topics/<topic>/  ·  /tags/  ·  /tags/<tag>/
                     /topics/<topic>/exam/  ·  /tags/<tag>/exam/
                                                     │  client:load
                                                     ▼
              React islands: src/components/Quiz.tsx (practice) and Exam.tsx (timed test) —
              session state (src/lib/session.ts, src/lib/exam.ts), grading (src/lib/grading.ts),
              shuffling (src/lib/shuffle.ts), progress in localStorage (src/lib/storage.ts)
```

1. **Load + validate.** `src/content.config.ts` defines three collections: `quizzes` (glob over
   `src/content/quizzes/**/*.yaml`, one entry per topic file), `domains` (taxonomy, with an
   `order` field to keep file order) and `sources`. Each is validated with the Zod schemas in
   `src/lib/schema.ts`, a field-by-field mirror of `tools/mlrecall/schema.py` including its
   cross-field rules (answer keys, reviewed ⇒ difficulty + cited explanation, citation markers
   in range, `extra="forbid"`). A violation stops `pnpm dev` / `pnpm build`.
2. **Join + check.** `getBank()` in `src/lib/bank.ts` builds domains → topics in taxonomy order
   and fails on what Zod cannot see: file name ≠ `topic`, folder ≠ `domain`, unknown topic or
   source, reference-only provenance, duplicate ids, missing figure files. Retired questions
   are dropped here, so they never reach a page.
3. **Render.** `toQuizQuestion()` resolves everything at build time — Markdown → HTML, source
   ids → titles and licenses, figure paths → bundled URLs — so the browser receives
   ready-to-show props and never parses Markdown or LaTeX.
4. **Practice.** Pages pass the questions of one topic (or one tag) to the `Quiz` island. The
   server renders the first question in file order; on hydration the island applies the saved
   settings and shuffles, then fades the question in. Test pages pass only the questions a
   test can draw from to the `Exam` island ([timed tests](#timed-tests)).

`src/lib/schema.test.ts` compares the Zod mirror with the JSON Schemas exported by
`uv run mlr schema` (field names, required fields, enums) and validates every YAML file, so a
change to `schema.py` that is not mirrored fails `pnpm test`.

## Markdown, math, code, citations

`src/lib/markdown.ts`: remark-parse → remark-gfm → remark-math → remark-rehype → rehype-katex →
Shiki → rehype-stringify.

- **No raw HTML.** remark-rehype runs without `allowDangerousHtml`, so HTML in the YAML is
  dropped (write `\<mask>`). The island inserts only this pipeline's output.
- **Math** is rendered by KaTeX at build time; an unsupported command fails the build with the
  question id and field. KaTeX "strict" findings are printed as warnings. The KaTeX CSS
  (fonts bundled, no CDN) must come from the same KaTeX version that rehype-katex renders
  with — keep the `katex` dependency on rehype-katex's range (currently `^0.16`).
- **Code** fences are highlighted by Shiki (`github-light` / `github-dark` via CSS variables);
  languages load on demand, unknown ones fall back to plain text.
- **Citations.** `[^n]` markers in the question, options, `why`, explanation or model answer
  become superscript links to the reference list shown after answering
  (`#ref-<question-id>-<n>`). They are replaced in the Markdown syntax tree on text nodes only,
  so markers inside code or math stay literal. remark-gfm would otherwise read them as
  footnotes; `src/lib/citations.ts` has the marker logic, mirroring `citation_markers()` in
  `schema.py` for validation.
- Option text is rendered inline (a lone paragraph is unwrapped).

Each reference shows the registry title (or `title`), the `locator`, a link (`url`, else the
registry `url`) and the `quote` in italics. Under every answered question the provenance line
shows `source` title, license (linked to `license_url`) and the question id.

## Practice mode

- One question at a time with progress (`Q 3 / 20`) and score (correct / answered).
- **Shuffle questions** (default on) and **Reviewed only** (hides `draft`) are remembered per
  browser; changing either starts a new session. Drafts carry an "unreviewed" badge.
- Options are shuffled per question unless `shuffle: false`. True/false questions keep
  "True, False" in file order (a fixed pair; position carries no information).
- After **Check**: chosen and correct options are marked (icon + text, not only colour), every
  option's `why` is shown, then the model answer, explanation, figure, references, source.
- End of session: score, missed questions with their answers, **Retry missed**, **Practice
  again**.
- Keyboard: `1`–`9` select the n-th option (toggle for "select all that apply"), `Enter`
  checks, then goes to the next question. Keys are ignored while typing in a text field.

### Grading rules (`src/lib/grading.ts`)

| Type | Rule |
| --- | --- |
| `single`, `true_false` | correct iff exactly the correct option is selected |
| `multiple` | all-or-nothing: the selected set must equal the set of correct options; the feedback says how many were missed / wrong |
| `short_answer` + `accept` | correct iff the input equals an accepted answer after normalization: Unicode NFKC, lowercase, whitespace and punctuation (`\p{P}`) removed — math symbols such as `+ ^ =` are kept |
| `short_answer` + `numeric` | correct iff \|x − value\| ≤ `tolerance` (plus 1e-9 relative slack for float noise). Input may be `760`, `-0.5`, `7.6e2`, `1,000`, `0,5`, `1/3`; anything else asks for a number instead of grading |
| `short_answer`, model only | self-graded: **Show answer** reveals the model answer, then **I got it** / **I missed it** |

When a key has both `accept` and `numeric`, either match counts.

### Progress storage (`src/lib/storage.ts`)

| Key | Value |
| --- | --- |
| `ml-recall:results:v1` | question id → `{ correct, at }`, the latest result (practice and tests) |
| `ml-recall:settings:v1` | `{ shuffleQuestions, reviewedOnly }`; "Reviewed only" is shared with tests |
| `ml-recall:exam:v1:<scope>` | the [test in progress](#timed-tests) of one topic or tag |
| `ml-recall:exam-history:v1` | scope → `{ attempts, best }`: the last 10 tests and the best one |

`<scope>` is `topic:<id>` or `tag:<tag>` (prefixed: a topic and a tag may share a name, e.g.
`pytorch`). All access is wrapped in `try/catch`; the app works without storage. The index
page reads the results to show "answered / total" per topic. Changing a stored format is a
breaking change (bump the key, migrate).

## Timed tests

"Take a test" on a topic or tag page opens `/topics/<topic>/exam/` or `/tags/<tag>/exam/`:
N random questions in N minutes, no feedback until the test is submitted. Pages are static;
the random draw happens in the browser from the questions embedded at build time.

- **Pool.** Non-retired questions of the topic or tag, except `short_answer` questions
  without `accept` / `numeric` (self-graded, so practice-only). A page is built only when the
  pool is not empty (today every topic with questions, and every tag but
  `numerical-stability`). **Reviewed questions only** on the start screen (shared with
  practice) restricts the pool to `reviewed`.
- **Size and time.** N = min(20, pool); time limit = N minutes. A smaller pool says so on the
  start screen ("This topic has 8 questions, so this test has 8 questions · 8 minutes").
- **Draw.** A uniformly random subset in random order; options shuffled with the practice
  rules (`shuffle: false` and true/false keep file order). Each test is a new draw.
- **During the test.** One question at a time (the practice `QuestionCard`, without
  feedback), Previous / Next, a navigator grid (answered / unanswered / flagged / current),
  **Flag for review**. The sticky status bar shows the countdown (`mm:ss`; amber at ≤ 5:00,
  red at ≤ 1:00, announced once at each threshold through an `aria-live` region), "answered
  k / N" and **Submit**. Submitting with unanswered or flagged questions asks for
  confirmation.
- **Timer.** Derived from the start timestamp (`remainingMs(startedAt, durationMs, now)`), so
  it stays right when the tab sleeps or the page reloads; at 00:00 the test submits itself.
- **Resume.** The test in progress (question ids, option orders, answers, flags, position,
  start time) is saved after every change. A reload resumes it; a test whose time ran out
  while the page was closed is submitted on load (dated at its deadline). A stored test that
  no longer matches the page (a question or its options changed after a deploy) is
  discarded. The topic / tag page then offers **Resume test**.
- **Keyboard.** `1`–`9` select the n-th option (toggle for "select all that apply"), `←` / `→`
  previous / next, `F` flag, `Enter` in a short-answer field goes to the next question. Keys
  are ignored while typing in a text field.
- **Scoring.** The [grading rules](#grading-rules-srclibgradingts) of practice mode:
  `multiple` is all-or-nothing; a numeric-only answer that is not a number is wrong (a test
  cannot ask again); unanswered counts as wrong.
- **Results.** Score k / N with the percentage and time used, a grid of outcomes, and a
  review of every question — the learner's answer against the key, every option's `why`,
  model answer, explanation, references and source — with **Show only incorrect**. **New
  test** goes back to the start screen; **Practice this topic / tag** opens practice mode.
  Answered questions are also recorded in `ml-recall:results:v1`.
- **History.** Per topic or tag, the last 10 attempts and the best one ever (highest
  percentage; on a tie the longer test). The start screen and the topic / tag page show the
  last and best score.

Pure logic (eligibility, draw with an injectable RNG, reducer, timer, scoring, validation of
the stored test, history) is in `src/lib/exam.ts` with tests in `exam.test.ts`; the storage
I/O is in `src/lib/storage.ts`.

## Figures

`figure`, `explanation_figure` and option `image` paths are relative to the YAML file
(`./cnn/cnn-007.svg`). `bank.ts` collects all images under `src/content/quizzes/` with
`import.meta.glob(…, { query: "?url" })`, so Vite fingerprints and copies them (small SVGs are
inlined) and the URLs already include the base path. A missing file fails the build. Figures
render on a white card in both themes, lazy-loaded, with `alt` and an optional caption.

## URLs and base path

The site is built for `https://mtoan651.github.io` with `base: '/ml-recall'` and
`trailingSlash: 'always'` (`astro.config.mjs`). Build internal links with `url()`,
`topicUrl()`, `tagUrl()`, `topicExamUrl()` and `tagExamUrl()` from `src/lib/url.ts`, never with
a hard-coded `/…`.

## Deploy

`.github/workflows/ci.yml`, job `check` (required by the ruleset): Python checks, then
`pnpm install --frozen-lockfile`, `lint`, `test`, `check`, `build`. On pushes to `main` it uploads
`dist/` as the Pages artifact and the `deploy` job publishes it with `actions/deploy-pages`
(environment `github-pages`). One-time setup: repository **Settings → Pages → Source: GitHub
Actions**.

## Where to change things

| Change | File |
| --- | --- |
| Data format (field, rule) | `tools/mlrecall/schema.py` first, then `src/lib/schema.ts` (the parity test tells you what is missing) |
| Cross-file checks (topics, sources, figures) | `src/lib/bank.ts` → `loadBank()` |
| Markdown / math / code rendering | `src/lib/markdown.ts`, styles in `src/styles/global.css` (`.md`) |
| Citation markers | `src/lib/citations.ts` |
| Grading | `src/lib/grading.ts` (+ `grading.test.ts`) |
| Shuffling | `src/lib/shuffle.ts` |
| Session flow (select, check, next, score) | `src/lib/session.ts`; UI in `src/components/Quiz.tsx` |
| Question / feedback / summary UI | `src/components/QuestionCard.tsx`, `Feedback.tsx`, `Summary.tsx` |
| Timed tests: pool, size, timer, scoring, stored test, history | `src/lib/exam.ts` (+ `exam.test.ts`); keys in `src/lib/storage.ts` |
| Timed test UI | `src/components/Exam.tsx` (flow), `ExamStart.tsx`, `ExamRunner.tsx`, `ExamResults.tsx`; "Take a test" box: `ExamCallout.astro` |
| Colours, dark mode | tokens at the top of `src/styles/global.css` |
| Header, footer, `<head>` | `src/layouts/Base.astro` |
| Pages | `src/pages/` |
