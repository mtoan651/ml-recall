# Changelog

All notable changes are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning: [SemVer](https://semver.org) as defined in [docs/conventions.md](docs/conventions.md#versioning).

## [Unreleased]

### Added

- **Topic notes** (`/topics/<topic>/notes/`): a cheat sheet for each of the 54 topics — key ideas,
  formulas, a worked example, a short code sample and the common pitfalls the questions probe —
  with 2–8 cited references each. Written by one agent per group of topics and reviewed by a
  second, independent pass (every formula, example and code output re-derived, every source
  opened; all 54 revised). Topic pages link "Read the notes"; notes are searchable.
- **57 questions from the Hands-On Machine Learning notebooks** (Apache-2.0 notebooks only, never
  the book's text): written from the exercise solutions of 18 chapters across 24 topics, 22 of
  them code reading (TensorFlow ideas rewritten in PyTorch or scikit-learn), every snippet run;
  reviewed by a second, independent pass (25 fixed, e.g. the deprecated `SVC(probability=True)`
  and version-dependent numbers).
- **59 questions from OpenIntro Statistics** (CC BY-SA 3.0, from its GitHub LaTeX source):
  odd-numbered exercises with printed answers — probability 19, statistics 30 (sampling, inference,
  power, χ², ANOVA), linear regression 10 — keys re-derived with scipy and tolerances that reject
  common mistakes; reviewed by a second, independent pass (10 fixed).
- **Review with spaced repetition** (`/review/`): every answered question gets an FSRS card
  (wrong = Again, right = Good, from practice, tests, My mistakes and reviews alike); the page
  lists what is due today, most overdue first, by topic, with a 7-day forecast, and after a
  right answer lets you rate it Hard, Good or Easy (with the next interval shown). Past
  results become cards on first visit. A badge on "Review" in the header shows today's count.
- **Export and import progress** (on `/progress/`): download everything this browser stores
  as a JSON file and import it elsewhere. Importing merges — the newer answer and review card
  per question win, test histories are joined — so an old file never overwrites recent work.
- **Search** (`/search/`): full-text search over every question with filters for domain,
  topic, type and difficulty (Pagefind, built with the site), and a page per question
  (`/q/<id>/`) to answer or share it.
- **Works offline and installs as an app**: a service worker keeps every page you open (and the
  main pages from the start), so practice, Review, Mistakes and Progress keep working without
  a connection; pages not kept yet show an offline page listing what is.
- **English–Vietnamese glossary** (`/glossary/`): 458 terms from the glossary of *Đắm mình vào
  Học Sâu* (d2l-vi, CC BY-SA 4.0), searchable in both languages; `uv run mlr glossary`
  regenerates it from the pinned upstream file.
- **Vietnamese interface**: an EN | VI switch in the header (remembered; a browser set to
  Vietnamese starts in Vietnamese) translates the whole interface — navigation, buttons,
  feedback, tests, Review, Mistakes, Progress, search, dates and numbers — using the d2l-vi
  terms. Questions, explanations and notes stay in English; topic and domain titles show the
  Vietnamese title next to the English one ("Mạng nơ-ron tích chập · Convolutional Neural
  Networks"). Switching keeps a test in progress, and Vietnamese pages show no English first.

### Fixed

- `object-detection-005` linked the PASCAL VOC paper on a host that now disallows crawlers; it
  uses the DOI instead (curation fix).
- Three imported questions whose wording made the key debatable, found while reviewing the topic
  notes (each recorded as a curation fix): `gans-006` (Google calls GAN training alternating,
  Goodfellow et al. "simultaneous" — now asks about updating both in every step),
  `probabilistic-models-010` ("always increase" vs `-007`'s reading of the same word — now "never
  decreases"), `nlp-basics-006` (stop words were defined as never changing the sentiment, but
  lists can contain "not").

## [0.4.1] — 2026-10-12

Finishes what the v0.4.0 roadmap promised. The tag filter is a new capability, which the
conventions would make a MINOR bump; it ships as a PATCH because it completes the v0.4.0
mixed-test item rather than starting new work.

Bank: 2909 questions, all reviewed (56 by the owner, 2853 by Claude, "AI-checked"), 8 retired —
ml 864, dl 486, math 372, ai 303, practice 230, nlp 212, llm 138, cv 119, rl 93, gen 92; every
topic has at least 26 questions, so every topic test has the full 20.

### Added

- **Tags in mixed tests** — the part of the v0.4.0 roadmap item ("across topics, difficulty and
  tags") that v0.4.0 left out: search any of the 2258 tags or pick one of the largest, and a
  mixed test draws only questions with at least one chosen tag (within the chosen topics and
  difficulties). A tag page with more than 20 questions links to `/exam/?tag=<tag>` for a
  longer test or one by difficulty — e.g. all 132 `ce6146` questions, up to 50 at a time.
- **12 questions for Deep Learning Frameworks** (18 → 30), the only topic that could not fill a
  20-question test: eager vs. graph execution, tracing and data-dependent `if`, JAX `jit`
  retracing and PRNG keys, float16 loss scaling, activation checkpointing (peak memory),
  gradient accumulation, `DataLoader` workers, DDP gradient averaging, ZeRO-2 memory,
  run-to-run nondeterminism, `state_dict` vs. pickling. Written and then reviewed by a second,
  independent pass (every key re-run with PyTorch 2.14 / JAX 0.11 or simulated, every reference
  opened; 10 fixed, none dropped), `reviewed_by: claude`.

### Fixed

- Roadmap: items shipped in a later version showed an open box (exam mode, NCU lecture
  questions, `mlr extract`); v0.2.0 was not marked done; keyboard shortcuts were missing; the
  v0.4.0 mixed-test line had been narrowed to what shipped. Source `plan` notes and
  `docs/sources.md` carried import counts from before the v0.3 keep-and-fix re-review and
  still described self-graded answers, which v0.3.0 replaced with fill-ins.

## [0.4.0] — 2026-10-12

### Added

- **Mixed tests** (`/exam/`): pick topics (by domain), difficulties and a length of 10–50
  questions; a timed test draws from all of them with the usual test rules, its own history
  and resume after a reload. The form remembers its choices.
- **My mistakes** (`/mistakes/`): every question whose latest answer was wrong, by topic, to
  practice again (all, the 50 most recent, or one topic); a correct answer removes it.
- **Progress** (`/progress/`): answered / correct / to revisit per topic, last and best test
  and a chart of the last 10 test scores, plus tag and mixed tests.
- Per-question JSON (`/data/q/<id>.json`) and a compact question index, so the cross-topic
  pages fetch only the questions they show instead of embedding the bank.
- Figures can be enlarged (click, or the corner button on option images; Esc closes), and
  questions whose options are all pictures show them as a 2 × 2 grid.
- **271 new questions** (2626 → 2897), each reviewed by a second, independent pass (every key
  re-derived by script or by running the code, every reference opened; 18 dropped, 141 fixed
  before they went in) and marked `reviewed_by: claude`:
  - **CE6146 lectures 1–3** (81, `ncu-intro-dl`): extracted with `mlr extract`, paraphrased (no
    run of 8+ words shared with the slides), each citing its slides plus an open source —
    forward/backward passes by hand, activations and losses, initialization, optimizers
    (momentum, RMSProp, Adam, AdamW), regularization, batch norm, evaluation.
  - **Code reading** (55): Tensor Puzzles (12), LLMs-from-scratch code (20: tokenizer, sliding
    windows, attention masks and scaling, GPT shapes, top-k/temperature, LoRA), NumPy (17
    original) and PyTorch autograd/modules — the output of every snippet comes from running it.
  - **Computer vision** (68, original): cv-basics 15 → 35, object detection 20 → 46,
    segmentation 16 → 38 — IoU and NMS step by step (with two figures), anchors, AP/mAP, RoI
    pooling, FCN/transposed convolution, U-Net, dilated convolution, Dice/IoU/PQ, Sobel,
    histogram equalization, colour and memory computations.
  - **Thin topics** (67, original): AI intro 12 → 34 (agents, PEAS, environments, Turing test),
    NLP basics 22 → 37, NLP tasks 24 → 40 (BIO, entity F1, BLEU, ROUGE), tokenization 25 → 44
    (BPE, WordPiece and Unigram by hand).
- `mlr extract <pdf|dir> [--colors]`: PDF → Markdown in the git-ignored `.cache/extract/`, one
  `## Page N` section per page (so questions can cite slides), via pdfminer.six. `--colors`
  marks coloured text as `[red: …]`, which recovers answer keys printed in red (CE6146
  exercises) that plain text extraction loses.

Bank: 2897 questions, all reviewed (56 by the owner, 2841 by Claude, "AI-checked"), 8 retired —
ml 864, dl 474, math 372, ai 303, practice 230, nlp 212, llm 138, cv 119, rl 93, gen 92;
questions from 54 external sources (66 registered, 9 of them reference-only).

## [0.3.0] — 2026-10-12

### Changed

- Citation checks (Python and Zod) find `[^n]` after inline math that wraps onto a second line
  or after an escaped `\$`; before, such markers could be hidden.
- Licence policy: the project is non-commercial (study and research), so NonCommercial sources
  without ND (CC BY-NC-SA) may be adapted; those questions keep their licence
  (`LICENSE-CONTENT.md`, `THIRD_PARTY_NOTICES.md`). MMLU subsets are imported selectively.
- `mlr check` is ~5× faster: the near-duplicate scan only compares texts of similar length.
- CI re-renders every figure (`mlr figs --force`) and fails if a committed SVG differs from
  its generator; `astral-sh/setup-uv` v6 → v10.3.0 (Node 24 runtime; pinned to the exact tag,
  as the action no longer publishes major-version tags).
- Source decisions: MMLU subsets only as hand-picked keep-lists, not wholesale (its questions
  come from practice tests and books); AI clauses are judged by what they cover (a training ban doesn't affect us, an
  ingestion ban does); OpenIntro stays usable from its GitHub repo; Deep-ML is reference-only
  (educational-use licence). `docs/sources.md` lists the surveyed candidates and why the rest
  are not usable.
- Dropped upstream questions were re-reviewed under a keep-and-fix rule: an item is dropped only
  for a content reason (off-scope, trivial, tool-specific, duplicate, dated trivia), while
  ambiguous, inaccurate and lesson-specific ones are fixed. 287 more upstream questions kept
  (942 of 1139): numpy-100 +34, MS Data Science +55, MS AI +49, MS ML +52, MMLU-Redux +53, HF
  LLM/Agents/Deep RL +29, Google +15. Every fix is a curation `fix`, so a fresh import
  reproduces the bank.
- Deep Learning Interviews is used from arXiv v2 only (`pinned: 2201.00650v2`), under the CC BY
  4.0 licence arXiv lists for that version; the book's own copyright page reserves all rights,
  so no other copy is used (see Added).
- Practice and timed tests share one question bank: tests draw from every question of the
  topic or tag (e.g. NumPy: 1 → 64 questions to draw from, Q-learning: 8 → 20).
- Short answers are always fill-ins, graded automatically: one number or word/phrase, or a
  **gap-fill** with blanks `{{1}}`, `{{2}}`… inside the question (an input in place of each
  blank; correct when every blank is). The 85 open, self-graded questions (63 numpy-100, 21 HF
  Deep RL, 1 original) were converted — none retired — and self-grading is gone from practice
  and tests. Schema: `AnswerKey`, `ShortAnswer.blanks`, optional `model`; `mlr check` and the
  build reject open short answers and misplaced or misnumbered blanks.
- `openstax-intro-stats` is now `reference` and not used: OpenStax moved to CC BY-NC-SA 4.0 and
  forbids ingestion into LLMs/generative AI (checked 2026-10-11). CLAUDE.md and docs/sources.md say not to
  fetch or cite such sources.

### Added

- **Every draft reviewed** (2578 questions, 20 reviewers working in parallel): each key
  re-derived by script, simulator or brute force (search and game trees, d-separation, message
  passing, value iteration, NumPy/PyTorch snippets run); explanations made self-contained and
  cited; a `why` on every wrong option; difficulty everywhere. No answer key was wrong; about
  1,000 questions were improved (stems that pointed at another question or "the lesson",
  missing feedback, wrong locators, a few factual slips in explanations, graders that rejected
  natural answer variants). 2567 questions are now `reviewed` with `reviewed_by: claude`
  ("AI-checked" in the quiz). The 11 items left for the owner were then settled with the owner:
  data-prep-018 is re-keyed to the four latitude buckets its own plot shows (Google's key,
  "Don't bucket", contradicted the stem); huggingface-007 and -021 are rewritten as concept
  questions (the tokenizer's steps; why seq2seq label padding is −100); eight Hugging Face /
  smolagents API-trivia or duplicate items are retired. No drafts remain: 2626 active questions,
  all reviewed.
- `reviewed_by` (`owner` | `claude`) on reviewed questions, with an "AI-checked" badge.
- `mlr sync-curation [--check]`: records bank edits of imported questions as curation fixes; the
  ~900 imported questions whose explanations lived only in the bank are now reproducible.
- 114 questions from *Deep Learning Interviews* (Kashani & Ivry), arXiv v2 only, under the CC BY
  4.0 licence arXiv lists for it (the book's copyright page conflicts; the owner chose the arXiv
  licence for this non-commercial study project). Every key re-derived by script: ~22 printed
  solutions were wrong and are corrected (e.g. an odds ratio, a cross-entropy, a VGG output
  size). Trees/ensembles +15, transfer learning +13, optimization +10, logistic regression +10,
  CNNs +9, neural networks +9, probabilistic models +8, information theory +7, and others.
- 879 more questions (1641 → 2520), all drafts with cited explanations; numbers re-computed by
  script, search/game/logic/graph keys by simulators and brute force:
  - **Non-commercial course material** (new licence policy, CC BY-NC-SA, 374): MIT
    OpenCourseWare 6.034, 16.410, 6.867, 6.438, 18.657, 9.520, 15.062, 6.7960, 6.864, 18.065,
    6.S890, 18.S096 (292; keys worked out where OCW publishes none) and NPTEL assignments with
    their published answers (71); UBC DSCI 571 (11).
  - **Open courses**: Neuromatch Academy (84), Kaggle Learn via `learntools` (75), Data Science
    Interviews (50), Microsoft Generative AI / AI Agents / GenAI-with-JS (28), Learn PyTorch,
    Spinning Up, Udacity, Cortal NLP (60), UBC DSCI 563/573 (24), trusthlt NLP (23), Galaxy
    Training Network (14), Hugging Face MCP Course (7), Google Intro to ML (10).
  - **MMLU-Redux keep-lists**: econometrics (20) and college computer science (9), two upstream
    keys corrected.
  - **Original questions** (101) for genetic algorithms, fine-tuning/PEFT, alignment,
    multi-agent, diffusion, search, segmentation, autoencoders, transfer learning and policy
    gradient.
  - Topics that were thin: search 6 → 86, probabilistic models 94 → 125, knowledge
    representation 45 → 69, time series 16 → 59, multi-agent 10 → 45, genetic algorithms
    6 → 31, diffusion 0 → 29, fine-tuning 6 → 27, alignment 10 → 26, policy gradient 11 → 27,
    autoencoders 8 → 32, transfer learning 8 → 30.
- `figstyle.graph_figure` draws graphical-model diagrams, search graphs and game trees; the
  Gutmann generators use it (all figures re-render byte-identical).
- 575 questions from newly surveyed open sources (1066 → 1641), all drafts with cited
  explanations; numbers re-computed by script, logic keys by truth tables, graph claims by a
  d-separation checker:
  - d2l: every remaining convertible end-of-section exercise (+335; 371 in all) — CNNs and
    computer vision, sequence models and attention, preliminaries and MLPs, the maths appendix,
    optimization and Gaussian processes.
  - Gutmann, *Pen and Paper Exercises in Machine Learning* (91, CC BY 4.0) with 30 redrawn graphs.
  - UBC CPSC 330 and DSCI 575 (92, CC BY 4.0), three pictures redrawn.
  - *forall x: Calgary* (38, CC BY 4.0) for knowledge representation.
  - Hugging Face Audio Course quizzes (12, importer `hf-audio-course`), ML-InterviewQs (6),
    dlbook_exercises (1).
  - Thin topics now: probabilistic models 10 → 94, knowledge representation 7 → 45, PyTorch
    7 → 39, RNNs 12 → 36, CNNs 11 → 36, object detection 7 → 20, nonparametric 5 → 21,
    architectures 6 → 17, tokenization 7 → 13, search 2 → 5, fine-tuning 3 → 6.
- 67 questions for the thinnest topics, from d2l exercises (36) and original questions citing
  d2l, scikit-learn, Distill and Wikipedia (31): information theory 1 → 17, logistic
  regression 6 → 20, learning theory 3 → 22, dimensionality reduction 1 → 19.
- Picture questions are kept and redrawn: 20 questions that had been dropped as image-only or
  page-dependent are restored (Google MLCC 11, Google ML courses 4, HF Deep RL 5), and 21
  questions (17 restored + 4 already kept) now show 30 SVG figures generated from code — ROC curves with exact AUCs, loss curves, histograms,
  scatter plots, a fairness prediction grid, similarity vectors, decision trees with their
  prediction map, a network diagram, and the Bellman/TD/Monte Carlo/Q-learning equations with
  numbered parts (with written model answers). `tools/mlrecall/figstyle.py` (shared style and
  helpers, deterministic SVG), `mlr figs` (re-render stale figures), curation fixes for `figure`,
  `images`, `explanation_figure` and `answer`; `mlr check` no longer flags same-stem questions
  about different figures as duplicates.
- 129 draft questions from three new sources: Google Machine Learning Crash Course (44), Google's
  Decision Forests, Clustering, GANs and Problem Framing courses (22) — page quizzes with
  per-option feedback, CC BY 4.0 — and numpy-100 (63 NumPy exercises, MIT). Stems that
  relied on a picture or an interactive widget were rewritten to stand alone; weak upstream
  feedback was replaced by cited explanations. New importers `google_ml` and `numpy_100`;
  curation `fix.why` edits or removes option feedback.
- Timed tests for every topic and tag (`/topics/<topic>/exam/`, `/tags/<tag>/exam/`): up to 20
  random auto-graded questions, 1 minute each, one question per screen or all on one page. The
  clock runs from the start time, a reload resumes the test, it is submitted at 00:00, and the
  results page explains every question. Best score and history per topic/tag.
- Regex-graded short answers: `pattern` (full match, case-insensitive, NFKC, ASCII semantics,
  checked in Python and JavaScript) and `hint` (format guidance under the input).
- "No explanation yet" notice for questions without any explanation.
- 178 draft questions from four new importers (pinned upstream revisions, per-item curation):
  Hugging Face Deep RL Course (36), Hugging Face AI Agents Course
  (19), Microsoft Data Science for Beginners (15) and MMLU-Redux `high_school_statistics` (75, 2
  answer keys corrected) and `college_mathematics` (33). Topics with ≥ 20 questions: 4 → 7;
  `rag-agents` and `policy-gradient` are no longer empty.
- Source registry: `hf-deep-rl-course`, `hf-agents-course`, `ms-ds-for-beginners`,
  `openintro-stats` (CC BY-SA 3.0) and `openstax-intro-stats` (reference only, see Changed) — 25
  external sources.
- Cited explanations for all 395 imported questions that had none (then `draft`, reviewed since):
  each answer key re-solved first, every `[^n]` reference opened and checked, `difficulty` set,
  lesson references narrowed to the section that covers the point. Main sources: d2l, the
  course lessons, OpenIntro *Introduction to Modern Statistics*, Penn State STAT notes, Sutton &
  Barto, scikit-learn, CS229, Interactive Linear Algebra, Active Calculus.
- Curation: `default_drop` keep-lists, per-item overrides of `exclude_prefixes`, `keep: true` for
  flagged items.

### Fixed

- Audit of all 712 questions: every key re-solved, numbers recomputed. 2 wrong keys
  (training-004 had two valid loop orders; huggingface-021 relied on `as_target_tokenizer`,
  removed in Transformers v5), about 80 major issues (second defensible options, missing
  context, misleading or pasted-together upstream explanations, chapter-intro citations,
  fill-in keys that accepted wrong code such as unbracketed shapes or einsum strings without
  commas) and about 250 minor ones (plain-text math → KaTeX, typos, options named by letter,
  "all of the above", length giveaways). Longest-option bias 37% → 30%.
- Equation figures put the underline below the deepest descender (q-learning-019).
- Penn State STAT links point at the current URLs (without `.html`).
- `trees-ensembles-006`: the MMLU key "weak classifiers" contradicted how bagging works; the
  question is reworded with a new key (bootstrap samples + averaging). `statistics-005`: the
  distractor "a class of data" was also correct and is replaced. `statistics-021`: restored the
  missing ≠ in $H_a$. `policy-gradient-007`: "n strategies" → "n trajectories". All four are
  recorded as curation fixes.
- Dollar amounts in imported statistics questions are escaped (`\$`) so KaTeX does not treat them
  as math.

### Security

- KaTeX 0.16.47 → 0.19.0 for GHSA-238p-pmpm-9mq7 (prototype pollution could bypass `trust`;
  low severity). A pnpm override makes `rehype-katex` and `remark-math`, which ask for `^0.16`,
  use the same version; every question still renders, with no KaTeX warnings.

Bank: 2626 questions, all reviewed (56 by the owner, 2570 by Claude, "AI-checked"), 8 retired —
ml 851, dl 419, math 351, ai 281, practice 195, nlp 162, llm 131, rl 93, gen 92, cv 51; questions
from 52 external sources (66 registered, 9 of them reference-only).

## [0.2.0] — 2026-10-10

### Added

- Quiz website (Astro 7 + React + Tailwind), live at <https://mtoan651.github.io/ml-recall/>:
  topic and tag practice pages, all four question types (short answers auto- or self-graded),
  option shuffling that respects `shuffle: false`, per-option feedback, explanations with
  footnoted references and source/license, reviewed-only filter, end-of-session summary with
  "retry missed", keyboard shortcuts, progress in the browser. Build-time Markdown + KaTeX + Shiki;
  the build fails on schema, reference or LaTeX errors (Zod mirror of the pydantic schema).
- CI builds and tests the web app; a `deploy` job publishes `main` to GitHub Pages.
- 51 questions paraphrased from CE6146 Exercises 1–3 (`ncu-intro-dl`; tags `ce6146`,
  `ce6146-ex01`…`ex03`), each citing lecture slides and *Dive into Deep Learning*, reviewed by the
  maintainer. The answer key of Exercise 2 Q1 is corrected (regression, not clustering).
- `docs/web-app.md`; new topic file `dl/frameworks.yaml`.

### Changed

- Published as `github.com/mtoan651/ml-recall`; `main` is protected (PR + CI required, squash only).
- Course materials are kept outside the repository (`../materials/`); upstream downloads are
  cached in the git-ignored `.cache/upstream/` instead of `materials/external/`.

### Fixed

- Stray escaped quotes (`\"`) in the `ncu-intro-dl` notes in `sources.yaml`.

Bank: 384 questions (56 reviewed, 328 draft) — ml 111, dl 104, nlp 47, practice 27, math 22, ai 21,
llm 20, rl 12, cv 10, gen 10.

## [0.1.0] — 2026-10-09

### Added

- Question bank schema (`schema_version: 1`): types `single`, `multiple`, `true_false`,
  `short_answer`; `references` with `[^n]` citation markers; `source` provenance; statuses
  `draft` / `reviewed` / `retired`; figures. Exported to `schema/*.schema.json`.
- `mlr` CLI: `check` (integrity errors, quality warnings, bias report), `import`, `schema`, `stats`.
- Taxonomy: 10 domains, 54 topics. Source registry: 20 external sources + `original`, `ncu-intro-dl`.
- Importers with pinned revisions and per-item curation for 4 sources:
  HF LLM Course (86 of 132), Microsoft AI for Beginners (92 of 145),
  Microsoft ML for Beginners (60 of 156), MMLU-Redux `machine_learning` (90 of 100;
  2 answer keys corrected, 4 flagged rows repaired).
- 5 original reviewed questions (4 `short_answer`, 1 `multiple`) citing *Dive into Deep Learning*.
- Project handbook in `docs/`, `CLAUDE.md`, question-generation prompt, CI workflow.

Bank: 333 questions (328 draft, 5 reviewed) — ml 97, dl 77, nlp 47, practice 27, ai 20, llm 20,
math 13, rl 12, cv 10, gen 10.

[Unreleased]: https://github.com/mtoan651/ml-recall/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/mtoan651/ml-recall/releases/tag/v0.4.1
[0.4.0]: https://github.com/mtoan651/ml-recall/releases/tag/v0.4.0
[0.3.0]: https://github.com/mtoan651/ml-recall/releases/tag/v0.3.0
[0.2.0]: https://github.com/mtoan651/ml-recall/releases/tag/v0.2.0
[0.1.0]: https://github.com/mtoan651/ml-recall/releases/tag/v0.1.0
