import matplotlib.pyplot as plt
import numpy as np
import pytest

from mlrecall import figs, figstyle


def test_roc_with_auc_hits_the_target_and_stays_monotone():
    fpr = [0, 0.1, 0.3, 0.6, 1]
    tpr = [0, 0.5, 0.8, 0.95, 1]
    blended = figstyle.roc_with_auc(fpr, tpr, 0.7)
    assert figstyle.auc(fpr, blended) == pytest.approx(0.7)
    assert np.all(np.diff(blended) >= 0)
    with pytest.raises(ValueError, match="further from 0.5"):
        figstyle.roc_with_auc(fpr, tpr, 0.95)  # would need λ > 1


def test_auc_label_keeps_one_decimal():
    assert figstyle._auc_label(1.0) == "1.0"
    assert figstyle._auc_label(0.5) == "0.5"
    assert figstyle._auc_label(0.508) == "0.508"


def test_save_is_deterministic(tmp_path):
    script = tmp_path / "demo-001.py"
    outputs = []
    for _ in range(2):
        fig, ax = plt.subplots(figsize=(2, 2))
        ax.plot([0, 1], [0, 1])
        outputs.append(figstyle.save(fig, str(script)).read_bytes())
    assert outputs[0] == outputs[1]
    assert (tmp_path / "demo-001.svg").exists()


def test_generators_skip_helper_modules(tmp_path, monkeypatch):
    topic = tmp_path / "ml" / "metrics"
    topic.mkdir(parents=True)
    for name in ["metrics-014.py", "roc_shapes.py", "notes.txt"]:
        (topic / name).write_text("")
    monkeypatch.setattr(figs.paths, "QUIZZES", tmp_path)
    assert [p.name for p in figs.generators()] == ["metrics-014.py"]
    assert figs.stale(topic / "metrics-014.py")  # no SVG yet
