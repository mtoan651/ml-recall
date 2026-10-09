"""Importers for Microsoft's "ML for Beginners" and "AI for Beginners" pre/post-lecture quizzes."""

from __future__ import annotations

import json
import re
from collections.abc import Iterator

from .common import Item, collapse_ws, fetch

# quiz-pair index (1-based, = ceil(quiz id / 2)) -> (lesson folder, default topic)
ML_LESSONS = {
    1: ("1-Introduction/1-intro-to-ML", "ml-basics"),
    2: ("1-Introduction/2-history-of-ML", "ai-intro"),
    3: ("1-Introduction/3-fairness", "ai-ethics"),
    4: ("1-Introduction/4-techniques-of-ML", "ml-basics"),
    5: ("2-Regression/1-Tools", "ml-basics"),
    6: ("2-Regression/2-Data", "data-prep"),
    7: ("2-Regression/3-Linear", "linear-regression"),
    8: ("2-Regression/4-Logistic", "logistic-regression"),
    9: ("3-Web-App/1-Web-App", "ml-basics"),
    10: ("4-Classification/1-Introduction", "classification"),
    11: ("4-Classification/2-Classifiers-1", "classification"),
    12: ("4-Classification/3-Classifiers-2", "classification"),
    13: ("4-Classification/4-Applied", "classification"),
    14: ("5-Clustering/1-Visualize", "clustering"),
    15: ("5-Clustering/2-K-Means", "clustering"),
    16: ("6-NLP/1-Introduction-to-NLP", "nlp-basics"),
    17: ("6-NLP/2-Tasks", "nlp-basics"),
    18: ("6-NLP/3-Translation-Sentiment", "nlp-basics"),
    19: ("6-NLP/4-Hotel-Reviews-1", "nlp-basics"),
    20: ("6-NLP/5-Hotel-Reviews-2", "nlp-basics"),
    21: ("7-TimeSeries/1-Introduction", "time-series"),
    22: ("7-TimeSeries/2-ARIMA", "time-series"),
    23: ("8-Reinforcement/1-QLearning", "rl-basics"),
    24: ("8-Reinforcement/2-Gym", "rl-basics"),
    25: ("9-Real-World/1-Applications", "ml-basics"),
    26: ("7-TimeSeries/3-SVR", "time-series"),
}

# lesson number (= quiz id % 100) -> (lesson folder, default topic)
AI_LESSONS = {
    1: ("lessons/1-Intro", "ai-intro"),
    2: ("lessons/2-Symbolic", "knowledge-rep"),
    3: ("lessons/3-NeuralNetworks/03-Perceptron", "neural-networks"),
    4: ("lessons/3-NeuralNetworks/04-OwnFramework", "neural-networks"),
    5: ("lessons/3-NeuralNetworks/05-Frameworks", "frameworks"),
    6: ("lessons/4-ComputerVision/06-IntroCV", "cv-basics"),
    7: ("lessons/4-ComputerVision/07-ConvNets", "cnn"),
    8: ("lessons/4-ComputerVision/08-TransferLearning", "transfer-learning"),
    9: ("lessons/4-ComputerVision/09-Autoencoders", "autoencoders"),
    10: ("lessons/4-ComputerVision/10-GANs", "gans"),
    11: ("lessons/4-ComputerVision/11-ObjectDetection", "object-detection"),
    12: ("lessons/4-ComputerVision/12-Segmentation", "segmentation"),
    13: ("lessons/5-NLP/13-TextRep", "text-representation"),
    14: ("lessons/5-NLP/14-Embeddings", "text-representation"),
    15: ("lessons/5-NLP/15-LanguageModeling", "language-models"),
    16: ("lessons/5-NLP/16-RNN", "rnn"),
    17: ("lessons/5-NLP/17-GenerativeNetworks", "rnn"),
    18: ("lessons/5-NLP/18-Transformers", "transformers"),
    19: ("lessons/5-NLP/19-NER", "nlp-tasks"),
    20: ("lessons/5-NLP/20-LangModels", "llm-basics"),
    21: ("lessons/6-Other/21-GeneticAlgorithms", "genetic-algorithms"),
    22: ("lessons/6-Other/22-DeepRL", "rl-basics"),
    23: ("lessons/6-Other/23-MultiagentSystems", "multi-agent"),
    24: ("lessons/7-Ethics", "ai-ethics"),
}

_QUIZ_SUFFIX_RE = re.compile(r":\s*(pre|post)[- ]?(lecture )?[- ]?quiz\s*$", re.IGNORECASE)


def load_ml(pinned: str) -> list[Item]:
    repo = "microsoft/ML-For-Beginners"
    path = "quiz-app/src/assets/translations/en.json"
    doc = json.loads(
        fetch("ms-ml-for-beginners", pinned, "en.json", _raw(repo, pinned, path)).read_text()
    )
    quizzes = (doc[0] if isinstance(doc, list) else doc)["quizzes"]
    lesson_of = lambda qid: ML_LESSONS[(qid + 1) // 2]  # noqa: E731
    return list(_items("ms-ml-for-beginners", repo, pinned, path, quizzes, lesson_of))


def load_ai(pinned: str) -> list[Item]:
    repo = "microsoft/AI-For-Beginners"
    items = []
    for n in sorted(AI_LESSONS):
        path = f"etc/quiz-app/src/assets/translations/en/lesson-{n}.json"
        doc = json.loads(
            fetch(
                "ms-ai-for-beginners", pinned, f"lesson-{n}.json", _raw(repo, pinned, path)
            ).read_text()
        )
        quizzes = [q for block in doc for q in block["quizzes"]]
        items += _items(
            "ms-ai-for-beginners", repo, pinned, path, quizzes, lambda qid: AI_LESSONS[qid % 100]
        )
    return items


def _raw(repo: str, pinned: str, path: str) -> str:
    return f"https://raw.githubusercontent.com/{repo}/{pinned}/{path}"


def _items(source_id, repo, pinned, quiz_path, quizzes, lesson_of) -> Iterator[Item]:
    for quiz in quizzes:
        folder, topic = lesson_of(int(quiz["id"]))
        lesson_title = _QUIZ_SUFFIX_RE.sub("", quiz["title"]).strip()
        reference = {
            "source": source_id,
            "locator": f"Lesson: {lesson_title}",
            "url": f"https://github.com/{repo}/blob/{pinned}/{folder}/README.md",
        }
        for i, q in enumerate(quiz["quiz"], start=1):
            options = [
                {"text": _clean(o["answerText"]), "correct": str(o["isCorrect"]).lower() == "true"}
                for o in q["answerOptions"]
            ]
            is_tf = sorted(o["text"].lower() for o in options) == ["false", "true"]
            yield Item(
                ref=f"quiz-{quiz['id']}/q{i}",
                topic=topic,
                data={
                    "type": "true_false" if is_tf else "single",
                    "question": _clean(q["questionText"]),
                    "options": options,
                    "references": [dict(reference)],
                },
                url=f"https://github.com/{repo}/blob/{pinned}/{quiz_path}",
            )


def _clean(text: str) -> str:
    text = collapse_ws(re.sub(r"[ \t]+", " ", text))
    return text[0].upper() + text[1:] if text in ("true", "false") else text
