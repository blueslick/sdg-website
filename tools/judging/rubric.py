"""The rubric: criteria, weights and the score scale, kept in an editable rubric.yaml."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

from common import JudgingError, TOOL_DIR

DEFAULT_PATH = TOOL_DIR / "rubric.yaml"

# Written when rubric.yaml is first created. The comments are the instructions for the owner.
DEFAULT_YAML = """\
# Rubric for the essay competition.
#
# !! PLACEHOLDER !!  These criteria and weights are made up so the tools can be tested.
# Replace them with the real rubric, then change `placeholder` below to false.
# While it says true, every command prints a reminder and results.xlsx is stamped as a draft.
placeholder: true

name: "Placeholder rubric (replace me)"

# Scores judges may enter. `integer_only: true` means whole numbers only (1, 2, 3 ... 10).
scale:
  min: 1
  max: 10
  integer_only: true

# How far apart two judges' weighted totals can be before the essay is flagged.
# Same 1-10 scale as the scores, so 2 means "two points apart".
disagreement_margin: 2

# Weights are relative: 3, 2, 2, 1 is the same as 30, 20, 20, 10. They do not need to add up to 100.
# Keep each `id` short, lowercase and unchanged once judges have sheets (it links sheets to results).
criteria:
  - id: argument
    name: Argument and thesis
    description: "[PLACEHOLDER] A clear position that is argued, not just stated."
    weight: 3
  - id: evidence
    name: Evidence and examples
    description: "[PLACEHOLDER] Specific, relevant support for the argument."
    weight: 2
  - id: justice
    name: Social-justice insight
    description: "[PLACEHOLDER] Understands who is affected and why, beyond the headline."
    weight: 2
  - id: structure
    name: Structure and clarity
    description: "[PLACEHOLDER] Easy to follow from first line to last."
    weight: 2
  - id: voice
    name: Originality and voice
    description: "[PLACEHOLDER] Sounds like a real person with something to say."
    weight: 1
"""


@dataclass(frozen=True)
class Criterion:
    id: str
    name: str
    description: str
    weight: float


@dataclass(frozen=True)
class Rubric:
    name: str
    placeholder: bool
    scale_min: int
    scale_max: int
    integer_only: bool
    margin: float
    criteria: tuple[Criterion, ...]

    @property
    def total_weight(self) -> float:
        return sum(c.weight for c in self.criteria)

    def weighted_total(self, scores: dict[str, float]) -> float:
        """Weighted average of the scores, on the same scale as the criteria (10 is perfect)."""
        return sum(c.weight * scores[c.id] for c in self.criteria) / self.total_weight

    def header(self, criterion: Criterion) -> str:
        return f"{criterion.name} (x{criterion.weight:g})"


def write_default(path: Path = DEFAULT_PATH, force: bool = False) -> bool:
    """Create rubric.yaml. Returns False (and changes nothing) if it exists and force is off."""
    if path.exists() and not force:
        return False
    path.write_text(DEFAULT_YAML, encoding="utf-8")
    return True


def load_rubric(path: Path = DEFAULT_PATH) -> Rubric:
    if not path.is_file():
        raise JudgingError(
            f"No rubric found at {path}. Run:  python judging.py rubric   to create one."
        )
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as err:
        raise JudgingError(f"{path.name} is not valid YAML: {err}") from None

    def bad(msg: str) -> JudgingError:
        return JudgingError(f"{path.name}: {msg}")

    scale = raw.get("scale") or {}
    lo, hi = scale.get("min", 1), scale.get("max", 10)
    if not (isinstance(lo, int) and isinstance(hi, int) and lo < hi):
        raise bad("scale needs whole numbers with min lower than max (e.g. min: 1, max: 10)")
    margin = raw.get("disagreement_margin", 2)
    if not isinstance(margin, (int, float)) or margin < 0:
        raise bad("disagreement_margin must be a number, 0 or more")

    criteria: list[Criterion] = []
    for i, item in enumerate(raw.get("criteria") or [], start=1):
        cid = str(item.get("id", "")).strip()
        name = str(item.get("name", "")).strip()
        weight = item.get("weight")
        if not cid or not name:
            raise bad(f"criterion {i} needs both an id and a name")
        if not isinstance(weight, (int, float)) or isinstance(weight, bool) or weight <= 0:
            raise bad(f"criterion '{cid}' needs a weight greater than 0")
        if any(c.id == cid for c in criteria):
            raise bad(f"two criteria share the id '{cid}'")
        criteria.append(Criterion(cid, name, str(item.get("description", "")).strip(), float(weight)))
    if not criteria:
        raise bad("add at least one criterion")

    return Rubric(
        name=str(raw.get("name", "Rubric")),
        placeholder=bool(raw.get("placeholder", False)),
        scale_min=lo,
        scale_max=hi,
        integer_only=bool(scale.get("integer_only", True)),
        margin=float(margin),
        criteria=tuple(criteria),
    )


def placeholder_warning(rubric: Rubric) -> str | None:
    if rubric.placeholder:
        return ("Reminder: rubric.yaml is still marked as a PLACEHOLDER. "
                "Replace the criteria and set `placeholder: false` before real judging.")
    return None


def describe(rubric: Rubric) -> str:
    lines = [f"Rubric: {rubric.name}"
             + ("   [PLACEHOLDER]" if rubric.placeholder else ""),
             f"Scale: {rubric.scale_min}-{rubric.scale_max}"
             + (" (whole numbers)" if rubric.integer_only else " (decimals allowed)"),
             f"Disagreement margin: {rubric.margin:g}", ""]
    total = rubric.total_weight
    for c in rubric.criteria:
        lines.append(f"  {c.weight / total:5.1%}  {c.name}  [{c.id}]")
        if c.description:
            lines.append(f"          {c.description}")
    return "\n".join(lines)
