"""Importer for rougier/numpy-100 (`source/exercises100.ktx`).

The keyed text file holds blocks `< qN` (question, difficulty as ★☆☆/★★☆/★★★), `< hN` (hint) and
`< aN` (solution code). Each exercise becomes a self-graded `short_answer` whose model answer is the
solution code; the hint is not shown, since it would give the answer away.
"""

from __future__ import annotations

import re

from .common import Item, escape_stray_tags, fetch

SOURCE_ID = "numpy-100"
REPO = "rougier/numpy-100"
PATH = "source/exercises100.ktx"

_BLOCK_RE = re.compile(r"^< ([qha])(\d+)\s*$", re.MULTILINE)
_STARS = {"★☆☆": "easy", "★★☆": "medium", "★★★": "hard"}
_STARS_RE = re.compile(r"\s*\((★[★☆]{2})\)")


def load_items(pinned: str) -> list[Item]:
    raw = f"https://raw.githubusercontent.com/{REPO}/{pinned}/{PATH}"
    text = fetch(SOURCE_ID, pinned, "exercises100.ktx", raw).read_text(encoding="utf-8")
    blocks: dict[int, dict[str, str]] = {}
    marks = list(_BLOCK_RE.finditer(text))
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        blocks.setdefault(int(m.group(2)), {})[m.group(1)] = text[m.end() : end].strip()

    url = f"https://github.com/{REPO}/blob/{pinned}/100_Numpy_exercises_with_solutions.md"
    items = []
    for num, block in sorted(blocks.items()):
        question, answer = block.get("q", ""), block.get("a", "")
        if not question or not answer:
            continue
        stars = _STARS_RE.search(question)
        data = {
            "type": "short_answer",
            "difficulty": _STARS.get(stars.group(1)) if stars else None,
            "question": escape_stray_tags(_STARS_RE.sub("", question, count=1).strip()),
            "answer": {"model": f"```python\n{answer}\n```"},
            "references": [{"source": SOURCE_ID, "locator": f"Exercise {num}", "url": url}],
        }
        items.append(Item(ref=f"q{num}", topic="numpy", data=data, url=url))
    return items
