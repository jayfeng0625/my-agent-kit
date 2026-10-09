# Testing a ported mod

The test kit's API (`test`, `expect`, `mock`, the test's `on`) lives in the declarations file `plugin-authoring` names, under `declare module 'claude-code/testing'`. This file covers what a port adds. The kind file holds its own case table.

A test file imports plugin files with relative `import` declarations. Pure tests need no engine hooks.

## Wiring tests

Drive a guard's chain with `$.tool.check({ tool, input })` and a pointer's with `$.tool.call`. Each `$` call the mod makes needs a test hook answering it. A test hook on the driven event stands for the engine: on `tool.check` vary its verdict to show the mod keeps it on a pass and never loosens it.

A test registers each event once: a second `on` for the same event fails with "registered twice", so one hook branches on its input. Make a `$` call hook throw to reach the `.catch`.

## Live check

The prompt goes on stdin, because `--allowedTools` takes every following word as a tool name. `--setting-sources user` keeps project hooks out, so an old hook cannot answer for the mod:

```sh
echo 'Run exactly this one Bash command, once, then reply with only the raw result or the exact denial text: <harmless input>' \
  | claude -p --setting-sources user --settings '{"env":{"CLAUDE_CODE_PLUGIN_DIRS":"<empty dir>"}}' --plugin-dir <mod> --allowedTools Bash
```

The control is the same run without `--plugin-dir`. The `env` block of user settings overrides the process environment, so the `--settings` override is how both runs leave out a mod that already sits in the mods folder.

- A no-op the old hook falsely denies (`echo <guarded words>`) makes a good input: the mod denies it, and the control runs it harmlessly.
- When every input that passes would write somewhere outside the machine (an MCP save, a push), run only inputs the mod denies, aimed at a target that does not exist, and skip the control. Say so in the report.
- Pick an input no permission rule names. A plugin can apply the project's permission deny rules even under `--setting-sources user`, and then both runs deny.
- A denial can name several plugins, built-in ones (such as `cc-plugin-sec-default`) included. Match the mod's own name in the text.
- Run from a directory of the repository a scoped rule applies to, and once from outside it.
