"""Turn the website's Fontsource .woff2 fonts into static TrueType fonts that reportlab can embed.

The site installs Gloock, Instrument Sans and Kaushan Script from Fontsource into node_modules.
PDF libraries need plain .ttf files with one fixed weight each, so `setup-fonts` converts them
into .fonts/ (git-ignored: font files are never committed) and certificates read them from there.
"""
from __future__ import annotations

from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLFont

from common import JudgingError, TOOL_DIR, Tokens

FONT_DIR = TOOL_DIR / ".fonts"

# face name -> (family in tokens.json, Fontsource file pattern, axis values for variable fonts).
# Latin subset only: entrant names are English letters (the entry form asks for that).
FACES: dict[str, tuple[str, str, dict[str, float]]] = {
    "PharosDisplay": ("Gloock", "*-latin-400-normal.woff2", {}),                       # display type
    "PharosSans": ("Instrument Sans Variable", "*-latin-wght-normal.woff2", {"wght": 400}),   # body
    "PharosSansSemi": ("Instrument Sans Variable", "*-latin-wght-normal.woff2", {"wght": 600}),
    "PharosScript": ("Kaushan Script", "*-latin-400-normal.woff2", {}),                 # wordmark only
}


def _convert(source: Path, axes: dict[str, float], target: Path) -> None:
    font = TTFont(source)
    if "fvar" in font:
        # Pin every axis, otherwise leftover axes stay variable and PDFs show the default weight.
        location = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
        location.update({tag: value for tag, value in axes.items() if tag in location})
        font = instancer.instantiateVariableFont(font, location)
    font.flavor = None
    font.save(target)


def setup_fonts(tokens: Tokens) -> list[Path]:
    """The setup step: convert the site's fonts into .fonts/*.ttf. Safe to re-run."""
    FONT_DIR.mkdir(exist_ok=True)
    written = []
    for name, (family, pattern, axes) in FACES.items():
        matches = sorted(tokens.font_dir(family).glob(pattern))
        if not matches:
            raise JudgingError(f"No file matching {pattern} for {family} in node_modules. "
                               "Try `npm install` again.")
        target = FONT_DIR / f"{name}.ttf"
        _convert(matches[0], axes, target)
        written.append(target)
    return written


def register_fonts() -> dict[str, set[int]]:
    """Register the converted fonts with reportlab. Returns {face: supported code points}."""
    coverage: dict[str, set[int]] = {}
    for name in FACES:
        path = FONT_DIR / f"{name}.ttf"
        if not path.is_file():
            raise JudgingError("The certificate fonts have not been set up yet. Run "
                               "`python3 judging.py setup-fonts` (needs `npm install` in the repo first).")
        face = RLFont(name, str(path))
        pdfmetrics.registerFont(face)
        coverage[name] = set(face.face.charToGlyph)
    return coverage
