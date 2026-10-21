"""Finding downloaded files and reading essay PDFs."""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote, urlparse

import logging

from pypdf import PdfReader

logging.getLogger("pypdf").setLevel(logging.CRITICAL)  # damaged PDFs are reported by us, not as noise


@dataclass
class PdfResult:
    status: str          # "ok", "unreadable" or "scanned"
    words: int | None = None
    pages: int = 0
    text: str = ""
    detail: str = ""


def count_words(text: str) -> int:
    """Whitespace-separated tokens containing a letter or digit (so stray '-' or '•' don't count)."""
    return sum(1 for tok in text.split() if any(ch.isalnum() for ch in tok))


def analyse(path: Path, min_words_for_text: int) -> PdfResult:
    try:
        reader = PdfReader(str(path))
        if reader.is_encrypted and not reader.decrypt(""):
            return PdfResult("unreadable", detail="password-protected")
        pages = len(reader.pages)
        text = "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception:  # pypdf raises many different errors on damaged / non-PDF files
        return PdfResult("unreadable", detail="could not be opened (damaged, or not really a PDF)")
    words = count_words(text)
    if pages == 0:
        return PdfResult("unreadable", words=0, detail="no pages")
    if words < min_words_for_text:
        return PdfResult("scanned", words=words, pages=pages, text=text,
                         detail=f"only {words} words of text found (probably a scan or photo)")
    return PdfResult("ok", words=words, pages=pages, text=text)


def split_urls(cell: str) -> list[str]:
    return [u for u in re.split(r"[\s,;]+", str(cell or "").strip()) if u]


def url_filename(url: str) -> str:
    return unquote(Path(urlparse(url).path).name)


class FileIndex:
    """Matches the download URLs in the CSV to files in the downloads folder.

    A file matches if its name equals the name in the URL (ignoring upper/lower case), or if it
    sits in a sub-folder named after the Submission ID, or if its name starts with the Submission ID.
    """

    def __init__(self, root: Path):
        self.root = root
        self.files = [p for p in root.rglob("*") if p.is_file()] if root.is_dir() else []

    def find(self, cell: str, submission_id: str) -> tuple[Path | None, str]:
        """Returns (path or None, name we looked for)."""
        wanted = [url_filename(u) for u in split_urls(cell)]
        wanted = [w for w in wanted if w]
        sid = submission_id.strip().lower()
        mine = [p for p in self.files
                if sid and (any(part.lower() == sid for part in p.relative_to(self.root).parts[:-1])
                            or p.name.lower().startswith(sid))]
        for name in wanted:
            hits = [p for p in self.files if p.name.lower() == name.lower()]
            if len(hits) > 1:
                hits = [p for p in hits if p in mine] or hits[:1]
            if hits:
                return hits[0], name
        # fall back to anything filed under this submission's own ID
        pdfs = [p for p in mine if p.suffix.lower() == ".pdf"]
        if len(pdfs) == 1 and wanted:
            return pdfs[0], wanted[0]
        return None, (wanted[0] if wanted else "")
