# Porting a pointer

A pointer names a doc and the trigger for reading it. The mod delivers the doc when the trigger fires, so the agent reads it without having to notice the pointer. The oracle is the trigger itself: the doc arrives on each triggering call, and on no other.

## Events

| Pointer says | Mod event |
| --- | --- |
| before you touch a path, a tool or a command, read a doc | `tool.call`, matched on the tool; read `await next(e)` and return it with the doc's text added to its `context` list when the input matches the trigger |
| a context section that applies in one repository | `prompt.compose` or `prompt.context`; read both declarations, hook the one whose output carries the section, and scope it with `$.session.repo()` |

`context` arrives after the call has run, so match the earliest call of the trigger. For a path, that is a `Read` of it: an edit to an existing file needs a read first, so the doc arrives before the first change. For a command whose first run must follow the doc, answer that first call on `tool.check` with a deny whose reason carries the doc; the retry runs.

Read the doc through `$.fs` when the trigger fires, so an edit to the doc reaches the next call. Attach it once per session: a module variable keyed by `$.session.id()` holds that fact, and a reload attaching the doc again is harmless.

A pointer needs no `.catch`: a failed hook is skipped, and the call goes on without the doc.

## Proof

- A wiring test drives a triggering call through `$.tool.call` and finds the doc's text in the result's `context`.
- A call outside the trigger, and a second triggering call in the same session, carry none of the doc.

## Live check

The live run proves the model receives the doc. Use a triggering call that only reads, and ask the model to report what came back with the result:

```sh
echo 'Run this one tool call, once: <triggering read>. Then reply with only the first line of each note that came with its result besides the result itself, one per line, or NONE.' \
  | claude -p --setting-sources user --settings '{"env":{"CLAUDE_CODE_PLUGIN_DIRS":"<empty dir>"}}' --plugin-dir <mod> --allowedTools <tool>
```

Other plugins attach notes of their own. Done when the mod run lists the doc's first line and the control does not.

## Retire

Remove the pointer line when every reader of its file loads the mod: a user-level file read only by your own sessions. A checked-in file that people or agents read without the mod keeps the line.
