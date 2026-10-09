"""Shared importer machinery: download cache, curation, text cleanup, merge into the bank.

An importer turns one upstream source into `Item`s (one per upstream question, with a
stable `ref` and a default topic). `curate()` applies tools/curation/<source>.yaml
(drops, topic overrides, fixes) and `merge()` appends new questions to the topic files,
allocating ids. Re-running an import is idempotent: refs already in the bank are skipped.
"""

from __future__ import annotations

import re
import urllib.request
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from markdownify import markdownify

from .. import bank, paths, yamlio
from ..check import POSITIONAL_OPTION_RE

QUESTION_KEY_ORDER = [
    "id", "type", "difficulty", "tags", "shuffle", "question", "figure", "options", "answer",
    "explanation", "explanation_figure", "references", "source", "status",
]  # fmt: skip


@dataclass
class Item:
    ref: str
    topic: str
    data: dict[str, Any]  # question fields except id/source/status
    url: str | None = None
    tags: list[str] = field(default_factory=list)
    flag: str | None = None  # upstream quality flag; flagged items need an explicit decision


# --------------------------------------------------------------------------- download


def fetch(source_id: str, pinned: str, name: str, url: str) -> Path:
    """Download `url` once into .cache/upstream/<source>/<pinned>/<name>."""
    dest = paths.CACHE / source_id / pinned / name
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": "ml-recall-importer"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            dest.write_bytes(resp.read())
    return dest


# --------------------------------------------------------------------------- text


def html_to_md(html: str) -> str:
    md = markdownify(html, escape_asterisks=False, escape_underscores=False, escape_misc=False)
    return escape_stray_tags(collapse_ws(md))


def collapse_ws(text: str) -> str:
    text = re.sub(r"[ \t]+\n", "\n", text.strip())
    return re.sub(r"\n{3,}", "\n\n", text)


_PROTECTED_RE = re.compile(r"```.*?```|`[^`\n]*`|\$\$.*?\$\$|\$[^$\n]*\$", re.DOTALL)


def escape_stray_tags(text: str) -> str:
    """Escape '<' that would be parsed as an HTML tag (e.g. '<mask>') outside code/math."""
    out, last = [], 0
    for m in _PROTECTED_RE.finditer(text):
        out.append(re.sub(r"<(?=[A-Za-z/!])", r"\\<", text[last : m.start()]))
        out.append(m.group(0))
        last = m.end()
    out.append(re.sub(r"<(?=[A-Za-z/!])", r"\\<", text[last:]))
    return "".join(out)


# --------------------------------------------------------------------------- curation


def load_curation(source_id: str) -> dict[str, Any]:
    path = paths.CURATION / f"{source_id}.yaml"
    data = yamlio.load(path) or {}
    data.setdefault("items", {})
    data.setdefault("exclude_prefixes", {})
    return data


def curate(source_id: str, items: list[Item]) -> tuple[list[Item], Counter]:
    """Apply drops/overrides/fixes. Returns kept items and a Counter of drop reasons."""
    cur = load_curation(source_id)
    decisions: dict[str, Any] = {str(k): v or {} for k, v in cur["items"].items()}
    known = {i.ref for i in items}
    unknown = sorted(set(decisions) - known)
    if unknown:
        raise SystemExit(f"{source_id}: curation mentions unknown refs: {', '.join(unknown)}")

    kept, dropped = [], Counter()
    for item in items:
        prefix_reason = next(
            (r for p, r in cur["exclude_prefixes"].items() if item.ref.startswith(p)), None
        )
        d = decisions.get(item.ref, {})
        if prefix_reason or "drop" in d:
            dropped[d.get("drop") or prefix_reason] += 1
            continue
        if item.flag and "fix" not in d:
            dropped[f"upstream-error ({item.flag})"] += 1
            continue
        item.topic = d.get("topic", item.topic)
        item.tags = [*item.tags, *d.get("tags", [])]
        if "difficulty" in d:
            item.data["difficulty"] = d["difficulty"]
        _apply_fix(item, d.get("fix", {}))
        kept.append(item)
    return kept, dropped


def _apply_fix(item: Item, fix: dict[str, Any]) -> None:
    data = item.data
    for key in ("type", "question", "explanation", "shuffle"):
        if key in fix:
            data[key] = fix[key]
    for idx, text in (fix.get("options") or {}).items():
        data["options"][int(idx)]["text"] = text
    if "correct" in fix:
        wanted = {int(i) for i in fix["correct"]}
        for i, opt in enumerate(data["options"]):
            opt["correct"] = i in wanted
    if "references" in fix:
        data["references"] = [*data.get("references", []), *fix["references"]]


# --------------------------------------------------------------------------- merge


def merge(source_id: str, items: list[Item], dry_run: bool = False) -> Counter:
    """Append items not yet in the bank to their topic files. Returns per-topic counts."""
    topics = bank.topic_index(bank.load_taxonomy())
    files: dict[str, Any] = {}  # topic -> raw ruamel document
    seen_refs: set[tuple[str, str]] = set()
    max_num: dict[str, int] = defaultdict(int)

    for path in bank.quiz_paths():
        doc = yamlio.load(path)
        files[doc["topic"]] = doc
        for q in doc.get("questions") or []:
            seen_refs.add((q["source"]["id"], str(q["source"]["ref"])))
            prefix, _, num = q["id"].rpartition("-")
            max_num[prefix] = max(max_num[prefix], int(num))

    added: Counter = Counter()
    for item in items:
        if (source_id, item.ref) in seen_refs:
            continue
        if item.topic not in topics:
            raise SystemExit(f"{source_id}:{item.ref}: unknown topic '{item.topic}'")
        doc = files.get(item.topic)
        if doc is None:
            domain, title = topics[item.topic]
            doc = files[item.topic] = yamlio.styled(
                {"schema_version": 1, "domain": domain, "topic": item.topic, "title": title}
            )
        if not doc.get("questions"):
            doc["questions"] = yamlio.styled([])
        max_num[item.topic] += 1
        doc["questions"].append(yamlio.styled(_question(source_id, item, max_num[item.topic])))
        added[item.topic] += 1

    if not dry_run:
        for topic in added:
            domain = topics[topic][0]
            yamlio.dump(files[topic], paths.QUIZZES / domain / f"{topic}.yaml")
    return added


def _question(source_id: str, item: Item, num: int) -> dict[str, Any]:
    data = dict(item.data)
    data["id"] = f"{item.topic}-{num:03d}"
    data["tags"] = sorted(set(data.get("tags", []) + item.tags))
    options = data.get("options") or []
    if data.get("shuffle") is None and any(POSITIONAL_OPTION_RE.search(o["text"]) for o in options):
        data["shuffle"] = False
    if data.get("shuffle") is True:
        data.pop("shuffle")  # default
    data["options"] = [
        {"text": o["text"], "correct": True if o.get("correct") else None, "why": o.get("why")}
        for o in options
    ] or None
    data["source"] = {"id": source_id, "ref": item.ref, "url": item.url}
    data["status"] = "draft"
    unknown = set(data) - set(QUESTION_KEY_ORDER)
    if unknown:
        raise ValueError(f"unexpected question fields: {unknown}")
    return {k: data.get(k) for k in QUESTION_KEY_ORDER}
