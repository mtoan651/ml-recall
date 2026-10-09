"""Command line entry point: `uv run mlr <command>`."""

from __future__ import annotations

import argparse
import json
import sys

from . import check, paths


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="mlr", description="ml-recall data tooling")
    sub = parser.add_subparsers(dest="command", required=True)

    p_check = sub.add_parser("check", help="validate the bank and print a quality report")
    p_check.add_argument("--strict", action="store_true", help="fail on warnings too")

    sub.add_parser("schema", help="export JSON Schemas to schema/")

    p_import = sub.add_parser("import", help="import questions from an upstream source")
    p_import.add_argument("source", help="source id, or 'all'")
    p_import.add_argument("--dry-run", action="store_true", help="report without writing")

    p_stats = sub.add_parser("stats", help="print bank statistics as a Markdown table")
    p_stats.add_argument("--topics", action="store_true", help="one row per topic")

    args = parser.parse_args(argv)
    if args.command == "check":
        return check.run(strict=args.strict)
    if args.command == "schema":
        return export_schemas()
    if args.command == "import":
        from .importers import run_import

        return run_import(args.source, dry_run=args.dry_run)
    if args.command == "stats":
        from .stats import markdown_table

        print(markdown_table(by_topic=args.topics))
        return 0
    return 2


def export_schemas() -> int:
    from .schema import QuizFile, SourceRegistry, Taxonomy

    paths.SCHEMA_DIR.mkdir(exist_ok=True)
    for name, model in [
        ("quiz", QuizFile),
        ("taxonomy", Taxonomy),
        ("sources", SourceRegistry),
    ]:
        out = paths.SCHEMA_DIR / f"{name}.schema.json"
        out.write_text(json.dumps(model.model_json_schema(), indent=2) + "\n", encoding="utf-8")
        print(f"wrote {out.relative_to(paths.ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
