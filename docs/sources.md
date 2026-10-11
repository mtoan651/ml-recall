# Sources

The machine-readable registry is [`src/content/sources.yaml`](../src/content/sources.yaml); this
page explains the choices. Licenses were checked on 2026-10-09 (sources 1–12, 18–25) and 2026-10-10
(13–17) against each upstream LICENSE file or site terms; Google (8, 8b) and numpy-100 (12) were
rechecked on 2026-10-11, including for AI-use restrictions (none). Sources 26–29 were checked on
2026-10-11.

**Usage:** `adapt` = may be imported/adapted with attribution · `reference` = cite only, write
original questions. See [content-pipeline.md](content-pipeline.md#copyright-rules).

## Adapt (open licenses)

| # | Source | What it offers | License | Status |
| --- | --- | --- | --- | --- |
| 1 | [Hugging Face LLM Course](https://huggingface.co/learn/llm-course) | end-of-chapter MCQ with per-option explanations; transformers, tokenizers, fine-tuning, reasoning | Apache-2.0 | **v0.1 imported** (106) |
| 2 | [Microsoft AI for Beginners](https://github.com/microsoft/AI-For-Beginners) | pre/post-lecture quizzes: NN, CV, NLP, GANs, RL, ethics | MIT | **v0.1 imported** (141) |
| 3 | [Microsoft ML for Beginners](https://github.com/microsoft/ML-For-Beginners) | pre/post-lecture quizzes: classical ML, time series, NLP basics | MIT | **v0.1 imported** (112) |
| 4 | [MMLU-Redux 2.0](https://huggingface.co/datasets/edinburgh-dawg/mmlu-redux-2.0) — machine_learning, high_school_statistics, college_mathematics | exam-style MCQ with expert error labels (MMLU itself is MIT) | CC-BY-4.0 | **imported** (95 + 97 + 59) |
| 6 | [Dive into Deep Learning](https://d2l.ai) | end-of-section exercises; main citation target for DL | CC-BY-SA-4.0 | **v0.3 used** (371 questions from the end-of-section exercises of every chapter; refs `<dir>/<file>#ex<N>`) |
| 7 | [Đắm mình vào Học Sâu](https://d2l.aivivn.com/) | Vietnamese d2l translation | CC-BY-SA-4.0 | later — VI terminology |
| 8 | [Google ML Crash Course](https://developers.google.com/machine-learning/crash-course) | page quizzes with per-option feedback: regression, classification metrics, data, overfitting, production ML, fairness | CC-BY-4.0 | **v0.3 imported** (58) |
| 8b | [Google ML courses](https://developers.google.com/machine-learning) — Decision Forests, Clustering, GANs, Problem Framing | same quiz format | CC-BY-4.0 | **v0.3 imported** (38) |
| 9 | [Hands-On ML 3 notebooks](https://github.com/ageron/handson-ml3) | exercise solutions (notebooks only — book text is copyrighted) | Apache-2.0 | v0.3+ |
| 10 | [LLMs from Scratch](https://github.com/rasbt/LLMs-from-scratch) | chapter exercises + solutions (repo only) | Apache-2.0 | v0.4 — code questions |
| 11 | [Tensor / Autodiff / GPU Puzzles](https://github.com/srush/Tensor-Puzzles) | broadcasting & autodiff puzzles | MIT | v0.4 — code reading |
| 12 | [100 NumPy exercises](https://github.com/rougier/numpy-100) | NumPy drills with solution code | MIT | **v0.3 imported** (97, fill-ins) |
| 13 | [Hugging Face Deep RL Course](https://huggingface.co/learn/deep-rl-course) | unit quizzes: MCQ + open questions with solutions (RL basics, Q-learning, policy gradient, multi-agent) | Apache-2.0 | **v0.3 imported** (43) |
| 14 | [Hugging Face AI Agents Course](https://huggingface.co/learn/agents-course) | unit quizzes on agents, tools, ReAct, agentic RAG, observability | Apache-2.0 | **v0.3 imported** (26) |
| 15 | [Microsoft Data Science for Beginners](https://github.com/microsoft/Data-Science-For-Beginners) | pre/post-lecture quizzes; only data types, probability, statistics items kept | MIT | **v0.3 imported** (70) |
| 26 | [Hugging Face Audio Course](https://huggingface.co/learn/audio-course) | chapter quizzes: sampling, spectrograms, CTC, seq2seq, vocoders | Apache-2.0 | **v0.3 imported** (12) |
| 27 | [UBC CPSC 330 Applied ML](https://github.com/UBC-CS/cpsc330-2025W1) (Kolhatkar et al.) | midterm/final prep MCQs (keys in red) and lecture iClicker exercises | CC-BY-4.0 | **v0.3 used** (66) |
| 28 | [UBC MDS DSCI 575 Advanced ML](https://github.com/UBC-MDS/DSCI_575_adv-mach-learn) | iClicker exercises: Markov models, HMMs, RNNs, transformers, LLMs | CC-BY-4.0 | **v0.3 used** (26) |
| 29 | [forall x: Calgary](https://forallx.openlogicproject.org/) (Magnus, Button et al.) | logic textbook: truth tables, validity, satisfiability, first-order models, keyed in the LaTeX source | CC-BY-4.0 | **v0.3 used** (38) |
| 31 | [Pen and Paper Exercises in ML](https://github.com/michaelgutmann/ml-pen-and-paper-exercises) (Gutmann) | worked exercises: graphical models, HMMs, learning, variational inference, sampling | CC-BY-4.0 | **v0.3 used** (91; 5 exercises based on copyrighted books skipped) |
| 32 | [ML-InterviewQs](https://github.com/dsgiitr/ML-InterviewQs) (DSG IIT Roorkee) | 6 keyed MCQs | MIT | **v0.3 used** (6) |
| 33 | [dlbook_exercises](https://github.com/goodfeli/dlbook_exercises) (Goodfellow) | 1 contributed exercise | BSD-3-Clause | **v0.3 used** (1) |
| 16 | [OpenIntro Statistics](https://www.openintro.org/book/os/) | end-of-section exercises, odd-numbered solutions, LaTeX source on GitHub | CC-BY-SA-3.0 | later — probability/statistics; take files from the [GitHub repo](https://github.com/OpenIntroStat/openintro-statistics) only (the website's terms restrict automated scraping) |

## Reference only

| # | Source | Why it's useful | License |
| --- | --- | --- | --- |
| 18 | [Berkeley CS189/289A exams](https://people.eecs.berkeley.edu/~jrs/189/) (Shewchuk) | MCQ-heavy, multiple-answer midterms/finals with solutions, 2013–2025 — best model of exam style | all rights reserved |
| 19 | [Berkeley CS188 exams](https://ai.berkeley.edu/exams.html) | classic AI: search, CSPs, Bayes nets, MDPs, RL | all rights reserved |
| 20 | [Stanford CS230 practice midterms](https://cs230.stanford.edu/) | DL midterms (Fall 2019 with [solutions](https://cs230.stanford.edu/section/6/Practice_2_Sol.pdf)) | all rights reserved |
| 21 | [Stanford CS221 past exams](https://web.stanford.edu/class/archive/cs/cs221/cs221.1186/index.html) | AI exams 2013–2016 with solutions | all rights reserved |
| 22 | [MIT OCW 6.867 exams](https://ocw.mit.edu/courses/6-867-machine-learning-fall-2006/pages/exams/) | ML midterms/finals with solutions | CC-BY-NC-SA-4.0 (NC is incompatible with our content license) |
| 23 | [Understanding Deep Learning](https://udlbook.github.io/udlbook/) (Prince) | end-of-chapter problems + notebooks | CC-BY-NC-ND-4.0 |
| 24 | [fastbook questionnaires](https://github.com/fastai/fastbook) | quiz-like questions at the end of each chapter | prose not redistributable |
| 25 | [Machine Learning Q and AI](https://sebastianraschka.com/books/ml-q-and-ai/) (Raschka) | 30 Q&A chapters with exercises, free online | all rights reserved |
| 5 | [Deep Learning Interviews](https://arxiv.org/abs/2201.00650) (Kashani & Ivry) | **not used**: arXiv lists CC BY 4.0, but the book's own copyright page says all rights reserved, personal use only, no quoting or paraphrasing without consent (moved from Adapt on 2026-10-11; d2l exercises are used instead) | contradictory |
| 17 | [OpenStax Introductory Statistics 2e](https://openstax.org/details/books/introductory-statistics-2e) | **not used**: every OpenStax book page now says the book may not be "used in the training of" or "otherwise be ingested into" LLMs or generative AI without permission (checked 2026-10-11). We don't train models, but our pipeline feeds what it reads to an LLM, so we neither import nor fetch OpenStax (moved from Adapt on 2026-10-11) | CC-BY-NC-SA-4.0 |
| 30 | [Deep-ML](https://www.deep-ml.com/problems) | ML coding problems | **not used**: its LICENSE is "Educational Use Only" — non-commercial, non-transferable — so not CC BY-SA compatible (it also bars use as ML training data, which we don't do) | proprietary |

Internal sources: `original` (questions written here, CC BY-SA 4.0) and `ncu-intro-dl` (own course
slides, `private`).

## MMLU policy

MMLU-Redux (CC BY 4.0) and MMLU (MIT) license the datasets, but MMLU's questions were collected
from practice tests, course material and books. For this non-commercial study project that is an
acceptable risk, but subsets are **imported selectively** (keep-lists in
`tools/curation/mmlu-redux.yaml`), not wholesale: most of `econometrics` is finance-specific and
some rows refer to an outside book. `formal_logic` is not needed (forall x covers logic).

## Licence policy

The project is non-commercial (study and research). Besides permissive and CC BY / CC BY-SA
sources, **NonCommercial licences without ND** (CC BY-NC, CC BY-NC-SA) may be adapted; such
questions keep their licence (see `LICENSE-CONTENT.md`). Still not usable as question sources:
ND licences (no adaptations), all-rights-reserved or unlicensed material (the repo and site are
public), and sites whose terms forbid feeding content to AI/LLM tools.

## Candidates (checked 2026-10-11, not yet used)

Open licence, worth importing later: Neuromatch Academy *Deep Learning* "Think!" questions
(CC BY 4.0; diffusion, VAEs, CNNs, transformers — need rewriting as MCQs) · Kaggle Learn exercises
from [`Kaggle/learntools`](https://github.com/Kaggle/learntools) (Apache-2.0; the kaggle.com site
forbids scraping, the repo does not) · Google *Intro to ML*, *Managing ML Projects* and
*Recommendation Systems* quizzes (CC BY 4.0, existing importer) · Microsoft *Generative AI for
Beginners*, *AI Agents for Beginners*, *Generative AI with JavaScript* knowledge checks (MIT) ·
*Data Science Interviews* theory Q&A (Grigorev, CC BY 4.0; answers need fact-checking) · *Learn
PyTorch for Deep Learning* (Bourke, MIT) · OpenAI Spinning Up exercises (MIT) · UBC MDS DSCI 563
and 573 (CC BY 4.0, no keys) · Hugging Face MCP Course (Apache-2.0, mostly tool-specific).

Citation targets for original questions (no quizzes): CS231n notes (MIT) · aima-python (MIT) ·
Hugging Face smol-course, Diffusion course (Apache-2.0) and Computer Vision course (MIT) · Udacity
`deep-learning-v2-pytorch` (MIT) · *NLP with Deep Learning* lectures by trusthlt (CC BY-SA 4.0) ·
Gustave Cortal's NLP course (MIT).

Checked and not usable: Stanford CS336 (its `AGENTS.md` asks AI tools not to give solutions) ·
AIMA exercises (the repo's MIT licence covers the website theme, not the book's exercises) ·
Chip Huyen's *ML Interviews Book*, ARENA, Lena Voita's NLP course, Elements of AI, CMU 10-601,
fast.ai course22, Made With ML, Machine Learning cơ bản (no open licence) · MLSysBook (NC, and its
quizzes are LLM-generated) · CS-Bench (NC) · MMLU-Pro, SuperGPQA, MMLU-CF, TheoremQA (questions
scraped from the web or textbooks) · ML-interview datasets on the Hugging Face Hub (synthetic,
scraped or unlicensed) · GitHub repos of solutions to other courses' quizzes and homework
(Coursera, CS229/CS231n, Sutton & Barto — the repo owner can't license someone else's questions).

A user-supplied list of 88 links was screened on 2026-10-11 (sources 31–33 came from it). Also not
usable: GRADuateML (terms bar scraping and use for ML training; its problems are LLM-generated),
AppliedAIPrep, SpaceComplexity and Cloud Soft Solutions (terms bar scraping or derivatives) ·
NPTEL (CC BY-NC-SA) · MIT OCW 6.7960 (CC BY-NC-SA) · Studyopedia, HackerX, 365 Data Science,
NeetCode (all rights reserved) · 7wData (reposts Analytics Vidhya) · student repos of Coursera,
CS229/CS231n/CS224n, Caltech CS156, MIT 6.036 and Kaggle solutions.

## Adding a source

1. Check the license (LICENSE file, site terms) and decide `usage`. Also look for clauses about
   AI: a ban on *training* models doesn't affect us, but a ban on feeding the content to AI/LLM
   tools ("ingested into") does — such sources are not fetched or cited (see #17). Check where
   the questions come from, too: a licence only counts if the licensor wrote them.
2. Add an entry to `sources.yaml` (`pinned` if an importer will read it).
3. For `adapt` sources, add the attribution to `THIRD_PARTY_NOTICES.md`.
4. Update the tables above.
