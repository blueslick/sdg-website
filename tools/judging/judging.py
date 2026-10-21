#!/usr/bin/env python3
"""Judging toolkit for the essay competition.

    python judging.py rubric                      create / check rubric.yaml
    python judging.py sheets --judges "A,B,C"     one scoring sheet per judge
    python judging.py results                     rank the returned sheets -> results.xlsx
    python judging.py certificates                PDF certificates + certificates.json

Run any command with --help for its options. See README.md for the full workflow.
"""
from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

from common import JudgingError, TOOL_DIR, Tokens, find_repo_root, list_essays, read_key
from rubric import DEFAULT_PATH as RUBRIC_PATH, describe, load_rubric, placeholder_warning, write_default

DATA = TOOL_DIR / "data"


def _tokens(args) -> Tokens:
    return Tokens(Path(args.repo_root) if args.repo_root else find_repo_root())


def _soft_tokens(args) -> Tokens | None:
    """Tokens for cosmetic colours in Excel files; the command still works without them."""
    try:
        return _tokens(args)
    except JudgingError:
        return None


def cmd_rubric(args) -> None:
    path = Path(args.file)
    if write_default(path, force=args.force):
        print(f"Created {path} with PLACEHOLDER criteria. Open it in a text editor to change them.\n")
    rubric = load_rubric(path)
    print(describe(rubric))
    note = placeholder_warning(rubric)
    if note:
        print("\n" + note)


def cmd_sheets(args) -> None:
    from sheets import make_sheets, parse_judges
    rubric = load_rubric(Path(args.rubric))
    judges = parse_judges(args.judges)
    essays = list_essays(Path(args.essays))
    out = Path(args.out)
    plan = make_sheets(sorted(essays), judges, rubric, out, _soft_tokens(args), args.per_essay, args.seed)
    print(f"Made {len(plan)} scoring sheets in {out}")
    for judge, ids in plan.items():
        print(f"  {judge}: {len(ids)} essays")
    note = placeholder_warning(rubric)
    if note:
        print("\n" + note)


def cmd_results(args) -> None:
    from results import compute, write_results
    rubric = load_rubric(Path(args.rubric))
    key = read_key(Path(args.key))
    essays_dir = Path(args.essays)
    essay_ids = set(list_essays(essays_dir)) if essays_dir.is_dir() else None
    outcome = compute(Path(args.sheets), rubric, args.margin, set(key), essay_ids, Path(args.assignments))
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_results(outcome, rubric, key, out, _soft_tokens(args))

    ranked = sum(1 for e in outcome.entries.values() if e.rank is not None)
    by_type: dict[str, int] = {}
    for flag in outcome.flags:
        by_type[flag["type"]] = by_type.get(flag["type"], 0) + 1
    print(f"Wrote {out}: {len(outcome.entries)} essays, {ranked} ranked, judges: {', '.join(outcome.judges)}")
    if by_type:
        print("Flags to review (see the Flags sheet):")
        for kind, n in sorted(by_type.items()):
            print(f"  {n:3d}  {kind}")
    else:
        print("No flags.")
    note = placeholder_warning(rubric)
    if note:
        print("\n" + note)
    print("\nresults.xlsx contains names. Keep it private.")


def cmd_certificates(args) -> None:
    from certificates import issue_certificates
    issued = date.fromisoformat(args.issued) if args.issued else date.today()
    records = issue_certificates(Path(args.results), Path(args.config), Path(args.out),
                                 Path(args.json_out) if args.json_out else None,
                                 _tokens(args), issued, args.allow_missing_glyphs)
    counts: dict[str, int] = {}
    for r in records:
        counts[r["award"]] = counts.get(r["award"], 0) + 1
    out = Path(args.out)
    print(f"Wrote {len(records)} certificates to {out}: "
          + ", ".join(f"{n} {a}" for a, n in counts.items()))
    print(f"Wrote {Path(args.json_out) if args.json_out else out / 'certificates.json'} for the verify page.")
    print("certificates.json lists real names. Publish it only once entrants (or parents of entrants under 18) have agreed.")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="judging.py", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--repo-root", help="Folder holding tokens.json and fonts/ (found automatically by default)")
    sub = p.add_subparsers(dest="command", required=True)

    r = sub.add_parser("rubric", help="Create rubric.yaml if missing, then validate and show it")
    r.add_argument("--file", default=str(RUBRIC_PATH))
    r.add_argument("--force", action="store_true", help="Overwrite an existing rubric.yaml with the placeholder one")
    r.set_defaults(func=cmd_rubric)

    s = sub.add_parser("sheets", help="Make one Excel scoring sheet per judge")
    s.add_argument("--judges", required=True, help='Comma-separated judge names, e.g. "A,B,C"')
    s.add_argument("--essays", default=str(DATA / "essays"), help="Folder of anonymised essays named ZH-001.pdf ...")
    s.add_argument("--rubric", default=str(RUBRIC_PATH))
    s.add_argument("--out", default=str(DATA / "sheets"), help="Where to write the sheets")
    s.add_argument("--per-essay", type=int, metavar="K",
                   help="Give each essay to only K judges (default: every judge scores every essay)")
    s.add_argument("--seed", type=int, help="Make the --per-essay assignment repeatable")
    s.set_defaults(func=cmd_sheets)

    x = sub.add_parser("results", help="Combine returned sheets into a ranked results.xlsx")
    x.add_argument("--sheets", default=str(DATA / "returned"), help="Folder of returned scoring sheets")
    x.add_argument("--key", default=str(DATA / "key.xlsx"), help="Private key: entry ID, name, email, school, country")
    x.add_argument("--essays", default=str(DATA / "essays"), help="Optional: lets results spot essays nobody scored")
    x.add_argument("--assignments", default=str(DATA / "sheets" / "assignments.json"),
                   help="Written by `sheets`; lets results notice a judge who never returned a sheet")
    x.add_argument("--rubric", default=str(RUBRIC_PATH))
    x.add_argument("--margin", type=float, help="Flag essays whose judges differ by more than this (default: from rubric.yaml)")
    x.add_argument("--out", default=str(DATA / "results.xlsx"))
    x.set_defaults(func=cmd_results)

    c = sub.add_parser("certificates", help="Make PDF certificates and certificates.json")
    c.add_argument("--results", default=str(DATA / "results.xlsx"))
    c.add_argument("--config", default=str(TOOL_DIR / "certificates.yaml"))
    c.add_argument("--out", default=str(DATA / "certificates"))
    c.add_argument("--json-out", help="Where to write certificates.json (default: inside --out)")
    c.add_argument("--issued", metavar="YYYY-MM-DD", help="Issue date for new certificates (default: today)")
    c.add_argument("--allow-missing-glyphs", action="store_true",
                   help="Print names even if the fonts lack some characters")
    c.set_defaults(func=cmd_certificates)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        args.func(args)
    except JudgingError as err:
        print(f"\nProblem: {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
