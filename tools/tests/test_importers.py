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
