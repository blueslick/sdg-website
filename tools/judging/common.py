"""Shared helpers for the judging toolkit: paths, design tokens, entry IDs, the key file.

Everything here is plain Python so the other modules stay short.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import openpyxl

TOOL_DIR = Path(__file__).resolve().parent
DATA_DIR = TOOL_DIR / "data"          # everything with names or emails lives here (git-ignored)

# The two prize categories, as named in CATEGORIES in src/site.ts (a test keeps them in step).
CATEGORIES = ("Junior", "Open")

# Entry IDs look like ZH-001: letters/digits, a dash, then digits.
ENTRY_ID_RE = re.compile(r"^[A-Z0-9]+-\d+$")


class JudgingError(Exception):
    """A problem the user can fix. The CLI prints the message without a traceback."""


# --------------------------------------------------------------------------- repo + tokens

def find_repo_root(start: Path | None = None) -> Path:
    """Walk up from the toolkit folder until a folder containing tokens.json is found."""
    here = (start or TOOL_DIR).resolve()
    for folder in [here, *here.parents]:
        if (folder / "tokens.json").is_file():
            return folder
    raise JudgingError(
        "Could not find tokens.json in any parent folder. Pass --repo-root pointing at the "
        "folder that holds tokens.json and fonts/."
    )


class Tokens:
    """Read-only view of tokens.json (colours and font packages). The site is light-only."""

    def __init__(self, repo_root: Path, theme: str = "light"):
        self.root = repo_root
        self.theme = theme
        path = repo_root / "tokens.json"
        if not path.is_file():
            raise JudgingError(f"tokens.json not found at {path}")
        self.data = json.loads(path.read_text(encoding="utf-8"))
        self._colors = {t["name"]: t["value"][theme] for t in self.data["color"]["tokens"]}

    def color(self, name: str) -> str:
        try:
            return self._colors[name]
        except KeyError:
            raise JudgingError(
                f"tokens.json has no colour called '{name}'. The toolkit expects the real Pharos "
                "tokens.json (peach, cream, plum, plum-deep, plum-muted, coral, pink, edition ...). "
                "If the site has not been merged into this branch yet, pass --repo-root pointing at "
                "a checkout of the site."
            ) from None

    def color_or(self, name: str, fallback: str) -> str:
        """For cosmetic uses (Excel header colours) that should not stop a run."""
        return self._colors.get(name, fallback)

    def font_dir(self, family: str) -> Path:
        """Folder of .woff2 files that Fontsource installed in node_modules for this family."""
        for font in self.data["type"]["fonts"]:
            if font["family"] == family:
                package = font.get("package")
                if not package:
                    raise JudgingError(f"tokens.json lists no Fontsource package for {family}")
                folder = self.root / "node_modules" / package / "files"
                if not folder.is_dir():
                    raise JudgingError(
                        f"{package} is not installed. Run `npm install` in {self.root} first, "
                        "then `python3 judging.py setup-fonts`."
                    )
                return folder
        raise JudgingError(f"tokens.json lists no font called '{family}'")


def load_tokens(repo_root: Path | None = None) -> Tokens:
    return Tokens(repo_root or find_repo_root())


# --------------------------------------------------------------------------- entries

def normalise_id(value: object) -> str:
    return str(value or "").strip().upper()


def list_essays(folder: Path) -> dict[str, Path]:
    """Return {entry ID: file} for every file in the folder named like ZH-001.pdf.

    Files that do not look like an entry ID are reported, not silently ignored.
    """
    if not folder.is_dir():
        raise JudgingError(f"Essays folder not found: {folder}")
    found: dict[str, Path] = {}
    skipped: list[str] = []
    for path in sorted(folder.iterdir()):
        if path.name.startswith(".") or not path.is_file():
            continue
        entry_id = normalise_id(path.stem)
        if not ENTRY_ID_RE.match(entry_id):
            skipped.append(path.name)
            continue
        if entry_id in found:
            raise JudgingError(
                f"Two files share the entry ID {entry_id}: {found[entry_id].name} and {path.name}"
            )
        found[entry_id] = path
    if skipped:
        print(f"Note: ignored {len(skipped)} file(s) not named like ZH-001: {', '.join(skipped)}")
    if not found:
        raise JudgingError(f"No essays named like ZH-001.pdf found in {folder}")
    return found


KEY_COLUMNS = {"entryid": "entry_id", "name": "name", "fullname": "name", "email": "email",
               "school": "school", "country": "country", "category": "category"}


def read_key(path: Path) -> dict[str, dict[str, str]]:
    """Read the private key.xlsx into {entry ID: {name, category, school, country, email}}.

    Needs the columns Entry ID, Name (or Full name) and Category (Junior or Open). The Category
    column is not made by the entry-admin pack: add it by hand, counting each entrant's age on
    the deadline. Extra columns (Age, Prompt ...) are ignored.
    """
    if not path.is_file():
        raise JudgingError(f"Key file not found: {path}")
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True).worksheets[0]
    rows = ws.iter_rows(values_only=True)
    header = next(rows, None)
    if not header:
        raise JudgingError(f"{path.name} is empty")
    columns: dict[str, int] = {}
    for i, cell in enumerate(header):
        field = KEY_COLUMNS.get(re.sub(r"[^a-z]", "", str(cell or "").lower()))
        if field and field not in columns:
            columns[field] = i
    missing = [label for field, label in (("entry_id", "Entry ID"), ("name", "Name"), ("category", "Category"))
               if field not in columns]
    if missing:
        raise JudgingError(
            f"{path.name} needs the columns 'Entry ID', 'Name' and 'Category' in its first row "
            f"(Category is Junior or Open: add it by hand). Missing: {', '.join(missing)}"
        )
    key: dict[str, dict[str, str]] = {}
    bad_category: list[str] = []
    for row in rows:
        entry_id = normalise_id(row[columns["entry_id"]] if len(row) > columns["entry_id"] else "")
        if not entry_id:
            continue
        if entry_id in key:
            raise JudgingError(f"{path.name} lists {entry_id} more than once")
        record = {field: str(row[i]).strip() if i < len(row) and row[i] is not None else ""
                  for field, i in columns.items() if field != "entry_id"}
        category = next((c for c in CATEGORIES if c.lower() == record["category"].lower()), None)
        if category is None:
            bad_category.append(f"{entry_id} ('{record['category']}')")
        record["category"] = category or ""
        key[entry_id] = record
    if bad_category:
        raise JudgingError(f"{path.name}: the Category must be Junior or Open for every entry. "
                           "Fix: " + ", ".join(bad_category))
    return key


def safe_filename(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", text.strip()).strip("_") or "unnamed"


# --------------------------------------------------------------------------- values from the site

def _site_text(repo_root: Path, relative: str) -> str:
    path = repo_root / relative
    if not path.is_file():
        raise JudgingError(f"{relative} not found in {repo_root}. Pass --repo-root pointing at the site folder.")
    return path.read_text(encoding="utf-8")


def site_values(repo_root: Path) -> dict:
    """Read the few values the site owns (site.ts and astro.config.mjs), so nothing is typed twice.

    site.ts cannot be loaded by Node on its own (it uses import.meta.env), so it is read as text.
    """
    ts = _site_text(repo_root, "src/site.ts")

    def string_const(name: str) -> str:
        match = re.search(rf"export const {name}\s*=\s*'((?:[^'\\]|\\.)*)'", ts)
        if not match:
            raise JudgingError(f"Could not find {name} in src/site.ts")
        return match.group(1).replace("\\'", "'")

    block = re.search(r"export const RUBRIC\b.*?^\];", ts, re.S | re.M)
    if not block:
        raise JudgingError("Could not find RUBRIC in src/site.ts")
    rubric = [(m.group(1).replace("\\'", "'"), int(m.group(2)))
              for m in re.finditer(r"name:\s*'((?:[^'\\]|\\.)*)',\s*marks:\s*(\d+)", block.group(0))]
    total = re.search(r"export const RUBRIC_TOTAL\s*=\s*(\d+)", ts)
    cats = re.search(r"export const CATEGORIES\b.*?^\] as const;", ts, re.S | re.M)
    categories = re.findall(r"name:\s*'([^']+)'", cats.group(0)) if cats else []
    astro = _site_text(repo_root, "astro.config.mjs")
    site = re.search(r"site:\s*'([^']+)'", astro)
    if not site:
        raise JudgingError("Could not find `site:` in astro.config.mjs")
    return {
        "site_name": string_const("SITE_NAME"),
        "soup_kitchen": string_const("SOUP_KITCHEN_NAME"),
        "rubric": rubric,
        "rubric_total": int(total.group(1)) if total else None,
        "categories": categories,
        "site_url": site.group(1).rstrip("/"),
        "text": ts,
    }
