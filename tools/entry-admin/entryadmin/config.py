"""Loads config.toml. Paths in it are relative to the config file's folder."""
from __future__ import annotations

import tomllib
from dataclasses import dataclass
from pathlib import Path

DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "config.toml"


class ConfigError(Exception):
    """A problem the owner can fix; shown without a traceback."""


@dataclass
class Config:
    base: Path
    raw: dict

    def path(self, key: str) -> Path:
        return (self.base / self.raw["paths"][key]).resolve()

    def __getitem__(self, section: str) -> dict:
        return self.raw[section]


def load(path: str | Path | None = None) -> Config:
    p = Path(path) if path else DEFAULT_CONFIG
    if not p.is_file():
        raise ConfigError(f"Config file not found: {p}")
    try:
        raw = tomllib.loads(p.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as e:
        raise ConfigError(f"{p.name} has a typing mistake: {e}") from e
    for section in ("paths", "entry", "codes", "email", "columns"):
        if section not in raw:
            raise ConfigError(f"{p.name} is missing the [{section}] section.")
    return Config(base=p.resolve().parent, raw=raw)
