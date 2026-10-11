"""`mlr figs`: re-render question figures from their generator scripts.

A generator is a Python file next to a topic's figures, `src/content/quizzes/<domain>/<topic>/
<question-id>.py`, that writes `<question-id>*.svg` beside itself (see `figstyle.save`). Other
Python files there are shared helpers. A script is stale when it, a helper next to it, or
figstyle.py is newer than its oldest SVG, or when it has no SVG yet.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

from . import paths

FIGSTYLE = Path(__file__).with_name("figstyle.py")
_GENERATOR_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*-\d{3}\.py$")


def generators() -> list[Path]:
    return sorted(p for p in paths.QUIZZES.glob("*/*/*.py") if _GENERATOR_RE.match(p.name))


def _helpers(script: Path) -> list[Path]:
    return [p for p in script.parent.glob("*.py") if not _GENERATOR_RE.match(p.name)]


def outputs(script: Path) -> list[Path]:
    return sorted(script.parent.glob(f"{script.stem}*.svg"))


def stale(script: Path) -> bool:
    svgs = outputs(script)
    if not svgs:
        return True
    inputs = [script, FIGSTYLE, *_helpers(script)]
    newest_input = max(p.stat().st_mtime for p in inputs)
    return min(s.stat().st_mtime for s in svgs) < newest_input


def run(force: bool = False, check: bool = False) -> int:
    todo = [s for s in generators() if force or stale(s)]
    if check:
        for s in todo:
            print(f"stale: {s.relative_to(paths.ROOT)}")
        return 1 if todo else 0
    failed = 0
    for script in todo:
        result = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
        rel = script.relative_to(paths.ROOT)
        if result.returncode:
            failed += 1
            print(f"FAILED {rel}\n{result.stderr.strip()}")
        else:
            names = ", ".join(p.name for p in outputs(script))
            print(f"rendered {rel} → {names}")
    fresh = len(generators()) - len(todo)
    print(f"{len(todo) - failed} rendered, {failed} failed, {fresh} up to date")
    return 1 if failed else 0
