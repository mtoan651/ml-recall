import pytest
from pydantic import ValidationError

from mlrecall.check import POSITIONAL_OPTION_RE, _math_line_starts_block, _wrapped_display_math
from mlrecall.schema import Question, citation_markers


def make(**overrides):
    q = {
        "id": "cnn-001",
        "type": "single",
        "question": "Output shape?",
        "options": [{"text": "28", "correct": True}, {"text": "32"}],
        "source": {"id": "original", "ref": "cnn-001"},
        "status": "draft",
    }
    q.update(overrides)
    return Question.model_validate(q)


def test_minimal_single_choice_is_valid():
    assert make().type == "single"


def test_single_needs_exactly_one_correct():
    with pytest.raises(ValidationError, match="exactly one correct"):
        make(options=[{"text": "a", "correct": True}, {"text": "b", "correct": True}])


def test_multiple_allows_several_correct():
    make(type="multiple", options=[{"text": "a", "correct": True}, {"text": "b", "correct": True}])


def test_short_answer_needs_answer_and_no_options():
    answer = {"numeric": 28, "model": "$(32-5)/1+1 = 28$"}
    assert make(type="short_answer", options=None, answer=answer).answer.numeric == 28
    with pytest.raises(ValidationError, match="short_answer"):
        make(type="short_answer", answer=answer)  # still has options


def test_citation_must_match_a_reference():
    with pytest.raises(ValidationError, match=r"citation \[\^2\]"):
        make(explanation="See [^2].", references=[{"source": "d2l"}])


def test_reviewed_needs_cited_explanation():
    with pytest.raises(ValidationError, match="cited explanation"):
        make(status="reviewed", difficulty="easy", explanation="Because.")
    make(
        status="reviewed",
        difficulty="easy",
        explanation="Because [^1].",
        references=[{"source": "d2l", "locator": "Sec. 7.2"}],
    )


def test_citation_markers_ignore_code_and_math():
    assert citation_markers("x [^1] `a[^2]` $b[^3]$\n```\n[^4]\n```") == [1]


POSITIONAL = [
    "both of the above",
    "All of these",
    "a and b",
    "Both (a) and (b)",
    "either (a) or (b)",
]


@pytest.mark.parametrize("text", POSITIONAL)
def test_positional_options_detected(text):
    assert POSITIONAL_OPTION_RE.search(text)


@pytest.mark.parametrize("text", ["Bias increase ; Variance decrease", "Both text generation"])
def test_regular_options_not_flagged(text):
    assert not POSITIONAL_OPTION_RE.search(text)


def test_short_answer_pattern_is_auto_graded_and_matches_like_the_web_app():
    q = make(
        type="short_answer",
        options=None,
        answer={"pattern": r"\(?\s*5\s*[x×,*]\s*4\s*\)?", "accept": ["5x4"], "model": "5 × 4"},
    )
    assert q.answer.graded
    for text in ["5x4", " 5 × 4 ", "(5, 4)", "5X4", "５x４"]:
        assert q.answer.matches_pattern(text), text
    assert not q.answer.matches_pattern("4x5")


def test_pattern_must_compile_and_be_js_compatible():
    with pytest.raises(ValidationError, match="does not compile"):
        make(type="short_answer", options=None, answer={"pattern": "(", "model": "m"})
    with pytest.raises(ValidationError, match="JavaScript"):
        make(type="short_answer", options=None, answer={"pattern": r"(?P<n>\d+)", "model": "m"})
    with pytest.raises(ValidationError, match="JavaScript"):
        make(type="short_answer", options=None, answer={"pattern": r"\d{,3}", "model": "m"})


def test_pattern_uses_ascii_semantics_like_javascript():
    q = make(
        type="short_answer",
        options=None,
        answer={"pattern": r"\w+", "accept": ["abc"], "model": "m"},
    )
    assert q.answer.matches_pattern("ABC")
    assert not q.answer.matches_pattern("naïve")


def test_short_answers_are_auto_graded_never_open():
    with pytest.raises(ValidationError, match="auto-graded"):
        make(type="short_answer", options=None, answer={"model": "Explain it yourself"})
    q = make(type="short_answer", options=None, answer={"numeric": 21})
    assert [k.numeric for k in q.answer.inputs()] == [21]


def test_gap_fill_blanks_match_the_keys_in_reading_order():
    blanks = {"blanks": [{"accept": ["off"]}, {"accept": ["greedy", "max"]}]}
    q = make(type="short_answer", options=None, question="An {{1}}-policy, {{2}} target.",
             answer=blanks)  # fmt: skip
    assert [k.accept for k in q.answer.inputs()] == [["off"], ["greedy", "max"]]
    with pytest.raises(ValidationError, match="don't match"):
        make(type="short_answer", options=None, question="Only {{1}}.", answer=blanks)
    with pytest.raises(ValidationError, match="don't match"):
        make(type="short_answer", options=None, question="{{2}} then {{1}}.", answer=blanks)
    with pytest.raises(ValidationError, match="not inside code or math"):
        make(type="short_answer", options=None, question="`np.{{1}}` and {{2}}", answer=blanks)
    with pytest.raises(ValidationError, match="either `blanks`"):
        make(type="short_answer", options=None, question="{{1}} {{2}}",
             answer={**blanks, "accept": ["x"]})  # fmt: skip


def test_math_continuation_that_looks_like_a_list_item_is_flagged():
    assert _math_line_starts_block("$$a = b\n+ c$$")
    assert _math_line_starts_block("so $x = (a\n- b)$ holds")
    assert not _math_line_starts_block("$a$ and\n- a real list item")
    assert not _math_line_starts_block("$x = (14,\n6) = y$")  # "6)" cannot interrupt a paragraph


def test_display_math_that_wraps_mid_paragraph_is_flagged():
    assert _wrapped_display_math("kernel\n$$K = a +\nb.$$\nWhich map?")
    assert not _wrapped_display_math("$$\nK = a +\nb\n$$")  # fenced on its own lines
    assert not _wrapped_display_math("so $$K = a + b$$ holds")
