"""`mlr stats` — Markdown summary of the bank, pasted into README on release."""

from __future__ import annotations

from collections import Counter

from . import bank


def markdown_table(by_topic: bool = False) -> str:
    taxonomy = bank.load_taxonomy()
    total: Counter[str] = Counter()
    reviewed: Counter[str] = Counter()
    for f in bank.load_bank():
        if f.model is None:
            continue
        live = [q for q in f.model.questions if q.status != "retired"]
        total[f.model.topic] += len(live)
        reviewed[f.model.topic] += sum(q.status == "reviewed" for q in live)

    if by_topic:
        rows = ["| Domain | Topic | Questions | Reviewed |", "| --- | --- | ---: | ---: |"]
        for d in taxonomy.domains:
            rows += [
                f"| {d.title} | {t.title} | {total[t.id]} | {reviewed[t.id]} |"
                for t in d.topics
                if total[t.id]
            ]
    else:
        rows = ["| Domain | Topics | Questions | Reviewed |", "| --- | ---: | ---: | ---: |"]
        for d in taxonomy.domains:
            ids = [t.id for t in d.topics]
            n = sum(total[i] for i in ids)
            if n:
                covered = sum(bool(total[i]) for i in ids)
                rows.append(f"| {d.title} | {covered} | {n} | {sum(reviewed[i] for i in ids)} |")
    rows.append(f"| **Total** | | **{total.total()}** | **{reviewed.total()}** |")
    return "\n".join(rows)
