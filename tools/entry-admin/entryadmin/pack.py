"""`pack`: confirmed essays -> judging/ with anonymous names, plus a private key."""
from __future__ import annotations

import re
import shutil
from pathlib import Path

from openpyxl import Workbook
from pypdf import PdfReader, PdfWriter

from .config import Config
from .pdfs import analyse
from .tracker import is_ready, load_tracker
from .xlsxutil import autosize, save_workbook, style_header

KEY_HEADERS = ["Entry ID", "Full name", "Email", "Country", "School", "Age", "Prompt", "Submission ID"]


def _anonymous_copy(src: Path, dest: Path) -> bool:
    """Rewrites the PDF page by page so the author/title/software details stored inside it are dropped.
    Returns False (and does a plain copy) if the PDF can't be rewritten."""
    try:
        reader = PdfReader(str(src))
        if reader.is_encrypted:
            reader.decrypt("")
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        with dest.open("wb") as f:
            writer.write(f)
        return True
    except Exception:
        shutil.copy2(src, dest)
        return False


def _squash(s: str) -> str:
    return " ".join(re.sub(r"[^\w@.\s]", " ", s.casefold()).split())


def pack(cfg: Config, files_dir: Path | None = None) -> dict:
    files_dir = files_dir or cfg.path("files")
    out = cfg.path("judging")
    out.mkdir(parents=True, exist_ok=True)
    prefix = cfg["entry"]["id_prefix"]
    rows = sorted(load_tracker(cfg), key=lambda r: str(r.get("Entry ID")))

    packed, warnings, key_rows = [], [], []
    for row in rows:
        ok, why = is_ready(row)
        if why:
            warnings.append(why)
        if not ok:
            continue
        eid = str(row["Entry ID"])
        rel = str(row.get("Essay file") or "")
        src = files_dir / rel if rel else None
        if not src or not src.is_file():
            warnings.append(f"{eid}: essay file not found ({rel or 'none recorded'}), so it was not packed.")
            continue
        if not _anonymous_copy(src, out / f"{eid}.pdf"):
            warnings.append(f"{eid}: could not strip the PDF's hidden author details; copied as-is. Check it before sending to judges.")
        # An essay with the author's name on page 1 isn't anonymous, whatever the file is called.
        text = _squash(analyse(src, 0).text)
        for label, needle in (("name", str(row.get("Full name") or "")), ("email address", str(row.get("Email") or "")),
                              ("school", str(row.get("School") or ""))):
            needle = _squash(needle)
            if len(needle) >= 4 and needle in text:
                warnings.append(f"{eid}.pdf contains the entrant's {label} in its text. Remove it before it goes to judges.")
        packed.append(eid)
        key_rows.append([row.get(h, "") for h in KEY_HEADERS])

    # A PDF we made earlier for someone who is no longer Confirmed must not stay in the judging folder.
    pat = re.compile(rf"^{re.escape(prefix)}-\d+\.pdf$")
    removed = []
    for f in out.iterdir():
        if pat.match(f.name) and f.stem not in packed:
            f.unlink()
            removed.append(f.name)

    wb = Workbook()
    ws = wb.active
    ws.title = "Key (PRIVATE)"
    style_header(ws, KEY_HEADERS)
    for r in key_rows:
        ws.append(r)
    autosize(ws, KEY_HEADERS)
    save_workbook(wb, out / "key.xlsx")
    return {"packed": packed, "warnings": warnings, "removed": removed, "dir": out}
