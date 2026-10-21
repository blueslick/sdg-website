# Placeholders

Every placeholder in the project that the owner still needs to fill in. Add to this list whenever a new one is introduced.

## Judging toolkit (`tools/judging/`)

| Placeholder | Where | Fill in with |
|---|---|---|
| Rubric criteria, descriptions, weights | `tools/judging/rubric.yaml` (marked `placeholder: true`) | The real rubric; then set `placeholder: false` |
| `[site]` | `tools/judging/certificates.yaml`, `site:` | The website address, no `https://` (printed as "Verify at [site]/verify/") |
| `[Soup Kitchen Name]` | `tools/judging/certificates.yaml`, `footer:` | Leave as is until written permission arrives |
| Award counts and wording | `tools/judging/certificates.yaml`, `awards:` | Final numbers of Runner-up / Highly Commended places and the certificate wording |
