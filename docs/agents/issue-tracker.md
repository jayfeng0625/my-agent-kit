# Issue tracker: Linear

Issues for this repo live in Linear, team Jay's Agents (`JA`), project `my-agent-kit`. GitHub hosts the code. Use the `linear` CLI for every operation; find a command with `linear cli search "<task>"` and read its flags with `linear cli schema <area> <verb>`.

## Conventions

- **Create an issue**: `linear issue create --team JA --project my-agent-kit --title "..." --description-file <path>`.
- **Read an issue**: `linear issue get JA-<n> --team JA`, then `linear comment list JA-<n> --team JA` for the thread.
- **List issues**: `linear issue list --team JA --project my-agent-kit`, filtered by `--state`, `--label` or `--parent`.
- **Update an issue**: `linear issue update JA-<n> --team JA` with the fields to change. `--label` adds and `--unlabel` removes.
- **Comment**: `linear comment add JA-<n> --team JA --body-file <path>`.
- **Set a triage role**: `linear issue move JA-<n> --team JA --to "<state>"`, using `docs/agents/triage-labels.md`.

Resolve a bare number such as `42` as `JA-42`. Pass `--dry-run` to preview a write.
If Linear is unreachable, report the failure and leave the change pending. There is no local fallback.

## Public repo

This repo is public. Skills, `merge_guidance`, commit messages and PR bodies name no `JA` ticket, internal name or finding id.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

## When a skill says "publish to the issue tracker"

Create a `JA` issue in project `my-agent-kit`.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

Used by `/wayfinder`. The map is one `JA` issue, and its tickets are child issues of the map. The five labels form the `wayfinder` label group; pass the full name, such as `wayfinder:map`.

| Operation      | Command                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Map            | a `JA` issue labelled `wayfinder:map`, holding the Notes, Decisions-so-far, and Fog body                                      |
| Child ticket   | `linear issue create --parent JA-<map>`, labelled `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling` or `wayfinder:task` |
| Blocking       | `linear issue update JA-<n> --blocked-by JA-<m>`                                                                              |
| Frontier query | `linear issue list --parent JA-<map>`, dropping assigned or blocked issues; first in map order wins                           |
| Claim          | `linear issue update JA-<n> --assignee me`, the session's first write                                                         |
| Resolve        | `linear comment add` with the answer, `linear issue move JA-<n> --to Done`, then a context pointer in the map's Decisions-so-far |
