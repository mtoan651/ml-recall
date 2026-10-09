"""Importer for the Hugging Face LLM Course end-of-chapter quizzes (MDX `<Question>` blocks)."""

from __future__ import annotations

import json
import re

from ..yamlio import load as load_yaml
from .common import Item, collapse_ws, escape_stray_tags, fetch, html_to_md

SOURCE_ID = "hf-llm-course"
REPO = "huggingface/course"
SITE = "https://huggingface.co/learn/llm-course"

CHAPTER_TOPICS = {
    1: "transformers",
    2: "huggingface",
    3: "fine-tuning",
    4: "huggingface",
    5: "huggingface",
    6: "tokenization",
    7: "nlp-tasks",
    8: "huggingface",
    9: "huggingface",
    10: "huggingface",
    11: "fine-tuning",
    12: "alignment",
}

_HEADING_RE = re.compile(r"^###\s+(\d+)\.\s+(.*)$", re.MULTILINE)
_QUESTION_RE = re.compile(r"<Question\s+choices=\{\[(.*?)\]\}\s*/>", re.DOTALL)
_PATH_RE = re.compile(r"^chapters/en/chapter(\d+)/(\d+)\.mdx$")


def load_items(pinned: str) -> list[Item]:
    titles = _chapter_titles(pinned)
    items = []
    for path in _quiz_candidates(pinned):
        chapter, page = map(int, _PATH_RE.match(path).groups())
        text = fetch(SOURCE_ID, pinned, path, _raw(pinned, path)).read_text(encoding="utf-8")
        if "<Question" not in text:
            continue
        for num, data in _parse_quiz(text):
            data["references"] = [
                {
                    "source": SOURCE_ID,
                    "locator": f"Chapter {chapter}: {titles.get(chapter, '')}".rstrip(": "),
                    "url": f"{SITE}/chapter{chapter}/1",
                }
            ]
            if data.get("explanation"):
                data["explanation"] += " [^1]"
            items.append(
                Item(
                    ref=f"chapter{chapter}/{page}#q{num}",
                    topic=CHAPTER_TOPICS.get(chapter, "huggingface"),
                    data=data,
                    url=f"{SITE}/chapter{chapter}/{page}",
                )
            )
    return items


def _raw(pinned: str, path: str) -> str:
    return f"https://raw.githubusercontent.com/{REPO}/{pinned}/{path}"


def _quiz_candidates(pinned: str) -> list[str]:
    tree = fetch(
        SOURCE_ID,
        pinned,
        "tree.json",
        f"https://api.github.com/repos/{REPO}/git/trees/{pinned}?recursive=1",
    )
    paths = [e["path"] for e in json.loads(tree.read_text())["tree"]]
    return sorted((p for p in paths if _PATH_RE.match(p)), key=_chapter_page)


def _chapter_page(path: str) -> tuple[int, int]:
    return tuple(map(int, _PATH_RE.match(path).groups()))


def _chapter_titles(pinned: str) -> dict[int, str]:
    toc = load_yaml(
        fetch(SOURCE_ID, pinned, "_toctree.yml", _raw(pinned, "chapters/en/_toctree.yml"))
    )
    titles = {}
    for entry in toc:
        m = re.match(r"^(\d+)\.\s+(.*)$", str(entry.get("title", "")))
        if m:
            titles[int(m.group(1))] = m.group(2).strip()
    return titles


def _parse_quiz(mdx: str) -> list[tuple[int, dict]]:
    headings = list(_HEADING_RE.finditer(mdx))
    out = []
    for i, h in enumerate(headings):
        end = headings[i + 1].start() if i + 1 < len(headings) else len(mdx)
        segment = mdx[h.end() : end]
        m = _QUESTION_RE.search(segment)
        if not m:
            continue
        body = segment[: m.start()].strip()
        question = html_to_md(h.group(2)) + (f"\n\n{escape_stray_tags(body)}" if body else "")
        choices = _js_to_json(m.group(1))
        options = [
            {
                "text": html_to_md(c["text"]),
                "correct": bool(c.get("correct")),
                "why": html_to_md(c["explain"]) if c.get("explain") else None,
            }
            for c in choices
        ]
        correct = [o for o in options if o["correct"]]
        explanation = " ".join(o["why"] for o in correct if o["why"]) or None
        for o in correct:
            o["why"] = None  # folded into the explanation
        out.append(
            (
                int(h.group(1)),
                {
                    "type": "multiple" if len(correct) > 1 else "single",
                    "question": collapse_ws(question),
                    "options": options,
                    "explanation": explanation,
                },
            )
        )
    return out


def _js_to_json(js: str) -> list[dict]:
    """Convert the JS object-literal array inside `choices={[...]}` to Python objects."""
    s = re.sub(r"([{,]\s*)(text|explain|correct)\s*:", r'\1"\2":', js)
    s = re.sub(r",(\s*[}\]])", r"\1", s)
    s = s.replace("\\'", "'")
    s = re.sub(r",\s*$", "", s.strip())
    return json.loads(f"[{s}]")
