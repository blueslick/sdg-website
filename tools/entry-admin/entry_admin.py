#!/usr/bin/env python3
"""Entry-admin toolkit. Run `python entry_admin.py --help` or read README.md."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from entryadmin import codes, config, emails, pack, tracker
from entryadmin.config import ConfigError


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="entry_admin.py", description="Process competition entries from a Tally export.")
    p.add_argument("--config", help="path to a config.toml (default: the one next to this script)")
    sub = p.add_subparsers(dest="command", required=True)

    c = sub.add_parser("codes", help="fee-support codes")
    csub = c.add_subparsers(dest="codes_command", required=True)
    g = csub.add_parser("generate", help="make N new codes and add them to codes.xlsx")
    g.add_argument("n", type=int, metavar="N")

    pr = sub.add_parser("process", help="build or update tracker.xlsx from the Tally CSV")
    pr.add_argument("--csv", type=Path, help="the Tally export (default: from config.toml)")
    pr.add_argument("--files", type=Path, help="folder of downloaded files (default: from config.toml)")

    e = sub.add_parser("emails", help="write email drafts (nothing is sent)")
    e.add_argument("kind", nargs="?", default="all", choices=[*emails.KINDS, "all"])
    e.add_argument("--all", action="store_true", dest="redo_all", help="redo drafts already made before")
    e.add_argument("--only", nargs="+", metavar="ID", help="only these entry IDs, e.g. ZH-003")

    k = sub.add_parser("pack", help="copy confirmed essays into judging/ with anonymous names")
    k.add_argument("--files", type=Path, help="folder of downloaded files (default: from config.toml)")
    return p


def run(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        cfg = config.load(args.config)
        if args.command == "codes":
            if args.n < 1:
                raise ConfigError("N must be at least 1.")
            made = codes.generate(cfg.path("codes"), args.n, cfg["codes"]["length"], cfg["codes"]["group"])
            print(f"Added {len(made)} codes to {cfg.path('codes')}")
            for c in made:
                print("  " + c)
        elif args.command == "process":
            r = tracker.process(cfg, args.csv, args.files)
            for n in r["notes"]:
                print("Note:", n)
            print(f"{r['total']} entries in {r['path']}  ({len(r['new'])} new, {r['flagged']} with flags)")
            if r["new"]:
                print("New: " + ", ".join(r["new"]))
            for header, n in r["flag_counts"].items():
                if n:
                    print(f"  {header}: {n}")
        elif args.command == "emails":
            only = {i.upper() for i in args.only} if args.only else None
            for kind in (emails.KINDS if args.kind == "all" else [args.kind]):
                r = emails.make_drafts(cfg, kind, args.redo_all, only)
                for n in r["notes"]:
                    print("Note:", n)
                extra = f" ({r['skipped_already_drafted']} already drafted earlier; use --all to redo)" \
                    if r["skipped_already_drafted"] else ""
                print(f"{kind}: {len(r['made'])} drafts{extra}")
                if r["made"]:
                    print(f"  {r['dir'] / (kind + '_ALL.txt')}  (combined)  and {r['dir'] / kind}/<ID>.txt")
            print("Nothing has been sent. Read each draft, then send it yourself.")
        elif args.command == "pack":
            r = pack.pack(cfg, args.files)
            for w in r["warnings"]:
                print("Warning:", w)
            for f in r["removed"]:
                print("Removed (no longer confirmed):", f)
            print(f"Packed {len(r['packed'])} essays into {r['dir']}")
            print("PRIVATE: key.xlsx links IDs to people. Give judges the PDFs only, never key.xlsx.")
    except ConfigError as e:
        print(f"Problem: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(run())
