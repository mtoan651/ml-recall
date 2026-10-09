"""Loading the question bank, taxonomy and source registry."""

from __future__ import annotations

import contextlib
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from . import paths, yamlio
from .schema import QuizFile, SourceRegistry, Taxonomy


@dataclass
class BankFile:
    path: Path
    raw: Any
    model: QuizFile | None
    error: str | None

    @property
    def rel(self) -> str:
        return str(self.path.relative_to(paths.ROOT))


def quiz_paths() -> list[Path]:
    return sorted(paths.QUIZZES.glob("*/*.yaml"))


def load_bank() -> Iterator[BankFile]:
    for path in quiz_paths():
        raw = yamlio.load(path)
        try:
            yield BankFile(path, raw, QuizFile.model_validate(raw), None)
        except ValidationError as e:
            yield BankFile(path, raw, None, _format_error(e, raw))


def load_taxonomy() -> Taxonomy:
    return Taxonomy.model_validate(yamlio.load(paths.TAXONOMY))


def load_sources() -> SourceRegistry:
    return SourceRegistry.model_validate(yamlio.load(paths.SOURCES))


def topic_index(taxonomy: Taxonomy) -> dict[str, tuple[str, str]]:
    """topic id -> (domain id, topic title)"""
    return {t.id: (d.id, t.title) for d in taxonomy.domains for t in d.topics}


def _format_error(e: ValidationError, raw: Any) -> str:
    """Pydantic errors with the offending question id instead of a bare list index."""
    lines = []
    for err in e.errors():
        loc = list(err["loc"])
        if len(loc) >= 2 and loc[0] == "questions" and isinstance(loc[1], int):
            with contextlib.suppress(IndexError, KeyError, TypeError, AttributeError):
                loc[1] = raw["questions"][loc[1]].get("id", loc[1])
        lines.append(f"{'.'.join(map(str, loc))}: {err['msg']}")
    return "\n".join(lines)
