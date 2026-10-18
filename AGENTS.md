# AGENTS.md

This repo publishes agent skills and the user's global Claude Code setup.

## Distribution

The repo is public on GitHub and installs through the skills CLI (`npx skills`, from vercel-labs/skills).

- Each skill lives at `skills/<name>/`, the layout the CLI discovers.
- A change reaches installed copies only after it is pushed and the user runs `npx skills update`. The CLI updates GitHub-sourced installs only; a local-path install is a one-off copy.
- `global/` holds the user's global Claude Code files, symlinked into `~/.claude/`: `CLAUDE.md`, `references/`, `pstack-models.md` (the per-role models that pstack skills read), and `agents/` (links to the subagents that skills spawn by `subagent_type`: no-comments' `comment-sicko` and poteto-mode's `poteto-agent`). The output rule and em-dash line in `CLAUDE.md`, and `references/read-before-implementation.md`, adapt Mari Luukkainen's lisbeth718/agent-setup; credit stays here, out of the loaded files.

## Skill folder standard

Each `skills/<name>/` holds:

- `SKILL.md`, written Claude-first. Frontmatter uses Claude Code fields (`name`, `description`, and `disable-model-invocation`, `argument-hint`, or `paths` when needed), plus `metadata.tags`: labels describing what the skill does, for discovery once installed. The body names Claude Code tools (`Skill`, `Agent`, `AskUserQuestion`) and `.claude/` paths.
- `agents/openai.yaml`, for Codex. It sets `interface.display_name` and `interface.short_description`. It sets `policy.allow_implicit_invocation: false` exactly when `SKILL.md` sets `disable-model-invocation: true`.
- `LICENSE`, for a skill pulled from another repo: that repo's license text, so the notice ships with every install.

## Upstream skills

A skill pulled from another repo has a manifest at `upstream/<name>.yaml`. It lives outside `skills/` because the CLI installs every file in a skill folder, and the manifest serves this repo's workflow only.

```yaml
repo: https://github.com/<owner>/<repo>
path: <folder of the skill in that repo>
commit: <full SHA the local copy was last merged from>
author: <upstream author>
license: <SPDX identifier, matching skills/<name>/LICENSE>
tags: [<label>, ...]
extra_files:
  <path in skills/<name>/>: <upstream path outside `path`>
merge_guidance: |
  <optional prose for whoever merges the next upstream update>
```

Every key except `extra_files` and `merge_guidance` is required. `extra_files` brings upstream files kept outside the skill folder, such as a subagent definition, into every comparison at their local paths. `tags` are selection labels for syncing skills from upstream, separate from the discovery tags in `SKILL.md`. Read `repo`, `path`, `commit`, and `license` from the upstream repo itself.

Right after pulling a skill, run `node .claude/skills/sync-upstream/scripts/upstream-diff.ts diff <name>`. The pull is done when its local edits are only the folder-standard additions and the adaptations `merge_guidance` records.

Merge upstream updates with `/sync-upstream`.

## Writing

These rules apply to prose authored in this repo. Commands, code, identifiers, and quoted text stay as written.

- State each fact once. Cut a clause that restates an earlier point as a negation, contrast, or paraphrase; keep a second clause only when it adds a new fact.
- Punctuate sentences with periods, commas, colons, semicolons, and parentheses. The em dash (U+2014) and en dash (U+2013) are banned; hyphens inside tokens, compound modifiers, flags, and identifiers are fine.
- Banned words: `corpus`, and every form of `reinforce`.
- Banned contrast phrases, since each carries a restatement: `is X, not Y` (and the `are`, `was`, `were` forms), `not X, but Y`, `X, and not Y`, `rather than`, `instead of`, `as opposed to`, `never a`, `never an`. A procedure may use `instead of` or `rather than` when the phrase names a real choice the reader makes.
- Match length to what the task needs, and hold files on disk to the strictest budget.

## Repo tooling

Repo-only skills live in `.claude/skills/`, with their scripts beside them. The CLI scans that folder too, so each one sets `metadata.internal: true` to stay out of installs.

Node runs the TypeScript directly, with no build step; `tsconfig.json` allows erasable syntax only. Check with `npm test` and `npm run typecheck`.
