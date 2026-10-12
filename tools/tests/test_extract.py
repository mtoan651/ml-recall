from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.backends.backend_pdf import PdfPages  # noqa: E402

from mlrecall.extract import _runs, color_name, extract_pdf, run, to_markdown  # noqa: E402


def _two_page_pdf(path: Path) -> None:
    """Page 1: black text. Page 2: a red answer line and a black line."""
    plt.rcParams["pdf.fonttype"] = 42  # TrueType: text stays extractable
    with PdfPages(path) as pdf:
        for lines in ([("Which layer learns features?", "black")],
                      [("(C) The hidden layers", "red"), ("Reason follows", "black")]):  # fmt: skip
            fig = plt.figure(figsize=(4, 2))
            for i, (text, color) in enumerate(lines):
                fig.text(0.1, 0.7 - 0.3 * i, text, color=color, fontsize=12)
            pdf.savefig(fig)
            plt.close(fig)


def test_color_names():
    assert color_name((1.0, 0.0, 0.0)) == "red"
    assert color_name((0.0, 0.0, 1.0)) == "blue"
    assert color_name((0.0, 0.6, 0.0)) == "green"
    assert color_name((0.0, 0.0, 0.0, 0.0)) is None  # CMYK white
    assert color_name((0.0, 1.0, 1.0, 0.0)) == "red"  # CMYK red
    for neutral in [0, 0.5, (0, 0, 0), (0.4, 0.4, 0.4), (1, 1, 1), None, "pattern"]:
        assert color_name(neutral) is None


def test_runs_wrap_coloured_text_and_keep_spaces_outside():
    pieces = [("A", None), (" ", None), ("r", "red"), ("e", "red"), (" ", None), ("d", "red")]
    pieces += [(" ", None), ("x", None)]
    assert _runs(pieces) == "A [red: re d] x"


def test_extract_pdf_pages_and_colors(tmp_path):
    pdf = tmp_path / "sheet.pdf"
    _two_page_pdf(pdf)
    plain = extract_pdf(pdf)
    assert len(plain) == 2
    assert "Which layer learns features?" in plain[0]
    assert "[red:" not in plain[1]
    coloured = extract_pdf(pdf, colors=True)
    assert "[red: (C) The hidden layers]" in coloured[1]
    assert "Reason follows" in coloured[1] and "[red: Reason" not in coloured[1]


def test_markdown_and_run(tmp_path, capsys):
    assert to_markdown("x.pdf", ["one", ""]) == (
        "# x.pdf\n\n## Page 1\n\none\n\n## Page 2\n\n_(no text)_\n"
    )
    folder = tmp_path / "in"
    folder.mkdir()
    _two_page_pdf(folder / "a.pdf")
    out = tmp_path / "out"
    assert run([folder], out=out) == 0
    text = (out / "a.md").read_text(encoding="utf-8")
    assert text.startswith("# a.pdf\n") and "## Page 2" in text
    assert run([tmp_path / "missing.txt"], out=out) == 1
    assert "not a PDF" in capsys.readouterr().out
