"""Generate PDF certificates in the Pharos style, plus certificates.json for the verify page."""
from __future__ import annotations

import json
import re
import secrets
import unicodedata
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import openpyxl
import yaml
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.utils import simpleSplit

from common import JudgingError, TOOL_DIR, Tokens, safe_filename
from fontkit import register_fonts
from sealing import seal
from results import STATUS_NOT_JUDGED

DEFAULT_CONFIG = TOOL_DIR / "certificates.yaml"
LEDGER_FILE = "certificates-ledger.json"
# No 0/O/1/I/L so a code read aloud or copied from paper is hard to get wrong.
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
PLACEHOLDER_RE = re.compile(r"\[[^\]]+\]")


@dataclass(frozen=True)
class Award:
    name: str
    text: str
    count: int | None      # None = "everyone else"


@dataclass(frozen=True)
class Config:
    organisation: str
    edition: str
    edition_label: str
    code_prefix: str
    edition_code: str
    code_length: int
    site: str
    footer: str
    awards: tuple[Award, ...]


@dataclass(frozen=True)
class Recipient:
    entry_id: str
    name: str
    rank: int | None
    flags: str = ""


def load_config(path: Path, repo_root: Path) -> Config:
    if not path.is_file():
        raise JudgingError(f"Certificate settings not found: {path}")
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}

    def need(key: str) -> str:
        value = raw.get(key)
        if not isinstance(value, str) or not value.strip():
            raise JudgingError(f"{path.name}: '{key}' is missing")
        return value.strip()

    organisation = raw.get("organisation")
    if not organisation:
        site_ts = repo_root / "src" / "site.ts"
        match = re.search(r"SITE_NAME\s*=\s*['\"]([^'\"]+)['\"]",
                          site_ts.read_text(encoding="utf-8")) if site_ts.is_file() else None
        organisation = match.group(1) if match else None
    if not organisation:
        raise JudgingError(f"{path.name}: set 'organisation' (src/site.ts has no SITE_NAME to fall back on)")

    awards: list[Award] = []
    for item in raw.get("awards") or []:
        name = str(item.get("name", "")).strip()
        if not name:
            raise JudgingError(f"{path.name}: every award needs a name")
        rest = bool(item.get("rest"))
        count = None if rest else item.get("count")
        if not rest and (not isinstance(count, int) or count < 1):
            raise JudgingError(f"{path.name}: award '{name}' needs `count` (a whole number) or `rest: true`")
        awards.append(Award(name, str(item.get("text", "")).strip(), count))
    if not awards:
        raise JudgingError(f"{path.name}: list at least one award")
    if any(a.count is None for a in awards[:-1]):
        raise JudgingError(f"{path.name}: the `rest: true` award must be last")

    length = raw.get("code_length", 4)
    if not isinstance(length, int) or not 4 <= length <= 20:
        raise JudgingError(f"{path.name}: code_length must be a whole number from 4 to 20")
    return Config(organisation, need("edition"), need("edition_label"), need("code_prefix").upper(),
                  need("edition_code").upper(), length, need("site").rstrip("/"), need("footer"), tuple(awards))


def placeholders_in(cfg: Config) -> list[str]:
    texts = [cfg.site, cfg.footer, cfg.edition, *[a.text for a in cfg.awards]]
    return sorted({m for t in texts for m in PLACEHOLDER_RE.findall(t)})


# --------------------------------------------------------------------------- who gets what

def read_recipients(results_path: Path) -> list[Recipient]:
    """Read ranks and names from results.xlsx, so a hand-edited Rank column is respected."""
    if not results_path.is_file():
        raise JudgingError(f"results.xlsx not found: {results_path}. Run `results` first.")
    ws = openpyxl.load_workbook(results_path, data_only=True)["Results"]
    rows = ws.iter_rows(values_only=True)
    header = [str(h or "").strip().lower() for h in next(rows)]
    try:
        i_rank, i_id, i_name = header.index("rank"), header.index("entry id"), header.index("name")
    except ValueError:
        raise JudgingError("results.xlsx must have Rank, Entry ID and Name columns on its Results sheet.") from None
    i_status = header.index("status") if "status" in header else None
    i_flags = header.index("flags") if "flags" in header else None
    out: list[Recipient] = []
    for row in rows:
        entry_id = str(row[i_id] or "").strip()
        if not entry_id:
            continue
        if i_status is not None and row[i_status] == STATUS_NOT_JUDGED:
            print(f"Note: no certificate for {entry_id} (not on any scoring sheet)")
            continue
        rank = row[i_rank]
        try:
            rank = int(rank) if rank not in (None, "") else None
        except (TypeError, ValueError):
            raise JudgingError(f"results.xlsx: rank for {entry_id} is '{rank}', expected a whole number") from None
        flags = str(row[i_flags] or "") if i_flags is not None else ""
        out.append(Recipient(entry_id, unicodedata.normalize("NFC", str(row[i_name] or "").strip()), rank, flags))
    missing = [r.entry_id for r in out if not r.name]
    if missing:
        raise JudgingError("No name in results.xlsx for: " + ", ".join(missing)
                           + ". Check key.xlsx has these entry IDs, then re-run `results`.")
    return out


def award_for(rank: int | None, awards: tuple[Award, ...]) -> Award | None:
    covered = 0
    for award in awards:
        if award.count is None:
            return award
        covered += award.count
        if rank is not None and rank <= covered:
            return award
    return None


# --------------------------------------------------------------------------- codes + ledger

def new_code(cfg: Config, used: set[str]) -> str:
    while True:
        chars = "".join(secrets.choice(CODE_ALPHABET) for _ in range(cfg.code_length))
        groups = [chars[i:i + 4] for i in range(0, len(chars), 4)]       # PH-ZH-7K4Q, or PH-ZH-7K4Q-X9MD
        code = "-".join([cfg.code_prefix, cfg.edition_code, *groups])
        if code not in used:
            used.add(code)
            return code


# --------------------------------------------------------------------------- drawing

def _spaced(c: Canvas, text: str, x: float, y: float, font: str, size: float, space: float) -> None:
    """Draw text with letter-spacing."""
    t = c.beginText(x, y)
    t.setFont(font, size)
    t.setCharSpace(space)
    t.textOut(text)
    t.setCharSpace(0)          # character spacing otherwise leaks into every later string on the page
    c.drawText(t)


def _fit(text: str, font: str, size: float, min_size: float, max_width: float) -> float:
    while size > min_size and pdfmetrics.stringWidth(text, font, size) > max_width:
        size -= 0.5
    return size


def _slab_path(c: Canvas, width: float, bottom: float, top: float, radius: float):
    """The plum slab: square on three sides, one big round corner bottom-right (as on the site)."""
    k = 0.5523 * radius
    p = c.beginPath()
    p.moveTo(0, bottom)
    p.lineTo(width - radius, bottom)
    p.curveTo(width - radius + k, bottom, width, bottom + radius - k, width, bottom + radius)
    p.lineTo(width, top)
    p.lineTo(0, top)
    p.close()
    return p


def draw_certificate(path: Path, cfg: Config, tokens: Tokens, name: str, award: Award,
                     code: str, issued: date) -> None:
    """One A4-landscape certificate in the site's look: peach ground, plum slab, Gloock display
    type, Instrument Sans body, the Kaushan Script wordmark, rings, and the one edition disc."""
    W, H = landscape(A4)
    X0 = 22 * mm
    col = {n: HexColor(tokens.color(n)) for n in
           ("peach", "plum", "plum-muted", "cream", "pink", "coral", "edition")}
    c = Canvas(str(path), pagesize=(W, H))
    c.setTitle(f"{award.name} certificate: {name}")
    c.setAuthor(cfg.organisation)
    c.setSubject(f"{cfg.edition}. Verification code {code}")

    c.setFillColor(col["peach"]); c.rect(0, 0, W, H, stroke=0, fill=1)

    # Slab with rings clipped inside it.
    slab_w, slab_bottom, radius = 255 * mm, H - 100 * mm, 58 * mm
    slab = _slab_path(c, slab_w, slab_bottom, H, radius)
    c.setFillColor(col["plum"]); c.drawPath(slab, stroke=0, fill=1)
    c.saveState()
    c.clipPath(slab, stroke=0, fill=0)
    c.setStrokeColor(col["pink"]); c.setLineWidth(0.5)
    for i in range(1, 11):
        c.circle(slab_w - 6 * mm, slab_bottom + 6 * mm, i * 3.6 * mm, stroke=1, fill=0)
    c.restoreState()

    # The edition disc: the single edition-coloured shape, straddling the slab edge. No text on it.
    c.setFillColor(col["edition"]); c.circle(W - 24 * mm, slab_bottom - 4 * mm, 21 * mm, stroke=0, fill=1)

    # Wordmark (decorative accent, so the plain organisation name is also in the PDF metadata and footer).
    c.setFillColor(col["peach"]); c.setFont("PharosScript", 32)
    c.drawString(X0, H - 25 * mm, cfg.organisation)

    # Hook: the award, big, in cream on plum. The same words are plain text in the sentence below.
    c.setFillColor(col["peach"]); c.setFont("PharosSansSemi", 13)
    c.drawString(X0, H - 45 * mm, cfg.edition_label)
    size = _fit(award.name, "PharosDisplay", 78, 40, 185 * mm)   # stays clear of the rings
    c.setFillColor(col["cream"]); c.setFont("PharosDisplay", size)
    c.drawString(X0, H - 75 * mm, award.name)
    c.setFillColor(col["coral"]); c.rect(X0, H - 86 * mm, 34 * mm, 2.2 * mm, stroke=0, fill=1)

    # Facts on peach: who, for what, when, and how to verify.
    c.setFillColor(col["plum-muted"]); c.setFont("PharosSansSemi", 11)
    c.drawString(X0, 81 * mm, "This certificate is awarded to")
    name_w = 215 * mm
    size = _fit(name, "PharosDisplay", 42, 16, name_w)
    c.setFillColor(col["plum"]); c.setFont("PharosDisplay", size)
    c.drawString(X0, 66 * mm, name)
    c.setStrokeColor(col["plum"]); c.setLineWidth(1.4)
    c.line(X0, 60 * mm, X0 + name_w, 60 * mm)

    statement = award.text.replace("{edition}", cfg.edition)
    c.setFont("PharosSans", 14)
    y = 50 * mm
    for line in simpleSplit(statement, "PharosSans", 14, 170 * mm):
        c.drawString(X0, y, line)
        y -= 19

    c.setFillColor(col["plum-muted"]); c.setFont("PharosSansSemi", 10)
    c.drawString(X0, 33 * mm, "Verification code")
    c.drawString(X0 + 85 * mm, 33 * mm, "Issued")
    c.setFillColor(col["plum"])
    _spaced(c, code, X0, 25 * mm, "PharosSansSemi", 18, 1.0)
    c.setFont("PharosSans", 14)
    c.drawString(X0 + 85 * mm, 25.6 * mm, f"{issued.day} {issued:%B %Y}")
    c.setFont("PharosSans", 11)
    c.drawString(X0, 18 * mm, f"Verify at {cfg.site}/verify/")

    c.setFillColor(col["plum-muted"]); c.setFont("PharosSans", 9)
    c.drawString(X0, 9 * mm, cfg.footer)
    c.showPage()
    c.save()


# --------------------------------------------------------------------------- the command

def issue_certificates(results_path: Path, config_path: Path, out_dir: Path, json_path: Path | None,
                       tokens: Tokens, issued: date, allow_missing_glyphs: bool = False) -> list[dict]:
    cfg = load_config(config_path, tokens.root)
    recipients = read_recipients(results_path)
    coverage = register_fonts()

    found = placeholders_in(cfg)
    if found:
        print("WARNING: these placeholders will be printed on the certificates: " + ", ".join(found)
              + f"\n         Fill them in {config_path.name} before sending real certificates.")

    plan = [(r, award_for(r.rank, cfg.awards)) for r in recipients]
    plan = [(r, a) for r, a in plan if a is not None]

    flagged = [(r, a) for r, a in plan if r.flags and a.count is not None]
    if flagged:
        print("WARNING: these placed entries are still flagged in results.xlsx. Settle them (and fix the Rank "
              "column or re-run `results`) before sending real certificates:")
        for r, a in flagged:
            print(f"  {r.entry_id}  {a.name}: {r.flags}")

    # Check every name can be set in the certificate fonts before writing anything.
    unsupported = {r.entry_id: sorted({ch for ch in r.name if ord(ch) not in coverage["PharosDisplay"]})
                   for r, _ in plan}
    unsupported = {k: v for k, v in unsupported.items() if v}
    if unsupported and not allow_missing_glyphs:
        detail = "; ".join(f"{k}: {' '.join(v)}" for k, v in unsupported.items())
        raise JudgingError(
            "These names contain characters the certificate font cannot show (" + detail + "). "
            "Names must use the English spelling (A-Z letters). Nothing was written. "
            "Change the name in key.xlsx to its English spelling and re-run `results`, "
            "or add --allow-missing-glyphs to print them anyway (gaps will appear)."
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    ledger_path = out_dir / LEDGER_FILE
    ledger: dict[str, dict] = json.loads(ledger_path.read_text(encoding="utf-8")) if ledger_path.is_file() else {}
    used = {rec["code"] for rec in ledger.values()}
    new_ledger: dict[str, dict] = {}
    sealed: list[dict] = []
    summary: list[dict] = []

    for recipient, award in plan:
        old = ledger.get(recipient.entry_id)
        same = bool(old and old["name"] == recipient.name and old["award"] == award.name)
        if same:
            code, when = old["code"], old["issued"]          # re-run: same certificate, same code
        else:
            if old:
                print(f"Note: {recipient.entry_id} changed ({old['award']} -> {award.name}); new code issued, "
                      f"old code {old['code']} is no longer valid.")
            code, when = new_code(cfg, used), issued.isoformat()
        payload = {"name": recipient.name, "award": award.name, "edition": cfg.edition, "issued": when}
        # Keep the existing encrypted record when nothing changed, so the file only changes when it must.
        record = old["record"] if same and old.get("payload") == payload and old.get("record") else seal(code, payload)
        for stale in out_dir.glob(f"{recipient.entry_id}_*.pdf"):
            stale.unlink()
        file_name = f"{recipient.entry_id}_{safe_filename(award.name)}_{code}.pdf"
        draw_certificate(out_dir / file_name, cfg, tokens, recipient.name, award, code, date.fromisoformat(when))
        new_ledger[recipient.entry_id] = {"code": code, "name": recipient.name, "award": award.name,
                                          "issued": when, "file": file_name, "payload": payload, "record": record}
        sealed.append(record)
        summary.append({"code": code, "award": award.name})

    # Entries that dropped out of the results keep their ledger line so their code stays reserved.
    for entry_id, rec in ledger.items():
        new_ledger.setdefault(entry_id, rec)
    # The ledger is PRIVATE (readable names and codes). It stays in the output folder.
    ledger_path.write_text(json.dumps(new_ledger, indent=2, ensure_ascii=False), encoding="utf-8")

    # Sorted by id (a hash), so the order reveals nothing about who placed where.
    sealed.sort(key=lambda r: r["id"])
    json_path = json_path or out_dir / "certificates.json"
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(sealed, indent=2) + "\n", encoding="utf-8")
    return summary
