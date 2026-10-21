# Entry-admin toolkit: placeholders to fill in

Items for the project-wide `PLACEHOLDERS.md`. The site's main list lives on the pre-launch site branch (PR #2); when that is merged, move these rows into it and delete this file.

| Placeholder | Where | What to put |
|---|---|---|
| `[Soup Kitchen Name]` | `config.toml`, `[email] soup_kitchen` | Leave as is until written permission to name the soup kitchen arrives. |
| Site name `Pharos` | `config.toml`, `[email] site_name` | Keep in step with `SITE_NAME` in `src/site.ts` if the name changes. |
| Contact email `pharosprize@gmail.com` | `config.toml`, `[email] contact_email` | Keep in step with `CONTACT_EMAIL` in `src/site.ts`. |
| Edition wording | `config.toml`, `[email] edition` | Check it reads right. |
| Fee answers | `config.toml`, `[fees]` | Must match the Tally answers exactly if the form's wording or prices change. |
| Question titles | `config.toml`, `[columns]` | Set to the final Tally form; change if a question is renamed. |
| Word limit, age limit, entry ID prefix | `config.toml`, `[entry]` | Confirm 800 words, 20 and under, `ZH`. |
| Email wording | `templates/*.txt`, `templates/flag_messages.toml` | Read through and adjust the drafts' wording before first use. |
