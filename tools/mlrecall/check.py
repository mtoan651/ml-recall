"""`mlr check` — validate the bank and report quality signals.

Errors fail the command (and CI). Warnings are printed; `--strict` makes them fail too.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from difflib import SequenceMatcher

from . import bank, notes
from .schema import Question

# Options that refer to other options break when options are shuffled.
POSITIONAL_OPTION_RE = re.compile(
    r"\b(all|none|both|either|neither)\b.*\b(above|these|of them)\b"
    r"|\b(both|either|neither)\b.*\(?[a-d]\)?\s+(and|or|nor)\s+\(?[a-d]\)?"
    r"|^\s*\(?[a-d]\)?\s+(and|or)\s+\(?[a-d]\)?\s*$",
    re.IGNORECASE,
)
NEAR_DUPLICATE_RATIO = 0.92


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    questions: list[tuple[str, Question]] = field(default_factory=list)  # (domain, question)


# Digits split by spaces/punctuation, which answer normalization drops ("1.5" == "15").
_DIGIT_GROUPS_RE = re.compile(r"\d[^\w×]+\d")


def run(strict: bool = False) -> int:
    report = collect()
    for e in report.errors:
        print(f"ERROR   {e}")
    for w in report.warnings:
        print(f"WARNING {w}")
    print()
    print(summary(report))
    failed = bool(report.errors) or (strict and bool(report.warnings))
    print(f"\n{len(report.errors)} error(s), {len(report.warnings)} warning(s)")
    return 1 if failed else 0


def collect() -> Report:
    r = Report()
    taxonomy = bank.load_taxonomy()
    sources = {s.id: s for s in bank.load_sources().sources}
    topics = bank.topic_index(taxonomy)

    _check_unique(r, "topic id", [t.id for d in taxonomy.domains for t in d.topics])
    _check_unique(r, "source id", [s.id for s in bank.load_sources().sources])

    for f in bank.load_bank():
        if f.error:
            r.errors.append(f"{f.rel}: schema\n        " + f.error.replace("\n", "\n        "))
            continue
        quiz = f.model
        domain_dir, topic_file = f.path.parent.name, f.path.stem
        if (quiz.domain, quiz.topic) != (domain_dir, topic_file):
            r.errors.append(f"{f.rel}: domain/topic must match path ({domain_dir}/{topic_file})")
        if topics.get(quiz.topic, (None,))[0] != quiz.domain:
            r.errors.append(f"{f.rel}: topic '{quiz.topic}' not in taxonomy domain '{quiz.domain}'")
        for q in quiz.questions:
            r.questions.append((quiz.domain, q))
            _check_question(r, f, q, sources)

    note_errors, note_warnings = notes.check_notes(topics, set(sources))
    r.errors += note_errors
    r.warnings += note_warnings

    _check_unique(r, "question id", [q.id for _, q in r.questions])
    _check_unique(r, "source ref", [f"{q.source.id}:{q.source.ref}" for _, q in r.questions])
    _check_near_duplicates(r)
    return r


def _check_question(r: Report, f: bank.BankFile, q: Question, sources: dict) -> None:
    where = f"{f.rel} [{q.id}]"
    src = sources.get(q.source.id)
    if src is None:
        r.errors.append(f"{where}: unknown source '{q.source.id}'")
    elif src.usage == "reference":
        r.errors.append(
            f"{where}: source '{src.id}' is reference-only — write an original question "
            "(source: original) and cite it in references"
        )
    for ref in q.references:
        if ref.source and ref.source not in sources:
            r.errors.append(f"{where}: unknown reference source '{ref.source}'")

    options = q.options or []
    figures = [q.figure, q.explanation_figure, *(o.image for o in options)]
    for fig in filter(None, figures):
        if not (f.path.parent / fig.src).is_file():
            r.errors.append(f"{where}: figure not found: {fig.src}")

    for n, key in enumerate(q.answer.inputs() if q.answer else [], start=1):
        at = f"{where}: blank {n}" if q.answer.blanks else where
        if key.pattern is not None:
            misses = [a for a in key.accept if not key.matches_pattern(a)]
            if misses:
                r.errors.append(f"{at}: accepted answers don't match `pattern`: {misses}")
            if not key.accept:
                # The build checks each pattern against its examples in JavaScript too.
                r.errors.append(
                    f"{at}: `pattern` without examples — add the canonical answer to `accept`"
                )
        elif any(_DIGIT_GROUPS_RE.search(a) for a in key.accept):
            # Normalization drops separators: "(32, 3, 64, 64)" would also accept "(323, 64, 64)".
            r.warnings.append(
                f"{at}: `accept` splits digits with spaces/punctuation, which grading ignores — "
                "use `numeric` or a `pattern`"
            )

    if q.shuffle and any(POSITIONAL_OPTION_RE.search(o.text) for o in options):
        r.warnings.append(f"{where}: option refers to other options — set `shuffle: false`")

    texts = [q.question, q.explanation, q.answer and q.answer.model]
    texts += [o.text for o in options] + [o.why for o in options]
    if any(t and _unbalanced_dollars(t) for t in texts):
        r.warnings.append(f"{where}: unbalanced $ — math won't render (escape a literal $ as \\$)")
    if any(t and _wrapped_display_math(t) for t in texts):
        r.warnings.append(
            f"{where}: `$$…$$` starts mid-line and wraps onto the next line, which Markdown "
            "misreads — keep it on one line, or put each `$$` on a line of its own"
        )
    if any(t and _math_line_starts_block(t) for t in texts):
        r.warnings.append(
            f"{where}: a line inside math starts with `+ `, `- `, `* ` or `1. `, which Markdown "
            "reads as a list item — join it to the previous line"
        )


def _unbalanced_dollars(text: str) -> bool:
    text = re.sub(r"```.*?```|`[^`\n]*`", "", text, flags=re.DOTALL)
    return len(re.findall(r"(?<!\\)\$", text)) % 2 == 1


def _wrapped_display_math(text: str) -> bool:
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    for m in re.finditer(r"(?<!\\)\$\$(.*?)(?<!\\)\$\$", text, flags=re.DOTALL):
        body = m.group(1)
        if "\n" in body.strip(" ") and not body.lstrip(" ").startswith("\n"):
            return True
    return False


# Block markers that may interrupt a paragraph (CommonMark): bullets, ordered lists starting at 1.
_BLOCK_START_RE = re.compile(r"\s*(?:[-+*]\s|1[.)]\s|#{1,6}\s|>)")


def _math_line_starts_block(text: str) -> bool:
    """True if a line continuing an open `$…$` / `$$…$$` span looks like a Markdown block start."""
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    dollars = 0
    for line in text.split("\n"):
        if dollars % 2 and _BLOCK_START_RE.match(line):
            return True
        # `$$` counts as one delimiter
        dollars += len(re.findall(r"(?<!\\)\$\$?", re.sub(r"`[^`]*`", "", line)))
    return False


def _check_unique(r: Report, what: str, values: list[str]) -> None:
    for value, n in Counter(values).items():
        if n > 1:
            r.errors.append(f"duplicate {what}: {value} (x{n})")


def _normalize(text: str) -> str:
    return re.sub(r"\W+", " ", text.casefold()).strip()


def _check_near_duplicates(r: Report) -> None:
    def fingerprint(q: Question) -> str:
        options = " ".join(o.text for o in q.options or [])
        return _normalize(f"{q.question} {options} {q.answer.model if q.answer else ''}")

    def figures(q: Question) -> tuple[str, ...]:
        return tuple(f.src for f in [q.figure, *(o.image for o in q.options or [])] if f)

    items = [(q.id, fingerprint(q), figures(q)) for _, q in r.questions]
    # Compare only texts within 20% of each other's length: walk them sorted by length and stop
    # once the gap is too large. The quick ratios are upper bounds of ratio(), so they only skip
    # pairs that could not reach the threshold; the result equals the all-pairs comparison.
    order = sorted(range(len(items)), key=lambda k: len(items[k][1]))
    pairs = []
    for pos, i in enumerate(order):
        for j in order[pos + 1 :]:
            a, b = items[i][1], items[j][1]
            if len(b) - len(a) > 0.2 * max(len(b), 1):
                break
            lo, hi = min(i, j), max(i, j)
            (_, text_lo, fig_lo), (_, text_hi, fig_hi) = items[lo], items[hi]
            if fig_lo and fig_hi and fig_lo != fig_hi:
                continue  # the same stem about two different figures is two questions
            m = SequenceMatcher(None, text_lo, text_hi)
            if (
                m.real_quick_ratio() >= NEAR_DUPLICATE_RATIO
                and m.quick_ratio() >= NEAR_DUPLICATE_RATIO
                and m.ratio() >= NEAR_DUPLICATE_RATIO
            ):
                pairs.append((lo, hi))
    for lo, hi in sorted(pairs):
        r.warnings.append(f"near-duplicate questions: {items[lo][0]} ~ {items[hi][0]}")


def summary(r: Report) -> str:
    qs = [q for _, q in r.questions]
    domains = Counter(d for d, _ in r.questions)
    if not qs:
        return "Bank is empty."
    lines = [f"Questions: {len(qs)}"]
    for label, key in [
        ("status", lambda q: q.status),
        ("type", lambda q: q.type),
        ("source", lambda q: q.source.id),
    ]:
        counts = Counter(map(key, qs))
        lines.append(f"  by {label:<7} " + ", ".join(f"{k}={v}" for k, v in counts.most_common()))

    lines.append("  by domain  " + ", ".join(f"{k}={v}" for k, v in domains.most_common()))

    with_expl = sum(bool(q.explanation) for q in qs)
    cited = sum(bool(q.references) for q in qs)
    lines.append(f"  explained {with_expl}/{len(qs)}, with references {cited}/{len(qs)}")

    # Answer-position and "longest option is correct" bias, single-answer questions only.
    positions: dict[int, Counter] = defaultdict(Counter)
    longest = total = 0
    for q in qs:
        if q.type not in ("single", "multiple") or sum(o.correct for o in q.options) != 1:
            continue
        idx = next(i for i, o in enumerate(q.options) if o.correct)
        positions[len(q.options)][idx] += 1
        lengths = [len(o.text) for o in q.options]
        total += 1
        longest += lengths[idx] == max(lengths) and lengths.count(max(lengths)) == 1
    for n, c in sorted(positions.items()):
        dist = " ".join(f"{chr(65 + i)}={c[i] / sum(c.values()):.0%}" for i in range(n))
        lines.append(f"  correct position ({n} options, n={sum(c.values())}): {dist}")
    if total:
        lines.append(f"  correct option is the unique longest: {longest / total:.0%} (aim < 40%)")
    return "\n".join(lines)
