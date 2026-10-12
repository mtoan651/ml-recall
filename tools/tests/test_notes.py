from pathlib import Path

import pytest

from mlrecall import notes, paths

FRONT = """---
topic: cnn
summary: Convolutional networks share small filters across positions.
status: reviewed
reviewed_by: claude
references:
  - source: d2l
    url: https://d2l.ai/chapter_convolutional-neural-networks/conv-layer.html
    locator: Sec. 7.2
  - title: 'Wikipedia: Convolutional neural network'
    url: https://en.wikipedia.org/wiki/Convolutional_neural_network
---
"""
PROSE = "A kernel slides over the image and shares its weights across positions. " * 40
BODY = f"""## Key ideas

{PROSE}[^1]

## In code

```python
# not a heading
x = 1
```

## Common pitfalls

- Padding does not change the number of channels [^2].
"""


def _write(root: Path, rel: str, text: str) -> Path:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def test_valid_note(tmp_path, monkeypatch):
    monkeypatch.setattr(paths, "NOTES", tmp_path)
    monkeypatch.setattr(paths, "ROOT", tmp_path)
    _write(tmp_path, "dl/cnn.md", FRONT + BODY)
    errors, warnings = notes.check_notes({"cnn": ("dl", "CNN")}, {"d2l"})
    assert errors == []
    assert warnings == []


def test_path_topic_and_sources(tmp_path, monkeypatch):
    monkeypatch.setattr(paths, "NOTES", tmp_path)
    monkeypatch.setattr(paths, "ROOT", tmp_path)
    _write(tmp_path, "cv/cnn.md", FRONT + BODY)
    errors, _ = notes.check_notes({"cnn": ("dl", "CNN")}, set())
    assert any("not in taxonomy domain 'cv'" in e for e in errors)
    assert any("unknown source 'd2l'" in e for e in errors)


@pytest.mark.parametrize(
    ("body", "expected"),
    [
        (BODY.replace("## Common pitfalls", "## Pitfalls"), "is not one of"),
        (BODY.replace("## Key ideas", "### Key ideas"), "use `## ` section headings only"),
        (BODY.replace("[^2]", "[^3]"), "[^3] has no reference"),
        (BODY.replace("[^2]", ""), "reference 2 is never cited"),
        (BODY + "\nCost is $5.\n", "unbalanced `$`"),
        (BODY + "\nUse <b>bold</b>.\n", "raw HTML"),
        (BODY.replace("## In code", "## Common pitfalls\n\n- x\n\n## In code"), "in the order"),
    ],
)
def test_body_problems(body, expected):
    errors, _ = notes.body_problems(body, 2)
    assert any(expected in e for e in errors), errors


def test_front_matter_errors(tmp_path):
    missing = _write(tmp_path, "a.md", BODY)
    assert "no YAML front matter" in (notes.load_note(missing).error or "")
    unreviewed = _write(tmp_path, "b.md", FRONT.replace("reviewed_by: claude\n", "") + BODY)
    assert "reviewed_by" in (notes.load_note(unreviewed).error or "")
    one_ref = FRONT.split("  - title:")[0] + "---\n" + BODY
    assert "references" in (notes.load_note(_write(tmp_path, "c.md", one_ref)).error or "")


def test_short_note_warns():
    body = "## Key ideas\n\nShort [^1].\n\n## Common pitfalls\n\n- x\n"
    _, warnings = notes.body_problems(body, 1)
    assert any("words of prose" in w for w in warnings)
