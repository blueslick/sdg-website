# Instagram publisher

Posts approved Pharos posts and stories to Instagram on schedule. **Nothing posts unless Daniel approves it** in the queue sheet.

- **Queue:** the Google Sheet "Pharos · Instagram queue" (owned by Theo, shared with Daniel). One row per post. Its "How it works" tab explains the columns.
- **Publisher:** `publish.js`, run every hour by `.github/workflows/instagram-publish.yml`. It posts rows whose Status is **Approved** and whose **Post at** time (Malaysia time) has passed, then writes **Published** and the Instagram id back to the sheet.
- **Safety:**
  - It marks a row "Posting" before it starts, so a crash can never post the same thing twice.
  - If the final publish step fails, Instagram may already have posted, so the row becomes "Check on Instagram" and is never retried on its own.
  - A failure before anything went out puts the row back to Approved with the reason in "Last error". After 3 failed tries it becomes "Failed". To try a Failed row again, fix the problem, clear Attempts, then set Approved.
  - A post that already has a Published (or Posting, or Check) row is never posted again from another row.
  - It refuses to run if the header row isn't exactly the expected columns, and never touches columns A to D.
  - Post names from the sheet must be a real folder in `tools/social/posts` (lower-case letters, digits, hyphens), so nothing typed into the sheet can reach a shell command.
  - Three separate jobs: installing packages and drawing images happens in a job with no secrets; the job that holds the keys runs only the repo's own code on the finished images and captions.
- **What gets posted** is the post as it is on `main` at posting time. Post changes go through a pull request that Daniel merges, so what goes out is always something he has seen.
- **Off by default:** the workflow does nothing until all four secrets below exist, and scheduled workflows only run once the file is on `main`.

## One-time setup (Theo, about 40 minutes)

You need the @pharosprize login and access to the GitHub repo's settings. Claude can't do these steps: they create accounts, accept terms and handle passwords and keys.

### 1. Make @pharosprize a professional account (5 min)
In the Instagram app, sign in as @pharosprize, then go to **Settings → Account type and tools → Switch to professional account**. Pick **Business** (Meta's docs are clearest that publishing, including stories, works for Business accounts). It stays free. If Daniel wants Facebook later, this is also where you'd link a Facebook Page so posts can be shared there.

### 2. Create the Meta app and get an access key (20 min)
1. Go to developers.facebook.com, sign in, and accept the developer terms (use the pharosprize@gmail.com Facebook/Meta login if you can, so the app belongs to Pharos). Meta may ask you to verify a phone number first.
2. **Create app** → choose the **Instagram** use case ("Manage messaging and content on Instagram") → name it "Pharos publisher".
3. While the app is in development mode, the account it posts to has to be added as a tester: **App roles → Roles → Add people → Instagram Tester**, enter `pharosprize`. Then, in Instagram (as @pharosprize), accept the invite under **Settings → Website permissions → Apps and websites → Tester invites**. (Meta moves these menus around; if you can't find it, the API setup page in step 4 links to it.)
4. In the app, open **Instagram → API setup with Instagram login**. Under **Generate access tokens**, click **Add account** and sign in as @pharosprize. Allow the content publishing permission.
5. Copy two things: the **Instagram user ID** (a long number shown next to the account) and the **access token**. The token is long-lived (60 days).
6. Leave the app in development mode. That's fine for posting to your own account.

### 3. Create the Google service account that reads the queue sheet (10 min)
1. Go to console.cloud.google.com and create a project called "pharos-publisher" (free, no billing needed).
2. **APIs & Services → Library**: search **Google Sheets API** and click **Enable**.
3. **IAM & Admin → Service accounts → Create service account**, named "pharos-queue". Skip the optional role steps.
4. Open it, go to **Keys → Add key → Create new key → JSON**. A file downloads. Keep it private.
5. Copy the service account's email (ends in `iam.gserviceaccount.com`). In the queue sheet, click **Share**, paste that email, give it **Editor**, untick "Notify". Keep the sheet restricted to named people (Theo, Daniel, the service account), never "Anyone with the link".
6. Optional but worth it: in the sheet, **Data → Protect sheets and ranges** on column E (Status), allowing only Daniel and the service account to edit it. Then only Daniel can approve.

### 4. Add the four secrets to GitHub (5 min)
In github.com/blueslick/sdg-website go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Name | Value |
|---|---|
| `IG_USER_ID` | the Instagram user ID from step 2 |
| `IG_ACCESS_TOKEN` | the access token from step 2 |
| `GOOGLE_SA_KEY` | the whole contents of the JSON file from step 3, from `{` to `}` |
| `QUEUE_SHEET_ID` | `1wVnCMnsDABpt4PsR51Asck4DXKKXIkhLxUG3onVQpmY` |

If you can't see Settings, Daniel adds them (it needs admin on the repo). Then delete the JSON file from your Downloads.

### 5. Test it once
After the PR is merged: open **Actions → Instagram publish → Run workflow**. With nothing approved it should say "Nothing approved and due." To test a real post, Daniel approves one post with a time a few minutes ago, run it again, and check Instagram.

## Every 50 days: refresh the access token
Instagram tokens last 60 days. Before then, on your own computer (in `tools/social`):

```
IG_ACCESS_TOKEN=<current token> node publish/publish.js refresh-token --show
```

Paste the new token into the `IG_ACCESS_TOKEN` secret. The Command Centre has a reminder task for this.

## Commands (run in `tools/social`)

| Command | What it does |
|---|---|
| `node publish/publish.js` | Dry run: what would post right now. Needs `QUEUE_SHEET_ID` and `GOOGLE_SA_KEY` |
| `node publish/publish.js due` | Lists the folders that are approved and due |
| `node publish/publish.js prepare <folder>` | Turns a built post's PNGs into the JPEGs Instagram needs (feed and story) |
| `node publish/publish.js --live` | Posts. Only the workflow should run this |
| `node publish/publish.js --fixture=rows.json --now=2026-11-16T09:00` | Dry run against a local list of rows, for testing |
| `node publish/test-publish.js` | Tests the whole thing against a fake Instagram and a fake Google Sheet |

Images are fetched by Meta from the `social-media` branch on raw.githubusercontent.com (the repo is public), which the workflow updates just before posting. No post images are ever committed to `main`.
