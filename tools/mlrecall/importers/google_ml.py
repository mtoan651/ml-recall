"""Importer for Google's machine learning courses (developers.google.com/machine-learning).

Quizzes are `<devsite-multiple-choice>` elements: the first child `<div>` is the stem, every
following `<div>` is an option (`correct` attribute marks a key) whose first child is the option
text and whose second child is the feedback shown after answering. `preserve-order` keeps the
option order. The site has no public repository, so `pinned` is the snapshot date of the cached
pages. Questions that show an image, or that refer to a figure or the page around them, are
flagged so curation decides. MathJax delimiters `\\( \\)` / `\\[ \\]` become `$` / `$$`, site links
become absolute, and soft-wrapped lines are joined.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from bs4 import BeautifulSoup, Tag

from .common import Item, fetch, html_to_md

SITE = "https://developers.google.com"


@dataclass(frozen=True)
class Course:
    path: str  # /machine-learning/<path>
    topics: dict[str, str]  # first path segment after the course -> default topic
    default_topic: str


COURSES = {
    "google-mlcc": Course(
        path="crash-course",
        topics={
            "linear-regression": "linear-regression",
            "logistic-regression": "logistic-regression",
            "classification": "metrics",
            "numerical-data": "data-prep",
            "categorical-data": "data-prep",
            "overfitting": "ml-basics",
            "neural-networks": "neural-networks",
            "embeddings": "text-representation",
            "llm": "llm-basics",
            "production-ml-systems": "ml-basics",
            "automl": "ml-basics",
            "fairness": "ai-ethics",
        },
        default_topic="ml-basics",
    ),
    "google-ml-courses": Course(
        path="",
        topics={
            "decision-forests": "trees-ensembles",
            "clustering": "clustering",
            "gan": "gans",
            "problem-framing": "ml-basics",
            "recommendation": "ml-basics",
            "managing-ml-projects": "ml-basics",
        },
        default_topic="ml-basics",
    ),
}

_INLINE_MATH_RE = re.compile(r"\\\((.+?)\\\)", re.S)
_DISPLAY_MATH_RE = re.compile(r"\\\[(.+?)\\\]", re.S)
_NUMBERED_RE = re.compile(r"^\d+\.\s+")
_BLOCK_START_RE = re.compile(r"^(?:[*+-]\s|\d+\.\s|\||```|>)")
_CONTEXT_RE = re.compile(
    r"\b(figure|chart|graph|plot|diagram|image|shown|preceding|following|above|below)\b", re.I
)


def loader(source_id: str):
    course = COURSES[source_id]

    def load_items(pinned: str) -> list[Item]:
        items = []
        for page in _pages(source_id, course, pinned):
            html = _get(source_id, pinned, page).read_text(encoding="utf-8")
            soup = BeautifulSoup(html, "html.parser")
            title = _title(soup)
            module = page.split("/")[0]
            for num, block in enumerate(soup.find_all("devsite-multiple-choice"), start=1):
                url = f"{SITE}{_base(course)}/{page}"
                _absolute_links(block, url)
                parsed = _parse(block)
                if parsed is None:
                    continue
                data, flag = parsed
                data["references"] = [{"source": source_id, "locator": title, "url": url}]
                if data.get("explanation"):
                    data["explanation"] += " [^1]"
                items.append(
                    Item(
                        ref=f"{page}#q{num}",
                        topic=course.topics.get(module, course.default_topic),
                        data=data,
                        url=url,
                        flag=flag,
                    )
                )
        return items

    return load_items


def _base(course: Course) -> str:
    return f"/machine-learning/{course.path}".rstrip("/")


def _get(source_id: str, pinned: str, page: str):
    name = (page or "index").replace("/", "__") + ".html"
    course = COURSES[source_id]
    return fetch(source_id, pinned, name, f"{SITE}{_base(course)}/{page}".rstrip("/"))


def _links(source_id: str, pinned: str, page: str, prefix: str) -> list[str]:
    """Course-relative paths of the pages linked from `page` that start with `prefix`."""
    html = _get(source_id, pinned, page).read_text(encoding="utf-8")
    base = _base(COURSES[source_id])
    found = re.findall(rf'href="{re.escape(base)}/({re.escape(prefix)}[a-z0-9_/-]+)"', html)
    return sorted({p.rstrip("/") for p in found})


def _pages(source_id: str, course: Course, pinned: str) -> list[str]:
    """Each module's landing page plus the pages it links to inside the module."""
    pages: set[str] = set()
    for module in course.topics:
        pages.add(module)
        pages.update(_links(source_id, pinned, module, f"{module}/"))
    return sorted(pages)


def _title(soup: BeautifulSoup) -> str:
    """The page title without the site's bookmark widget nested in the <h1>."""
    h1 = soup.find("h1")
    if not h1:
        return ""
    text = "".join(s for s in h1.find_all(string=True, recursive=False))
    return " ".join(text.split())


def _absolute_links(block: Tag, page_url: str) -> None:
    for a in block.find_all("a", href=True):
        href = a["href"]
        if href.startswith("/"):
            a["href"] = SITE + href
        elif href.startswith("#"):
            a["href"] = page_url + href


def _md(html: str, stem: bool = False) -> str:
    """HTML → Markdown with `$` math and soft line breaks joined (lists and code kept).

    A stem loses its page numbering ("2. In general, ...").
    """
    text = html_to_md(html)
    if stem:
        text = _NUMBERED_RE.sub("", text, count=1)
    text = _DISPLAY_MATH_RE.sub(lambda m: f"$${_tex(m.group(1))}$$", text)
    text = _INLINE_MATH_RE.sub(lambda m: f"${_tex(m.group(1))}$", text)
    paragraphs = []
    for para in re.split(r"\n\s*\n", text):
        lines = [line.strip() for line in para.splitlines() if line.strip()]
        if any(_BLOCK_START_RE.match(line) for line in lines):
            paragraphs.append("\n".join(lines))
        else:
            paragraphs.append(" ".join(lines))
    return "\n\n".join(p for p in paragraphs if p)


def _tex(math: str) -> str:
    """MathJax tolerates a bare `%` in `\\text{25%}`; in KaTeX it starts a comment."""
    return re.sub(r"(?<!\\)%", r"\\%", math.strip())


def _parse(block: Tag) -> tuple[dict, str | None] | None:
    children = [c for c in block.find_all("div", recursive=False)]
    if len(children) < 3:
        return None
    stem, choices = children[0], children[1:]
    flag = None
    if stem.find("img") or any(c.find("img") for c in choices):
        flag = "image"
    elif _CONTEXT_RE.search(stem.get_text(" ")):
        flag = "context"

    options = []
    for choice in choices:
        parts = choice.find_all("div", recursive=False)
        text_div = parts[0] if parts else choice
        why_div = parts[1] if len(parts) > 1 else None
        why = _md(why_div.decode_contents()) if why_div else ""
        options.append(
            {
                "text": _md(text_div.decode_contents()),
                "correct": choice.has_attr("correct"),
                "why": why or None,
            }
        )
    correct = [o for o in options if o["correct"]]
    if not correct:
        return None
    explanation = " ".join(o["why"] for o in correct if o["why"]) or None
    for o in correct:
        o["why"] = None
    data = {
        "type": "multiple" if len(correct) > 1 else "single",
        "question": _md(stem.decode_contents(), stem=True),
        "options": options,
        "explanation": explanation,
    }
    if block.has_attr("preserve-order"):
        data["shuffle"] = False
    return data, flag
