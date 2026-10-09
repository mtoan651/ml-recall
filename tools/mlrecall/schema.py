"""Data model of the question bank — the single source of truth for the format.

`mlr schema` exports these models to `schema/*.schema.json` (used by the YAML
language server for autocompletion; the web app mirrors them in Zod).
See docs/data-format.md for the human-readable spec.
"""

from __future__ import annotations

import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, model_validator

Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")]
QuestionId = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*-\d{3}$")]
Text = Annotated[str, StringConstraints(min_length=1)]

# Citation markers are Markdown-footnote style: "... is shift-invariant [^1]."
CITATION_RE = re.compile(r"\[\^(\d+)\]")
_CODE_OR_MATH_RE = re.compile(r"```.*?```|`[^`\n]*`|\$\$.*?\$\$|\$[^$\n]*\$", re.DOTALL)


def citation_markers(text: str | None) -> list[int]:
    """Citation numbers used in `text`, ignoring code spans/blocks and math."""
    if not text:
        return []
    return [int(n) for n in CITATION_RE.findall(_CODE_OR_MATH_RE.sub("", text))]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# --------------------------------------------------------------------------- questions


class Figure(_Strict):
    src: Text = Field(description="Path relative to the YAML file, e.g. ./cnn/cnn-007.svg")
    alt: Annotated[str, StringConstraints(min_length=10)] = Field(
        description="Describe what is visible, never the conclusion/answer."
    )
    caption: str | None = None


class Option(_Strict):
    text: Text
    correct: bool = False
    why: str | None = Field(None, description="Feedback shown for this option after answering.")
    image: Figure | None = None


class Reference(_Strict):
    """A citation supporting the question or explanation, referenced as [^n] (1-based)."""

    source: Slug | None = Field(None, description="Id in src/content/sources.yaml")
    title: str | None = Field(None, description="For works not in the registry (e.g. a paper)")
    url: HttpUrl | None = None
    locator: str | None = Field(None, description="Chapter/section/page/slide, e.g. 'Sec. 4.3'")
    quote: Annotated[str, StringConstraints(max_length=300)] | None = Field(
        None, description="Short verbatim excerpt (keep it brief)."
    )

    @model_validator(mode="after")
    def _identifies_a_work(self) -> Reference:
        if not (self.source or self.url or self.title):
            raise ValueError("reference needs at least one of: source, url, title")
        return self


class Provenance(_Strict):
    """Where the question itself comes from."""

    id: Slug = Field(description="Source id in src/content/sources.yaml")
    ref: Text = Field(description="Stable locator inside the source; unique per source")
    url: HttpUrl | None = None


class ShortAnswer(_Strict):
    """Answer key of a `short_answer` question.

    Auto-graded when `accept` or `numeric` is set; otherwise the learner self-grades
    against `model`.
    """

    accept: list[Text] = Field(
        [], description="Accepted answers, matched ignoring case, spaces and punctuation"
    )
    numeric: float | None = Field(None, description="Numeric answer")
    tolerance: float = Field(0, ge=0, description="Absolute tolerance for `numeric`")
    model: Text = Field(description="Model answer shown after answering (Markdown)")


CHOICE_TYPES = ("single", "multiple", "true_false")


class Question(_Strict):
    id: QuestionId
    type: Literal["single", "multiple", "true_false", "short_answer"] = Field(
        description=(
            "single: one correct option; multiple: one or more correct options (select all); "
            "true_false: two options; short_answer: typed answer, see `answer`"
        )
    )
    difficulty: Literal["easy", "medium", "hard"] | None = None
    tags: list[Slug] = []
    shuffle: bool = Field(
        True, description="false keeps option order (e.g. 'both of the above' options)"
    )
    question: Text
    figure: Figure | None = None
    options: list[Option] | None = Field(None, min_length=2, max_length=8)
    answer: ShortAnswer | None = None
    explanation: str | None = None
    explanation_figure: Figure | None = None
    references: list[Reference] = []
    source: Provenance
    status: Literal["draft", "reviewed"]

    @model_validator(mode="after")
    def _consistent(self) -> Question:
        if self.type in CHOICE_TYPES:
            self._check_choices()
        else:
            if self.options or not self.answer:
                raise ValueError("short_answer: needs `answer` and no `options`")

        if self.status == "reviewed":
            missing = [f for f in ("explanation", "difficulty") if not getattr(self, f)]
            if missing:
                raise ValueError(f"reviewed questions need: {', '.join(missing)}")
            if not citation_markers(self.explanation):
                raise ValueError("reviewed questions need a cited explanation ([^n] marker)")

        scanned = [self.question, self.explanation, self.answer and self.answer.model]
        for o in self.options or []:
            scanned += [o.text, o.why]
        for n in (n for text in scanned for n in citation_markers(text)):
            if not 1 <= n <= len(self.references):
                raise ValueError(
                    f"citation [^{n}] has no matching reference ({len(self.references)} given)"
                )
        return self

    def _check_choices(self) -> None:
        if not self.options or self.answer:
            raise ValueError(f"{self.type}: needs `options` and no `answer`")
        n_correct = sum(o.correct for o in self.options)
        if self.type == "multiple":
            if n_correct < 1:
                raise ValueError("multiple: needs at least one correct option")
        elif n_correct != 1:
            raise ValueError(f"{self.type}: needs exactly one correct option, found {n_correct}")
        if self.type == "true_false" and len(self.options) != 2:
            raise ValueError("true_false: needs exactly two options")
        texts = [o.text.strip().casefold() for o in self.options]
        if len(set(texts)) != len(texts):
            raise ValueError("duplicate option text")


class QuizFile(_Strict):
    """One YAML file = one topic: src/content/quizzes/<domain>/<topic>.yaml"""

    schema_version: Literal[1] = 1
    domain: Slug
    topic: Slug
    title: Text
    description: str | None = None
    questions: list[Question] = []


# --------------------------------------------------------------------------- taxonomy


class Topic(_Strict):
    id: Slug = Field(description="Globally unique; used as the question id prefix")
    title: Text
    description: str | None = None


class Domain(_Strict):
    id: Slug
    title: Text
    topics: list[Topic]


class Taxonomy(_Strict):
    schema_version: Literal[1] = 1
    domains: list[Domain]


# --------------------------------------------------------------------------- sources


class Source(_Strict):
    id: Slug
    title: Text
    author: str | None = None
    kind: Literal[
        "course", "book", "exam", "dataset", "puzzles", "paper", "lecture", "website", "original"
    ]
    url: HttpUrl | None = None
    repo: HttpUrl | None = None
    license: Text = Field(description="SPDX id where possible, e.g. CC-BY-4.0, MIT, proprietary")
    license_url: HttpUrl | None = None
    usage: Literal["adapt", "reference", "original", "private"] = Field(
        description=(
            "adapt: may be imported/adapted with attribution; "
            "reference: cite only, write original questions; "
            "original: written for this repo; "
            "private: your own course materials, paraphrase only"
        )
    )
    pinned: str | None = Field(None, description="Upstream commit/revision used by the importer")
    covers: list[Slug] = Field([], description="Domains/topics this source is useful for")
    plan: str | None = Field(None, description="What we do / will do with it, by version")
    notes: str | None = None


class SourceRegistry(_Strict):
    schema_version: Literal[1] = 1
    sources: list[Source]
