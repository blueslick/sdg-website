"""End-to-end tests on fake data. Run from anywhere:  python -m unittest discover -s tools/judging/tests"""
from __future__ import annotations

import contextlib
import io
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import demo                                   # noqa: E402
import judging                                # noqa: E402
from certificates import Award, award_for     # noqa: E402
from common import JudgingError               # noqa: E402
from rubric import load_rubric, write_default  # noqa: E402
from sheets import assign                     # noqa: E402

try:
    import pypdf
except ImportError:                           # PDF text checks are skipped without it
    pypdf = None


def run(*argv: str) -> tuple[int, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = judging.main(list(argv))
    return code, out.getvalue() + err.getvalue()


class Pipeline(unittest.TestCase):
    """Fake essays -> 3 fake judges (with a deliberate disagreement) -> results -> certificates."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.tmp.name)
        demo.make_inputs(cls.root)
        cls.rubric_path = cls.root / "rubric.yaml"          # private copy: editing the real rubric can't break tests
        write_default(cls.rubric_path)
        code, out = run("sheets", "--judges", "A,B,C", "--essays", str(cls.root / "essays"),
                        "--out", str(cls.root / "sheets"), "--rubric", str(cls.rubric_path))
        assert code == 0, out
        demo.simulate_judges(cls.root / "sheets", cls.root / "returned")
        cls.results_path = cls.root / "results.xlsx"
        code, cls.results_out = run("results", "--sheets", str(cls.root / "returned"),
                                    "--key", str(cls.root / "key.xlsx"),
                                    "--essays", str(cls.root / "essays"), "--out", str(cls.results_path),
                                    "--rubric", str(cls.rubric_path))
        assert code == 0, cls.results_out

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def sheet_rows(self, name: str) -> list[tuple]:
        return list(openpyxl.load_workbook(self.results_path)[name].iter_rows(values_only=True))

    # ---- sheets

    def test_sheets_have_validation_and_no_names(self):
        files = sorted((self.root / "sheets").glob("scoring_*.xlsx"))
        self.assertEqual([f.name for f in files], ["scoring_A.xlsx", "scoring_B.xlsx", "scoring_C.xlsx"])
        wb = openpyxl.load_workbook(files[0])
        ws = wb["Scores"]
        self.assertEqual(ws.cell(1, 1).value, "Entry ID")
        self.assertEqual(ws.cell(1, ws.max_column - 1).value, "Comments")
        self.assertEqual(ws.max_row, 13)                                  # header + 12 entries
        dv = ws.data_validations.dataValidation[0]
        self.assertEqual((dv.type, dv.operator, dv.formula1, dv.formula2), ("whole", "between", "1", "10"))
        self.assertIn("B2:F13", str(dv.sqref))
        self.assertEqual(dv.errorStyle, "stop")
        key_values = {str(c) for row in openpyxl.load_workbook(self.root / "key.xlsx").active.iter_rows(min_row=2, values_only=True)
                      for c in row[1:]}
        for f in files:                                                    # nothing from the key leaks in
            for sheet in openpyxl.load_workbook(f):
                for row in sheet.iter_rows(values_only=True):
                    for cell in row:
                        self.assertNotIn(str(cell), key_values)

    # ---- results

    def test_ranking_and_names(self):
        rows = self.sheet_rows("Results")
        header = rows[0]
        by_id = {r[header.index("Entry ID")]: dict(zip(header, r)) for r in rows[1:]}
        self.assertEqual(by_id["ZH-006"]["Rank"], 1)                       # best essay wins
        self.assertEqual(by_id["ZH-012"]["Rank"], 12)
        self.assertEqual(by_id["ZH-006"]["Name"], "Nur Aqilah binti Mohd Zulkifli")
        averages = [r["Average"] for r in sorted(by_id.values(), key=lambda r: r["Rank"])]
        self.assertEqual(averages, sorted(averages, reverse=True))

    def test_weighted_total(self):
        rubric = load_rubric(self.rubric_path)
        scores = {c.id: s for c, s in zip(rubric.criteria, (10, 5, 5, 5, 1))}
        # weights 3,2,2,2,1 -> (30+10+10+10+1)/10 = 6.1
        self.assertAlmostEqual(rubric.weighted_total(scores), 6.1)

    def test_deliberate_disagreement_is_flagged(self):
        flags = [r for r in self.sheet_rows("Flags")[1:] if r[0] == "Disagreement"]
        self.assertEqual([f[1] for f in flags], ["ZH-004"])
        self.assertIn("A 9.00 vs C 3.00", flags[0][3])
        detail = [r for r in self.sheet_rows("Disagreements")[1:] if r[0] == "ZH-004"]
        self.assertEqual({r[1] for r in detail}, {"A", "B", "C"})
        self.assertNotIn("Chloé", json.dumps(self.sheet_rows("Disagreements"), default=str))   # IDs only

    def test_incomplete_and_invalid_are_flagged(self):
        flags = {(r[0], r[1], r[2]) for r in self.sheet_rows("Flags")[1:]}
        self.assertIn(("Incomplete sheet", "ZH-009", "B"), flags)         # half filled
        self.assertIn(("Incomplete sheet", "ZH-011", "B"), flags)         # blank
        self.assertIn(("Invalid score", "ZH-007", "B"), flags)            # typed 11
        by_id = {r[1]: r for r in self.sheet_rows("Results")[1:]}
        self.assertEqual(by_id["ZH-011"][6], "2 of 3")                    # B's row excluded from average

    def test_margin_option_changes_flags(self):
        out = self.root / "wide.xlsx"
        code, _ = run("results", "--sheets", str(self.root / "returned"), "--key", str(self.root / "key.xlsx"),
                      "--margin", "7", "--out", str(out), "--rubric", str(self.rubric_path))
        self.assertEqual(code, 0)
        types = [r[0] for r in openpyxl.load_workbook(out)["Flags"].iter_rows(min_row=2, values_only=True)]
        self.assertNotIn("Disagreement", types)

    def test_missing_judge_sheet_is_flagged(self):
        only_ab = self.root / "only_ab"
        only_ab.mkdir()
        for name in ("scoring_A.xlsx", "scoring_B.xlsx"):
            (only_ab / name).write_bytes((self.root / "returned" / name).read_bytes())
        (only_ab / "assignments.json").write_text((self.root / "sheets" / "assignments.json").read_text())
        out = self.root / "ab.xlsx"
        code, _ = run("results", "--sheets", str(only_ab), "--key", str(self.root / "key.xlsx"),
                      "--rubric", str(self.rubric_path), "--out", str(out))
        self.assertEqual(code, 0)
        flags = [r for r in openpyxl.load_workbook(out)["Flags"].iter_rows(min_row=2, values_only=True)]
        self.assertIn(("Missing sheet", None, "C"), {(r[0], r[1] or None, r[2]) for r in flags})

    # ---- certificates

    def test_certificates(self):
        out = self.root / "certs"
        code, text = run("certificates", "--results", str(self.results_path), "--out", str(out),
                         "--issued", "2026-10-21")
        self.assertEqual(code, 0, text)
        records = json.loads((out / "certificates.json").read_text(encoding="utf-8"))
        self.assertEqual(len(records), 12)
        for r in records:
            self.assertEqual(list(r), ["code", "name", "award", "edition", "issued"])   # exact shape and order
            self.assertRegex(r["code"], r"^PH-ZH-[A-HJ-NP-Z2-9]{4}$")
            self.assertEqual(r["edition"], "Inaugural Edition: Zero Hunger")
            self.assertEqual(r["issued"], "2026-10-21")
        self.assertEqual(len({r["code"] for r in records}), 12)                       # unique
        awards = [r["award"] for r in records]
        self.assertEqual((awards.count("Winner"), awards.count("Runner-up"),
                          awards.count("Highly Commended"), awards.count("Participation")), (1, 2, 5, 4))
        self.assertEqual(len(list(out.glob("*.pdf"))), 12)

        # Re-running keeps the codes, so certificates already sent stay valid.
        code, _ = run("certificates", "--results", str(self.results_path), "--out", str(out), "--issued", "2030-01-01")
        self.assertEqual(code, 0)
        again = json.loads((out / "certificates.json").read_text(encoding="utf-8"))
        self.assertEqual(again, records)

        if pypdf:
            winner = next(r for r in records if r["award"] == "Winner")
            pdf = next(out.glob(f"*{winner['code']}.pdf"))
            text = pypdf.PdfReader(str(pdf)).pages[0].extract_text()
            for needed in (winner["code"], "Verify at [site]/verify/", winner["name"], "Winner"):
                self.assertIn(needed, text)

    def test_unsupported_characters_stop_everything(self):
        wb = openpyxl.load_workbook(self.results_path)
        ws = wb["Results"]
        ws.cell(2, 3).value = "李小龙"
        bad = self.root / "bad_results.xlsx"
        wb.save(bad)
        out = self.root / "bad_certs"
        code, text = run("certificates", "--results", str(bad), "--out", str(out))
        self.assertEqual(code, 1)
        self.assertIn("cannot show", text)
        self.assertFalse(list(out.glob("*.pdf")) if out.exists() else [])


class Units(unittest.TestCase):
    def test_per_essay_assignment_is_balanced(self):
        ids = [f"ZH-{i:03d}" for i in range(1, 13)]
        plan = assign(ids, ["A", "B", "C"], per_essay=2, seed=1)
        for entry in ids:
            self.assertEqual(sum(entry in v for v in plan.values()), 2)
        sizes = [len(v) for v in plan.values()]
        self.assertLessEqual(max(sizes) - min(sizes), 1)
        self.assertEqual(plan, assign(ids, ["A", "B", "C"], per_essay=2, seed=1))      # repeatable
        self.assertEqual(assign(ids, ["A", "B", "C"], None, None)["B"], ids)           # default: everyone

    def test_awards_by_rank_with_ties(self):
        tiers = (Award("Winner", "", 1), Award("Runner-up", "", 2), Award("Participation", "", None))
        pick = lambda rank: award_for(rank, tiers).name
        self.assertEqual([pick(r) for r in (1, 2, 3, 4, None)],
                         ["Winner", "Runner-up", "Runner-up", "Participation", "Participation"])

    def test_bad_rubric_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "rubric.yaml"
            path.write_text("criteria:\n  - {id: a, name: A, weight: 0}\n")
            with self.assertRaises(JudgingError):
                load_rubric(path)


if __name__ == "__main__":
    unittest.main()
