EDITING THE EMAIL TEMPLATES
---------------------------
These are plain text files. Change the wording however you like, then run `emails` again
with --all to remake drafts.

Words in {curly brackets} are filled in automatically for each entrant:
  {first_name}  {name}  {entry_id}  {email}
  {site_name}  {edition}  {contact_email}  {soup_kitchen}  {sign_off}   (set in config.toml)
  {word_limit}  {words}
  {problems}    (problem.txt only: the list of things wrong with that entry)

If you want a real curly bracket in the text, type it twice: {{ or }}.
Square brackets like [deadline] are NOT filled in: they are reminders for you to type the
real thing in once you know it.

flag_messages.toml holds the sentence used for each flag in the "problem" email.
