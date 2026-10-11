from mlrecall.importers import common, hf_course, mmlu_redux


def test_html_to_md_escapes_tag_like_text_but_not_code():
    assert common.html_to_md("This &#60;mask> works") == r"This \<mask> works"
    assert common.html_to_md("<code>&lt;s&gt;</code> token") == "`<s>` token"


def test_js_object_literal_choices_parse():
    js = """
        { text: "A", explain: "say \\"hi\\"", },
        { text: "B", correct: true }
    """
    assert hf_course._js_to_json(js) == [
        {"text": "A", "explain": 'say "hi"'},
        {"text": "B", "correct": True},
    ]


def test_mmlu_statement_questions_are_split():
    q = mmlu_redux._question("Statement 1| A is true. Statement 2| B is false.")
    assert q.endswith("**Statement 1.** A is true.\n\n**Statement 2.** B is false.")


def test_mmlu_texttt_becomes_code():
    assert mmlu_redux._clean(r"\texttt{torch.randn(2)}") == "`torch.randn(2)`"


def _item(ref, flag=None):
    options = [{"text": "a", "correct": True}, {"text": "b"}]
    return common.Item(ref=ref, topic="ml-basics", data={"options": options}, flag=flag)


def test_curate_drops_fixes_and_respects_flags(monkeypatch):
    curation = {
        "exclude_prefixes": {"skip/": "tool-specific"},
        "items": {
            "x/1": {"drop": "trivial"},
            "x/2": {"topic": "svm", "fix": {"correct": [1]}},
        },
    }
    monkeypatch.setattr(common, "load_curation", lambda _: curation)
    items = [
        _item("x/1"),
        _item("x/2", flag="wrong_groundtruth"),
        _item("x/3", "bad"),
        _item("skip/1"),
    ]
    kept, dropped = common.curate("demo", items)
    assert [i.ref for i in kept] == ["x/2"]
    assert kept[0].topic == "svm"
    assert [o.get("correct") for o in kept[0].data["options"]] == [False, True]
    assert dropped == {"trivial": 1, "upstream-error (bad)": 1, "tool-specific": 1}


def test_hf_units_parses_choices_and_solutions():
    from mlrecall.importers import hf_units

    mdx = """
### Q1: What is a policy?

<details>
<summary>Solution</summary>

The function that maps states to actions.
<img src="x.png"/>
</details>

### Q2: Pick the value-based method

<img src="loop.jpg" alt="loop"/>

<Question
	choices={[
		{ text: "Q-Learning", explain: "", correct: true },
		{ text: "REINFORCE", explain: "Policy-based." },
	]}
/>
"""
    (n1, q1, img1), (n2, q2, img2) = hf_units._parse(mdx)
    assert (n1, q1["type"], img1) == (1, "short_answer", True)
    assert q1["answer"]["model"] == "The function that maps states to actions."
    assert (n2, q2["type"], img2) == (2, "single", True)
    assert "<img" not in q2["question"]
    assert [o["why"] for o in q2["options"]] == [None, "Policy-based."]


def test_mmlu_dollars_escaped_outside_latex_subsets():
    assert mmlu_redux._clean("costs $5 and $7", latex=False) == r"costs \$5 and \$7"
    assert mmlu_redux._clean("$x^2$") == "$x^2$"


def test_curation_keep_list_and_flag_override(monkeypatch):
    curation = {
        "default_drop": "off-scope",
        "exclude_prefixes": {"group/": "tool-specific"},
        "items": {"a/1": {}, "group/2": {"topic": "svm"}, "img/3": {"keep": True}},
    }
    monkeypatch.setattr(common, "load_curation", lambda _: curation)
    items = [
        _item("a/1"),
        _item("a/9"),
        _item("group/2"),
        _item("group/5"),
        _item("img/3", "image"),
    ]
    kept, dropped = common.curate("demo", items)
    assert [i.ref for i in kept] == ["a/1", "group/2", "img/3"]
    assert dropped == {"off-scope": 1, "tool-specific": 1}


def test_google_ml_parses_multiple_choice_with_feedback_and_math():
    from bs4 import BeautifulSoup

    from mlrecall.importers import google_ml

    html = """
    <devsite-multiple-choice preserve-order>
      <div>1. Which is the recall for
        5 TP and 2 FN?</div>
      <div correct>
        <div>\\(\\frac{5}{7}\\)</div><div>Recall is TP over all actual positives.</div>
      </div>
      <div>
        <div>0.455</div><div>See <a href="/machine-learning/glossary#recall">recall</a>.</div>
      </div>
    </devsite-multiple-choice>
    """
    block = BeautifulSoup(html, "html.parser").find("devsite-multiple-choice")
    google_ml._absolute_links(block, "https://developers.google.com/x")
    data, flag = google_ml._parse(block)
    assert flag is None
    assert data["question"] == "Which is the recall for 5 TP and 2 FN?"
    assert data["shuffle"] is False
    assert data["options"][0] == {"text": r"$\frac{5}{7}$", "correct": True, "why": None}
    assert data["explanation"] == "Recall is TP over all actual positives."
    link = "https://developers.google.com/machine-learning/glossary#recall"
    assert link in data["options"][1]["why"]


def test_numpy_100_reads_keyed_blocks(monkeypatch, tmp_path):
    from mlrecall.importers import numpy_100

    ktx = tmp_path / "exercises100.ktx"
    ktx.write_text(
        "< q3\nCreate a null vector of size 10 (★☆☆)\n\n< h3\nhint: np.zeros\n\n"
        "< a3\nZ = np.zeros(10)\nprint(Z)\n\n< q4\nNo answer (★★☆)\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(numpy_100, "fetch", lambda *a: ktx)
    [item] = numpy_100.load_items("sha")
    assert item.ref == "q3" and item.topic == "numpy"
    assert item.data["difficulty"] == "easy"
    assert item.data["question"] == "Create a null vector of size 10"
    assert item.data["answer"]["model"] == "```python\nZ = np.zeros(10)\nprint(Z)\n```"


def test_curation_fix_can_replace_or_remove_option_feedback():
    item = _item("x/1")
    item.data["options"][1]["why"] = "Review the page and try again."
    common._apply_fix(item, {"why": {1: None}})
    assert item.data["options"][1]["why"] is None


def test_curation_fix_turns_an_open_question_into_a_gap_fill_or_a_choice():
    item = common.Item(
        ref="x/1",
        topic="ml-basics",
        data={"type": "short_answer", "question": "What is x?", "answer": {"model": "long"}},
    )
    common._apply_fix(item, {"question": "x is {{1}}", "answer": {"blanks": [{"accept": ["y"]}]}})
    assert item.data["answer"] == {"model": "long", "blanks": [{"accept": ["y"]}]}

    common._apply_fix(
        item,
        {
            "type": "single",
            "answer": None,
            "options": [{"text": "y", "correct": True}, {"text": "z"}],
        },
    )
    assert "answer" not in item.data
    assert [o["text"] for o in item.data["options"]] == ["y", "z"]


def test_sync_curation_options_fix():
    from mlrecall.curation_sync import _options_fix

    base = [{"text": "a", "correct": True}, {"text": "b", "why": "old"}]
    want = [{"text": "a", "correct": True}, {"text": "B", "why": "new"}]
    assert _options_fix(base, want) == {"options": {1: "B"}, "why": {1: "new"}}
    assert _options_fix(base, [{"text": "a"}, {"text": "b", "correct": True}])["correct"] == [1]
    assert _options_fix(base, base[:1] + base + [{"text": "c"}]) == {
        "options": base[:1] + base + [{"text": "c"}]
    }


def test_fix_references_replace():
    from mlrecall.importers.common import Item, _apply_fix

    item = Item(ref="r", topic="t", data={"references": [{"title": "upstream"}]})
    _apply_fix(item, {"references": [{"title": "extra"}]})
    assert [r["title"] for r in item.data["references"]] == ["upstream", "extra"]
    _apply_fix(item, {"references": [{"title": "only"}], "references_replace": True})
    assert [r["title"] for r in item.data["references"]] == ["only"]
