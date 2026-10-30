# Mode eval

Scores impl-mode, bug-hunting-mode and research-mode by outcome. Each case runs `claude -p "/<mode> <request>"` on a fresh build of a small invoicing repo, then grades what the run left behind.

- `fixture/`: the invoicer repo, one folder per commit; `build.ts` rebuilds it with the same SHAs every time. It carries seeded bugs (tax on the undiscounted amount, an LRU that evicts on update, a quadratic duplicate check), open tickets INV-12 and INV-15, and a `tax-exempt` branch with noise to trim.
- `tasks.json`: the requests and what done means for each.
- `grade.ts` and `hidden/`: the graders. Code tasks run the suite and hidden tests on every new commit and keep the best; read-only tasks fail on any commit or tracked edit, and a Sonnet judge checks the facts the reply must state.
- `graders.test.ts`: proves, with no model, that each grader passes a reference fix and fails doing nothing and a plausible wrong fix. `npm test` runs it.
- `run-eval.mjs`: the runner, from `/claude-api build-eval`'s scaffold. Each case gets a scratch `HOME` that links this kit's `global/` and `skills/` at `--kit-ref`, an environment that keeps only the model proxy credential, a `gh` that always fails, and no `git push`, web, MCP or `ScheduleWakeup`.

Run, from the repo root, after the user's yes to the spend:

    node .claude/evals/modes/run-eval.mjs --flow .claude/hillclimb/modes --variant baseline \
      --model claude-opus-5-5 --effort medium --budget-usd 10 --kit-ref <sha> \
      --reps 2 --concurrency 5 --timeout-s 3600

The first run of a changed harness stops until the user approves it with `--approve-harness`.
