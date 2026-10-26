# Entry admin toolkit

Turns the **Tally submissions export** into everything you need to process entries: a tracker spreadsheet, email drafts, fee-support codes and an anonymous judging folder. It runs on your own computer, never sends anything and never uploads anything. It works with Excel files (`.xlsx`).

## One-time setup

1. Install Python 3.11 or newer from python.org (tick "Add Python to PATH" on Windows).
2. Open a terminal in this folder (`tools/entry-admin`) and type:
   ```
   pip install -r requirements.txt
   ```
3. Make the folders for your real data. Everything private lives in `work/`, which Git is set to ignore, so it can't be uploaded to GitHub by accident:
   ```
   work/submissions.csv     <- the Tally export, renamed to this
   work/downloads/          <- the essays (and anything else) you downloaded from Tally
   ```
   (You can change these names in `config.toml`, or pass `--csv` and `--files`.)

On Mac/Linux type `python3` where this guide says `python`.

## The four commands

```
python entry_admin.py codes generate 20
python entry_admin.py process
python entry_admin.py emails
python entry_admin.py pack
```

### 1. `codes generate N`: fee-support codes
Makes N new codes like `K7MQ-X3TD` (never containing 0, O, 1, I or L, so they can't be misread) and adds them to `work/codes.xlsx`. Running it again **adds** more; it never replaces or repeats codes. Columns: Code, Issued to, Email, Date issued, Used by submission. You type the first four when you hand a code out. `process` fills in the last one.

### 2. `process`: build the tracker
Reads the CSV and builds `work/tracker.xlsx`, one row per entry, with an entry ID (`ZH-001`, `ZH-002`...). Entries are numbered in the order they were submitted, and **an entry keeps its ID forever**.

**Flags** (colour-coded, and blank when nothing is wrong):

| Column | Raised when | Colour |
|---|---|---|
| Over word limit | more than 800 words | red |
| PDF problem | the essay answer isn't a PDF upload (blank, text, a link or another file type such as .docx), the file isn't in the downloads folder, it is damaged or password-protected, it is a scan/photo (no text), or two entries matched the same file | red |
| Duplicate entrant | same email or same name as another entry (case and spaces ignored) | amber |
| Non-Latin name | the name has letters that aren't Latin script (e.g. Chinese, Arabic, Cyrillic). The form asks for English letters only. Accented Latin letters such as é are not flagged. | amber |
| Age unclear | age missing or not a number. There is no upper age limit (the Open category is for students of any age) | red |
| Fee code problem | half fee chosen and the code is missing, not on `codes.xlsx`, or already used. Also raised if the fee answer is neither of the two options on the form. | red |
| No proof of payment | the Payment screenshot question is empty | red |
| Duplicate transfer reference | same transfer reference as another entry | red |

Red means fix or ask before confirming. Amber means have a look: it may be fine (someone who accidentally submitted twice). The **Key** sheet in the workbook repeats this.

**Your columns** are the three with yellow headers: **Payment verified (Y/N)**, **Notes**, **Status** (Pending / Confirmed / Rejected; blank counts as Pending). There are drop-downs. Type only in these. Every other column is rewritten from the CSV each time, so a correction typed there would be lost. If a detail in an entry is wrong, note it in Notes.

**Running `process` again** after downloading a newer export is safe: your three columns are kept, nobody is renumbered, and new entries are added. The flags are re-checked on everyone (a new submission can make an older entry a duplicate). Columns you add yourself to the right are also kept. Before each save, the old file is copied to `tracker.previous.xlsx`. **Close the tracker in Excel before running**, or it can't be saved.

Things to know:
- **Word count is approximate.** It counts every word in the PDF, including the title. Different PDF programs break text slightly differently, so treat entries within a few words of the limit as borderline and check by hand.
- **How downloaded files are matched.** The CSV has Tally download links; the tool takes the file name at the end of each link and looks for that file name in `work/downloads/` (any sub-folder, upper/lower case ignored). Files inside a sub-folder named after the Submission ID, or starting with it, also match. If you download everything flat into one folder and two people uploaded files with the same name, your computer will rename the second one (`essay (1).pdf`), and it can't be matched reliably: both entries get flagged "PDF problem: Shared..." so you notice. Putting each entry's files in a folder named after its Submission ID avoids this.
- The payment screenshot only needs to exist in the CSV. It isn't opened.
- The essay is a PDF upload only (Tally takes no pasted text or links). Anything else in the essay answer (blank, text, a link, or another file type) gets the red "PDF problem" flag, and the problem email asks for the essay as a PDF. The tool never opens or fetches links, and there is no word count for those entries.
- **Warning: the fee wording must match Tally word for word.** The fee answer must be exactly one of the two options on the form, "RM 40 (about USD 10)" or "Fee support at 50%: RM 20 (about USD 5)" (capital letters and extra spaces don't matter). They're set under `[fees]` in `config.toml`; **if you edit the fee wording or prices in Tally, update that section too, or every entry will be flagged.** The first entry (by time) to use a valid code owns it. Later ones are flagged "already used". If you hand a code out and know it was used another way, type an entry ID in "Used by submission" in `codes.xlsx` and every entry using it will be flagged.

### 3. `emails`: draft emails (nothing is sent)
Writes drafts into `work/emails/`, one `.txt` per entry in a folder per type, plus one combined file per type (`received_ALL.txt` etc.) you can read straight through:

| Type | Written for |
|---|---|
| `received` | every entry that isn't Rejected |
| `confirmed` | Status = Confirmed **and** Payment verified = Y (if you forget the Y, it tells you) |
| `problem` | entries still Pending that have at least one flag. The email lists that entry's problems in plain English. |

```
python entry_admin.py emails            # all three types
python entry_admin.py emails problem    # just one type
python entry_admin.py emails --only ZH-003 ZH-007
python entry_admin.py emails --all      # remake drafts you already made
```
To stop you emailing people twice, a draft is only made once. A problem draft is made again if the entry's problems change. The combined file contains only the drafts made in that run.

**Read each draft before you send it**, especially problem emails: a flag is a prompt to look, not a verdict. Copy it into your email program and send it yourself.

Edit the wording in `templates/` (`received.txt`, `confirmed.txt`, `problem.txt`, and the sentence for each flag in `flag_messages.toml`). `templates/README.txt` lists the `{placeholders}`. The contact email (pharosprize@gmail.com), site name and so on are set once in `config.toml` under `[email]`. The contact email **must match `CONTACT_EMAIL` in `src/site.ts`** (a test fails if they differ). The toolkit's settings that still need checking are listed under "Entry-admin toolkit" in the root `PLACEHOLDERS.md`. Anything still in `[square brackets]` is a reminder for you to fill in.

### 4. `pack`: the judging folder
Copies the essays of entries that are **Confirmed with Payment verified = Y** into `work/judging/` as `ZH-001.pdf` and so on, and writes `work/judging/key.xlsx` linking IDs to names, emails, schools and so on.

- **`key.xlsx` is private.** It is in the same folder only for convenience. Give judges the PDFs, not the key and not the folder as it is.
- The tool rewrites each PDF so the author name and software details hidden inside the file are dropped (file names alone aren't enough).
- It warns you if an essay's text contains the entrant's name, email or school, which would let judges identify them. Edit those essays by hand before judging.
- If you later change someone to Rejected, running `pack` again removes their PDF from `judging/`.

## When Tally renames a question
Open `config.toml`, find the question under `[columns]` and change the text on the **right** to match the new title in the CSV. That's the whole fix. If a name doesn't match, the tool stops and shows you the columns the CSV actually has.

## Trying it out with fake data
`sample/` holds a fake CSV, fake essays and fake codes, built so each flag fires at least once (names are invented; emails end in `example.com`).

```
python entry_admin.py --config sample/config.toml process
python entry_admin.py --config sample/config.toml emails
```
Results go in `sample/output/`. Running it also writes into `sample/codes.xlsx`; to reset, run `python sample/make_sample.py` (needs `pip install -r requirements-dev.txt`).

## Tests
```
pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```
The tests build the fake data in a temporary folder and check every flag, re-running, the emails and the judging pack.

## Where real exports go
Put the real Tally CSV and downloaded files in **`tools/entry-admin/work/`** (`work/submissions.csv`, `work/downloads/`). Everything the tools produce (tracker, codes, emails, judging pack) is written there too. `work/` is git-ignored, and so are `data/`, `real/`, `downloads/`, `judging/`, `emails/` and any `.csv`, `.xlsx` or `.pdf` placed directly in the toolkit folder, so an export saved there by mistake can't be committed. A test checks this.

Everything in `sample/` is fake and safe to commit: invented names, emails ending `example.com`, and "Fake Example School". A test checks that too. Never put a real export in `sample/`.

## Privacy
Entrants may be under 18, so the tracker, codes, emails and judging key are personal data. `work/` is git-ignored. Don't put these files in the repo, email them around or keep them in shared folders. Delete them when you no longer need them.
