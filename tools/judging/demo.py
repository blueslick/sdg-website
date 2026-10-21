#!/usr/bin/env python3
"""Run the whole toolkit on made-up data: 12 fake essays, 3 fake judges, one deliberate disagreement.

    python demo.py [folder]        (default: a new folder called demo-output/ next to this file)

Nothing here is real: the names are invented and the essays are filler text. The folder it
creates is for looking at; it is safe to delete.
"""
from __future__ import annotations

import random
import shutil
import sys
from pathlib import Path

import openpyxl
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen.canvas import Canvas

import judging
from sheets import SCORES_SHEET

FAKE_PEOPLE = [   # (name, school, country): all invented. Includes accents and a very long name.
    ("Aisyah Rahman", "Fake Secondary School A", "Malaysia"),
    ("Daniel Tan", "Fake Secondary School A", "Malaysia"),
    ("Priya Nair", "Fake College B", "India"),
    ("Chloé Dubois", "Fake Lycée C", "France"),
    ("Tomás Ibarra", "Fake Colegio D", "Chile"),
    ("Nur Aqilah binti Mohd Zulkifli", "Fake Secondary School E", "Malaysia"),
    ("Sofia Marquez-Fernandez de la Vega y Oliveira", "Fake Academy F", "Spain"),
    ("Kwame Mensah", "Fake High School G", "Ghana"),
    ("Lena Müller", "Fake Gymnasium H", "Germany"),
    ("Jun Hao Lim", "Fake Secondary School I", "Singapore"),
    ("Aaliyah O'Connor", "Fake College J", "Ireland"),
    ("Mateo Silva", "Fake Escola K", "Brazil"),
]
# How good each essay "really" is (1-10). ZH-004 is the one the judges will split on.
QUALITY = [6, 5, 8, 7, 3, 9, 4, 7, 6, 5, 8, 2]
JUDGES = ["A", "B", "C"]
FILLER = ("This is filler text standing in for an anonymised essay. " * 14).strip()


def make_inputs(root: Path) -> None:
    essays = root / "essays"
    essays.mkdir(parents=True, exist_ok=True)
    for i in range(1, len(FAKE_PEOPLE) + 1):
        c = Canvas(str(essays / f"ZH-{i:03d}.pdf"), pagesize=A4)
        c.setFont("Helvetica", 11)
        c.drawString(72, 780, f"Fake essay ZH-{i:03d}")
        text = c.beginText(72, 750)
        for j in range(0, len(FILLER), 90):
            text.textLine(FILLER[j:j + 90])
        c.drawText(text)
        c.save()
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Entry ID", "Name", "Email", "School", "Country"])
    for i, (name, school, country) in enumerate(FAKE_PEOPLE, start=1):
        ws.append([f"ZH-{i:03d}", name, f"fake{i}@example.invalid", school, country])
    wb.save(root / "key.xlsx")


def simulate_judges(sheets_dir: Path, returned_dir: Path, seed: int = 7) -> None:
    """Fill in the sheets the way judges would, including some deliberate mess."""
    rng = random.Random(seed)
    returned_dir.mkdir(parents=True, exist_ok=True)
    for path in sorted(sheets_dir.glob("scoring_*.xlsx")):
        wb = openpyxl.load_workbook(path)
        ws = wb[SCORES_SHEET]
        judge = path.stem.split("_", 1)[1]
        n_criteria = ws.max_column - 3
        for row in range(2, ws.max_row + 1):
            entry = ws.cell(row=row, column=1).value
            base = QUALITY[int(entry.split("-")[1]) - 1]
            for col in range(2, n_criteria + 2):
                ws.cell(row=row, column=col, value=max(1, min(10, base + rng.choice([-1, 0, 0, 1]))))
            ws.cell(row=row, column=n_criteria + 2, value=f"Judge {judge} note on {entry}")
            # Deliberate disagreement: A loves ZH-004, C is unimpressed.
            if entry == "ZH-004" and judge in ("A", "C"):
                for col in range(2, n_criteria + 2):
                    ws.cell(row=row, column=col, value=9 if judge == "A" else 3)
                ws.cell(row=row, column=n_criteria + 2,
                        value="Brilliant, original" if judge == "A" else "Off topic, thin on evidence")
            # Judge B's sheet is messy.
            if judge == "B":
                if entry == "ZH-009":                       # only two criteria filled
                    for col in range(4, n_criteria + 2):
                        ws.cell(row=row, column=col).value = None
                if entry == "ZH-011":                       # not scored at all
                    for col in range(2, n_criteria + 3):
                        ws.cell(row=row, column=col).value = None
                if entry == "ZH-007":                       # a pasted score that bypassed validation
                    ws.cell(row=row, column=3, value=11)
        wb.save(returned_dir / path.name)


def main(folder: str | None = None) -> int:
    root = Path(folder) if folder else Path(__file__).resolve().parent / "demo-output"
    if root.exists():
        shutil.rmtree(root)
    make_inputs(root)
    run = judging.main
    steps = [
        ["rubric"],
        ["sheets", "--judges", ",".join(JUDGES), "--essays", str(root / "essays"),
         "--out", str(root / "sheets")],
    ]
    for argv in steps:
        print(f"\n$ judging.py {' '.join(argv)}")
        if run(argv):
            return 1
    simulate_judges(root / "sheets", root / "returned")
    steps = [
        ["results", "--sheets", str(root / "returned"), "--key", str(root / "key.xlsx"),
         "--essays", str(root / "essays"), "--out", str(root / "results.xlsx")],
        ["certificates", "--results", str(root / "results.xlsx"), "--out", str(root / "certificates"),
         "--issued", "2026-10-21"],
    ]
    for argv in steps:
        print(f"\n$ judging.py {' '.join(argv)}")
        if run(argv):
            return 1
    print(f"\nDemo files are in {root}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else None))
