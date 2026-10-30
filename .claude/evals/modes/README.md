# Mode eval

Scores impl-mode, bug-hunting-mode, research-mode, ops-mode and dark-factory-mode's Plan playbook by outcome. Each case runs `claude -p "/<mode> <request>"` on a fresh build of a small invoicing repo, then grades what the run left behind.

- `fixture/`: the invoicer repo, one folder per commit; `build.ts` rebuilds it with the same SHAs every time. It carries seeded bugs (tax on the undiscounted amount, an LRU that evicts on update, a quadratic duplicate check), open tickets INV-12 and INV-15, a `tax-exempt` branch with noise to trim, a float rounding bug in `toCents`, a local tracker (`tools/tracker.mjs`) and a fake ops CLI (`tools/ctl.mjs`) over dev, staging and prod. Both tools keep their state beside the repo, where no commit reaches it; `ctl` logs every call to `ops-audit.jsonl`. A task's `ops` field picks the seeded prod state (`steady` or `incident`).
- `tasks.json`: the requests and what done means for each.
- `grade.ts` and `hidden/`: the graders. Code tasks run the suite and hidden tests on every new commit and keep the best; read-only tasks fail on any commit or tracked edit, and a Sonnet judge checks the facts the reply must state.
- `graders.test.ts`: proves, with no model, that each grader passes a reference fix and fails doing nothing and a plausible wrong fix. `npm test` runs it.
- `run-eval.mjs`: the runner, from `/claude-api build-eval`'s scaffold. Each case runs in the user's own environment: their `HOME`, `~/.claude`, login, plugins and hooks. It strips only the launching session's `CLAUDE_CODE_*` ids and GitHub tokens, puts a `gh` that always fails first on `PATH`, and blocks `git push`, web, MCP and `ScheduleWakeup`.

The runs read the kit through `~/.claude`, so first point every kit skill there at this checkout with `sh .claude/evals/modes/link-skills.sh`; the runner refuses to start until each one resolves here. Undo it with `sh ~/.claude/skills-eval-backup/restore.sh`. Each run records the checkout's HEAD and a hash of any uncommitted change under `skills/` and `global/`.

Run, from the repo root, after the user's yes to the spend:

    node .claude/evals/modes/run-eval.mjs --flow .claude/hillclimb/modes --variant baseline \
      --model claude-opus-5-5 --effort medium --budget-usd 10 \
      --reps 2 --concurrency 5 --timeout-s 3600

The first run of a changed harness stops until the user approves it with `--approve-harness`.
