"""Turn the website's .woff2 fonts into static TrueType fonts that reportlab can embed.

The site ships Fraunces and Inter as *variable* fonts (one file, every weight). PDF libraries
need one fixed weight per font, so we cut the weights we need out of the variable files and
cache them in .fontcache/. IBM Plex Mono is already a single weight and is just converted.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLFont

from common import TOOL_DIR, Tokens

CACHE_DIR = TOOL_DIR / ".fontcache"

# name -> (family in tokens.json, axis values). These mirror the type styles in tokens.json:
# "display" is Fraunces 400 at optical size 96, "heading" is 500 at 36; body is Inter 400.
# Fraunces' SOFT and WONK axes are switched on for display type, as the design README suggests.
FACES: dict[str, tuple[str, dict[str, float]]] = {
    "PharosDisplay": ("Fraunces", {"wght": 400, "opsz": 96, "SOFT": 50, "WONK": 1}),
    "PharosHeading": ("Fraunces", {"wght": 500, "opsz": 36, "SOFT": 50, "WONK": 1}),
    "PharosSans": ("Inter", {"wght": 400, "opsz": 14}),
    "PharosSansMedium": ("Inter", {"wght": 600, "opsz": 14}),
    "PharosMono": ("IBM Plex Mono", {}),
}


def _static_font(source: Path, axes: dict[str, float], target: Path) -> None:
    font = TTFont(source)
    if "fvar" in font:
        # Pin every axis, otherwise the leftovers stay variable and PDFs would show the default.
        location = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
        for tag, value in axes.items():
            if tag in location:
                location[tag] = value
        font = instancer.instantiateVariableFont(font, location)
    font.flavor = None
    font.save(target)


def register_fonts(tokens: Tokens) -> dict[str, set[int]]:
    """Register the Pharos faces with reportlab. Returns {face: set of supported code points}."""
    CACHE_DIR.mkdir(exist_ok=True)
    coverage: dict[str, set[int]] = {}
    for name, (family, axes) in FACES.items():
        source = tokens.font_file(family)
        stamp = f"{source.stat().st_size}-{int(source.stat().st_mtime)}-{sorted(axes.items())}"
        target = CACHE_DIR / f"{name}-{hashlib.sha1(stamp.encode()).hexdigest()[:10]}.ttf"
        if not target.exists():
            _static_font(source, axes, target)
        face = RLFont(name, str(target))
        pdfmetrics.registerFont(face)
        coverage[name] = set(face.face.charToGlyph)
    return coverage
