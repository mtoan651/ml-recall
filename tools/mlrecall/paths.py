from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "src" / "content"
QUIZZES = CONTENT / "quizzes"
TAXONOMY = CONTENT / "taxonomy.yaml"
SOURCES = CONTENT / "sources.yaml"
CURATION = ROOT / "tools" / "curation"
CACHE = ROOT / ".cache" / "upstream"
SCHEMA_DIR = ROOT / "schema"
