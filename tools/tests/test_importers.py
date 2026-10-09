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
