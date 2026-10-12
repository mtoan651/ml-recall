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
                     /exam/ · /review/ · /mistakes/ · /progress/  (question index only: toCatalog;
                                                        /exam/ also the tag index: toCatalogTags)
              data:  /data/q/<id>.json  (one rendered question each, fetched by those pages)
                                                     │  client:load
                                                     ▼
              React islands: src/components/Quiz.tsx (practice) and Exam.tsx (timed test),
              MixedExam.tsx, Mistakes.tsx, Progress.tsx — session state (src/lib/session.ts,
              src/lib/exam.ts), grading (src/lib/grading.ts), shuffling (src/lib/shuffle.ts),
              index logic (src/lib/catalog.ts), fetching (src/lib/fetch.ts), progress in
              localStorage (src/lib/storage.ts)
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
  with: `rehype-katex` and `remark-math` ask for `^0.16`, so `pnpm.overrides` in
  `package.json` (`"katex": "$katex"`) makes every package use the version of our own `katex`
  dependency — `pnpm why katex` must list one version.
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
  option's `why` is shown, then the answer (accepted values per input, and the `model` when
  there is one), explanation, figure, references, source.
- End of session: score, missed questions with their answers, **Retry missed**, **Practice
  again**.
- Keyboard: `1`–`9` select the n-th option (toggle for "select all that apply"), `Enter`
  checks, then goes to the next question. Keys are ignored while typing in a text field.
- Under a short-answer input a muted line says how to write the answer: the key's `hint`, else
  "Enter a number, e.g. 42, -0.5, 1/3 or 2.5e-3." for `numeric` keys and "A word or short
  phrase" otherwise (`answerHint()`). It is the input's `aria-describedby`; problems such as
  "Type an answer first" appear in red below it.
- **Gap-fill**: the build turns `{{n}}` in the question into `<span class="blank"
  data-blank="n">`, and `QuestionCard` renders an input into each one (React portals, so the
  build-time HTML is untouched). A blank's `hint` is its placeholder and part of its label
  ("Blank 2 of 3 (one word)"); `Enter` moves to the next blank and checks on the last one.
  **Check** needs every blank filled; after grading each blank turns green or red and the
  answer box lists what each blank accepts.

### Grading rules (`src/lib/grading.ts`)

| Type | Rule |
| --- | --- |
| `single`, `true_false` | correct iff exactly the correct option is selected |
| `multiple` | all-or-nothing: the selected set must equal the set of correct options; the feedback says how many were missed / wrong |
| `short_answer` + `accept` | correct iff the input equals an accepted answer after normalization: Unicode NFKC, lowercase, whitespace and punctuation (`\p{P}`) removed — math symbols such as `+ ^ =` are kept |
| `short_answer` + `numeric` | correct iff \|x − value\| ≤ `tolerance` (plus 1e-9 relative slack for float noise). Input may be `760`, `-0.5`, `7.6e2`, `1,000`, `0,5`, `1/3`; anything else asks for a number instead of grading (numeric-only keys) |
| `short_answer` + `pattern` | correct iff the trimmed, NFKC-normalized input fully matches the regex, ignoring case: `new RegExp("^(?:" + pattern + ")$", "i")`, no `u` flag so identity escapes such as `\-` work as in Python (`ShortAnswer.matches_pattern`). NFKC makes full-width `（32，3）` match `\(32,3\)` |
| `short_answer` gap-fill (`blanks`) | each blank is graded with its own key (rules above); correct iff every blank is |

A key may combine `numeric`, `accept` and `pattern`: they are tried in that order and any
match counts. The build fails on a `pattern` that does not compile in JavaScript, uses
Python-only syntax (`(?P<…>`, `\A`, `\Z`, inline flags), or rejects one of the key's `accept`
entries (the Zod mirror in `src/lib/schema.ts`; `mlr check` checks the same in Python).

### Progress storage (`src/lib/storage.ts`)

| Key | Value |
| --- | --- |
| `ml-recall:results:v1` | question id → `{ correct, at }`, the latest result (practice and tests) |
| `ml-recall:settings:v1` | `{ shuffleQuestions, reviewedOnly, examLayout }`; "Reviewed only" is shared with tests; `examLayout` (`"one"` · `"all"`, default `"one"`) is the test layout last chosen — settings saved without it get the default |
| `ml-recall:exam:v1:<scope>` | the [test in progress](#timed-tests) of one topic, tag or the mixed test |
| `ml-recall:exam-history:v1` | scope → `{ attempts, best }`: the last 10 tests and the best one |
| `ml-recall:mixed:v1` | `{ topics, tags, difficulties, size }`: the last choices on the [mixed test](#mixed-tests) form (`tags` absent before v0.4.1: no tag filter) |
| `ml-recall:srs:v1` | question id → `[due, stability, difficulty, scheduledDays, reps, lapses, state, lastReview]` (times in ms): the [spaced-repetition](#review-spaced-repetition) card (`src/lib/srs.ts`) |

`<scope>` is `topic:<id>`, `tag:<tag>` or `mixed:custom` (prefixed: a topic and a tag may share
a name, e.g. `pytorch`). All access is wrapped in `try/catch`; the app works without storage. The index
page reads the results to show "answered / total" per topic. Changing a stored format is a
breaking change (bump the key, migrate).

## Timed tests

"Take a test" on a topic or tag page opens `/topics/<topic>/exam/` or `/tags/<tag>/exam/`:
N random questions in N minutes, no feedback until the test is submitted. Pages are static;
the random draw happens in the browser from the questions embedded at build time.

- **Pool.** The same question bank as practice: every non-retired question of the topic or
  tag, of every type (single, multiple, true/false, short answer — auto-graded or open — with
  text, formulas and figures). Practice and test only differ in how questions are served.
  **Reviewed questions only** on the start screen (shared with practice) restricts the pool to
  `reviewed`.
- **Size and time.** N = min(20, pool); time limit = N minutes. A smaller pool says so on the
  start screen ("This topic has 8 questions, so this test has 8 questions · 8 minutes").
- **Draw.** A uniformly random subset in random order; options shuffled with the practice
  rules (`shuffle: false` and true/false keep file order). Each test is a new draw.
- **Layout.** The start screen offers **One at a time** (default) and **All on one page**;
  the choice is remembered (`examLayout` in the settings) and saved in the test in progress,
  so a reload resumes in the same layout. Results look the same either way.
- **During the test.** The practice `QuestionCard` without feedback (the short-answer format
  hint is shown; nothing about correctness), **Flag for review** per question, a navigator
  grid (answered / unanswered / flagged / current). The sticky status bar shows the
  countdown (`mm:ss`; amber at ≤ 5:00, red at ≤ 1:00, announced once at each threshold
  through an `aria-live` region), "answered k / N" and **Submit**. Submitting with unanswered
  or flagged questions asks for confirmation.
  - *One at a time:* Previous / Next (the last question has **Submit test**), the grid below.
  - *All on one page:* every question stacked and numbered like a paper exam; the status bar
    adds a row of question numbers that stays in reach while scrolling; the grid and **Submit
    test** are at the bottom. Clicking a number scrolls to that question (just below the
    status bar) and focuses it. The question in view — the last one whose top is above a
    line a third of the way down the window, or the one just jumped to — is "current": it is
    highlighted, saved as the position, and scrolled back to after a reload.
- **Short answers** are graded exactly as in practice. A gap-fill with every blank empty is
  "not answered"; once anything is typed, an empty blank counts as wrong.
- **Timer.** Derived from the start timestamp (`remainingMs(startedAt, durationMs, now)`), so
  it stays right when the tab sleeps or the page reloads; at 00:00 the test submits itself.
- **Resume.** The test in progress (question ids, option orders, answers, flags, position,
  start time, layout) is saved after every change. A reload resumes it; a test whose time ran out
  while the page was closed is submitted on load (dated at its deadline). A stored test that
  no longer matches the page (a question or its options changed after a deploy) is
  discarded. The topic / tag page then offers **Resume test**.
- **Keyboard.** `1`–`9` select the n-th option (toggle for "select all that apply"), `←` / `→`
  previous / next question, `F` flag, `Enter` in a short-answer field goes to the next
  question. Keys are ignored while typing in a text field. On one page they act on the
  focused question if it is visible, otherwise on the question in view.
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

## Cross-topic pages

The topic, tag and test pages embed their questions. Pages that span the whole bank cannot (the
bank renders to ~32 MB of HTML), so they embed only the **question index** — `toCatalog()` in
`bank.ts`: per domain and topic the visible ids plus one letter per id for the difficulty
(`e` / `m` / `h` / `-`) and status (`r` / `d`), about 100 KB (19 KB gzipped) — and fetch the
questions they show from **`/data/q/<id>.json`**: one file per visible question with exactly the
`QuizQuestion` props of the islands (src/pages/data/q/[id].json.ts, ~12 KB on average).
`fetchQuestions()` (src/lib/fetch.ts) loads them six at a time, in order, and fails as a whole
(`QuestionFetchError` with the failed ids) when one is missing or the network is down.

### Mixed tests

`/exam/` (`MixedExam.tsx`): a timed test drawn from the topics, tags and difficulties the
learner picks.

- **Form.** Topics grouped by domain (a checkbox per domain — all / some / none of its topics —
  and the topics inside a `<details>`), **Select all** / **Clear**; optional **tags** (below);
  difficulty (easy, medium, hard, with the count in the chosen topics and tags); length
  **10 / 20 / 30 / 40 / 50** questions (default 20; N minutes); the [layout](#timed-tests);
  "Reviewed questions only" when the selection has drafts. A line says how many questions
  match. Topics, tags, difficulties and length are remembered (`ml-recall:mixed:v1`; unknown
  topic ids and tags are dropped). Default: everything, no tag filter.
- **Tags.** A search box over every tag (a `<datalist>`, rendered only after hydration — it
  has thousands of options), the chosen tags as removable chips, and the eight largest tags as
  one-click suggestions. Picking a suggestion adds the tag; a typed tag is added with Enter or
  **Add** when it matches exactly. The page embeds the tag index as one string
  (`CatalogTags`: `tag:p.p.p …`, base-36 positions in catalog order — `encodeTags` /
  `decodeTags`), about 60 KB for every tag instead of an object that island props would wrap
  and escape entry by entry.
- **Link from a tag page.** A tag with more questions than a tag test uses (20) links to
  `/exam/?tag=<tag>`: the form opens with that tag, every topic and every difficulty (saved as
  the form's choices), and the query is removed from the address.
- **Pool** (`selectionPool` in src/lib/catalog.ts): questions of the chosen topics that carry
  at least one chosen tag (when any is chosen) and whose difficulty is chosen; a question
  without a difficulty is drawn only when all three are chosen. **Draw:** `drawIds` picks N ids uniformly at random, the page fetches them, and the
  usual `Exam` island starts at once (`autoStart`, `maxQuestions = N`) — the
  [timed test](#timed-tests) rules apply unchanged, with the topic shown on each question.
- **Scope** `mixed:custom`: one test in progress and one history for all mixed tests. On load
  the page reads the stored test's ids (`storedExamIds`), fetches them and resumes; if they
  cannot be loaded (offline) the test is kept for a later reload, and if it no longer matches
  the site it is discarded with a notice. **New test** returns to the form; the results link
  to **Practice your mistakes**.

### Review (spaced repetition)

`/review/` (`Review.tsx`, scheduling in `src/lib/srs.ts` with [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs), MIT):

- **Cards.** Every graded answer — practice, test, My mistakes, review — is a review of that
  question's FSRS card: wrong = **Again**, right = **Good** (`saveResults` → `recordReviews`;
  the scheduler module is loaded with a dynamic `import()` on the first answer, so pages
  without answers don't download it). FSRS defaults (90 % target retention), days-based
  (`enable_short_term: false`: no same-day learning steps), with fuzz. A card is **due** on the
  local day of its due date or later (`dueIds`, `endOfDay`).
- **Backfill.** Results stored before scheduling existed (or imported from another browser)
  get a card on first visit: one review at the time of the stored result (`withBackfill`).
- **Page.** "N questions due", **Review N now** (at most 50 per round, most overdue first),
  tiles (due today, tomorrow, next 7 days, tracked and mature ≥ 21 days), a 7-day forecast and
  the due questions per topic with a **Review** button each. A round fetches the questions and
  runs the practice `Quiz` with topics shown.
- **Rating.** After a right answer the sticky bar offers **Hard · Good · Easy** with the next
  interval each gives (`previewDays`, fuzz-free); Good is already recorded and selected, and a
  click re-rates from the card as it was when the round started (`rateAnswer`). A wrong answer
  shows "Again: it comes back tomorrow".
- **Badge.** "Review" in the header (and on the index) shows today's due count, read from
  storage by a tiny script (`src/lib/srs-due.ts`, no scheduler); it refreshes when cards are
  saved (`ml-recall:srs` window event) and on back/forward navigation.

### My mistakes

`/mistakes/` (`Mistakes.tsx`): every question whose **latest** result (`ml-recall:results:v1`,
written by practice and tests) is wrong, most recent first, grouped by topic (`mistakesOf`,
`mistakesByTopic`). **Practice all** — or the 50 most recent when there are more — or one
topic: the page fetches those questions and runs the practice `Quiz` with topics shown.
Answering a question correctly anywhere removes it; **← All mistakes** re-reads the results.
Retired ids are ignored.

### Progress

`/progress/` (`Progress.tsx`), from the browser's storage only: totals (answered / bank,
correct and its share of answered, questions to revisit with a link to My mistakes, tests
kept), then per domain a table of the topics with any activity — answered / total, correct,
to revisit, last test, best test and a bar chart of the last 10 test scores (oldest left; the
scores are also in screen-reader text) — and a table of tag and mixed tests. At phone width
"Correct", "Best" and the chart are hidden.

## Figures

`figure`, `explanation_figure` and option `image` paths are relative to the YAML file
(`./cnn/cnn-007.svg`). `bank.ts` collects all images under `src/content/quizzes/` with
`import.meta.glob(…, { query: "?url" })`, so Vite fingerprints and copies them (small SVGs are
inlined) and the URLs already include the base path. A missing file fails the build. Figures
render on a white card in both themes, lazy-loaded, with `alt` and an optional caption.

- **Zoom.** A click on a question or explanation figure — or the corner button, the only way
  for option images, where a click selects the option — opens it enlarged in a native modal
  `<dialog>` (portal to `<body>`, so clicks inside never reach the option's `<label>`); Esc,
  **Close** or a click outside closes it. Quiz and test shortcuts ignore keys inside a dialog.
- **Picture options.** When every option of a question has an `image`, the options are laid out
  as a grid, two per row from the `sm` breakpoint.

## URLs and base path

The site is built for `https://mtoan651.github.io` with `base: '/ml-recall'` and
`trailingSlash: 'always'` (`astro.config.mjs`). Build internal links with `url()`,
`topicUrl()`, `tagUrl()`, `topicExamUrl()`, `tagExamUrl()`, `mixedExamUrl()`, `mistakesUrl()`,
`progressUrl()` and `questionDataUrl()` from `src/lib/url.ts`, never with a hard-coded `/…`.

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
| Timed test UI | `src/components/Exam.tsx` (flow), `ExamStart.tsx`, `ExamRunner.tsx` (both layouts, timer, keys), `ExamNavigator.tsx`, `ConfirmSubmit.tsx`, `ExamResults.tsx`; "Take a test" box: `ExamCallout.astro` |
| Question index, mixed-test pool, mistakes, progress | `src/lib/catalog.ts` (+ `catalog.test.ts`); index built by `toCatalog()` in `bank.ts` |
| Fetching questions; per-question JSON | `src/lib/fetch.ts` (+ `fetch.test.ts`); `src/pages/data/q/[id].json.ts` |
| Mixed test, My mistakes, Progress UI | `src/components/MixedExam.tsx`, `Mistakes.tsx`, `Progress.tsx`; pages `exam.astro`, `mistakes.astro`, `progress.astro` |
| Spaced repetition: cards, due, forecast, rating; review UI; due badge | `src/lib/srs.ts` (+ `srs.test.ts`), `src/lib/srs-due.ts`; `src/components/Review.tsx`, page `review.astro`; badge script in `Base.astro` |
| Figure zoom, picture-option grid | `src/components/Figure.tsx`; `OptionList` in `QuestionCard.tsx` |
| Short-answer format hints | `answerHint()` in `src/lib/grading.ts`; shown by `QuestionCard.tsx` |
| Colours, dark mode | tokens at the top of `src/styles/global.css` |
| Header, footer, `<head>` | `src/layouts/Base.astro` |
| Pages | `src/pages/` |
