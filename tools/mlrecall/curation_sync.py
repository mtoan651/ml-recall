"""`mlr sync-curation` — record bank edits of imported questions as curation fixes.

The bank is edited in place (reviews, corrections, explanations). For imported questions every
such edit must also live in `tools/curation/<source>.yaml`, so that a fresh import reproduces the
bank. This command compares, for each imported question, what the importer + curation would
produce with what the bank holds, and with `--check` reports the questions that differ; without
it, it rewrites the `fix` (and `topic`/`difficulty`/`tags`) of those items, derived from the raw
upstream item, and verifies the result.
"""

from __future__ import annotations

import copy
import json
from typing import Any

from ruamel.yaml.comments import CommentedMap, CommentedSeq
from ruamel.yaml.scalarstring import LiteralScalarString

from . import bank, paths, yamlio
from .importers import LOADERS, common

CONTENT = ["type", "question", "figure", "options", "answer", "explanation",
           "explanation_figure", "references", "shuffle"]  # fmt: skip
SCALARS = ["type", "question", "explanation", "shuffle", "figure", "explanation_figure"]


def _styled(obj: Any) -> Any:
    """Like yamlio.styled, but keeps None: in a fix, null means "remove" (a why, an answer key)."""
    if isinstance(obj, dict):
        return CommentedMap((k, _styled(v)) for k, v in obj.items())
    if isinstance(obj, list):
        return CommentedSeq(_styled(v) for v in obj)
    if isinstance(obj, str) and "\n" in obj.strip("\n"):
        text = "\n".join(line.rstrip() for line in obj.strip("\n").splitlines())
        return LiteralScalarString(text + "\n")
    return obj


def _norm(x: Any) -> Any:
    """Plain JSON-like data; a trailing newline of a string (block-literal style) is ignored."""
    if isinstance(x, dict):
        return {str(k): _norm(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_norm(v) for v in x]
    if isinstance(x, str):
        return str(x).rstrip("\n")
    return json.loads(json.dumps(x, default=str))


def _bank_by_ref() -> dict[tuple[str, str], tuple[dict, str]]:
    out = {}
    for p in bank.quiz_paths():
        doc = yamlio.load(p)
        for q in doc.get("questions") or []:
            out[(q["source"]["id"], str(q["source"]["ref"]))] = (_norm(q), doc["topic"])
    return out


def _produce(source_id: str, item: common.Item) -> dict:
    """What `mlr import` writes for an (already curated) item, normalized."""
    return _norm(yamlio.styled(common._question(source_id, item, 0)))


def _differences(source_id: str, kept: list[common.Item], banked: dict) -> dict[str, list[str]]:
    diffs = {}
    for item in kept:
        hit = banked.get((source_id, item.ref))
        if hit is None:
            continue
        q, topic = hit
        got = _produce(source_id, item)
        fields = [k for k in [*CONTENT, "difficulty", "tags"] if got.get(k) != q.get(k)]
        if item.topic != topic:
            fields.append("topic")
        if fields:
            diffs[item.ref] = fields
    return diffs


def _options_fix(base: list[dict], want: list[dict]) -> dict:
    if len(base) != len(want) or any(
        b.get("image") != w.get("image") for b, w in zip(base, want, strict=True)
    ):
        return {"options": want}
    fix: dict[str, Any] = {}
    texts = {
        i: w["text"]
        for i, (b, w) in enumerate(zip(base, want, strict=True))
        if b["text"] != w["text"]
    }
    whys = {
        i: w.get("why")
        for i, (b, w) in enumerate(zip(base, want, strict=True))
        if b.get("why") != w.get("why")
    }
    if texts:
        fix["options"] = texts
    if whys:
        fix["why"] = whys
    if [bool(b.get("correct")) for b in base] != [bool(w.get("correct")) for w in want]:
        fix["correct"] = [i for i, w in enumerate(want) if w.get("correct")]
    return fix


def _derive(source_id: str, raw: common.Item, q: dict) -> tuple[dict, dict]:
    """(item-level decisions, fix) that turn the raw upstream item into bank question `q`."""
    base = _produce(source_id, raw)
    fix: dict[str, Any] = {}
    for k in SCALARS:
        if base.get(k) != q.get(k):
            fix[k] = q.get(k) if k != "shuffle" else bool(q.get("shuffle", True))
    if (base.get("options") or []) != (q.get("options") or []):
        fix.update(_options_fix(base.get("options") or [], q.get("options") or []))
    if base.get("answer") != q.get("answer"):
        if q.get("answer") is None:
            fix["answer"] = None
        else:
            gone = {k: None for k in (base.get("answer") or {}) if k not in q["answer"]}
            fix["answer"] = {**q["answer"], **gone}
    b_refs, q_refs = base.get("references") or [], q.get("references") or []
    if b_refs != q_refs:
        if q_refs[: len(b_refs)] == b_refs:
            fix["references"] = q_refs[len(b_refs) :]
        else:
            fix["references"] = q_refs
            fix["references_replace"] = True
    decisions: dict[str, Any] = {}
    if q.get("difficulty"):
        decisions["difficulty"] = q["difficulty"]
    extra = sorted(set(q.get("tags") or []) - set(base.get("tags") or []))
    if extra:
        decisions["tags"] = extra
    return decisions, fix


def run(source: str = "all", check: bool = False) -> int:
    registry = {s.id: s for s in bank.load_sources().sources}
    banked = _bank_by_ref()
    targets = list(LOADERS) if source == "all" else [source]
    total = 0
    for sid in targets:
        raw_items = LOADERS[sid](registry[sid].pinned)
        kept, _ = common.curate(sid, copy.deepcopy(raw_items))
        diffs = _differences(sid, kept, banked)
        total += len(diffs)
        if check or not diffs:
            print(f"{sid}: {len(diffs)} imported questions differ from importer + curation")
            for ref, fields in list(diffs.items())[:10]:
                print(f"  {ref}: {', '.join(fields)}")
            continue
        path = paths.CURATION / f"{sid}.yaml"
        doc = yamlio.load(path) or {}
        if doc.get("items") is None:
            doc["items"] = yamlio.styled({})
        items = doc["items"]
        raw_by_ref = {i.ref: i for i in raw_items}
        for ref in diffs:
            q, topic = banked[(sid, ref)]
            raw = copy.deepcopy(raw_by_ref[ref])
            decisions, fix = _derive(sid, raw, q)
            old = items.get(ref) or {}
            entry: dict[str, Any] = {}
            if topic != raw.topic:
                entry["topic"] = topic
            entry.update(decisions)
            if raw.flag and not fix:
                entry["keep"] = True
            if fix:
                entry["fix"] = fix
            for k in ("comment",):
                if old.get(k):
                    entry[k] = old[k]
            items[ref] = _styled(entry)
        yamlio.dump(doc, path)
        kept2, _ = common.curate(sid, copy.deepcopy(raw_items))
        left = _differences(sid, kept2, banked)
        print(f"{sid}: rewrote {len(diffs)} curation entries; {len(left)} still differ")
        for ref, fields in list(left.items())[:10]:
            print(f"  {ref}: {', '.join(fields)}")
        total += len(left) - len(diffs)
    return 1 if (check and total) else 0
