"""Upstream importers. `mlr import <source-id>` runs load → curate → merge."""

from __future__ import annotations

from collections.abc import Callable

from .. import bank
from . import common, hf_course, hf_units, mmlu_redux, ms_beginners

LOADERS: dict[str, Callable[[str], list[common.Item]]] = {
    hf_course.SOURCE_ID: hf_course.load_items,
    "ms-ai-for-beginners": ms_beginners.load_ai,
    "ms-ml-for-beginners": ms_beginners.load_ml,
    "ms-ds-for-beginners": ms_beginners.load_ds,
    mmlu_redux.SOURCE_ID: mmlu_redux.load_items,
    **{source_id: hf_units.loader(source_id) for source_id in hf_units.COURSES},
}


def run_import(source: str, dry_run: bool = False) -> int:
    registry = {s.id: s for s in bank.load_sources().sources}
    targets = list(LOADERS) if source == "all" else [source]
    for source_id in targets:
        if source_id not in LOADERS:
            print(f"no importer for '{source_id}' (available: {', '.join(LOADERS)})")
            return 2
        pinned = registry[source_id].pinned
        if not pinned:
            print(f"{source_id}: set `pinned` in sources.yaml first")
            return 2
        items = LOADERS[source_id](pinned)
        kept, dropped = common.curate(source_id, items)
        added = common.merge(source_id, kept, dry_run=dry_run)
        verb = "would add" if dry_run else "added"
        print(
            f"{source_id}@{pinned[:7]}: {len(items)} upstream, {len(kept)} kept, "
            f"{verb} {sum(added.values())} new"
        )
        for reason, n in dropped.most_common():
            print(f"  dropped {n:>3}  {reason}")
        for topic, n in sorted(added.items()):
            print(f"  {verb} {n:>3}  {topic}")
    return 0
