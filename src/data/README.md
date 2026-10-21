# Certificate data

`certificates.json` is an array of **encrypted records**, written by the judging tool:

```json
[{ "id": "<64 hex>", "iv": "<base64>", "data": "<base64>" }]
```

It is built into the `/verify/` page, so it is public. Names, awards and codes are never in it as plain text: each record is locked with a key made from its own certificate code, so it only opens for someone who has that code. The build stops if the file has anything but `id`, `iv` and `data`.

## The scheme (version 2)

The code that does all of this is `src/lib/certificateScheme.ts`. The page, the build check, the encrypt script and the tests use it, so it is the reference. Version 2 replaced version 1 (long codes, plain SHA-256 ids), so any file made for version 1 must be made again.

**Codes.** 8 characters shown as `XXXX-XXXX`, from the 32-character Crockford base32 alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (0-9 and A-Z without I, L, O, U, so no look-alikes). Generate them randomly, with every character equally likely. The encrypt script can do this (see below).

For a certificate code `C`:

| Step | What | Detail |
|---|---|---|
| 1 | Normalise | `n` = `C` in UPPER CASE with every space and dash removed, then `O` read as `0` and `I` and `L` read as `1`. Dashes include the hyphen `-` and `‐ ‑ ‒ – — −` (U+2010 to U+2014, U+2212). |
| 2 | Find | `id` = PBKDF2-HMAC-SHA-256 with password `n` (UTF-8), salt `pharos-certificate-id-v2` (UTF-8), **100,000** iterations, 32 bytes, written as 64 lower-case hex characters. |
| 3 | Key | PBKDF2-HMAC-SHA-256 with password `n` (UTF-8), salt `pharos-certificate-key-v2` (UTF-8), **100,000** iterations, 32 bytes (AES-256). |
| 4 | Lock | AES-256-GCM with a fresh random 12-byte `iv` for every record, no additional data, over the UTF-8 JSON `{"name","award","edition","issued"}` (all strings; key order and spacing don't matter). |
| 5 | Write | `iv` = base64 of the 12 bytes. `data` = base64 of the ciphertext **followed by the 16-byte GCM tag** (what Web Crypto and most libraries return). Standard base64 with `=` padding. |

`issued` is best as `YYYY-MM-DD`; the page shows it as "1 December 2026". Any other text is shown as it is.

The page only does the slow steps for text that is 8 characters from the alphabet after step 1. Anything else was never issued, so it is "not found" straight away.

### Test vector

Code `k7qm-4txd` (so `n` = `K7QM4TXD`), `iv` bytes `00 01 02 … 0b`, details
`{"name":"Test Student One","award":"Test Award: First Place","edition":"Test Edition","issued":"2026-12-01"}`
(compact JSON, no spaces) give exactly:

```json
{
  "id": "bd10365842b7e9a68c264095a94d962f12423b0ba3305dab620178ece7c94377",
  "iv": "AAECAwQFBgcICQoL",
  "data": "mMJoco65aim+H0NVniCufwmk4uECmuphQ0QqhWj0jHwAsXmwlVQoxyIq9z1Grya23G+kIIp0dSc6fQher4oa4C65JUNw6wxTMD3GuQawi6YnsC6fd+oeeBo6XGcg//IS7Aq6u9zeUwqwNnFtAA/CBQM/+kRZHjF70NCp+A=="
}
```

A tool that gets this output matches the site. (`tests/scheme.spec.ts` checks it, and it was reproduced separately in Python with `hashlib.pbkdf2_hmac` and `cryptography`'s `AESGCM`.)

## How safe are 8-character codes?

An 8-character code has 40 bits: about 1.1 trillion possibilities. The record ids are public, so someone with the page can try guesses against them offline. The slow id (100,000 PBKDF2 rounds) makes each guess expensive, but it does not make guessing impossible. A rough estimate, assuming one modern graphics card does about 15,000 guesses a second at this cost (an assumption, not measured here; real figures depend on the hardware):

| Certificates in the file | Time to find the first valid code, one graphics card |
|---|---|
| 100 | about 8 days |
| 1,000 | about 20 hours |

Trying every code in the whole space would take over two years per card. Every guess is checked against all records at once, because they share one salt. So this stops casual enumeration, but not a determined attacker who rents some hardware. The levers, if that matters: **longer codes** (each extra character makes it 32 times harder; 10 characters is 1,000 times harder) or **more iterations** (doubling them doubles the cost, and doubles the wait on a phone, see below). Anyone who holds a code can open that one certificate, and anyone can tell how many certificates exist.

## Speed in the browser

The page works out the id (one slow step) and finds the record. Only if there is one does it work out the key (a second slow step) and open it. In headless Chromium on a 2.8 GHz server CPU, one step takes about 50 ms at 100,000 iterations (about 90 ms at 200,000). Measured on the real page, from pressing Check to the result: a valid code takes about 0.11 second, a wrong well-formed code about 0.06 second, and text that isn't shaped like a code is instant. The browser runs the two steps one after the other, not side by side. I could not test a real phone. If one is 3 to 4 times slower than this machine, a valid code would take about 0.35 to 0.45 second. At 200,000 iterations a valid code took about 0.23 second here, which is why it was not kept. If the iteration count ever changes, measure again.

## Making the file

```
node scripts/encrypt-certificates.mjs <plain.json> <certificates.json>
node scripts/encrypt-certificates.mjs <plain.json> <certificates.json> --generate-codes --plain-out <with-codes.json>
```

`<plain.json>` is an array of `{ "name", "award", "edition", "issued" }` plus `"code"` where you already have one. With `--generate-codes`, entries without a code get a random one, and the full list with the codes is saved to `--plain-out`: that is the only place the codes exist, so print the certificates from it. Keep both plain files **out of the repo**; only the encrypted `certificates.json` belongs here. The script refuses codes that aren't in the format, and repeated codes.

## Trying it out

Make a plain file of fake entries **outside the repo** (`[{ "name", "award", "edition", "issued" }]`), then

```
node scripts/encrypt-certificates.mjs my-fake-entries.json src/data/certificates.example.json --generate-codes --plain-out my-fake-entries-with-codes.json
npm run dev
```

and type one of the codes from `my-fake-entries-with-codes.json` on `/verify/`.

`certificates.example.json` is git-ignored and only `npm run dev` reads it; `npm run build` never does. `npm test` builds its own copy of the site with its own fake entries.
