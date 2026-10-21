# Judging toolkit

Python scripts for the part of the competition that happens after entries close: scoring sheets for judges, a ranked results file, and PDF certificates with verification codes. It lives in its own folder and imports nothing from the rest of the repo; it only *reads* `tokens.json` and `fonts/` so certificates match the site.

Everything runs on your own computer. Nothing is uploaded anywhere.

## One-time setup

You need Python 3.9 or newer (`python3 --version`). From the repo folder:

```
cd tools/judging
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

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

Writes one PDF per entrant to `data/certificates/` and `certificates.json` for the website's verify page:

```json
[{"code": "PH-ZH-7K4Q", "name": "...", "award": "Winner",
  "edition": "Inaugural Edition: Zero Hunger", "issued": "2026-10-21"}]
```

Each certificate is A4 landscape, set in Fraunces, Inter and IBM Plex Mono with the light-theme colours from `tokens.json`, and carries its code and "Verify at [site]/verify/". The site name comes from `src/site.ts`, so a rename there carries through.

`certificates.yaml` controls who gets what:

- **Awards by rank**: Winner = rank 1, Runner-up = the next 2, Highly Commended = the next 5, everyone else gets Participation. Change the counts, names and wording there. Tied entries share a rank, so a tie can award slightly more people than the count.
- **Codes** are `PH-ZH-` plus four random characters (no 0/O/1/I/L). Re-running keeps each person's code, so certificates already sent stay valid. If someone's award or name changes, they get a new code and the old one is dropped. The private record is `certificates-ledger.json`. Don't delete it between runs.
- **Issue date** is today; use `--issued 2026-10-21` to set it.

#### Before you send real certificates

- Fill in the placeholders in `certificates.yaml`: `site` (the website address) and, only once written permission arrives, the soup kitchen's name in `footer`. The command warns while any `[bracketed]` text would be printed.
- Names the fonts can't draw (Chinese, Arabic, Tamil and other non-Latin scripts) stop the run before anything is written, and tell you which entries. Fraunces covers Latin letters only. Use a Latin spelling in `key.xlsx` or ask the owner what to do.
- **`certificates.json` contains real names and is meant to be published.** Entrants may be under 18 and Malaysia's PDPA applies, so make sure entrants (or their parents) have agreed to this on the entry form first. Consider whether the verify page should look up one code at a time instead of shipping the whole list.
- Resolve the flags in `results.xlsx` first. `certificates` warns about placed entries that are still flagged.

## Tests

```
pip install -r requirements-dev.txt
python3 -m unittest discover -s tests
```

Runs the whole pipeline on fake data, including the deliberate disagreement, an incomplete sheet and an out-of-range score.

## Files

| File | Job |
|---|---|
| `judging.py` | The command-line entry point |
| `rubric.yaml` / `rubric.py` | The rubric and its loader |
| `certificates.yaml` / `certificates.py` | Certificate settings, codes, PDF drawing |
| `sheets.py`, `results.py` | Scoring sheets and results |
| `fontkit.py` | Turns the site's `.woff2` fonts into fixed-weight fonts for PDFs (cached in `.fontcache/`) |
| `common.py` | Shared helpers |
| `demo.py`, `tests/` | Fake-data demo and tests |
