"""`mlr extract` — PDF → Markdown text with page markers, for writing questions from slides.

Course materials stay outside the repository (`../materials/`); the extracted text goes to the
git-ignored `.cache/extract/<file stem>.md`. Each page becomes a `## Page N` section, so a
question can cite "Lecture 2, slides 24–25". With `--colors`, coloured text is marked as
`[red: …]` — the CE6146 exercise sheets print their answers in red, which plain text extraction
loses. Uses pdfminer.six (the PDF backend of markitdown); other formats can be converted with
`uvx markitdown <file>`.
"""

from __future__ import annotations

import colorsys
import re
from collections.abc import Iterable, Iterator
from pathlib import Path

from . import paths

# Hue (degrees) where each named colour ends, for marking coloured text.
_HUES = [(15, "red"), (45, "orange"), (70, "yellow"), (165, "green"), (195, "cyan"),
         (255, "blue"), (290, "purple"), (335, "pink"), (360, "red")]  # fmt: skip
_BLANK_LINES_RE = re.compile(r"\n{3,}")


def color_name(color: object) -> str | None:
    """Name of a PDF fill colour (gray, RGB or CMYK components in 0–1), or None when it is
    black, gray or white — text that needs no marking."""
    if isinstance(color, int | float):
        return None
    if not isinstance(color, list | tuple) or not all(isinstance(c, int | float) for c in color):
        return None  # pattern colours, unknown spaces
    if len(color) == 4:
        c, m, y, k = color
        color = ((1 - c) * (1 - k), (1 - m) * (1 - k), (1 - y) * (1 - k))
    if len(color) != 3:
        return None
    h, light, s = colorsys.rgb_to_hls(*(min(max(float(v), 0.0), 1.0) for v in color))
    if s < 0.35 or light < 0.12 or light > 0.92 or max(color) - min(color) < 0.2:
        return None
    hue = h * 360
    return next(name for end, name in _HUES if hue < end)


def _runs(chars: Iterable[tuple[str, str | None]]) -> str:
    """Join (text, colour) pieces, wrapping each coloured run as `[colour: text]`."""
    out: list[str] = []
    run: list[str] = []
    current: str | None = None

    def flush() -> None:
        text = "".join(run)
        if current and text.strip():
            core = text.strip()
            lead, trail = text[: len(text) - len(text.lstrip())], text[len(text.rstrip()) :]
            out.append(f"{lead}[{current}: {core}]{trail}")
        else:
            out.append(text)
        run.clear()

    for text, color in chars:
        # Spaces take the colour of the run they are in, so "[red: two words]" stays one run.
        if color != current and text.strip():
            flush()
            current = color
        run.append(text)
    flush()
    return "".join(out)


def _page_text(page: object, colors: bool) -> str:
    from pdfminer.layout import LTAnno, LTChar, LTTextContainer, LTTextLine

    lines: list[str] = []
    for box in page:  # type: ignore[attr-defined]
        if not isinstance(box, LTTextContainer):
            continue
        for line in box:
            if not isinstance(line, LTTextLine):
                continue
            if not colors:
                lines.append(line.get_text())
                continue
            pieces = []
            for ch in line:
                if isinstance(ch, LTChar):
                    pieces.append((ch.get_text(), color_name(ch.graphicstate.ncolor)))
                elif isinstance(ch, LTAnno):
                    pieces.append((ch.get_text(), None))
            lines.append(_runs(pieces))
        lines.append("\n")
    text = "".join(lines)
    text = "\n".join(line.rstrip() for line in text.splitlines())
    return _BLANK_LINES_RE.sub("\n\n", text).strip()


def extract_pdf(path: Path, colors: bool = False) -> list[str]:
    """The text of every page of a PDF, in reading order."""
    from pdfminer.high_level import extract_pages

    return [_page_text(page, colors) for page in extract_pages(path)]


def to_markdown(title: str, pages: list[str]) -> str:
    parts = [f"# {title}\n"]
    for n, text in enumerate(pages, start=1):
        parts.append(f"## Page {n}\n\n{text}\n" if text else f"## Page {n}\n\n_(no text)_\n")
    return "\n".join(parts)


def _inputs(items: Iterable[Path]) -> Iterator[Path]:
    for item in items:
        if item.is_dir():
            yield from sorted(item.glob("*.pdf"))
        else:
            yield item


def run(items: list[Path], out: Path | None = None, colors: bool = False) -> int:
    out = out or paths.EXTRACT
    failed = 0
    files = list(_inputs(items))
    if not files:
        print("no PDF files given")
        return 1
    for pdf in files:
        if pdf.suffix.lower() != ".pdf" or not pdf.is_file():
            print(f"skipped {pdf}: not a PDF file (convert other formats with `uvx markitdown`)")
            failed += 1
            continue
        pages = extract_pdf(pdf, colors=colors)
        out.mkdir(parents=True, exist_ok=True)
        dest = out / f"{pdf.stem}.md"
        dest.write_text(to_markdown(pdf.name, pages), encoding="utf-8")
        empty = sum(1 for p in pages if not p)
        note = f", {empty} without text (scanned?)" if empty else ""
        print(f"wrote {dest} ({len(pages)} pages{note})")
    return 1 if failed else 0
