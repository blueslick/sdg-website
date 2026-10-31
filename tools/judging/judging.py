#!/usr/bin/env python3
"""Judging toolkit for the essay competition. One judge: you score every shortlisted essay yourself.

    python judging.py rubric          show rubric.yaml (the 4 criteria and their marks, out of 100)
    python judging.py sheet           make the scoring sheet (data/scoring.xlsx) from the essays folder
    python judging.py results         add up your marks -> data/results.xlsx (Junior and Open ranked separately)
    python judging.py setup-fonts     one-off: convert the site's fonts for the certificate PDFs
    python judging.py certificates    PDF certificates + the encrypted list for the verify page

Everything runs on your own computer. No AI or LLM is used anywhere: scoring is by people only.
Run any command with --help for its options. See README.md for the full workflow.
"""
from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

from common import DATA_DIR, JudgingError, Tokens, find_repo_root, list_essays, read_key
from rubric import DEFAULT_PATH as RUBRIC_PATH, describe, load_rubric, placeholder_warning

SITE_JSON = Path("src") / "data" / "certificates.json"


def _tokens(args) -> Tokens:
    return Tokens(Path(args.repo_root) if args.repo_root else find_repo_root())


def _soft_tokens(args) -> Tokens | None:
    """Tokens for cosmetic colours in Excel files; the command still works without them."""
    try:
        return _tokens(args)
    except JudgingError:
        return None


def _warn_placeholder(rubric) -> None:
    note = placeholder_warning(rubric)
    if note:
        print("\n" + note)


def cmd_rubric(args) -> None:
    rubric = load_rubric(Path(args.file))
    print(describe(rubric))
    _warn_placeholder(rubric)


def cmd_sheet(args) -> None:
    from sheet import make_sheet
    rubric = load_rubric(Path(args.rubric))
    essays = list_essays(Path(args.essays))
    out = Path(args.out)
    make_sheet(list(essays), rubric, out, _soft_tokens(args), args.force)
    print(f"Made {out} with {len(essays)} essays. Open it in Excel, triage every essay, and give marks to the Maybe and Strong ones.")
    _warn_placeholder(rubric)


def cmd_results(args) -> None:
    from results import compute, read_picks, write_results
    from sheet import TRIAGE
    rubric = load_rubric(Path(args.rubric))
    key = read_key(Path(args.key))
    essays_dir = Path(args.essays)
    outcome = compute(Path(args.scores), rubric, key, set(list_essays(essays_dir)) if essays_dir.is_dir() else None)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    picks = read_picks(out)
    if out.exists():                                   # keep a copy, and keep the owner's yes/no choices
        out.replace(out.with_name(out.stem + ".previous.xlsx"))
    write_results(outcome, rubric, key, out, _soft_tokens(args), picks)

    for category in ("Junior", "Open"):
        rows = outcome.ranked(category)
        print(f"{category}: {len(rows)} ranked")
    counts = {t: sum(1 for e in outcome.essays.values() if e.triage == t) for t in TRIAGE}
    print("Triage: " + ", ".join(f"{n} {t}" for t, n in counts.items())
          + f", {sum(1 for e in outcome.essays.values() if not e.triage)} not triaged")
    kept = sum(1 for p in picks.values() if p["shortlist"] or p["winner"])
    if kept:
        print(f"Kept your Shortlist/Winner choices from the previous results.xlsx ({kept} entries).")
    by_type: dict[str, int] = {}
    for flag in outcome.flags:
        by_type[flag["type"]] = by_type.get(flag["type"], 0) + 1
    if by_type:
        print("Flags to look at (see the Flags sheet):")
        for kind, n in sorted(by_type.items()):
            print(f"  {n:3d}  {kind}")
    print(f"\nWrote {out}. Now fill in the Shortlist and Winner columns yourself. results.xlsx contains names: keep it private.")
    _warn_placeholder(rubric)


def cmd_certificates(args) -> None:
    from certificates import EDITION, issue_certificates
    tokens = _tokens(args)
    issued = date.fromisoformat(args.issued) if args.issued else date.today()
    out = Path(args.out)
    site_json = tokens.root / SITE_JSON if args.write_site else None
    summary = issue_certificates(Path(args.results), tokens, out, site_json, issued, args.edition or EDITION,
                                 args.allow_missing_glyphs)
    counts: dict[str, int] = {}
    for item in summary:
        counts[item["award"]] = counts.get(item["award"], 0) + 1
    print(f"Wrote {len(summary)} certificates to {out / 'pdfs'}: " + ", ".join(f"{n} {a}" for a, n in sorted(counts.items())))
    if site_json:
        print(f"Wrote the encrypted list to {site_json} (--write-site). That file is public once it is merged: "
              "it holds encrypted records only. Commit it on a branch and open a pull request.")
    else:
        print(f"Wrote the encrypted list to {out / 'certificates.json'}. The site does not use it until you run this again with --write-site.")
    print(f"The private list of names and codes is {out / 'certificate-codes.json'}: it stays in data/.")


def cmd_setup_fonts(args) -> None:
    from fontkit import FONT_DIR, setup_fonts
    written = setup_fonts(_tokens(args))
    print(f"Converted {len(written)} fonts into {FONT_DIR} (git-ignored; never commit font files):")
    for path in written:
        print(f"  {path.name}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="judging.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--repo-root", help="The site folder (holds tokens.json, src/ and scripts/). Found automatically by default.")
    sub = p.add_subparsers(dest="command", required=True)

    r = sub.add_parser("rubric", help="Validate and show rubric.yaml")
    r.add_argument("--file", default=str(RUBRIC_PATH))
    r.set_defaults(func=cmd_rubric)

    s = sub.add_parser("sheet", help="Make the scoring sheet")
    s.add_argument("--essays", default=str(DATA_DIR / "essays"), help="Folder of anonymised essays named ZH-001.pdf ...")
    s.add_argument("--rubric", default=str(RUBRIC_PATH))
    s.add_argument("--out", default=str(DATA_DIR / "scoring.xlsx"))
    s.add_argument("--force", action="store_true", help="Overwrite an existing scoring sheet (it may hold your scores!)")
    s.set_defaults(func=cmd_sheet)

    x = sub.add_parser("results", help="Add up the marks and rank Junior and Open separately")
    x.add_argument("--scores", default=str(DATA_DIR / "scoring.xlsx"), help="Your filled-in scoring sheet")
    x.add_argument("--key", default=str(DATA_DIR / "key.xlsx"), help="Private key: Entry ID, Name, Category (Junior/Open), School, Country")
    x.add_argument("--essays", default=str(DATA_DIR / "essays"), help="Optional: lets results spot essays missing from the sheet")
    x.add_argument("--rubric", default=str(RUBRIC_PATH))
    x.add_argument("--out", default=str(DATA_DIR / "results.xlsx"))
    x.set_defaults(func=cmd_results)

    f = sub.add_parser("setup-fonts", help="One-off setup: convert the site's Fontsource fonts to TTF for the PDFs")
    f.set_defaults(func=cmd_setup_fonts)

    c = sub.add_parser("certificates", help="Make PDF certificates and the encrypted list of records")
    c.add_argument("--results", default=str(DATA_DIR / "results.xlsx"), help="results.xlsx with your Shortlist and Winner choices")
    c.add_argument("--out", default=str(DATA_DIR / "out"), help="Where the PDFs, certificates.json and the private code list go")
    c.add_argument("--write-site", action="store_true",
                   help="Write the encrypted list to where the site reads it (src/data/certificates.json) instead of into --out.")
    c.add_argument("--issued", metavar="YYYY-MM-DD", help="Issue date for new certificates (default: today)")
    c.add_argument("--edition", help="Edition wording (default: Inaugural Edition: Zero Hunger)")
    c.add_argument("--allow-missing-glyphs", action="store_true", help="Print names even if the fonts lack some characters")
    c.set_defaults(func=cmd_certificates)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        args.func(args)
    except (JudgingError, ValueError) as err:
        print(f"\nProblem: {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
