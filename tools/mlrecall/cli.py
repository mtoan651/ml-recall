"""Command line entry point: `uv run mlr <command>`."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

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

    p_figs = sub.add_parser("figs", help="re-render figures whose generator script changed")
    p_figs.add_argument("--force", action="store_true", help="re-render every figure")
    p_figs.add_argument("--check", action="store_true", help="list stale figures, render nothing")

    p_sync = sub.add_parser(
        "sync-curation", help="record bank edits of imported questions as curation fixes"
    )
    p_sync.add_argument("source", nargs="?", default="all", help="source id, or 'all'")
    p_sync.add_argument("--check", action="store_true", help="report differences, write nothing")

    p_extract = sub.add_parser(
        "extract", help="PDF → Markdown with page markers in .cache/extract/ (to write questions)"
    )
    p_extract.add_argument("paths", nargs="+", type=Path, help="PDF files or folders of PDFs")
    p_extract.add_argument("--out", type=Path, help="output folder (default .cache/extract/)")
    p_extract.add_argument("--colors", action="store_true", help="mark coloured text: [red: …]")

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
    if args.command == "figs":
        from .figs import run as render_figs

        return render_figs(force=args.force, check=args.check)
    if args.command == "sync-curation":
        from .curation_sync import run as sync_curation

        return sync_curation(args.source, check=args.check)
    if args.command == "extract":
        from .extract import run as extract

        return extract(args.paths, out=args.out, colors=args.colors)
    if args.command == "stats":
        from .stats import markdown_table

        print(markdown_table(by_topic=args.topics))
        return 0
    return 2


def export_schemas() -> int:
    from .schema import Note, QuizFile, SourceRegistry, Taxonomy

    paths.SCHEMA_DIR.mkdir(exist_ok=True)
    for name, model in [
        ("quiz", QuizFile),
        ("taxonomy", Taxonomy),
        ("sources", SourceRegistry),
        ("note", Note),
    ]:
        out = paths.SCHEMA_DIR / f"{name}.schema.json"
        out.write_text(json.dumps(model.model_json_schema(), indent=2) + "\n", encoding="utf-8")
        print(f"wrote {out.relative_to(paths.ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
