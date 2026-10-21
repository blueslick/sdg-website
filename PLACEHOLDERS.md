# Placeholders to fill in

Every bracketed placeholder in the project, so nothing is forgotten. Tick them off as you fill them in.

## Entry-admin toolkit (`tools/entry-admin/`)

| Placeholder | Where | What to put |
|---|---|---|
| `[contact email]` | `tools/entry-admin/config.toml`, `[email] contact_email` | The contact email (same one as on the Contact page). Used in email drafts. |
| `[Soup Kitchen Name]` | `tools/entry-admin/config.toml`, `[email] soup_kitchen` | Leave as is until written permission to name the soup kitchen arrives. |
| Site name `Pharos` | `tools/entry-admin/config.toml`, `[email] site_name` | Keep in step with `src/site.ts` if the name changes. |
| Edition wording | `tools/entry-admin/config.toml`, `[email] edition` | Check it reads right. |
| Question titles | `tools/entry-admin/config.toml`, `[columns]` | Must match the Tally question titles exactly (including "Age on [date]"). |
| Word limit, age limit, entry ID prefix | `tools/entry-admin/config.toml`, `[entry]` | Confirm 800 words, 20 and under, `ZH`. |
| Email wording | `tools/entry-admin/templates/*.txt`, `flag_messages.toml` | Read through and adjust the drafts' wording before first use. |
