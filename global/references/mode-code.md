# Mode code

Read it before you write code or review a diff in a `-mode` run.

## Comments

Keep a comment only for a non-obvious *why*. Test and verify scripts document each step in the assertion or log string. A repo's own test-label convention (such as `// Given`, `// When`, `// Then`) wins.

## Code delegate report

A code `mode-agent`'s report opens with `done`, `blocked` or `question`, then lists the branch and head SHA, the success check's command with its last output lines, the files changed, and what it skipped. At most 15 lines.
