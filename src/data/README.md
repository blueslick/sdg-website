# Certificate data

`certificates.json` is an array of **encrypted records**, written by the judging tool:

```json
[{ "id": "<64 hex>", "iv": "<base64>", "data": "<base64>" }]
```

It is built into the `/verify/` page, so it is public. Names, awards and codes are never in it as plain text: each record is locked with a key made from its own certificate code, so it only opens for someone who has that code. The build stops if the file has anything but `id`, `iv` and `data`.

## The scheme

The code that does all of this is `src/lib/certificateScheme.ts`. The page, the build check and the tests use it, so it is the reference. For a certificate code `C`:

| Step | What | Detail |
|---|---|---|
| 1 | Normalise | `n` = `C` in UPPER CASE with every space and dash removed. Dashes include the hyphen `-` and `‐ ‑ ‒ – — −` (U+2010 to U+2014, U+2212). |
| 2 | Find | `id` = SHA-256 of `n` (UTF-8 bytes), as 64 lower-case hex characters. |
| 3 | Key | PBKDF2-HMAC-SHA-256 with password `n` (UTF-8), salt `pharos-certificate-v1` (UTF-8), **100,000** iterations, giving 32 bytes (AES-256). |
| 4 | Lock | AES-256-GCM with a fresh random 12-byte `iv` for every record, no additional data, over the UTF-8 JSON `{"name","award","edition","issued"}` (all strings; key order and spacing don't matter). |
| 5 | Write | `iv` = base64 of the 12 bytes. `data` = base64 of the ciphertext **followed by the 16-byte GCM tag** (what Web Crypto and most libraries return). Standard base64 with `=` padding. |

`issued` is best as `YYYY-MM-DD`; the page shows it as "1 December 2026". Any other text is shown as it is.

### Test vector

Code `test-ab12-cd34` (so `n` = `TESTAB12CD34`), `iv` bytes `00 01 02 … 0b`, details
`{"name":"Test Student One","award":"Test Award: First Place","edition":"Test Edition","issued":"2026-12-01"}`
(compact JSON, no spaces) give exactly:

```json
{
  "id": "ffb20b3b20c86ffe42924da1fd54b68439a9f921a992b2f0c9725fced2fe5fd4",
  "iv": "AAECAwQFBgcICQoL",
  "data": "Gz6lwgQtJLWEiq9a/X+x/veBn8112YiLKO5+/sUMDR5+PPL5gOVqniDtCYv/OOEKMSnrl2ZymOvbhjKTZxljF0J/QcoPcFoLQ+vcYcXELK2FzfWqmm6AiVogFF7yz2TTmN5k4ShxPeW70eD6FWTDlJDhqnNg3Nhf6JCkaw=="
}
```

A tool that gets this output matches the site. (`tests/scheme.spec.ts` checks it, and it was reproduced separately in Python with `hashlib.pbkdf2_hmac` and `cryptography`'s `AESGCM`.) `scripts/encrypt-certificates.mjs` turns a plain list into this file.

## Codes must be long and random

The `id` is a plain SHA-256, so anyone who has the page can try guesses against it quickly. The extra work in step 3 does not slow that down. What keeps the details private is the code itself. Use at least 16 random characters from a 32-letter-and-number alphabet (80 bits), for example `K7QM-4TXD-9W2P-HB5N`. Short or guessable codes (names, `0001`, `2026-A`) can be found by guessing.

Also: anyone who holds a code can open that one certificate, and anyone can tell how many certificates exist.

## Trying it out

Make a plain file of fake entries **outside the repo** (`[{ "code", "name", "award", "edition", "issued" }]`), then

```
node scripts/encrypt-certificates.mjs my-fake-entries.json src/data/certificates.example.json
npm run dev
```

`certificates.example.json` is git-ignored and only `npm run dev` reads it; `npm run build` never does. `npm test` builds its own copy of the site with its own fake entries.
