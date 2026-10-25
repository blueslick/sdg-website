"""`emails`: writes draft emails to text files. Nothing is ever sent."""
from __future__ import annotations

import json
import tomllib
from pathlib import Path

from .config import Config, ConfigError
from .tracker import load_tracker, raised_flags, status_of, is_ready

KINDS = ("received", "confirmed", "problem")
RULE = "=" * 72


class _Safe(dict):
    """Unknown {placeholders} are left as typed instead of crashing, so a typo in a template is visible."""

    def __missing__(self, key):
        return "{" + key + "}"


def _fill(text: str, ctx: dict, name: str) -> str:
    try:
        return text.format_map(_Safe(ctx))
    except (ValueError, IndexError, AttributeError) as e:
        raise ConfigError(f"{name} has a stray curly bracket or a bad placeholder ({e}). "
                          "Placeholders look like {name}; for a literal bracket use {{ and }}.") from e


def _load_template(cfg: Config, filename: str) -> str:
    path = cfg.path("templates") / filename
    if not path.is_file():
        raise ConfigError(f"Template not found: {path}")
    return path.read_text(encoding="utf-8")


def _context(cfg: Config, row: dict) -> dict:
    name = str(row.get("Full name") or "").strip()
    ec = cfg["email"]
    return {
        "name": name, "first_name": name.split()[0] if name else "there",
        "entry_id": row.get("Entry ID", ""), "email": str(row.get("Email") or "").strip(),
        "words": row.get("Word count", ""), "word_limit": cfg["entry"]["word_limit"],
        "site_name": ec["site_name"], "edition": ec["edition"], "contact_email": ec["contact_email"],
        "soup_kitchen": ec["soup_kitchen"], "sign_off": ec["sign_off"],
    }


def problem_lines(cfg: Config, row: dict, messages: dict) -> list[str]:
    """One plain-English sentence per flag on the entry, from templates/flag_messages.toml."""
    ctx = _context(cfg, row)
    flags = raised_flags(row)
    lines: list[str] = []
    for key, text in flags:
        sub, _, detail = text.partition(":")
        sub = sub.strip().casefold() if detail else ""
        # "key.with_others" is the wording to use when this isn't the entry's only flag
        wanted = ([f"{key}.with_others"] if len(flags) > 1 else []) + [f"{key}.{sub}", key]
        msg = next((messages[w] for w in wanted if messages.get(w)), None)
        if not msg:
            continue
        line = _fill(msg, {**ctx, "detail": (detail or text).strip()}, "flag_messages.toml")
        if line not in lines:
            lines.append(line)
    return lines


def make_drafts(cfg: Config, kind: str, redo_all: bool = False, only: set[str] | None = None) -> dict:
    if kind not in KINDS:
        raise ConfigError(f"Unknown email type '{kind}'. Choose from: {', '.join(KINDS)}.")
    rows = load_tracker(cfg)
    template = _load_template(cfg, f"{kind}.txt")
    messages = {}
    if kind == "problem":
        messages = tomllib.loads(_load_template(cfg, "flag_messages.toml"))

    out_dir = cfg.path("emails")
    state_path = out_dir / ".drafted.json"
    state = json.loads(state_path.read_text()) if state_path.exists() else {}

    made, skipped, notes = [], 0, []
    for row in sorted(rows, key=lambda r: str(r.get("Entry ID"))):
        eid = str(row.get("Entry ID") or "")
        if only and eid not in only:
            continue
        status = status_of(row)
        if kind == "received" and status == "Rejected":
            continue
        if kind == "confirmed":
            ok, why = is_ready(row)
            if why:
                notes.append(why)
            if not ok:
                continue
        if kind == "problem":
            if status != "Pending" and not only:
                continue  # already decided: no point chasing it
            lines = problem_lines(cfg, row, messages)
            if not lines:
                continue
            fingerprint = "|".join(f"{k}={t}" for k, t in raised_flags(row))
        else:
            lines, fingerprint = [], "v1"
        if not str(row.get("Email") or "").strip():
            notes.append(f"{eid} has no email address, so no draft was made.")
            continue
        if not (redo_all or only) and state.get(f"{kind}:{eid}") == fingerprint:
            skipped += 1
            continue
        ctx = _context(cfg, row)
        ctx["problems"] = "\n".join(f"  - {l}" for l in lines)
        text = _fill(template, ctx, f"{kind}.txt").rstrip() + "\n"
        made.append((eid, text, fingerprint))

    if made:
        (out_dir / kind).mkdir(parents=True, exist_ok=True)
        for eid, text, fp in made:
            (out_dir / kind / f"{eid}.txt").write_text(text, encoding="utf-8")
            state[f"{kind}:{eid}"] = fp
        combined = f"\n{RULE}\n".join(f"[{eid}]\n{text}" for eid, text, _ in made)
        (out_dir / f"{kind}_ALL.txt").write_text(combined, encoding="utf-8")
        state_path.write_text(json.dumps(state, indent=1, sort_keys=True))
    return {"kind": kind, "made": [m[0] for m in made], "skipped_already_drafted": skipped,
            "notes": notes, "dir": out_dir}
