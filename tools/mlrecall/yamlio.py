"""YAML read/write with a stable, diff-friendly style.

- round-trip mode keeps comments and formatting of hand-edited files
- multi-line strings are written as literal blocks (`|`), so LaTeX needs no escaping
- no line folding (width 4096) to keep diffs one-line-per-change
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from ruamel.yaml import YAML
from ruamel.yaml.comments import CommentedMap, CommentedSeq
from ruamel.yaml.scalarstring import LiteralScalarString


def _yaml() -> YAML:
    y = YAML()
    y.indent(mapping=2, sequence=4, offset=2)
    y.width = 4096
    y.preserve_quotes = True
    return y


def load(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return _yaml().load(f)


def dump(data: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        _yaml().dump(data, f)


def styled(obj: Any) -> Any:
    """Convert plain dicts/lists/strings into round-trip nodes with our house style.

    Drops keys whose value is None, "" or an empty list so files stay compact.
    """
    if isinstance(obj, dict):
        out = CommentedMap()
        for k, v in obj.items():
            if v is None or v == "" or v == []:
                continue
            out[k] = styled(v)
        return out
    if isinstance(obj, list):
        return CommentedSeq(styled(v) for v in obj)
    if isinstance(obj, str):
        text = "\n".join(line.rstrip() for line in obj.strip("\n").splitlines())
        return LiteralScalarString(text + "\n") if "\n" in text else text
    return obj
