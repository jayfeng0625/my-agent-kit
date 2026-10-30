# Output rule (always on)

Super short replies, relevant info only. Follow ~/.claude/skills/brief/SKILL.md on every reply, except inside a `-mode` run, where mode-core's Writing the reply applies.
- Sequential grammar when structuring a sentence, drop any re-assertion, use facts and examples as support if needed.

# Ways of working
- Em dashes read as AI output. Code, copy and docs use commas, colons, parentheses or periods; Agent greps their own diff for U+2014.
- Context: progressive disclosure. Load detail on demand; when writing skills, AGENTS.md or CLAUDE.md, use the `writing-for-agents` skill.
- Implementation and scoping run red-green-refactor. Before implementing outside a `-mode` run, read `~/.claude/references/read-before-implementation.md`.
