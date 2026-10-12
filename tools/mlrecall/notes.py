"""Topic notes: src/content/notes/<domain>/<topic>.md — YAML front matter (`Note`) + Markdown.

`mlr check` validates them with `check_notes()`: the front matter schema, the path against the
taxonomy (one note per topic), the sections, length, citations, and the Markdown/KaTeX rules
the questions follow. The web app renders the body with the same Markdown pipeline as
questions (docs/web-app.md#topic-notes).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import ValidationError
from ruamel.yaml import YAML, YAMLError

from . import paths
from .schema import Note, citation_markers

#: Allowed `## ` sections, in this order; the first and last are required.
SECTIONS = ["Key ideas", "Formulas", "Worked example", "In code", "Common pitfalls"]
REQUIRED = ["Key ideas", "Common pitfalls"]
WORDS = (400, 1300)

_FRONT_MATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)
_FENCE_RE = re.compile(r"^```.*?^```", re.DOTALL | re.MULTILINE)


@dataclass
class NoteFile:
    path: Path
    meta: dict[str, Any] | None
    body: str
    model: Note | None
    error: str | None

    @property
    def rel(self) -> str:
        return self.path.relative_to(paths.ROOT).as_posix()


def note_paths() -> list[Path]:
    return sorted(paths.NOTES.glob("*/*.md")) if paths.NOTES.exists() else []


def load_note(path: Path) -> NoteFile:
    m = _FRONT_MATTER_RE.match(path.read_text(encoding="utf-8"))
    if not m:
        return NoteFile(path, None, "", None, "no YAML front matter (--- … ---) at the top")
    try:
        meta = YAML(typ="safe").load(m.group(1)) or {}
    except YAMLError as e:
        return NoteFile(path, None, m.group(2), None, f"front matter is not YAML: {e}")
    try:
        return NoteFile(path, meta, m.group(2), Note.model_validate(meta), None)
    except ValidationError as e:
        first = e.errors()[0]
        where = ".".join(str(x) for x in first["loc"])
        return NoteFile(path, meta, m.group(2), None, f"{where}: {first['msg']}")


def load_notes() -> list[NoteFile]:
    return [load_note(p) for p in note_paths()]


def prose_words(body: str) -> int:
    text = _FENCE_RE.sub("", body)
    text = re.sub(r"\$\$.*?\$\$|\$[^$\n]*\$", "", text, flags=re.DOTALL)
    return len(re.findall(r"[A-Za-z][A-Za-z'-]*", text))


def body_problems(body: str, ref_count: int) -> tuple[list[str], list[str]]:
    """(errors, warnings) of a note body with `ref_count` references."""
    from .check import _math_line_starts_block, _unbalanced_dollars, _wrapped_display_math

    errors: list[str] = []
    warnings: list[str] = []
    outside_code = _FENCE_RE.sub("", body)
    headings = re.findall(r"^(#{1,6})\s+(.+?)\s*$", outside_code, flags=re.MULTILINE)
    names = []
    for hashes, title in headings:
        if len(hashes) != 2:
            errors.append(f"heading `{hashes} {title}`: use `## ` section headings only")
        elif title not in SECTIONS:
            errors.append(f"section `{title}` is not one of {SECTIONS}")
        else:
            names.append(title)
    for need in REQUIRED:
        if need not in names:
            errors.append(f"missing section `## {need}`")
    if names != [s for s in SECTIONS if s in names] or len(names) != len(set(names)):
        errors.append(f"sections must appear once each, in the order {SECTIONS}")

    words = prose_words(body)
    if not WORDS[0] <= words <= WORDS[1]:
        warnings.append(f"{words} words of prose; aim for {WORDS[0]}–{WORDS[1]}")

    cited = set(citation_markers(body))
    for n in sorted(cited):
        if not 1 <= n <= ref_count:
            errors.append(f"[^{n}] has no reference (there are {ref_count})")
    for n in range(1, ref_count + 1):
        if n not in cited:
            errors.append(f"reference {n} is never cited")
    if _unbalanced_dollars(body):
        errors.append("unbalanced `$` (a literal dollar is `\\$`)")
    if _wrapped_display_math(body):
        errors.append("display math `$$…$$` spanning lines must open and close on their own lines")
    if _math_line_starts_block(body):
        errors.append("a line inside math starts with `+ `, `- `, `* `, `1. ` or `#`: join it")
    no_code = re.sub(r"`[^`\n]*`", "", outside_code)
    if re.search(r"<[A-Za-z/!]", re.sub(r"\$[^$]*\$", "", no_code)):
        errors.append("raw HTML is not rendered: write `\\<` for a literal `<` outside math/code")
    if "{{" in no_code:
        errors.append("`{{` is reserved for gap-fill blanks")
    return errors, warnings


def check_notes(
    topics: dict[str, tuple[str, str]], sources: set[str]
) -> tuple[list[str], list[str]]:
    """Errors and warnings of every note; `topics` maps topic id → (domain id, title)."""
    errors: list[str] = []
    warnings: list[str] = []
    seen: dict[str, str] = {}
    for f in load_notes():
        if f.error or f.model is None:
            errors.append(f"{f.rel}: {f.error}")
            continue
        note = f.model
        domain_dir, topic_file = f.path.parent.name, f.path.stem
        if note.topic != topic_file:
            errors.append(f"{f.rel}: topic '{note.topic}' must match the file name")
        if topics.get(note.topic, (None,))[0] != domain_dir:
            errors.append(f"{f.rel}: topic '{note.topic}' is not in taxonomy domain '{domain_dir}'")
        if note.topic in seen:
            errors.append(f"{f.rel}: second note for '{note.topic}' (also {seen[note.topic]})")
        seen[note.topic] = f.rel
        for i, r in enumerate(note.references, 1):
            if r.source and r.source not in sources:
                errors.append(f"{f.rel}: reference {i}: unknown source '{r.source}'")
        e, w = body_problems(f.body, len(note.references))
        errors += [f"{f.rel}: {x}" for x in e]
        warnings += [f"{f.rel}: {x}" for x in w]
    return errors, warnings
