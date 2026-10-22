"""Encrypt each certificate record so certificates.json holds no readable names.

Each record can only be opened by someone who knows that certificate's code. The website's
verify page does the same steps in the browser with WebCrypto (README.md has a reference snippet).

Format of certificates.json: an array of
    {"id": <hex>, "iv": <base64>, "data": <base64>}
sorted by id, where, for a certificate with code C:

    normalised = C with whitespace and dashes removed, upper-cased
    id         = SHA-256(UTF-8 of normalised), lower-case hex, 64 characters
    key        = PBKDF2-HMAC-SHA256(password=normalised, salt="pharos-certificate-v1",
                                    iterations=200000, length=32 bytes)
    iv         = 12 random bytes, base64
    data       = base64( AES-256-GCM(key, iv, plaintext) )   # ciphertext followed by the 16-byte tag,
                                                             # exactly what WebCrypto decrypt() expects
    plaintext  = UTF-8 JSON {"name", "award", "edition", "issued"}   # issued is YYYY-MM-DD
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import re

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

SALT = b"pharos-certificate-v1"
ITERATIONS = 200_000
PAYLOAD_FIELDS = ("name", "award", "edition", "issued")

# Same characters the verify page strips: whitespace (including non-breaking spaces and the BOM)
# and every dash lookalike: hyphen-minus, hyphen, non-breaking hyphen, figure dash, en dash,
# em dash, minus sign.
_STRIP = re.compile(r"[\s﻿\-‐‑‒–—−]")


def normalise_code(code: str) -> str:
    return _STRIP.sub("", code).upper()


def record_id(code: str) -> str:
    return hashlib.sha256(normalise_code(code).encode("utf-8")).hexdigest()


def _key(code: str) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", normalise_code(code).encode("utf-8"), SALT, ITERATIONS, 32)


def seal(code: str, payload: dict[str, str]) -> dict[str, str]:
    plaintext = json.dumps({f: payload[f] for f in PAYLOAD_FIELDS}, ensure_ascii=False).encode("utf-8")
    iv = os.urandom(12)
    data = AESGCM(_key(code)).encrypt(iv, plaintext, None)
    return {"id": record_id(code),
            "iv": base64.b64encode(iv).decode("ascii"),
            "data": base64.b64encode(data).decode("ascii")}


def unseal(code: str, record: dict[str, str]) -> dict[str, str] | None:
    """Open a record with a code. Returns None if the code is wrong. Used by the tests."""
    if record["id"] != record_id(code):
        return None
    try:
        plaintext = AESGCM(_key(code)).decrypt(base64.b64decode(record["iv"]), base64.b64decode(record["data"]), None)
    except Exception:
        return None
    return json.loads(plaintext.decode("utf-8"))
