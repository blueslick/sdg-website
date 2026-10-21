# Placeholders: social post maker

Things in `tools/social/` that still need the owner's real information. (The site-wide list is `PLACEHOLDERS.md` at the repo root once the site branches land; these lines can be copied into it.)

| Placeholder | Where | Fill in with |
|---|---|---|
| `[Instagram handle]` | `brand.yaml` → `handle` | The account's handle, once it exists. Shown in the footer of announcement slides. |
| `Inaugural Edition / SDG 02` | `brand.yaml` → `edition_label` | Check it matches the Competition page. Change it when a new edition starts. |
| `[Soup Kitchen Name]` | example announcement | Leave as is until written permission arrives. Never write the real name. |
| `[month]`, `[deadline date]`, `[word limit]`, `[fee]`, `[contact email]`, `[link in bio]`, `[N] days left` | `posts/example-announcement/post.yaml` | Real dates, fee and contact once decided. For the countdown, use `deadline: YYYY-MM-DD` and `{days_left}` instead of `[N]`. |
| `[Publisher]`, `[Artist Name]`, `[Gallery or website]`, `[the artist or owner]` | example report and artwork posts | Real credits for a real post. |

The three folders in `posts/example-*` are samples with invented content. Copy one to start a real post; don't publish the examples.
