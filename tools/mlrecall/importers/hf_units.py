"""Importer for Hugging Face courses organised in units (Deep RL, Agents).

Quiz pages mix `<Question choices={[...]} />` blocks (multiple choice) with open questions whose
answer sits in `<details><summary>Solution</summary>...</details>`; the latter become self-graded
`short_answer` questions. Questions whose text relies on an image are flagged so curation decides.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

from ..yamlio import load as load_yaml
from .common import Item, collapse_ws, escape_stray_tags, fetch, html_to_md
from .hf_course import _QUESTION_RE, _js_to_json


@dataclass(frozen=True)
class Course:
    repo: str
    site: str
    topics: dict[str, str]  # unit directory -> default topic
    default_topic: str


COURSES = {
    "hf-deep-rl-course": Course(
        repo="huggingface/deep-rl-class",
        site="https://huggingface.co/learn/deep-rl-course",
        topics={
            "unit1": "rl-basics",
            "unit2": "q-learning",
            "unit3": "q-learning",
            "unit4": "policy-gradient",
            "unit5": "rl-basics",
            "unit6": "policy-gradient",
            "unit7": "multi-agent",
        },
        default_topic="rl-basics",
    ),
    "hf-agents-course": Course(
        repo="huggingface/agents-course",
        site="https://huggingface.co/learn/agents-course",
        topics={},
        default_topic="rag-agents",
    ),
}

_PATH_RE = re.compile(r"^units/en/(?P<local>(?P<unit>[^/]+)/(?:[^/]+/)*[^/]*quiz[^/]*)\.mdx$")
_HEADING_RE = re.compile(r"^###\s+(?:Q?(?P<num>\d+)\s*[.:)]\s*)?(?P<text>.+)$", re.MULTILINE)
_DETAILS_RE = re.compile(
    r"<details>\s*<summary>\s*Solution\s*</summary>(?P<body>.*?)</details>", re.S
)
_IMG_RE = re.compile(r"<img\b[^>]*>", re.I)


def loader(source_id: str):
    course = COURSES[source_id]

    def load_items(pinned: str) -> list[Item]:
        toc = _toc(source_id, course, pinned)
        items = []
        for path in _quiz_paths(source_id, course, pinned):
            m = _PATH_RE.match(path)
            local, unit = m.group("local"), m.group("unit")
            mdx = fetch(source_id, pinned, path, _raw(course, pinned, path)).read_text(
                encoding="utf-8"
            )
            group_title, first_page = toc.get(local, (None, None))
            reference = {
                "source": source_id,
                "locator": group_title or unit,
                "url": f"{course.site}/{first_page or local}",
            }
            for num, data, has_image in _parse(mdx):
                data["references"] = [dict(reference)]
                if data.get("explanation"):
                    data["explanation"] += " [^1]"
                items.append(
                    Item(
                        ref=f"{local}#q{num}",
                        topic=course.topics.get(unit, course.default_topic),
                        data=data,
                        url=f"{course.site}/{local}",
                        flag="image" if has_image else None,
                    )
                )
        return items

    return load_items


def _raw(course: Course, pinned: str, path: str) -> str:
    return f"https://raw.githubusercontent.com/{course.repo}/{pinned}/{path}"


def _quiz_paths(source_id: str, course: Course, pinned: str) -> list[str]:
    api = f"https://api.github.com/repos/{course.repo}/git/trees/{pinned}?recursive=1"
    tree = json.loads(fetch(source_id, pinned, "tree.json", api).read_text())
    return sorted(e["path"] for e in tree["tree"] if _PATH_RE.match(e["path"]))


def _toc(source_id: str, course: Course, pinned: str) -> dict[str, tuple[str, str]]:
    """page local path -> (title of its toctree group, local path of the group's first page)"""
    path = "units/en/_toctree.yml"
    toc = load_yaml(fetch(source_id, pinned, "_toctree.yml", _raw(course, pinned, path)))
    index: dict[str, tuple[str, str]] = {}

    def walk(sections, title, first):
        for s in sections or []:
            if "local" in s:
                index[str(s["local"])] = (title, first)
            walk(s.get("sections"), title, first)

    for group in toc:
        sections = group.get("sections") or []
        first = next((str(s["local"]) for s in sections if "local" in s), None)
        walk(sections, str(group.get("title", "")), first)
    return index


def _parse(mdx: str) -> list[tuple[int, dict, bool]]:
    headings = list(_HEADING_RE.finditer(mdx))
    out = []
    for i, h in enumerate(headings, start=1):
        end = headings[i].start() if i < len(headings) else len(mdx)
        segment = mdx[h.end() : end]
        num = int(h.group("num") or i)
        mcq, details = _QUESTION_RE.search(segment), _DETAILS_RE.search(segment)
        block = mcq or details
        if not block:
            continue
        body = segment[: block.start()]
        has_image = bool(_IMG_RE.search(body))
        body = re.sub(r"^\s*---\s*$", "", _IMG_RE.sub("", body), flags=re.M).strip()
        question = html_to_md(h.group("text")) + (f"\n\n{escape_stray_tags(body)}" if body else "")
        if mcq:
            data = _choice_question(mcq.group(1))
        else:
            solution = _IMG_RE.sub("", details.group("body"))
            has_image |= solution != details.group("body")
            data = {
                "type": "short_answer",
                "answer": {"model": escape_stray_tags(collapse_ws(solution))},
            }
        data["question"] = collapse_ws(question)
        out.append((num, data, has_image))
    return out


def _choice_question(js: str) -> dict:
    options = [
        {
            "text": html_to_md(c["text"]),
            "correct": bool(c.get("correct")),
            "why": html_to_md(c["explain"]) if c.get("explain") else None,
        }
        for c in _js_to_json(js)
    ]
    correct = [o for o in options if o["correct"]]
    explanation = " ".join(o["why"] for o in correct if o["why"]) or None
    for o in correct:
        o["why"] = None
    return {
        "type": "multiple" if len(correct) > 1 else "single",
        "options": options,
        "explanation": explanation,
    }
