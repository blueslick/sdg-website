# Judging toolkit

Python scripts for the part of the competition that happens after entries close. **One judge: you score every shortlisted essay yourself.** The toolkit gives you a scoring sheet, adds up your marks, ranks Junior and Open separately, and makes certificates for the winners and shortlisted entrants.

**No AI or LLM is used anywhere in this toolkit. Scoring is by people only.** The toolkit adds up your marks and sorts them. It never picks the shortlist or the winners: you type those yourself.

Everything runs on your own computer. Nothing is uploaded anywhere.

## One-time setup

You need Python 3.9 or newer (`python3 --version`) and Node (the site needs it too). From the repo folder:

```bash
npm install
```

That installs the site's fonts (Gloock, Instrument Sans, Kaushan Script), which the certificates use. Then:

```bash
cd tools/judging
python3 -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 judging.py setup-fonts    # converts the fonts for the PDFs (once; font files are never committed)
```

## Try it on fake data first

```bash
python3 demo.py
```

This makes a `demo-output/` folder (safe to delete) with 18 fake essays by "Test Student 01" to "Test Student 18" (8 Junior, 10 Open). It plays your part: triages every essay, gives marks to the Maybe and Strong ones, adds a second-reader spot check, then "chooses" 2 winners and 4 more shortlisted entrants (marked as simulated in the output) and makes their 6 certificates. At the end it prints the demo certificate codes. Open `demo-output/results.xlsx`, `demo-output/scoring.xlsx` and the PDFs in `demo-output/out/pdfs/` to look.

To check a demo code on the site's `/verify/` page on your laptop:

```bash
python3 demo.py --dev-site
cd ../..
npm run dev
```

Open the address it prints, go to `/verify/` and type one of the demo codes. (`--dev-site` writes `src/data/certificates.example.json`, which git ignores and only `npm run dev` reads.)

### Checking a demo code on a pull request's preview page

A pull request preview only contains what is in `src/data/certificates.json`, which is an empty list until real certificates exist. To see a demo code on a preview you have to put the demo records in that file, on a **throwaway branch you will never merge**:

```bash
python3 demo.py --write-site      # overwrites src/data/certificates.json with FAKE records
```

Commit that on the throwaway branch, open a pull request, type a demo code on the preview's `/verify/`, then delete the branch. If you ever do this on a real branch, put the file back with `git checkout src/data/certificates.json` before the pull request is ready: fake people must never go live.

## The real workflow

Real files go in `tools/judging/data/`, which git ignores, so they cannot be committed by accident.

```
tools/judging/data/
  essays/         the anonymised essays: ZH-001.pdf, ZH-002.pdf ...
  key.xlsx        PRIVATE: Entry ID, Name, Category, School, Country (see below)
  scoring.xlsx    made by `sheet`; you fill it in
  results.xlsx    made by `results`; you fill in Shortlist and Winner
  out/            certificates: pdfs/, certificates.json, and certificate-codes.json (names and codes)
```

The entry-admin `pack` command can make the essays folder and a `key.xlsx` for you (see `tools/entry-admin/README.md`). Copy them into `data/`.

**Add a Category column to `key.xlsx`.** Each row needs `Junior` or `Open`. The pack does not add it: work it out from each entrant's age on the deadline (Junior is 14 and under, Open is any age). The toolkit stops with a clear message if a row has no valid category. The Name column may be called `Name` or `Full name`.

### 1. Make the scoring sheet

```bash
python3 judging.py sheet
```

Makes `data/scoring.xlsx` with one row per essay and only entry IDs, never names. It refuses to overwrite a sheet that already exists (it may hold your scores).

### 2. Score the essays (in Excel)

- **Triage** every essay: `Clearly no`, `Maybe` or `Strong`.
- For **Maybe** and **Strong** essays, give a whole mark for each of the four criteria, up to the maximum shown in its column heading. The Total adds itself up (out of 100).
- Optional **spot check**: for some Clearly-no essays, a second reader can write `Agree` or `Read again`. Marks typed on a Clearly-no essay are ignored.

The rubric is in `rubric.yaml`. It is a copy of `RUBRIC` in `src/site.ts` (the site is the single source, with the approved wording), and a test fails if the names or marks ever differ. Check it any time with `python3 judging.py rubric`.

### 3. Add up the marks

```bash
python3 judging.py results
```

Makes `data/results.xlsx`:

- **Junior** and **Open** sheets: each ranked separately, highest total first, with your marks and the total out of 100. **Ties are shown, not broken**: tied essays share a rank (1, 2, 2, 4) and are flagged.
- **Shortlist (yes/no)** and **Winner (yes/no)** columns, **empty**. You fill them in yourself.
- **Not ranked**: Clearly-no essays (with the second reader's answer; "Read again" is highlighted), essays not triaged yet, and Maybe/Strong essays with a mark missing.
- **Flags** and **Notes**.

If you run `results` again after changing marks, it keeps the yes/no you already typed for each Entry ID and saves the old file as `results.previous.xlsx`.

### 4. Choose, then make the certificates

Type `yes` or `no` in the **Shortlist** and **Winner** columns of `results.xlsx`. The certificate uses the **Name** column of that sheet, so fix a spelling there if needed (English letters only; the fonts cannot print other scripts). Then:

```bash
python3 judging.py certificates --issued 2027-02-03
```

- One certificate for each winner (`Winner, Junior` / `Winner, Open`) and each other shortlisted entrant (`Shortlisted, Junior` / `Shortlisted, Open`). Someone who is both gets the Winner one only.
- Edition `Inaugural Edition: Zero Hunger`; the issue date is `--issued` (default: today).
- Each has a unique code shown as `XXXX-XXXX` and "Check it at pharosprize.org/verify/". The colours and fonts come from the site's `tokens.json`. The footer uses `SOUP_KITCHEN_NAME` from `src/site.ts`. The certificates have no signatures and no judges' names.
- The PDFs go in `data/out/pdfs/`. The encrypted list goes to `data/out/certificates.json`, **not** to the site.
- A re-run keeps the same code and date for anyone whose name and award did not change, so certificates you already sent stay valid.

### 5. Put the list on the site

When you are happy, run the same command again with `--write-site`:

```bash
python3 judging.py certificates --issued 2027-02-03 --write-site
```

That writes the encrypted records to `src/data/certificates.json`, the only place the site reads. Then commit **only that file** on a new branch and open a pull request. Merging it publishes the list. The build refuses the file if it holds anything readable.

## How the certificate list is made (no second copy of the encryption)

The toolkit has no crypto of its own. It writes the list of `{code, name, award, edition, issued}` to a temporary file inside `data/`, runs the site's own `node scripts/encrypt-certificates.mjs <plain> <out> --generate-codes --plain-out <with-codes>`, reads the codes back for the PDFs, and deletes the temporary file. The scheme (version 2: 8-character codes, slow salted PBKDF2 ids, AES-256-GCM) is defined in `src/lib/certificateScheme.ts` and documented in `src/data/README.md`, including how safe 8-character codes are. The list is sorted by its hashed ids, so its order says nothing about who placed where.

## Privacy

Everything with names or emails stays in `tools/judging/data/` (git ignores it, and a test checks that nothing there is tracked). That includes `key.xlsx`, `results.xlsx`, the certificate PDFs and `data/out/certificate-codes.json`.

**Delete tools/judging/data/ except the published names and certificate records by 3 August 2027.** (This matches the Privacy page: `DATES.entryDataDeleted` in `src/site.ts`.) Keep the encrypted `src/data/certificates.json` and the names you published.

## The files

| File | What it does |
|---|---|
| `judging.py` | The commands: `rubric`, `sheet`, `results`, `setup-fonts`, `certificates` |
| `rubric.yaml` | The four criteria and their marks (copy of `RUBRIC` in `src/site.ts`) |
| `sheet.py`, `results.py` | The scoring sheet and the ranked results |
| `certificates.py`, `fontkit.py` | The PDFs; the font conversion (`.fonts/` is git-ignored) |
| `common.py` | Shared helpers, including reading values from `src/site.ts` |
| `demo.py`, `tests/` | The fake-data demo; the tests |

## Tests

```bash
pip install -r requirements-dev.txt
python3 -m pytest tools/judging        # from the repo folder
```

They check that `rubric.yaml` matches `RUBRIC` in `src/site.ts`; that a demo certificate code opens with the site's own `decryptCertificate`; that Junior and Open are ranked separately and ties are shown; that the toolkit never fills in the shortlist or winners; that the site build accepts the encrypted list and refuses readable data; and that nothing in `data/` is tracked by git. The site's own tests (`npm test`) still need to pass too.
