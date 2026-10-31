"""The rubric: criteria and their marks, read from rubric.yaml.

rubric.yaml copies the names and marks of RUBRIC in src/site.ts (a test keeps them identical).
All marks are whole numbers and add up to `total` (100).
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

from common import JudgingError, TOOL_DIR

DEFAULT_PATH = TOOL_DIR / "rubric.yaml"


@dataclass(frozen=True)
class Criterion:
    id: str
    name: str
    marks: int           # the most a judge can give for this criterion

    def header(self) -> str:
        return f"{self.name} (out of {self.marks})"


@dataclass(frozen=True)
class Rubric:
    name: str
    placeholder: bool
    total: int
    criteria: tuple[Criterion, ...]


def load_rubric(path: Path = DEFAULT_PATH) -> Rubric:
    if not path.is_file():
        raise JudgingError(f"No rubric found at {path}.")
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as err:
        raise JudgingError(f"{path.name} is not valid YAML: {err}") from None

    def bad(msg: str) -> JudgingError:
        return JudgingError(f"{path.name}: {msg}")

    criteria: list[Criterion] = []
    for i, item in enumerate(raw.get("criteria") or [], start=1):
        cid, name, marks = str(item.get("id", "")).strip(), str(item.get("name", "")).strip(), item.get("marks")
        if not cid or not name:
            raise bad(f"criterion {i} needs both an id and a name")
        if not isinstance(marks, int) or isinstance(marks, bool) or marks < 1:
            raise bad(f"criterion '{cid}' needs `marks` as a whole number, 1 or more")
        if any(c.id == cid for c in criteria):
            raise bad(f"two criteria share the id '{cid}'")
        criteria.append(Criterion(cid, name, marks))
    if not criteria:
        raise bad("add at least one criterion")
    total = raw.get("total")
    if not isinstance(total, int) or isinstance(total, bool):
        raise bad("`total` must be a whole number (100)")
    if sum(c.marks for c in criteria) != total:
        raise bad(f"the marks add up to {sum(c.marks for c in criteria)}, but total says {total}")
    return Rubric(str(raw.get("name", "Rubric")), bool(raw.get("placeholder", False)), total, tuple(criteria))


def placeholder_warning(rubric: Rubric) -> str | None:
    if rubric.placeholder:
        return ("Reminder: rubric.yaml is still marked as a PLACEHOLDER. "
                "Put in the real rubric and set `placeholder: false` before real judging.")
    return None


def describe(rubric: Rubric) -> str:
    lines = [f"Rubric: {rubric.name}" + ("   [PLACEHOLDER]" if rubric.placeholder else ""),
             f"Marked out of {rubric.total}, whole marks", ""]
    lines += [f"  {c.marks:3d}  {c.name}  [{c.id}]" for c in rubric.criteria]
    return "\n".join(lines)
