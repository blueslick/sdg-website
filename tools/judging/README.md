# Judging toolkit

Python scripts for the part of the competition that happens after entries close: scoring sheets for judges, a ranked results file, and PDF certificates with verification codes. It lives in its own folder and imports nothing from the rest of the repo. It only *reads* `tokens.json` (colours) and the Fontsource fonts the site already installs, so certificates match the site.

Everything runs on your own computer. Nothing is uploaded anywhere.

> **Needs the real Pharos site.** The certificate colours and fonts come from the site's `tokens.json` (peach, cream, plum ...) and `node_modules`. The sheets and results commands work on their own; `certificates` needs the site's `tokens.json` in the repo root, so use it once the site is merged. Until then, pass `--repo-root` pointing at a checkout of the site (e.g. `python3 judging.py --repo-root ../site certificates`).

## One-time setup

You need Python 3.9 or newer (`python3 --version`) and Node (the site already needs it). From the repo folder:

```
npm install                       # installs the site's fonts (Fontsource) into node_modules
cd tools/judging
python3 -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 judging.py setup-fonts    # converts Gloock, Instrument Sans, Kaushan Script to TTF
```

`setup-fonts` writes the converted fonts into `tools/judging/.fonts/`, which git ignores. **Font files are never committed.** Re-run it if the site's fonts change.

Try it on fake data first (12 invented essays, 3 invented judges, one deliberate disagreement):

```
python3 demo.py
```

That makes a `demo-output/` folder to look at: scoring sheets, `results.xlsx`, and certificates. Delete it whenever you like.

## Where your real files go

Real data goes in `tools/judging/data/`, which git ignores, so it can't be committed by accident.

```
tools/judging/data/
  essays/       the anonymised essays: ZH-001.pdf, ZH-002.pdf ...
  key.xlsx      PRIVATE. Columns: Entry ID, Name, Email, School, Country
  sheets/       made by `sheets` (send these to judges)
  returned/     put the judges' completed sheets here
  results.xlsx  made by `results` (private: has names)
  certificates/ made by `certificates`
```

Every path can be changed with an option (`--help` on any command shows them). Names and emails live only in `key.xlsx`. They are joined to the entry IDs in `results.xlsx` and nowhere earlier.

## The four steps

Run these from `tools/judging/`.

### 1. `rubric`: set the scoring criteria

```
python3 judging.py rubric
```

Creates `rubric.yaml` if it doesn't exist, checks it, and prints a summary. Open `rubric.yaml` in any text editor to change criteria, weights, the 1-10 scale and the disagreement margin.

**The criteria in the file now are placeholders** (marked `placeholder: true`). Replace them with the real rubric, then set `placeholder: false`. Until then every command reminds you and `results.xlsx` says it is a draft. Don't change a criterion's `id` after sheets have gone out.

Weights are relative. A weighted total is `sum(weight x score) / sum(weights)`, so it stays on the 1-10 scale and 10 means a perfect score on every criterion.

### 2. `sheets`: one scoring sheet per judge

```
python3 judging.py sheets --judges "A,B,C"
```

Makes `scoring_A.xlsx`, `scoring_B.xlsx`, ... in `data/sheets/`. Each lists every entry ID, a column per criterion, and a comments column. Score cells only accept whole numbers from 1 to 10 (a pop-up stops anything else). Entry IDs are locked so they can't be changed by accident (no password, it's a guard against slips, not security).

To give each essay to only some of the judges:

```
python3 judging.py sheets --judges "A,B,C,D,E" --per-essay 3
```

Each essay goes to 3 judges, and workloads are kept within one essay of each other. Add `--seed 1` to make the split repeatable.

Send each judge only their own file. Put the returned files in `data/returned/`. Keep the `assignments.json` that `sheets` writes next to the sheets: it lets `results` notice a judge who never sent a sheet back.

### 3. `results`: rank everything

```
python3 judging.py results
```

Reads every sheet in `data/returned/`, then writes `data/results.xlsx` with:

| Sheet | What it shows |
|---|---|
| Results | Rank, entry ID, name, school, country, average, each judge's total, spread, flags |
| Flags | Everything to look at before announcing anything |
| Disagreements | For each flagged essay, every judge's scores and comments (IDs only, no names) |
| Notes | How the numbers were worked out |

Things it flags:

- **Disagreement**: the highest and lowest judge totals for an essay differ by more than the margin (default 2, set in `rubric.yaml`, or use `--margin 1.5`).
- **Incomplete sheet**: a judge left a row blank or only part-filled. That judge's row is left out of the average.
- **Fewer judges**: an essay's average uses fewer judges than were assigned.
- **Invalid score**: a number outside the scale got in anyway (e.g. pasted over the pop-up check). Treated as blank.
- **Missing sheet**, **Not judged**, **Not in key**, **No essay**, **Tie**.

Ties share a rank (1, 2, 2, 4). Scores are not adjusted for judges who mark harder or easier than others.

If your judging panel decides a different order after discussing the flags, edit the **Rank** column in `results.xlsx` by hand. `certificates` reads the ranks from that file.

### 4. `certificates`: PDFs and the verify list

```
python3 judging.py certificates
```

Writes one PDF per entrant to `data/certificates/` and `certificates.json` for the website's verify page. **`certificates.json` contains no readable names**: every record is encrypted, and only the certificate's own code can open it (details below).

Each certificate is A4 landscape and follows the site: peach ground, the plum slab with its round corner and rings, the award in Gloock, text in Instrument Sans, the "Pharos" wordmark in Kaushan Script, and the one edition-coloured disc. All colours come from `tokens.json`; the fonts are the converted ones from `setup-fonts`. The organisation name comes from `src/site.ts`, so a rename there carries through.

`certificates.yaml` controls who gets what and what is printed:

- **Awards by rank**: Winner = rank 1, Runner-up = the next 2, Highly Commended = the next 5, everyone else gets Participation. Tied entries share a rank, so a tie can award slightly more people than the count.
- **Website address**: `site` (now `https://pharos-prize.web.app`) is the only place it is set. When a custom domain arrives, change that one line. It prints as "Verify at <site>/verify/".
- **Codes** are `PH-ZH-` plus random characters (no 0/O/1/I/L). `code_length: 4` gives `PH-ZH-7K4Q`; `8` gives `PH-ZH-7K4Q-X9MD`. Re-running keeps each person's code (and their encrypted record), so certificates already sent stay valid. If someone's award or name changes, they get a new code and the old one is dropped. The private record of codes is `certificates-ledger.json`: don't delete it between runs, and don't publish it.
- **Issue date** is today; use `--issued 2026-10-21` to set it.

To put the file on the site: `python3 judging.py certificates --json-out ../../src/data/certificates.json`.

#### The format of `certificates.json`

An array of records, sorted by `id` (so the order says nothing about who placed where):

```json
[{"id": "7f9d66...", "iv": "kQPoaHsleRDN7Sjx", "data": "SM6hkBIi5zq..."}]
```

For a certificate with code `C` (say `PH-ZH-7K4Q`):

| Step | Definition |
|---|---|
| Normalise | Remove whitespace and dashes (hyphen, non-breaking hyphen, figure dash, en dash, em dash, minus sign), then upper-case. `ph-zh 7k4q` and `PH–ZH—7K4Q` both become `PHZH7K4Q`. This is the same rule as `src/lib/certificateCode.ts` on the verify page. |
| `id` | SHA-256 of the UTF-8 normalised code, as 64 lower-case hex characters. The page uses it to find the record. |
| Key | PBKDF2-HMAC-SHA256 of the normalised code, salt `pharos-certificate-v1`, 200,000 iterations, 32 bytes. |
| `iv` | 12 random bytes, base64. |
| `data` | AES-256-GCM of the payload, base64. It is the ciphertext followed by the 16-byte tag, which is exactly what WebCrypto's `decrypt` takes. No additional data. |
| Payload | UTF-8 JSON `{"name", "award", "edition", "issued"}`. `issued` is `YYYY-MM-DD`; the page formats it for display. |

The verify page does these steps in the browser. `verify-reference.mjs` is a working reference (WebCrypto) that the tests run under Node against real output, so what Python encrypts is proven to open in a browser. Its core is:

```js
const id = toHex(await crypto.subtle.digest('SHA-256', enc.encode(normalised)));
const record = records.find((r) => r.id === id);           // not found -> "We couldn't find that code"
const password = await crypto.subtle.importKey('raw', enc.encode(normalised), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('pharos-certificate-v1'), iterations: 200000 },
  password, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(record.iv) }, key, fromBase64(record.data));
const { name, award, edition, issued } = JSON.parse(new TextDecoder().decode(plain));
```

If the format ever changes, change the salt's version (`pharos-certificate-v1`) in `sealing.py` and in the page together.

**Heads-up: the verify page on the unmerged PR for `/verify/` currently reads the old plain list (`{code, name, award, edition, issued}`). It needs to be changed to this format before the real `certificates.json` goes on the site.**

#### How private is `certificates.json`?

Honest answer, so you can decide:

- **What it does:** nobody can read a name by opening the file or the page source. The page only reveals a record to someone who types that exact code. That stops casual snooping and search engines.
- **What it does not do:** the code is short, so a determined person with a script could try every possible code against the public file. With 4 random characters there are only about 900,000 codes, which a computer tries in seconds (the `id` is a plain SHA-256, and the slow key step does not help once the code is known). So it is a lock on the door, not a vault.
- **How to make it much stronger:** set `code_length` to a bigger number in `certificates.yaml` (8 gives about a trillion codes: slow, but still within reach of a determined attacker with a graphics card; 12 gives about 10^18, which is safe against guessing, though long to type). That is a one-line change and nothing else has to change. The longer the code, the safer the names of entrants who may be under 18.
- Entries only appear in the file if they get a certificate; the number of records (not who they belong to) is visible.

#### Before you send real certificates

- Keep `[Soup Kitchen Name]` in the `footer` of `certificates.yaml` until written permission arrives. The command warns while any `[bracketed]` text would be printed.
- Names must be in English letters (the entry form asks for this). If a name has characters the font can't draw, the run stops before writing anything and says which entries: change them to the English spelling in `key.xlsx`, re-run `results`, then `certificates`.
- Resolve the flags in `results.xlsx` first. `certificates` warns about placed entries that are still flagged.
- `certificates-ledger.json` and the PDFs contain real names. They stay in `data/` (git-ignored).

## Placeholders and decisions

Rows for the site's `PLACEHOLDERS.md` (that file is part of the site, not of this folder):

| Item | Where | State |
|---|---|---|
| Rubric criteria, descriptions, weights | `tools/judging/rubric.yaml` (`placeholder: true`) | Placeholder. Replace with the real rubric, then set `placeholder: false` |
| `[Soup Kitchen Name]` on certificates | `tools/judging/certificates.yaml`, `footer:` | Placeholder. Leave until written permission arrives |
| Website address on certificates | `tools/judging/certificates.yaml`, `site:` | Filled in: `https://pharos-prize.web.app`. One line to change for a custom domain |
| Awards | `tools/judging/certificates.yaml`, `awards:` | Decided: 1 Winner, 2 Runner-up, 5 Highly Commended, everyone else Participation |
| Code length | `tools/judging/certificates.yaml`, `code_length:` | 4 for now. See "How private is certificates.json?" |

## Tests

```
pip install -r requirements-dev.txt
python3 -m unittest discover -s tests
```

Runs the whole pipeline on fake data, including the deliberate disagreement, an incomplete sheet and an out-of-range score, and checks that encrypted records open with the browser reference. The certificate tests need the real site (its `tokens.json` and `npm install` done); if the repo root isn't that, point them at one with `PHAROS_SITE_DIR=/path/to/site`, otherwise they are skipped.

## Files

| File | Job |
|---|---|
| `judging.py` | The command-line entry point |
| `rubric.yaml` / `rubric.py` | The rubric and its loader |
| `certificates.yaml` / `certificates.py` | Certificate settings, codes, PDF drawing |
| `sealing.py` | Encrypts each record of `certificates.json` |
| `verify-reference.mjs` | Browser-side reference for the verify page (WebCrypto) |
| `sheets.py`, `results.py` | Scoring sheets and results |
| `fontkit.py` | `setup-fonts`: turns the site's Fontsource `.woff2` fonts into TTF for PDFs (in `.fonts/`, git-ignored) |
| `common.py` | Shared helpers |
| `demo.py`, `tests/` | Fake-data demo and tests |
