# Porting a hook

The old hook is the oracle: its behaviour is the spec, and its self-test is the first test suite.

## Events

| Hook does | Mod event |
| --- | --- |
| deny or ask before a tool runs (PreToolUse) | `tool.check` |
| context for a skill when the Skill tool runs (PreToolUse on `Skill`) | `skill.prompt`, adding to the skill's text |
| context after a tool runs (PostToolUse) | `tool.call`, adding `context` to the result of `await next(e)` |
| any other settings event | `classic.<Event>`, or its native event (`prompt.submit`, `session.start`) |

## Port

Carry the hook's logic across unchanged, condition by condition. A behaviour change belongs in a later commit; this port has none. A settings matcher is an unanchored regex (`save_(issue|comment)` also selects `save_issue_label`), so carry it verbatim as the mod's matcher and pin its reach with a test.

When the hook's own parser judges some inputs differently from the mod's parser, keep the hook's parsing inside its rule and judge from the raw input. Find the differences by running each doubtful input through both parsers, applying the rule's own judgement to each parser's words, and list them in the report as the work for that later commit.

The `.catch` answers the decision the hook gave when it crashed (often `ask`). A shared mod has one `.catch` for every rule; report each hook whose crash answer differs from it.

A hook that judges paths relative to the home directory gets pinned cases under a second home, one holding a regex metacharacter (`/home/u.v2`).

A hook that reads a tool input field beyond the one the declarations name (such as Bash's `run_in_background`) needs proof that the engine passes it: a throwaway mod that echoes `e.input` settles it in one live run.

## The oracle

A hook that reads git, files or the environment answers per directory, so drive its exported check function with its own self-test fakes; importing it may run its `main()`, so close stdin. Otherwise pipe a payload: a settings hook reads its payload on stdin. Write the payload to a file with the Write tool and pipe the file, since a live guard may block a shell command whose text names the strings it guards:

```sh
node <old hook> < payload.json
```

## Parity suite

Name the file `tests/<hook>-parity.test.ts`. Fill its table by script, so no case is retyped:

- Copy the hook's self-test cases.
- For each doubtful input, a generator runs the old hook on it and writes the hook's exact decision and reason into the table.

Run each case through the mod's pure decide function with a faked IO interface, and compare the whole verdict:

```ts
for (const [command, reason, decision = 'deny'] of CASES) {
    test(command, async () => {
        const want = reason === null ? pass : { kind: decision, reason: expect.stringMatching(reason) }
        expect(await decide(command, SESSION, io)).toEqual(want)
    })
}
```

## Proof

- The hook's own self-test cases run unchanged against the pure decide function, and pass.
- Every input where you doubt the old behaviour is pinned with the old hook's own answer.
- The report lists each parser difference.

## Retire

Remove the hook's entry from its settings file, then confirm the file still parses and the entry is gone. The auto mode classifier may refuse an edit that removes a safety hook; then ask the user to remove it (for example with `/update-config`). Leave the hook file in place until the user retires it.
