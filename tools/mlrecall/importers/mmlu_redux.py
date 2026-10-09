"""Importer for MMLU-Redux 2.0, `machine_learning` subset (Arrow file pinned by revision).

Rows that MMLU-Redux experts flagged (error_type != "ok") are dropped unless the curation
file fixes them explicitly.
"""

from __future__ import annotations

import re

import pyarrow as pa

from .common import Item, collapse_ws, fetch

SOURCE_ID = "mmlu-redux"
DATASET = "edinburgh-dawg/mmlu-redux-2.0"
CONFIG = "machine_learning"

_STATEMENT_RE = re.compile(r"\s*Statement\s*(\d)\s*\|\s*")


def load_items(pinned: str) -> list[Item]:
    url = (
        f"https://huggingface.co/datasets/{DATASET}/resolve/{pinned}"
        f"/{CONFIG}/data-00000-of-00001.arrow"
    )
    path = fetch(SOURCE_ID, pinned, f"{CONFIG}.arrow", url)
    with pa.memory_map(str(path)) as source:
        rows = pa.ipc.open_stream(source).read_all().to_pylist()

    items = []
    for idx, row in enumerate(rows):
        options = [
            {"text": _clean(c), "correct": k == row["answer"]} for k, c in enumerate(row["choices"])
        ]
        items.append(
            Item(
                ref=f"{CONFIG}/{idx}",
                topic="ml-basics",  # every row gets its topic from the curation file
                data={"type": "single", "question": _question(row["question"]), "options": options},
                url=f"https://huggingface.co/datasets/{DATASET}/viewer/{CONFIG}/test?row={idx}",
                flag=None if row["error_type"] == "ok" else row["error_type"],
            )
        )
    return items


def _question(text: str) -> str:
    """'Statement 1| A. Statement 2| B.' -> two bold-labelled paragraphs."""
    parts = _STATEMENT_RE.split(text)
    if len(parts) == 5 and not parts[0].strip():
        text = f"**Statement 1.** {parts[2].strip()}\n\n**Statement 2.** {parts[4].strip()}"
        text = "Evaluate both statements.\n\n" + text
    return _clean(text)


def _clean(text: str) -> str:
    text = re.sub(r"\\texttt\{([^{}]*)\}", r"`\1`", text)
    return collapse_ws(re.sub(r"[ \t]+", " ", text))
