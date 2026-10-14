# CLAUDE.md

## Never write user-facing prose

**This is a hard rule. Do not write prose that readers of the site will see.**

The book's text is the author's. That covers every paragraph, introduction, explanation,
caption, label, hint, tooltip, description, and any other sentence a reader would take as
the book speaking to them. Claude does not draft it, "just a short intro" included, not
even as a placeholder for the author to rewrite.

- When asked to add a section or tool, build **only the tool**: its component, logic, tests,
  and the heading its section needs to exist. Leave the surrounding prose out.
- Do not put an explanatory paragraph before or after a tool, or add instructions for using
  it. If the author wants words there, they will write them.
- Functional UI text that a control cannot work without is fine and should be kept to the
  minimum: column headers, input labels (`m`, `n`), and validation messages. Nothing that
  explains, introduces, or teaches.
- Do not restate or "improve" prose the author has already written.
- If you think a section needs prose, say so in your reply to the author. Do not add it to
  the page.

Code comments and commit messages are not user-facing and are unaffected by this rule.
