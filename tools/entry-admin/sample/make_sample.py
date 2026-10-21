#!/usr/bin/env python3
"""Makes FAKE test data: a Tally-style CSV, fake essay PDFs and a codes.xlsx.

    python sample/make_sample.py            # writes into sample/
    python sample/make_sample.py some/dir   # or anywhere else

Needs reportlab (pip install -r requirements-dev.txt). All names, emails and text are invented.
Each entry below exists to trigger one particular flag; the comment says which.
"""
from __future__ import annotations

import csv
import os
import random
import sys
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from entryadmin import codes as codes_mod  # noqa: E402

HEADERS = ["Submission ID", "Respondent ID", "Submitted at", "Full name", "Email", "Country", "School",
           "Age on [date]", "Which prompt are you answering?", "Your essay (PDF)", "Your entry fee",
           "Fee support code", "Proof of payment", "PayPal transaction ID", "Email you paid with",
           "Before you submit"]
FULL, HALF = "Full fee (USD 10)", "Half fee with an approved fee support code (USD 5)"
LOREM = ("lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore "
         "et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip").split()
URL = "https://storage.tally.so/private/{}?id=abc123&accessType=DOWNLOAD&signature=fake"


def words(n: int, seed: int) -> list[str]:
    r = random.Random(seed)
    return [r.choice(LOREM) for _ in range(n)]


def write_text_pdf(path: Path, ws: list[str], author: str = "", title_line: str = "") -> None:
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setAuthor(author)
    c.setTitle("Essay")
    lines = [ws[i:i + 12] for i in range(0, len(ws), 12)]
    if title_line:
        lines.insert(0, [title_line])
    y = 800
    for line in lines:
        if y < 60:
            c.showPage()
            y = 800
        c.drawString(50, y, " ".join(line))
        y -= 16
    c.save()


def write_scanned_pdf(path: Path) -> None:
    """Pages with shapes but no text: what a scan or photo looks like to a text reader."""
    c = canvas.Canvas(str(path), pagesize=A4)
    for _ in range(2):
        c.rect(50, 100, 400, 600, fill=1)
        c.showPage()
    c.save()


def build(target: Path) -> dict:
    target.mkdir(parents=True, exist_ok=True)
    dl = target / "downloads"
    dl.mkdir(exist_ok=True)

    code_file = target / "codes.xlsx"
    code_file.unlink(missing_ok=True)
    good = codes_mod.generate(code_file, 5, rng=random.Random(7))

    # (key, name, email, age, fee, code, essay words, proof?, txn, extra)
    E = []

    def add(key, name, email, age=17, fee=FULL, code="", n=600, proof=True, txn=None, **kw):
        E.append(dict(key=key, name=name, email=email, age=age, fee=fee, code=code, n=n, proof=proof,
                      txn=txn if txn is not None else f"TXN{len(E) + 1:04d}FAKE", **kw))

    add("clean", "Ada Example", "ada@example.com", author="Ada Example")             # no flags
    add("over", "Ben Over", "ben.over@example.com", n=850)                            # over 800 words
    add("limit800", "Cara Exact", "cara@example.com", n=800)                          # exactly 800: no flag
    add("limit801", "Dev Edge", "dev@example.com", n=801)                             # 801: over
    add("scanned", "Eli Scan", "eli@example.com", scanned=True)                       # scanned PDF
    add("corrupt", "Fay Broken", "fay@example.com", corrupt=True)                     # unreadable PDF
    add("nofile", "Gus Missing", "gus@example.com", nofile=True)                      # essay not in folder
    add("dupemail", "Hana Twin", "ada@example.com")                                   # same email as 'clean'
    add("dupname_a", "Ivy Same", "ivy.one@example.com")                               # same name as next
    add("dupname_b", "ivy  same", "ivy.two@example.com")                              # (case/space differences)
    add("old", "Jon Elder", "jon@example.com", age=23)                                # age over 20
    add("age20", "Kit Twenty", "kit@example.com", age=20)                             # 20 is allowed
    add("half_ok", "Lia Half", "lia@example.com", fee=HALF, code=good[0], author="Lia Half",
        title="By Lia Half")                                                          # valid code (+ name in essay)
    add("half_reuse", "Max Reuse", "max@example.com", fee=HALF, code=good[0].lower())  # code already used
    add("half_bad", "Nia Wrong", "nia@example.com", fee=HALF, code="ZZZZ-9999")       # invalid code
    add("half_none", "Omar Blank", "omar@example.com", fee=HALF, code="")             # code missing
    add("half_spaces", "Pia Spaces", "pia@example.com", fee=HALF,
        code=good[1].replace("-", " ").lower())                                       # valid, typed loosely
    add("noproof", "Quin NoProof", "quin@example.com", proof=False)                   # no proof of payment
    add("txn_a", "Rae Dupe", "rae@example.com", txn="PAYPAL9999")                     # same PayPal ID as next
    add("txn_b", "Sam Dupe", "sam@example.com", txn="paypal 9999")                    # (case/space differences)
    add("multi", "Tia Many", "tia@example.com", age="twenty", n=900, proof=False)     # several problems at once
    add("fee_other", "Una Odd", "una@example.com", fee="Pay what you can")               # unrecognised fee answer
    add("nonlatin", "李明 Li Ming", "liming@example.com")                                # name not in English letters
    add("gdoc", "Vik Docs", "vik@example.com",
        essay_cell="https://docs.google.com/document/d/FAKE-DOC-ID/edit?usp=sharing")      # Google Docs link
    add("other_url", "Wen Link", "wen@example.com", essay_cell="https://example.com/my-essay")  # some other URL
    add("few_words", "Xav Short", "xav@example.com", essay_cell="see my email")           # a few words, no file
    add("accents", "José Álvarez", "jose@example.com")                                 # accented Latin letters: fine

    rows = []
    for i, e in enumerate(E, start=1):
        sid = f"sub{i:03d}"
        fname = f"essay-{e['key']}.pdf"
        path = dl / fname
        if "essay_cell" in e:
            pass  # a link or text instead of a file: nothing to download
        elif e.get("scanned"):
            write_scanned_pdf(path)
        elif e.get("corrupt"):
            path.write_bytes(b"this is not really a pdf file\n")
        elif not e.get("nofile"):
            write_text_pdf(path, words(e["n"], i), e.get("author", ""), e.get("title", ""))
        rows.append({
            "Submission ID": sid, "Respondent ID": f"resp{i:03d}",
            "Submitted at": f"2026-11-{1 + i // 4:02d} {9 + i % 8:02d}:{i:02d}:00",
            "Full name": e["name"], "Email": e["email"], "Country": "Malaysia", "School": "Fake Example School",
            "Age on [date]": e["age"], "Which prompt are you answering?": "Prompt A (placeholder)",
            "Your essay (PDF)": e["essay_cell"] if "essay_cell" in e else URL.format(fname), "Your entry fee": e["fee"], "Fee support code": e["code"],
            "Proof of payment": URL.format(f"proof-{e['key']}.png") if e["proof"] else "",
            "PayPal transaction ID": e["txn"], "Email you paid with": e["email"], "Before you submit": "Yes",
        })
    with (target / "tally-export.csv").open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=HEADERS)
        w.writeheader()
        w.writerows(rows)

    (target / "config.toml").write_text(
        (HERE.parent / "config.toml").read_text(encoding="utf-8")
        .replace('"work/submissions.csv"', '"tally-export.csv"')
        .replace('"work/downloads"', '"downloads"')
        .replace('"work/tracker.xlsx"', '"output/tracker.xlsx"')
        .replace('"work/codes.xlsx"', '"codes.xlsx"')
        .replace('"templates"', '"' + Path(os.path.relpath(HERE.parent / "templates", target)).as_posix() + '"')
        .replace('"work/emails"', '"output/emails"')
        .replace('"work/judging"', '"output/judging"'), encoding="utf-8")
    return {"codes": good, "entries": [(f"sub{i:03d}", e["key"]) for i, e in enumerate(E, start=1)]}


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE
    info = build(out)
    print(f"Fake data written to {out} ({len(info['entries'])} entries).")
