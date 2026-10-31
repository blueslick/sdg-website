#!/usr/bin/env python3
"""Try the whole toolkit on made-up data. Nothing here is real.

    python demo.py [folder]            (default: demo-output/ next to this file; safe to delete)
    python demo.py --dev-site          also let `npm run dev` show the demo codes on /verify/
    python demo.py --write-site        also write the demo list to src/data/certificates.json (see below)

All the names are fake ("Test Student 01" ...), the emails end in .invalid, and the essays are filler text.
It plays the part of you: it triages 18 fake essays (8 Junior, 10 Open), fills in marks, adds a
second-reader spot check, then "chooses" 2 winners and 4 more shortlisted entrants (marked in the output as
simulated choices) and makes their certificates. Real use never chooses for you.

--write-site changes a tracked file. Only use it on a throwaway branch to look at a pull request's preview
page, and never merge it: put the file back with  git checkout src/data/certificates.json
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

import openpyxl
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen.canvas import Canvas

import judging
from common import find_repo_root
from rubric import load_rubric
from sheet import SCORES_SHEET

# (entry ID, name, category) : all invented. IDs 001-008 are Junior, 009-018 are Open.
FAKE = [(f"ZH-{i:03d}", f"Test Student {i:02d}", "Junior" if i <= 8 else "Open") for i in range(1, 19)]

# What "you" decide for each essay: (triage, marks for the four criteria or None, second reader or None).
# Marks are out of 30, 30, 20, 20. ZH-004 and ZH-005 tie on 77; ZH-014 has a mark missing;
# ZH-007 gets "Read again"; ZH-018 is left untriaged.
CHOICES = {
    "ZH-001": ("Strong", (27, 26, 18, 17), None),
    "ZH-002": ("Strong", (25, 27, 17, 18), None),
    "ZH-003": ("Strong", (22, 25, 16, 17), None),
    "ZH-004": ("Maybe", (23, 21, 17, 16), None),
    "ZH-005": ("Maybe", (21, 22, 18, 16), None),
    "ZH-006": ("Clearly no", None, "Agree"),
    "ZH-007": ("Clearly no", None, "Read again"),
    "ZH-008": ("Clearly no", None, None),
    "ZH-009": ("Strong", (28, 28, 19, 19), None),
    "ZH-010": ("Strong", (26, 25, 18, 19), None),
    "ZH-011": ("Strong", (24, 26, 17, 16), None),
    "ZH-012": ("Maybe", (21, 20, 15, 14), None),
    "ZH-013": ("Maybe", (19, 18, 14, 13), None),
    "ZH-014": ("Maybe", (20, 19, 14, None), None),
    "ZH-015": ("Clearly no", None, "Agree"),
    "ZH-016": ("Clearly no", None, "Agree"),
    "ZH-017": ("Clearly no", None, None),
    "ZH-018": (None, None, None),
}
# The simulated owner's choices (a real owner types these into results.xlsx himself).
WINNERS = {"ZH-001", "ZH-009"}                    # one Junior, one Open
SHORTLISTED = WINNERS | {"ZH-002", "ZH-003", "ZH-010", "ZH-011"}   # winners are shortlisted too: 4 more
FILLER = ("This is filler text standing in for an anonymised essay. It is not real. " * 12).strip()


def make_inputs(root: Path) -> None:
    essays = root / "essays"
    essays.mkdir(parents=True, exist_ok=True)
    for entry_id, name, _ in FAKE:
        c = Canvas(str(essays / f"{entry_id}.pdf"), pagesize=A4)
        c.setFont("Helvetica", 11)
        c.drawString(72, 780, f"FAKE essay {entry_id} (demo only)")
        text = c.beginText(72, 750)
        for j in range(0, len(FILLER), 90):
            text.textLine(FILLER[j:j + 90])
        c.drawText(text)
        c.save()
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Entry ID", "Name", "Email", "School", "Country", "Category"])
    for i, (entry_id, name, category) in enumerate(FAKE, start=1):
        ws.append([entry_id, name, f"test{i:02d}@example.invalid", f"Fake School {chr(64 + (i % 5) + 1)}", "Testland", category])
    wb.save(root / "key.xlsx")


def fill_in_scoring(path: Path) -> None:
    """Do what you would do in Excel: triage, marks, second reader."""
    wb = openpyxl.load_workbook(path)
    ws = wb[SCORES_SHEET]
    n = len(load_rubric().criteria)
    for row in range(2, ws.max_row + 1):
        entry_id = ws.cell(row=row, column=1).value
        triage, marks, second = CHOICES[entry_id]
        ws.cell(row=row, column=2, value=triage)
        for i in range(n):
            ws.cell(row=row, column=3 + i, value=marks[i] if marks else None)
        ws.cell(row=row, column=4 + n, value=f"Demo note on {entry_id}" if marks else None)
        ws.cell(row=row, column=5 + n, value=second)
    wb.save(path)


def choose_winners_and_shortlist(path: Path) -> None:
    """Do what you would do in Excel: type yes into the Shortlist and Winner columns (simulated choices)."""
    wb = openpyxl.load_workbook(path)
    for category in ("Junior", "Open"):
        ws = wb[category]
        header = [str(c.value or "").lower() for c in ws[1]]
        i_short = next(i for i, h in enumerate(header) if h.startswith("shortlist")) + 1
        i_win = next(i for i, h in enumerate(header) if h.startswith("winner")) + 1
        for row in range(2, ws.max_row + 1):
            entry_id = ws.cell(row=row, column=2).value
            ws.cell(row=row, column=i_short, value="yes" if entry_id in SHORTLISTED else "no")
            ws.cell(row=row, column=i_win, value="yes" if entry_id in WINNERS else "no")
    wb.save(path)


def main(argv: list[str]) -> int:
    flags = {a for a in argv if a.startswith("--")}
    folders = [a for a in argv if not a.startswith("--")]
    root = Path(folders[0]) if folders else Path(__file__).resolve().parent / "demo-output"
    if root.exists():
        shutil.rmtree(root)
    make_inputs(root)
    repo = find_repo_root()

    def step(*args: str) -> int:
        print(f"\n$ judging.py {' '.join(args)}")
        return judging.main(list(args))

    if step("rubric") or step("sheet", "--essays", str(root / "essays"), "--out", str(root / "scoring.xlsx")):
        return 1
    fill_in_scoring(root / "scoring.xlsx")
    print("\n(simulated: you triaged all 18 essays and gave marks to the Maybe and Strong ones)")
    if step("results", "--scores", str(root / "scoring.xlsx"), "--key", str(root / "key.xlsx"),
            "--essays", str(root / "essays"), "--out", str(root / "results.xlsx")):
        return 1
    choose_winners_and_shortlist(root / "results.xlsx")
    print("\n(simulated: you typed yes into Winner for ZH-001 and ZH-009, and into Shortlist for those two and four more)")
    if step("setup-fonts"):
        return 1
    cert = ["certificates", "--results", str(root / "results.xlsx"), "--out", str(root / "out"), "--issued", "2027-02-03"]
    if "--write-site" in flags:
        cert.append("--write-site")
    if step(*cert):
        return 1

    # --dev-site: git-ignored file that only `npm run dev` reads; the build never does.
    encrypted = (repo / "src/data/certificates.json") if "--write-site" in flags else root / "out" / "certificates.json"
    if "--dev-site" in flags:
        shutil.copyfile(encrypted, repo / "src/data/certificates.example.json")
        print("\nCopied the demo list to src/data/certificates.example.json (git-ignored). Run `npm run dev` and use /verify/.")
    import json
    ledger = json.loads((root / "out" / "certificate-codes.json").read_text(encoding="utf-8"))
    print("\nDemo certificates (FAKE people). Type any code on /verify/ to see it:")
    for entry_id, rec in sorted(ledger.items()):
        print(f"  {rec['code']}   {rec['award']:<20} {rec['name']}")
    print(f"\nAll the demo files are in {root}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
