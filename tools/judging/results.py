"""Read the returned scoring sheets and write a ranked results.xlsx.

Names are joined from key.xlsx here and nowhere else.
"""
from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from common import JudgingError, Tokens, normalise_id
from rubric import Rubric
from sheets import ASSIGNMENTS_FILE, META_SHEET, SCORES_SHEET

STATUS_RANKED = "Ranked"
STATUS_UNRANKED = "Not ranked (no complete scores)"
STATUS_NOT_JUDGED = "Not judged (not on any scoring sheet)"


@dataclass
class JudgeRow:
    scores: dict[str, float]          # valid scores only, by criterion id
    comment: str
    total: float | None               # weighted total, only when every criterion is scored


@dataclass
class Entry:
    entry_id: str
    judges_assigned: list[str] = field(default_factory=list)
    rows: dict[str, JudgeRow] = field(default_factory=dict)   # by judge
    rank: int | None = None
    status: str = STATUS_NOT_JUDGED

    @property
    def totals(self) -> dict[str, float]:
        return {j: r.total for j, r in self.rows.items() if r.total is not None}

    @property
    def average(self) -> float | None:
        t = list(self.totals.values())
        return sum(t) / len(t) if t else None

    @property
    def spread(self) -> float | None:
        t = list(self.totals.values())
        return max(t) - min(t) if len(t) >= 2 else None


@dataclass
class Outcome:
    entries: dict[str, Entry]
    judges: list[str]
    flags: list[dict[str, str]]
    margin: float


# --------------------------------------------------------------------------- reading

def _read_score(value: object, rubric: Rubric) -> tuple[float | None, str | None]:
    """Return (score, problem). A blank cell is (None, None)."""
    if value is None or (isinstance(value, str) and not value.strip()):
        return None, None
    try:
        number = float(str(value).strip()) if isinstance(value, str) else float(value)
    except (TypeError, ValueError):
        return None, f"'{value}' is not a number"
    if not rubric.scale_min <= number <= rubric.scale_max:
        return None, f"{number:g} is outside {rubric.scale_min}-{rubric.scale_max}"
    if rubric.integer_only and number != int(number):
        return None, f"{number:g} is not a whole number"
    return number, None


def _read_sheet(path: Path, rubric: Rubric, entries: dict[str, Entry],
                flags: list[dict[str, str]]) -> str | None:
    """Read one judge's workbook into `entries`. Returns the judge name, or None if not a sheet."""
    wb = openpyxl.load_workbook(path, data_only=True)
    if META_SHEET not in wb.sheetnames or SCORES_SHEET not in wb.sheetnames:
        print(f"Note: skipped {path.name} (not a scoring sheet made by this toolkit)")
        return None
    meta = json.loads(wb[META_SHEET]["A1"].value)
    judge = meta["judge"]
    if sorted(meta["criteria"]) != sorted(c.id for c in rubric.criteria):
        raise JudgingError(
            f"{path.name} was made with different criteria from the current rubric.yaml "
            f"(sheet: {', '.join(meta['criteria'])}). Either restore rubric.yaml or remake the sheets."
        )
    ws = wb[SCORES_SHEET]
    by_id = {c.id: c for c in rubric.criteria}
    n = len(meta["criteria"])
    seen: set[str] = set()
    for row in ws.iter_rows(min_row=2, values_only=True):
        entry_id = normalise_id(row[0])
        if not entry_id:
            continue
        if entry_id not in meta["entries"]:
            flags.append({"type": "Unexpected row", "entry": entry_id, "judge": judge,
                          "detail": "Row is not one of this judge's assigned essays; ignored."})
            continue
        seen.add(entry_id)
        scores: dict[str, float] = {}
        for cid, cell in zip(meta["criteria"], row[1:n + 1]):
            score, problem = _read_score(cell, rubric)
            if problem:
                flags.append({"type": "Invalid score", "entry": entry_id, "judge": judge,
                              "detail": f"{by_id[cid].name}: {problem}; treated as blank."})
            elif score is not None:
                scores[cid] = score
        comment = str(row[n + 1]).strip() if len(row) > n + 1 and row[n + 1] else ""
        total = rubric.weighted_total(scores) if len(scores) == n else None
        entries.setdefault(entry_id, Entry(entry_id)).rows[judge] = JudgeRow(scores, comment, total)
        if len(scores) == 0:
            flags.append({"type": "Incomplete sheet", "entry": entry_id, "judge": judge,
                          "detail": "Not scored at all."})
        elif len(scores) < n:
            missing = [c.name for c in rubric.criteria if c.id not in scores]
            flags.append({"type": "Incomplete sheet", "entry": entry_id, "judge": judge,
                          "detail": f"Missing: {', '.join(missing)}. Excluded from the average."})
    for entry_id in meta["entries"]:
        entries.setdefault(entry_id, Entry(entry_id))
        if entry_id not in seen:
            flags.append({"type": "Incomplete sheet", "entry": entry_id, "judge": judge,
                          "detail": "Row was deleted from the sheet."})
    return judge


def compute(sheets_dir: Path, rubric: Rubric, margin: float | None = None,
            key_ids: set[str] | None = None, essay_ids: set[str] | None = None,
            assignments: Path | None = None) -> Outcome:
    if not sheets_dir.is_dir():
        raise JudgingError(f"Returned-sheets folder not found: {sheets_dir}")
    margin = rubric.margin if margin is None else margin
    entries: dict[str, Entry] = {}
    flags: list[dict[str, str]] = []
    judge_files: dict[str, Path] = {}

    for path in sorted(sheets_dir.glob("*.xlsx")):
        if path.name.startswith("~$"):
            continue
        judge = _read_sheet(path, rubric, entries, flags)
        if judge is None:
            continue
        if judge in judge_files:
            raise JudgingError(f"Two returned sheets are for judge '{judge}': "
                               f"{judge_files[judge].name} and {path.name}. Remove one.")
        judge_files[judge] = path
    if not judge_files:
        raise JudgingError(f"No scoring sheets found in {sheets_dir}")
    judges = list(judge_files)

    # Judges who were given sheets but never sent one back.
    plan_path = next((p for p in (assignments, sheets_dir / ASSIGNMENTS_FILE) if p and p.is_file()), None)
    plan: dict[str, list[str]] = json.loads(plan_path.read_text()) if plan_path else {}
    for judge, ids in plan.items():
        if judge not in judge_files:
            flags.append({"type": "Missing sheet", "entry": "", "judge": judge,
                          "detail": f"No returned sheet from {judge} ({len(ids)} essays)."})
            judges.append(judge)
            for entry_id in ids:
                entries.setdefault(entry_id, Entry(entry_id))

    for judge, ids in plan.items():
        for entry_id in ids:
            entries.setdefault(entry_id, Entry(entry_id)).judges_assigned.append(judge)
    for entry in entries.values():           # sheets without an assignments file
        for judge in entry.rows:
            if judge not in entry.judges_assigned:
                entry.judges_assigned.append(judge)

    # Essays and key rows that never reached the judges.
    for entry_id in sorted((essay_ids or set()) - entries.keys()):
        entries[entry_id] = Entry(entry_id)
        flags.append({"type": "Not judged", "entry": entry_id, "judge": "",
                      "detail": "Essay file exists but is not on any scoring sheet."})
    for entry_id in sorted((key_ids or set()) - entries.keys()):
        if essay_ids is not None and entry_id not in essay_ids:
            flags.append({"type": "No essay", "entry": entry_id, "judge": "",
                          "detail": "Listed in key.xlsx but there is no essay file."})
            continue
        entries[entry_id] = Entry(entry_id)
        flags.append({"type": "Not judged", "entry": entry_id, "judge": "",
                      "detail": "In key.xlsx but not on any scoring sheet."})
    if key_ids is not None:
        for entry_id in sorted(entries.keys() - key_ids):
            flags.append({"type": "Not in key", "entry": entry_id, "judge": "",
                          "detail": "No matching row in key.xlsx, so no name can be shown."})

    # Averages, disagreement, ranking.
    ranked = [e for e in entries.values() if e.average is not None]
    ranked.sort(key=lambda e: (-round(e.average, 6), e.entry_id))
    previous: Entry | None = None
    for position, entry in enumerate(ranked, start=1):
        tied = previous is not None and round(previous.average, 6) == round(entry.average, 6)
        entry.rank = previous.rank if tied else position
        if tied:
            flags.append({"type": "Tie", "entry": entry.entry_id, "judge": "",
                          "detail": f"Same average as {previous.entry_id}; both ranked {entry.rank}."})
        entry.status = STATUS_RANKED
        previous = entry
    for entry in entries.values():
        if entry.rows and entry.average is None:
            entry.status = STATUS_UNRANKED
        if entry.average is None and entry.judges_assigned:
            flags.append({"type": "Unranked", "entry": entry.entry_id, "judge": "",
                          "detail": "No judge completed every criterion for this essay."})
        if entry.spread is not None and entry.spread > margin:
            lo = min(entry.totals, key=entry.totals.get)
            hi = max(entry.totals, key=entry.totals.get)
            flags.append({"type": "Disagreement", "entry": entry.entry_id, "judge": "",
                          "detail": f"Judges differ by {entry.spread:.2f} (margin {margin:g}): "
                                    f"{hi} {entry.totals[hi]:.2f} vs {lo} {entry.totals[lo]:.2f}."})
        got, expected = len(entry.totals), len(entry.judges_assigned)
        if entry.average is not None and got < expected:
            flags.append({"type": "Fewer judges", "entry": entry.entry_id, "judge": "",
                          "detail": f"Average uses {got} of {expected} judges."})
    return Outcome(entries, judges, flags, margin)


# --------------------------------------------------------------------------- writing

def write_results(outcome: Outcome, rubric: Rubric, key: dict[str, dict[str, str]] | None,
                  path: Path, tokens: Tokens | None) -> None:
    def colour(name: str, fallback: str) -> str:
        return (tokens.color(name) if tokens else fallback).lstrip("#")

    head_fill = PatternFill("solid", fgColor=colour("paper-2", "E8E3D7"))
    head_font = Font(bold=True, color=colour("ink", "111111"))
    warn_fill = PatternFill("solid", fgColor=colour("peach", "F3B48F"))

    def style_header(ws, widths: list[int]) -> None:
        for cell in ws[1]:
            cell.font, cell.fill = head_font, head_fill
            cell.alignment = Alignment(wrap_text=True, vertical="center")
        for i, width in enumerate(widths, start=1):
            ws.column_dimensions[get_column_letter(i)].width = width
        ws.freeze_panes = "A2"

    flags_by_entry: dict[str, list[str]] = defaultdict(list)
    for flag in outcome.flags:
        if flag["entry"]:
            flags_by_entry[flag["entry"]].append(flag["type"])

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Results"
    ws.append(["Rank", "Entry ID", "Name", "School", "Country", "Average", "Judges scored",
               *[f"Judge {j}" for j in outcome.judges], "Spread", "Flags", "Status"])
    order = sorted(outcome.entries.values(),
                   key=lambda e: (e.rank is None, e.rank or 0, e.entry_id))
    for e in order:
        who = (key or {}).get(e.entry_id, {})
        flag_text = "; ".join(dict.fromkeys(flags_by_entry.get(e.entry_id, [])))
        ws.append([
            e.rank, e.entry_id, who.get("name", ""), who.get("school", ""), who.get("country", ""),
            round(e.average, 4) if e.average is not None else None,
            f"{len(e.totals)} of {len(e.judges_assigned)}" if e.judges_assigned else "0 of 0",
            *[round(e.totals[j], 4) if j in e.totals else None for j in outcome.judges],
            round(e.spread, 4) if e.spread is not None else None, flag_text, e.status,
        ])
        if flag_text:
            for cell in ws[ws.max_row]:
                cell.fill = warn_fill
    for row in ws.iter_rows(min_row=2, min_col=6, max_col=6 + len(outcome.judges) + 3):
        for cell in row:
            if isinstance(cell.value, float):
                cell.number_format = "0.00"
    style_header(ws, [7, 11, 28, 28, 14, 10, 14, *[11] * len(outcome.judges), 9, 34, 34])

    # Flags sheet.
    fs = wb.create_sheet("Flags")
    fs.append(["Type", "Entry ID", "Judge", "Detail"])
    for flag in sorted(outcome.flags, key=lambda f: (f["type"], f["entry"], f["judge"])):
        fs.append([flag["type"], flag["entry"], flag["judge"], flag["detail"]])
    if not outcome.flags:
        fs.append(["None", "", "", "Nothing to review."])
    style_header(fs, [20, 11, 14, 100])

    # Disagreements: every judge's scores for each flagged essay, by ID only (no names).
    ds = wb.create_sheet("Disagreements")
    ds.append(["Entry ID", "Judge", "Weighted total", *[c.name for c in rubric.criteria], "Comments"])
    flagged = [e for e in order if e.spread is not None and e.spread > outcome.margin]
    for e in flagged:
        for judge, row in e.rows.items():
            ds.append([e.entry_id, judge,
                       round(row.total, 4) if row.total is not None else None,
                       *[row.scores.get(c.id) for c in rubric.criteria], row.comment])
        ds.append([])
    if not flagged:
        ds.append(["None", "", "", "No essay has judges further apart than the margin."])
    style_header(ds, [11, 14, 14, *[16] * len(rubric.criteria), 70])

    # Notes: how to read this file.
    ns = wb.create_sheet("Notes")
    lines = [
        ("CONFIDENTIAL", "Contains names from key.xlsx. Do not share outside the organisers."),
        ("Generated", datetime.now().strftime("%Y-%m-%d %H:%M")),
        ("Rubric", rubric.name + ("  [PLACEHOLDER RUBRIC: DRAFT RESULTS]" if rubric.placeholder else "")),
        ("Scale", f"{rubric.scale_min}-{rubric.scale_max}"),
        ("Weighted total", "Per judge: sum(weight x score) / sum(weights), on the criteria scale "
                           f"({rubric.scale_max} is perfect). Only rows where every criterion is scored count."),
        ("Average", "Mean of the judges' weighted totals for that essay."),
        ("Rank", "Highest average = 1. Equal averages share a rank (1, 2, 2, 4)."),
        ("Disagreement", f"Flagged when the highest and lowest judge totals differ by more than {outcome.margin:g}."),
        ("Not adjusted", "Scores are not adjusted for judges who mark harder or easier than others."),
        ("Values", "All numbers are calculated by the toolkit and pasted as values, not live formulas. "
                   "To change a rank by hand (e.g. after a moderation meeting), edit the Rank column; "
                   "`certificates` reads it."),
        ("Judges", ", ".join(outcome.judges)),
    ]
    for label, text in lines:
        ns.append([label, text])
    for row in ns.iter_rows():
        row[0].font = Font(bold=True)
    ns.column_dimensions["A"].width = 18
    ns.column_dimensions["B"].width = 110
    wb.save(path)
