---
name: sync-upstream
description: Merge upstream changes into skills that have an upstream/<name>.yaml manifest.
argument-hint: "<skill...> | --tag <tag>... | --all | verbatim <skill...>"
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/upstream-diff.ts *)
metadata:
  internal: true
---

Run the script from the repo root. It reads `upstream/<name>.yaml` and `skills/<name>/`, and changes nothing.

## Verbatim comparison

When `$ARGUMENTS` starts with `verbatim`, run `node ${CLAUDE_SKILL_DIR}/scripts/upstream-diff.ts $ARGUMENTS` and stop after reporting it. It prints one diff per named skill, from upstream HEAD to `skills/<name>/`, with no `merge_guidance`. Break the diff down for the user by file and by kind of change. The script accepts skill names only.

## 1. Survey

Run `node ${CLAUDE_SKILL_DIR}/scripts/upstream-diff.ts status $ARGUMENTS`.

- `up to date`: nothing to merge.
- `missing upstream`: the skill moved or was deleted upstream. Report it to the user and leave the skill untouched.
- `changed upstream`: merge it in step 2.

## 2. Merge each changed skill, one at a time

1. Run `node ${CLAUDE_SKILL_DIR}/scripts/upstream-diff.ts diff <name>`. It prints the manifest's `merge_guidance`, then two diffs that share the pinned `commit` as their base:
   - **upstream changes**: what upstream changed since `commit`.
   - **local edits**: how `skills/<name>/` differs from upstream at `commit`.
2. Apply every upstream change to `skills/<name>/`. Keep every local edit, and follow `merge_guidance`. Port anything new that is platform-specific so the skill stays Claude-first, and keep the skill folder standard in `AGENTS.md` true. When an upstream change and a local edit pull the same text in different directions, ask the user. When `merge_guidance` routes an upstream file to another skill, apply that change in that skill and review its diff before step 3.
3. Set `commit` in `upstream/<name>.yaml` to the `head` SHA that `diff` printed.
4. When this merge needed a judgement the next merge will need again, add it to `merge_guidance`.
5. Run `diff <name>` again. The skill is done when the upstream changes read `(none)` and every hunk under local edits is an intended local adaptation.

## 3. Report

List each selected skill with its outcome: up to date, merged, missing upstream, or waiting on the user. Leave the changes uncommitted for review.
