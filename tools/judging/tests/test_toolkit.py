"""End-to-end tests on fake data. Run from anywhere:  python -m unittest discover -s tools/judging/tests"""
from __future__ import annotations

import base64
import contextlib
import io
import json
import os
import shutil
import subprocess
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
from sealing import normalise_code, record_id, seal, unseal   # noqa: E402
from sheets import assign                     # noqa: E402

try:
    import pypdf
except ImportError:                           # PDF text checks are skipped without it
    pypdf = None


def find_site_root() -> Path | None:
    """A checkout of the real Pharos site (real tokens.json, `npm install` done), or None."""
    candidates = [os.environ.get("PHAROS_SITE_DIR"), str(Path(__file__).resolve().parents[3])]
    for c in filter(None, candidates):
        root = Path(c)
        try:
            ok = "plum" in (root / "tokens.json").read_text() and (root / "node_modules/@fontsource/gloock/files").is_dir()
        except OSError:
            ok = False
        if ok:
            return root
    return None


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
        self.assertNotIn("Chloe", json.dumps(self.sheet_rows("Disagreements"), default=str))   # IDs only

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

    # ---- certificates (need the real site's tokens.json and fonts, see site_root())

    @classmethod
    def site_root(cls) -> Path:
        root = find_site_root()
        if root is None:
            raise unittest.SkipTest("needs a Pharos site checkout with `npm install` done: set PHAROS_SITE_DIR")
        code, out = run("--repo-root", str(root), "setup-fonts")
        assert code == 0, out
        return root

    def issue(self, name: str, *extra: str) -> tuple[Path, dict, list]:
        root = self.site_root()
        out = self.root / name
        code, text = run("--repo-root", str(root), "certificates", "--results", str(self.results_path),
                         "--out", str(out), "--issued", "2026-10-21", *extra)
        self.assertEqual(code, 0, text)
        ledger = json.loads((out / "certificates-ledger.json").read_text(encoding="utf-8"))
        return out, ledger, json.loads((out / "certificates.json").read_text(encoding="utf-8"))

    def test_certificates_json_is_encrypted(self):
        out, ledger, records = self.issue("certs")
        self.assertEqual(len(records), 12)
        raw = (out / "certificates.json").read_text(encoding="utf-8")
        for person in ledger.values():                                 # no readable names or awards at all
            self.assertNotIn(person["name"], raw)
            self.assertNotIn(person["name"].split()[0], raw)
        self.assertNotIn("Winner", raw)
        for r in records:
            self.assertEqual(sorted(r), ["data", "id", "iv"])         # exactly this shape
            self.assertRegex(r["id"], r"^[0-9a-f]{64}$")
            self.assertEqual(len(base64.b64decode(r["iv"])), 12)
        self.assertEqual([r["id"] for r in records], sorted(r["id"] for r in records))   # order leaks no ranking

        codes = [p["code"] for p in ledger.values()]
        self.assertEqual(len(set(codes)), 12)
        for entry_id, p in ledger.items():
            self.assertRegex(p["code"], r"^PH-ZH-[A-HJ-NP-Z2-9]{4}$")
            opened = unseal(p["code"], next(r for r in records if r["id"] == record_id(p["code"])))
            self.assertEqual(opened, {"name": p["name"], "award": p["award"],
                                      "edition": "Inaugural Edition: Zero Hunger", "issued": "2026-10-21"})
            self.assertEqual(list(opened), ["name", "award", "edition", "issued"])
        # A code that is not on a certificate opens nothing, and a record will not open with another code.
        self.assertIsNone(unseal("PH-ZH-AAAA", records[0]))
        self.assertIsNone(unseal(codes[0], next(r for r in records if r["id"] != record_id(codes[0]))))
        awards = sorted(p["award"] for p in ledger.values())
        self.assertEqual([awards.count(a) for a in ("Winner", "Runner-up", "Highly Commended", "Participation")],
                         [1, 2, 5, 4])
        self.assertEqual(len(list(out.glob("*.pdf"))), 12)

    def test_rerun_keeps_codes_and_file(self):
        out, ledger, records = self.issue("certs_rerun")
        before = (out / "certificates.json").read_text()
        code, _ = run("--repo-root", str(self.site_root()), "certificates", "--results", str(self.results_path),
                      "--out", str(out), "--issued", "2030-01-01")
        self.assertEqual(code, 0)
        self.assertEqual((out / "certificates.json").read_text(), before)     # same records, same codes
        self.assertEqual(json.loads((out / "certificates-ledger.json").read_text()).keys(), ledger.keys())

    def test_longer_codes(self):
        config = self.root / "long.yaml"
        config.write_text((Path(__file__).resolve().parents[1] / "certificates.yaml").read_text().replace(
            "code_length: 4", "code_length: 8"))
        _, ledger, _ = self.issue("certs_long", "--config", str(config))
        for p in ledger.values():
            self.assertRegex(p["code"], r"^PH-ZH-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$")

    def test_pdf_content(self):
        out, ledger, _ = self.issue("certs_pdf")
        winner = next(p for p in ledger.values() if p["award"] == "Winner")
        self.assertEqual(winner["name"], "Nur Aqilah binti Mohd Zulkifli")
        if pypdf:
            text = pypdf.PdfReader(str(out / winner["file"])).pages[0].extract_text()
            for needed in (winner["code"], "Verify at https://pharos-prize.web.app/verify/",
                           winner["name"], "Winner", "21 October 2026"):
                self.assertIn(needed, text)

    @unittest.skipUnless(shutil.which("node"), "node not installed")
    def test_browser_code_opens_what_python_sealed(self):
        """Run the verify-page reference (WebCrypto under Node) against the real output."""
        _, ledger, _ = self.issue("certs_node")
        out = self.root / "certs_node"
        person = next(iter(ledger.values()))
        reference = str(Path(__file__).resolve().parents[1] / "verify-reference.mjs")
        sloppy = [person["code"], person["code"].lower(), person["code"].replace("-", " "),
                  person["code"].replace("-", "\u2013"), person["code"].replace("-", "\u2014") + "  "]
        for typed in sloppy:                                           # case, spaces, en and em dashes all match
            result = subprocess.run(["node", reference, str(out / "certificates.json"), typed],
                                    capture_output=True, text=True, check=True).stdout.strip()
            self.assertEqual(json.loads(result)["name"], person["name"], typed)
        nope = subprocess.run(["node", reference, str(out / "certificates.json"), "PH-ZH-AAAA"],
                              capture_output=True, text=True, check=True).stdout.strip()
        self.assertEqual(nope, "not found")

    def test_unsupported_characters_stop_everything(self):
        root = self.site_root()
        wb = openpyxl.load_workbook(self.results_path)
        ws = wb["Results"]
        ws.cell(2, 3).value = "李小龙"
        bad = self.root / "bad_results.xlsx"
        wb.save(bad)
        out = self.root / "bad_certs"
        code, text = run("--repo-root", str(root), "certificates", "--results", str(bad), "--out", str(out))
        self.assertEqual(code, 1)
        self.assertIn("English spelling", text)
        self.assertFalse(list(out.glob("*.pdf")) if out.exists() else [])


class Units(unittest.TestCase):
    def test_code_normalisation(self):
        for typed in ("PH-ZH-7K4Q", "ph-zh-7k4q", " ph zh 7k4q ", "PH\u2013ZH\u20147K4Q", "PH\u2212ZH\u20117K4Q", "PH\u00a0ZH-7K4Q"):
            self.assertEqual(normalise_code(typed), "PHZH7K4Q", repr(typed))
        self.assertEqual(record_id("ph-zh-7k4q"), record_id("PHZH7K4Q"))
        # Known answer, so the format cannot drift unnoticed: SHA-256 of the normalised code.
        self.assertEqual(record_id("PH-ZH-7K4Q"), "7f9d66353f1cebcf2e0c0b75af8cbc3c93bc02791b9613daf6dd8b21694e92b2")

    def test_seal_round_trip(self):
        payload = {"name": "Test Student", "award": "Winner", "edition": "Ed", "issued": "2026-10-21"}
        record = seal("PH-ZH-7K4Q", payload)
        self.assertEqual(unseal("ph zh 7k4q", record), payload)
        self.assertIsNone(unseal("PH-ZH-7K4R", record))
        self.assertNotEqual(seal("PH-ZH-7K4Q", payload)["iv"], record["iv"])   # fresh IV every time


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
