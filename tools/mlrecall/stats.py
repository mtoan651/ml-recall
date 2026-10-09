"""`mlr stats` — Markdown summary of the bank, pasted into README on release."""

from __future__ import annotations

from collections import Counter

from . import bank


def markdown_table() -> str:
    taxonomy = bank.load_taxonomy()
    per_topic: Counter[str] = Counter()
    reviewed: Counter[str] = Counter()
    for f in bank.load_bank():
        if f.model is None:
            continue
        per_topic[f.model.topic] += len(f.model.questions)
        reviewed[f.model.topic] += sum(q.status == "reviewed" for q in f.model.questions)

    rows = ["| Domain | Topic | Questions | Reviewed |", "|---|---|---:|---:|"]
    total = total_reviewed = 0
    for d in taxonomy.domains:
        for t in d.topics:
            if per_topic[t.id]:
                rows.append(f"| {d.title} | {t.title} | {per_topic[t.id]} | {reviewed[t.id]} |")
                total += per_topic[t.id]
                total_reviewed += reviewed[t.id]
    rows.append(f"| **Total** | | **{total}** | **{total_reviewed}** |")
    return "\n".join(rows)
