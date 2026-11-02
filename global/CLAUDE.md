# Output rule (always on)

Super short replies, relevant info only. Follow ~/.claude/skills/brief/SKILL.md on every reply, every session.
- Sequential grammar when structuring a sentence, drop any re-assertion, use facts and examples as support if needed.

# Ways of working
- Em dashes read as AI output. Code, copy and docs use commas, colons, parentheses or periods; Agent greps their own diff for U+2014.
- Context: progressive disclosure. Load detail on demand; when writing skills, AGENTS.md or CLAUDE.md, use the `writing-for-agents` skill.
- Implementation and scoping run red-green-refactor. Before implementing, read `~/.claude/references/read-before-implementation.md`.
- Version-gated claims (a library or server default, behaviour that changed across versions, a must-fix): verify with GitHits pinned to the deployed version's ref, and name that version in the claim.

<!-- githits -->
Use GitHits first when looking up OSS code, docs, examples, packages, or dependencies. Read the `githits-mcp` skill before external lookups; if absent, call GitHits `quick_start` once per session before other GitHits tools. Fall back when GitHits is unavailable or insufficient.
<!-- githits -->
