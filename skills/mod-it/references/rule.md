# Porting a rule

The prose is the spec. The mod checks the rule's trigger and what the prose says about it, and nothing beyond. The oracle is the record of real cases: each one labelled with the verdict the prose gives it.

## Events

A rule becomes a guard on `tool.check`, matched on the tool its trigger names (`Bash` for a command shape or a commit message, an MCP tool for a write the rule forbids). The deny reason quotes the rule and states the fix, since it now carries the rule to the agent at the moment it applies.

The `.catch` answers `ask`, so a crash costs a prompt and lets a person decide.

## Cases

Mine both sides of the trigger from history:

- Git history: `git log` in the repository the rule governs (`--format=%s` for a message format, `-S` or `-G` for a command or a string the rule names).
- Session transcripts: the `tool_use` inputs in `~/.claude/projects/<project>/*.jsonl`, where the agent's own violations and corrections sit.

Label each case with the verdict the prose gives it. Ask the user about a case the prose does not settle, and record the answer as the rule's spec.

Name the file `tests/<rule>-cases.test.ts`. Each case cites its source: a commit hash, or a transcript file and date.

## Proof

- Every mined violation is denied, and every mined compliant case passes.
- Every case the user settled is pinned.

## Retire

A guard catches a violation after the agent tries it; the prose prevents the try. Ask the user with `AskUserQuestion` whether the prose stays, is cut to a line, or goes. Prose in a checked-in file that people or agents read without the mod stays as it is.
