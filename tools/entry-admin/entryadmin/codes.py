"""Fee-support codes: generate them, read them, normalise what entrants type."""
from __future__ import annotations

import random
import secrets
from pathlib import Path

from openpyxl import Workbook

from .xlsxutil import autosize, read_table, save_workbook, style_header

# No 0/O/1/I (and no L, which looks like 1/I in many fonts).
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
HEADERS = ["Code", "Issued to", "Email", "Date issued", "Used by submission"]


def normalise(code: object) -> str:
    """Upper-case and drop spaces/hyphens so 'abcd efgh' matches 'ABCD-EFGH'."""
    return "".join(ch for ch in str(code or "").upper() if ch.isalnum())


def format_code(raw: str, group: int) -> str:
    return "-".join(raw[i:i + group] for i in range(0, len(raw), group))


def generate(path: Path, n: int, length: int = 8, group: int = 4, rng: random.Random | None = None) -> list[str]:
    """Add n new unique codes to codes.xlsx (creating it if needed). Existing rows are kept."""
    if n < 1:
        raise ValueError("N must be at least 1.")
    existing = read_table(path)
    taken = {normalise(r.get("Code")) for r in existing}
    pick = rng.choice if rng else secrets.choice
    new: list[str] = []
    while len(new) < n:
        raw = "".join(pick(ALPHABET) for _ in range(length))
        if raw not in taken:
            taken.add(raw)
            new.append(raw)
    rows = [[r.get(h, "") for h in HEADERS] for r in existing] + [[format_code(c, group), "", "", "", ""] for c in new]
    wb = Workbook()
    ws = wb.active
    ws.title = "Codes"
    style_header(ws, HEADERS, owner_cols=("Issued to", "Email", "Date issued"))
    for r in rows:
        ws.append(r)
    autosize(ws, HEADERS)
    save_workbook(wb, path, keep_backup=True)
    return [format_code(c, group) for c in new]


def load_codes(path: Path) -> dict[str, dict]:
    """normalised code -> its row from codes.xlsx."""
    return {normalise(r.get("Code")): r for r in read_table(path) if r.get("Code")}


def record_usage(path: Path, used: dict[str, str]) -> None:
    """Write 'Used by submission' for codes in `used` (normalised code -> entry ID). Never overwrites."""
    rows = read_table(path)
    changed = False
    for r in rows:
        n = normalise(r.get("Code"))
        if n in used and not r.get("Used by submission"):
            r["Used by submission"] = used[n]
            changed = True
    if not changed:
        return
    wb = Workbook()
    ws = wb.active
    ws.title = "Codes"
    style_header(ws, HEADERS, owner_cols=("Issued to", "Email", "Date issued"))
    for r in rows:
        ws.append([r.get(h, "") for h in HEADERS])
    autosize(ws, HEADERS)
    save_workbook(wb, path, keep_backup=True)
