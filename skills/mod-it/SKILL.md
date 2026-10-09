---
name: mod-it
description: Turn a Claude Code hook, a prose rule or a doc pointer into a mod, prove it against an oracle, then swap it in live.
disable-model-invocation: true
argument-hint: <hook, rule or pointer to port>
metadata:
  tags: [claude-code, mods, hooks, porting]
---

Port the named harness piece into a mod, prove the mod against an oracle, then swap it in.

The `plugin-authoring` skill, with the declarations file and `reference.md` it names, is the source of truth for the engine: events and their answers, `$` and its nouns, `.catch`, the test kit, a mod's files, and the checks. This skill holds only what porting adds. When a measurement contradicts that source, trust the measurement and name the conflict in the report.

## 1. Sort the source

Read the source and whatever wires or cites it. Sort it into one kind, and read that kind's file:

| Kind | Looks like | Oracle | Read |
| --- | --- | --- | --- |
| Hook | a settings hook script | the old hook's answers | [`references/hook.md`](references/hook.md) |
| Rule | prose whose trigger code can check: a command shape, a message format, a scope kept read-only | real violations and real compliant cases from git history and session transcripts | [`references/rule.md`](references/rule.md) |
| Pointer | a line of the form "before you touch X, read Y", or a context section that applies in one repository | the trigger: the doc arrives when it fires, and at no other time | [`references/pointer.md`](references/pointer.md) |

Plain knowledge (domain docs, recipes), skills, subagents and setup scripts stay as they are; say so and stop when the source is one of those. Port a source that mixes kinds one piece at a time.

Invoke the `plugin-authoring` skill. Its folder for new mods does not apply here: a port writes into the mods folder of step 2.

Map each behaviour to one event with the kind file's table. Read each event's declaration, and each `$` call you plan to use, in the declarations file. Skip the read for an event the target mod already hooks; its registration shows the shape.

Done when the source has one kind and each behaviour maps to one event.

## 2. Find the mods folder

The mods folder is the directory `CLAUDE_CODE_PLUGIN_DIRS` names in the `env` block of `~/.claude/settings.json`; Claude Code loads each child folder that holds `.claude-plugin/plugin.json`. When the folder has `bin/new` and `bin/check`, scaffold with `bin/new <name>` and check with `bin/check <name>`. Otherwise lay out the files and run the checks `plugin-authoring` names. With no such folder, ask the user where mods live.

Port into an existing mod when one already hooks the same tool and event. There each rule is a file of its own, and the rule list names every rule. Its order picks the reason a verdict shows when two rules agree. Separate settings hooks give no order to copy, so place the new rule on purpose and pin the reason with a test. A new mod with one rule keeps its pure decide function in one module beside the registration.

## 3. Model, then port

Name the data shape before the logic. A guard parses its input once into a typed model (a shell command into segments, each segment into what it does), runs each rule as a pure function over that model, and folds the verdicts to the strictest. The kind file names the spec the logic follows.

A guard (a hook or a rule on `tool.check`) is wired this way:

- On a pass return `next(e)`. On a verdict, read `await next(e)` and return whichever of the two is stricter, so a settings deny still wins over the mod's ask.
- Give the registration the `.catch` that `plugin-authoring` shows, answering the decision the kind file names.
- Reach files, processes, environment and the repository through `$`, behind one small interface that tests fake. Scope a repository's rules with `$.session.repo()` and its `remote`.

## 4. Prove it

Read [`references/testing.md`](references/testing.md) before writing a test. Done when the kind file's proof holds, and all of these:

- The suite goes red with the port switched off for one run, then green again. In a mod shared with other rules, remove only the new rule. In a new mod, make a copy whose pure decide function passes everything.
- Wiring tests drive the event chain through `$`. For a guard they cover a verdict, a pass that keeps the engine's verdict, and the `.catch` path; when the rule can ask, also a settings deny that beats the mod's ask. A shared mod's existing `.catch` test covers a new rule.
- The mod check passes: validate, type-check, tests.

## 5. Prove it live

Run a headless session with the mod and a control without it, using inputs whose effect is harmless if the mod lets them through. The recipe is in [`references/testing.md`](references/testing.md). Done when the mod session shows the mod's effect, naming the mod where it names anything, and the control does not.

## 6. Swap and report

1. Retire the source as the kind file says.
2. Find every other copy of what you retired: other checkouts of the same repository (worktrees), and any script that provisions a checkout's settings. Report each copy and how it converges: a provisioning script that copies the main checkout's entry fixes it at the next provision, and until then both answer.
3. Run the live input once more in a default session, with no flags, from the directory the mod applies to, once the mod sits in the mods folder and the source is retired. Done when the mod's effect shows.
4. Format the mod's changed files. A mods folder may have no formatter of its own; then use the host repository's formatter through stdin, so its ignore rules do not skip the file.
5. Commit the mod in its repository. When the file you edited to retire the source is git-ignored, the host repository has nothing to commit; say so in the report.

Report the proof and live evidence, each case you pinned, each copy of the source, and anything you did not verify.
