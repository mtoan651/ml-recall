# Git workflow

GitHub Flow for a single maintainer: **`main` + short-lived branches**, every change lands as one
squash commit. No `develop`/`release`/`hotfix` branches.

```text
main ──●────────────●────────────●──────▶   each ● = one squashed PR (auto-deploys from v0.2)
        \          /  \          /
         content/cnn   feat/exam-mode
```

## Rules

1. `main` is always releasable; no direct pushes (enforced by a GitHub ruleset).
2. One branch = one purpose, branched from the latest `main`, merged within days.
3. Commits inside a branch are free-form ("wip" is fine) — they get squashed.
4. The **PR title** is the commit message on `main`, so it follows
   [Conventional Commits](conventions.md#commit-types): `content(cnn): add 25 questions from lecture 5`.
5. Squash merge only; the branch is deleted after merge.
6. CI (job `check`) must be green. No approvals required (single maintainer).
7. A content PR is the review step for generated questions: read the diff, run `pnpm dev` (v0.2+),
   flip what you verified to `reviewed`. Unverified items may merge as `draft`.

## Branch names: `<type>/<short-description>`

| Type | For | Example |
| --- | --- | --- |
| `content/` | questions, figures, curation, sources | `content/cnn-lecture-5` |
| `feat/` | new capability | `feat/exam-mode` |
| `fix/` | bug or wrong answer key | `fix/mmlu-row-12-key` |
| `docs/` | documentation | `docs/data-format` |
| `chore/` | config, deps, CI, releases | `chore/release-v0.2.0` |

## Daily loop

```bash
git switch main && git pull
git switch -c content/cnn-lecture-5
# ... work, commit freely; run: uv run mlr check && uv run pytest
git push -u origin HEAD
gh pr create --fill                 # edit the title to Conventional Commits
gh pr merge --squash --auto         # merges when CI is green
git switch main && git pull --prune && git branch -D content/cnn-lecture-5
```

Before the GitHub remote exists, the same flow runs locally:

```bash
git switch main && git merge --squash content/cnn-lecture-5
git commit -m "content(cnn): add 25 questions from lecture 5"
git branch -D content/cnn-lecture-5
```

## Releases

See the [release checklist](conventions.md#release-checklist). Tag `vX.Y.Z` on `main`;
`gh release create vX.Y.Z --generate-notes` builds notes from the squashed PR titles.

## One-time GitHub setup

After the first push of `main`:

```bash
REPO=mtoan651/ml-recall
gh repo edit $REPO --enable-squash-merge --enable-merge-commit=false \
  --enable-rebase-merge=false --delete-branch-on-merge --enable-auto-merge \
  --description "Active-recall quiz bank for AI/ML/DL: exam-style questions with LaTeX, cited explanations, timed mock exams and spaced repetition." \
  --homepage "https://mtoan651.github.io/ml-recall"
gh repo edit $REPO --add-topic machine-learning,deep-learning,artificial-intelligence,neural-networks,llm,transformers,quiz,quiz-app,mcq,exam-preparation,interview-preparation,active-recall,spaced-repetition,flashcards,study-tool,education,astro,typescript,github-pages,katex

# protect main: PR required, CI job "check" must pass, no force-push / deletion
gh api -X POST repos/$REPO/rulesets --input - <<'EOF'
{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0, "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false, "require_last_push_approval": false,
        "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [ { "context": "check" } ] } }
  ]
}
EOF
```

## CI

`.github/workflows/ci.yml`, job **`check`** (name referenced by the ruleset), on every PR and push
to `main`: `uv sync` → `ruff check` → `ruff format --check` → `pytest` → `mlr check`.
From v0.2 it also builds the web app, and a `deploy` job publishes to GitHub Pages on `main`.
