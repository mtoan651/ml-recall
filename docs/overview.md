# Overview

**ml-recall** is an active-recall question bank for AI / ML / DL, served as a free static quiz
site. It began as revision material for an *Introduction to Deep Learning* course and grows with
open-licensed sources from the internet.

## Goals

- Exam-style practice: single/multiple choice, true/false, short answers (including numeric
  calculations), timed mock exams.
- Every question is **traceable** (`source`) and every reviewed explanation is **cited** (`references`).
- Quality over quantity: curated imports, explicit drop reasons, a human review step.
- Zero running cost: data in git, static site on GitHub Pages, progress in the browser.

Non-goals: user accounts, a backend, hosting copyrighted course material.

## Lessons from the reference project

[ngocthien2306/SMM_QUIZ](https://github.com/ngocthien2306/SMM_QUIZ) is a single `index.html` plus
10 JSON files (248 questions) on GitHub Pages. Kept: data separated from UI, static hosting,
explanations. Fixed here:

| SMM_QUIZ | ml-recall |
| --- | --- |
| ~55% of keys are option C, 93% are B or C — guessable | options shuffled; `mlr check` reports position and length bias |
| `answer: <index>` | `correct: true` on options (shuffle-safe, supports multiple answers) |
| quiz list hard-coded (`for i <= 10`) and fetched from raw.githubusercontent | content collections discovered at build time |
| no source, topic, difficulty | `source`, `references`, taxonomy, `difficulty`, `tags` |
| no math/code rendering | Markdown + KaTeX + code highlighting |
| no validation, no license | schema + CI; MIT code, per-source content licenses |
| fixed 25-minute timer, no progress | timer per question count; progress and spaced repetition (roadmap) |

## Branding

- **Name:** `ml-recall` — *recall* is both an ML metric and the active-recall study technique.
- **Description:** Active-recall quiz bank for AI/ML/DL: exam-style questions with LaTeX, cited
  explanations, timed mock exams and spaced repetition. Free static site on GitHub Pages.
- **Homepage:** `https://mtoan65.github.io/ml-recall`
- **GitHub topics (20):** machine-learning, deep-learning, artificial-intelligence,
  neural-networks, llm, transformers, quiz, quiz-app, mcq, exam-preparation,
  interview-preparation, active-recall, spaced-repetition, flashcards, study-tool, education,
  astro, typescript, github-pages, katex
- **Hashtags:** #MachineLearning #DeepLearning #AI #NeuralNetworks #LLM #ExamPrep #ActiveRecall
  #StudyWithMe #LearnInPublic #100DaysOfMLCode #OpenSource
- **SEO keywords:** deep learning quiz, machine learning multiple choice questions, neural network
  practice questions, transformer attention quiz, AI interview questions, ML exam preparation,
  câu hỏi trắc nghiệm deep learning, ôn thi machine learning

## Decision log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-09 | YAML, one file per topic | reviewable diffs; LaTeX without escaping |
| 2026-10-09 | Python tooling now, Astro web app in v0.2 | data first; the maintainer works in Python |
| 2026-10-09 | `correct: true` on options, runtime shuffling, `shuffle: false` escape hatch | fixes answer-position bias |
| 2026-10-09 | `source` (provenance) separate from `references` (citations, `[^n]` markers) | every explanation must cite; questions may cite too |
| 2026-10-09 | question types `single`, `multiple`, `true_false`, `short_answer` | exam formats incl. calculations and open questions |
| 2026-10-09 | `status: retired` instead of deleting | ids are progress keys and must never be reused |
| 2026-10-09 | pinned upstream revisions + per-item curation files | reproducible, auditable imports |
| 2026-10-09 | code MIT; each question under its source's license, originals CC BY-SA 4.0 | compatible with d2l (CC BY-SA) adaptations |
| 2026-10-09 | GitHub Flow with squash merges | simplest flow for one maintainer |
| 2026-10-10 | local layout `intro_dl/{materials,ml-recall}`: course files outside the repo, derived data in `.cache/` | copyrighted slides can never be committed by accident |
