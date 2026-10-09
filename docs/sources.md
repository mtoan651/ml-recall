# Sources

The machine-readable registry is [`src/content/sources.yaml`](../src/content/sources.yaml); this
page explains the choices. Licenses were checked on 2026-10-09 against each upstream LICENSE file
or site terms.

**Usage:** `adapt` = may be imported/adapted with attribution · `reference` = cite only, write
original questions. See [content-pipeline.md](content-pipeline.md#copyright-rules).

## Adapt (open licenses)

| # | Source | What it offers | License | Status |
| --- | --- | --- | --- | --- |
| 1 | [Hugging Face LLM Course](https://huggingface.co/learn/llm-course) | end-of-chapter MCQ with per-option explanations; transformers, tokenizers, fine-tuning, reasoning | Apache-2.0 | **v0.1 imported** (86) |
| 2 | [Microsoft AI for Beginners](https://github.com/microsoft/AI-For-Beginners) | pre/post-lecture quizzes: NN, CV, NLP, GANs, RL, ethics | MIT | **v0.1 imported** (92) |
| 3 | [Microsoft ML for Beginners](https://github.com/microsoft/ML-For-Beginners) | pre/post-lecture quizzes: classical ML, time series, NLP basics | MIT | **v0.1 imported** (60) |
| 4 | [MMLU-Redux 2.0 — machine_learning](https://huggingface.co/datasets/edinburgh-dawg/mmlu-redux-2.0) | college-exam MCQ with expert error labels (MMLU itself is MIT) | CC-BY-4.0 | **v0.1 imported** (90) |
| 5 | [Deep Learning Interviews](https://arxiv.org/abs/2201.00650) (Kashani & Ivry) | hundreds of fully solved problems: math, info theory, CNNs, ensembles | CC-BY-4.0 | v0.3 — PDF → MCQ |
| 6 | [Dive into Deep Learning](https://d2l.ai) | end-of-section exercises; main citation target for DL | CC-BY-SA-4.0 | v0.3 — exercises → MCQ |
| 7 | [Đắm mình vào Học Sâu](https://d2l.aivivn.com/) | Vietnamese d2l translation | CC-BY-SA-4.0 | later — VI terminology |
| 8 | [Google ML Crash Course](https://developers.google.com/machine-learning/crash-course) | module exercises & quizzes on ML basics | CC-BY-4.0 | v0.3 |
| 9 | [Hands-On ML 3 notebooks](https://github.com/ageron/handson-ml3) | exercise solutions (notebooks only — book text is copyrighted) | Apache-2.0 | v0.3+ |
| 10 | [LLMs from Scratch](https://github.com/rasbt/LLMs-from-scratch) | chapter exercises + solutions (repo only) | Apache-2.0 | v0.4 — code questions |
| 11 | [Tensor / Autodiff / GPU Puzzles](https://github.com/srush/Tensor-Puzzles) | broadcasting & autodiff puzzles | MIT | v0.4 — code reading |
| 12 | [100 NumPy exercises](https://github.com/rougier/numpy-100) | NumPy drills | MIT | v0.4 — `practice/numpy` |

## Reference only

| # | Source | Why it's useful | License |
| --- | --- | --- | --- |
| 13 | [Berkeley CS189/289A exams](https://people.eecs.berkeley.edu/~jrs/189/) (Shewchuk) | MCQ-heavy, multiple-answer midterms/finals with solutions, 2013–2025 — best model of exam style | all rights reserved |
| 14 | [Berkeley CS188 exams](https://ai.berkeley.edu/exams.html) | classic AI: search, CSPs, Bayes nets, MDPs, RL | all rights reserved |
| 15 | [Stanford CS230 practice midterms](https://cs230.stanford.edu/) | DL midterms (Fall 2019 with [solutions](https://cs230.stanford.edu/section/6/Practice_2_Sol.pdf)) | all rights reserved |
| 16 | [Stanford CS221 past exams](https://web.stanford.edu/class/archive/cs/cs221/cs221.1186/index.html) | AI exams 2013–2016 with solutions | all rights reserved |
| 17 | [MIT OCW 6.867 exams](https://ocw.mit.edu/courses/6-867-machine-learning-fall-2006/pages/exams/) | ML midterms/finals with solutions | CC-BY-NC-SA-4.0 (NC is incompatible with our content license) |
| 18 | [Understanding Deep Learning](https://udlbook.github.io/udlbook/) (Prince) | end-of-chapter problems + notebooks | CC-BY-NC-ND-4.0 |
| 19 | [fastbook questionnaires](https://github.com/fastai/fastbook) | quiz-like questions at the end of each chapter | prose not redistributable |
| 20 | [Machine Learning Q and AI](https://sebastianraschka.com/books/ml-q-and-ai/) (Raschka) | 30 Q&A chapters with exercises, free online | all rights reserved |

Internal sources: `original` (questions written here, CC BY-SA 4.0) and `ncu-intro-dl` (own course
slides, `private`).

## Candidates (not yet registered)

CMU 10-601 recitations with solutions · Kaggle Learn exercises · Deep-ML coding problems
(deep-ml.com) · Chip Huyen's ML Interviews Book · Karpathy's *Neural Networks: Zero to Hero*
exercises (MIT) · Stanford CS336 assignments (MIT) · AIMA exercises · Machine Learning cơ bản
(Vũ Hữu Tiệp). Check the license before registering; most are `reference`.

## Adding a source

1. Check the license (LICENSE file, site terms) and decide `usage`.
2. Add an entry to `sources.yaml` (`pinned` if an importer will read it).
3. For `adapt` sources, add the attribution to `THIRD_PARTY_NOTICES.md`.
4. Update the tables above.
