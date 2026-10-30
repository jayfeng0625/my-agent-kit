# Single loop plan

Audit date: 2026-10-29
Repo and commit: jayfeng0625/my-agent-kit at 14f8c94 (branch `claude/routers-audit-poteto-removal-gcddj7`)

What blocks the plan: nothing; the reference run is `baseline` at kit `8a1316d` on harness `e9c7095ea344` (20 of 20, new container, 2026-10-30), and the person picks the next variant at its check-in.

## Status

- [ ] Verdicts agreed with the person (end of step 0)
- [x] Main eval agreed and baseline measured (end of step 1)

A new session picks up at the first unticked box here, then at the first unticked item in
the worklist.

## Verdicts

The system already has the single-loop shape: each `-mode` is a skill the main session loads, and the session runs the playbook itself (mode-core.md:20). The router is the person, who types `/<x>-mode`; every mode sets `disable-model-invocation: true`. The subagents below are the delegates the modes and their routed skills spawn. Backing rows: `single-loop/inventory.tsv`.

| Agent | Verdict | Why, in one sentence | Evidence | Confidence |
| --- | --- | --- | --- | --- |
| main session | `main` | Runs every playbook and owns every spawn. | mode-core.md:20 | high |
| dark-factory lane reviewer | `merge:dark-factory verifier` | A lane cannot spawn it, and the verifier reads the same diff right after. | probe: a subagent's tools hold Skill but no Agent or Task; run.md:11 | high |
| poteto-agent | `merge:mode-agent` | Same role and frontmatter as mode-agent; only poteto-mode spawns it. | mode-agent.md:1-7, poteto-agent.md:1-6 | high |
| comment-sicko | `merge:fresh reviewer` | Runs on the same diff just before the fresh reviewer, and mode-core already states its rule. | impl-mode/SKILL.md:33, mode-core.md Comments | medium |
| mode-agent (code delegate) | `as-tool` | Parallel lanes in their own worktrees earn the context; it needs a fixed return shape. | impl-mode/SKILL.md:61, bug-hunting-mode/SKILL.md:56 | medium |
| fresh reviewer | `as-tool` | Independent review earns the context; findings come back as free text. | impl-mode/SKILL.md:84 | medium |
| bulk parser | `as-tool` | Reads tens of thousands of tokens the main thread never keeps. | research-mode/SKILL.md:29, bug-hunting-mode/SKILL.md:28 | medium |
| research fresh check | `as-tool` | Checks citations it did not write. | research-mode/SKILL.md:53 | medium |
| dark-factory lane | `as-tool` | One per ticket, parallel; its 15-line report is already near-structured. | dark-factory-mode/SKILL.md:38 | high |
| dark-factory verifier | `as-tool` | Independent verdict on a head SHA; already structured. | dark-factory-mode/SKILL.md:39 | high |
| how explainer | `fold` | Rewrites explorer findings the main thread could read itself. Upstream-owned. | how/SKILL.md:30 | low |
| why synthesizer | `fold` | Merges reports the main thread could merge. Upstream-owned. | why/SKILL.md:81 | low |
| how explorers, why investigators, DESIGN-IT-TWICE designers, show-me-your-work reviewer | `as-tool` | Parallel or independent work. Upstream-owned, so left as the upstream skills spawn them. | how/SKILL.md:26, why/SKILL.md:51, DESIGN-IT-TWICE.md:21, show-me-your-work/SKILL.md:69 | medium |

No `keep` rows: no subagent talks to the user over several turns.

Glue that goes away as subagents fold or merge:

- The `Put this file's absolute path in every mode-agent prompt` line in each mode, and mode-agent.md's read-the-mode preamble, once delegates get a fixed brief (as-tool).
- mode-core's per-role routing for spawns that become tools with a named role.
- The `/no-comments` step in each mode's Before commit trigger (comment-sicko merge).
- impl-mode Verify item 3 as a lane step in dark-factory (lane reviewer merge).

## Prompt notes

- Hard limits written as prose that a tool or a permission rule could enforce:
  - ops-mode Prod boundary (read verbs only against prod): a `deny` permission rule or a PreToolUse hook on the prod context.
  - dark-factory Gates (no `git push`, no `gh` writes for lanes and verifiers): `deny` rules in the lane's settings.
  - how's "the subagent edits no files": a `tools:` list without Edit and Write on a dedicated agent type.
- Persona: comment-sicko writes in the first person ("I read nearby..."). One voice for the main session's reply.
- This container sets `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`, which may be why the probe found that a subagent cannot spawn; a local install may differ. The eval runs without that variable.
- Instructions about other agents: mode-agent.md:11 says the parent owns "every Agent spawn", while impl-mode Verify 3 and dark-factory lanes assume a delegate spawns a reviewer. A delegate cannot spawn (probe).
- Rules that conflict across files (all found by the audit lanes, details in the Changes log):
  - brief (every reply, about 5 lines, no tables) against each mode's Reply line (VERIFIED, REASONED and Deferred lists, tables).
  - mode-core passes effort `medium` for a role line with no effort; pstack-models.md:2 says it runs at the session's effort.
  - mode-core's `inherit` omits `model`, but mode-agent's frontmatter pins `model: opus`.
  - Ten routed skills set `disable-model-invocation: true` (how, why, deslop, unslop, technical-writing, no-comments, figure-it-out, show-me-your-work, benchmark-checklist, triage), so the Skill tool will not run them, and mode-core names no other way to load them.

## Evals

| Eval | What it measures | What to do with it |
| --- | --- | --- |
| `.claude/checks/modes.test.ts` | Structure: Verify heading last, mode-core opening, playbook paths, trigger names and Verify item numbers resolve | Keep as a gate. It scores no behavior. |
| `.claude/evals/modes/` (built in step 1) | Outcome of impl, bug-hunting and research mode runs on a fixture repo: commits, hidden tests, read-only state, judged reply facts | Main metric, once the person signs off the tasks |

Main metric: `pass` on `.claude/evals/modes/`. Pinned: `claude-opus-5-5` at effort `medium` with `--budget-usd 10` per case for the run under test, `claude-sonnet-5-5` for the judge (the person's settings, 2026-10-29).

Sign-off (2026-10-29, the person): tasks as drafted, the probe and baseline spend, `--approve-harness`, and no stop after the baseline for the hillclimb port and the poteto-mode removal. A first probe at effort `high` finished t08 twice (pass both; 224k and 308k input tokens, 3.1k and 4.4k output, 7 and 9 model calls, 32 s and 49 s, all on the main agent) before the person switched to `medium`; those rows sit outside the flow dir and do not count.

Runner (built 2026-10-29): `node .claude/evals/modes/run-eval.mjs`, adapted from `/claude-api build-eval`'s scaffold. Entry point: `claude -p "/<mode> <request>"`, the same slash command the person types. What makes it safe: each case builds a throwaway fixture repo with no remote; `HOME` is a scratch dir that links `global/` and `skills/` from a `git archive` of `--kit-ref`; the environment keeps only the model proxy variables (no `CLAUDE_CODE_*` session ids, no `GH_TOKEN` or `GITHUB_TOKEN`); a `gh` shim always fails; `git push`, WebSearch, WebFetch and MCP are off. The person chose this design at the regroup. Proven with no model: `graders.test.ts` (30 checks: each code task's reference fix passes, doing nothing and a plausible wrong fix fail; each read-only task fails on a commit or a tracked edit), and a full dry run with a stand-in `claude` that wrote rows, traces, `by_agent` and actions that `compare.py` read.

Where the tasks come from: no transcripts were shared, so Claude synthesized them from the modes' playbooks onto the fixture (the lowest-fidelity source), for the person to correct.

| Task | Mode, playbook | Graded on |
| --- | --- | --- |
| t01-impl-csv | impl, Feature | `--csv` output exactly per INV-12 (ticket example, and a hidden invoice with a comma, quotes and a newline); report unchanged; suite green; cache, rates and config untouched |
| t02-impl-refactor | impl, Refactoring | report.js and cli.js call formatCents with no cents math of their own; CLI output identical to main on three invoices; suite green |
| t03-impl-no-ticket | impl, unhappy path | no commit, no tracked edit; judge: the reply asks where INV-31 lives |
| t04-impl-trim | impl, Trim | diff against main only in invoice.js, report.js and tests; INV-15 works; the [dbg] log, its log-wording test, legacyRound, lodash and the cache.js reindent gone; suite green |
| t05-bug-discount | bug-hunting, Bug fix | tax on the discounted amount per docs/pricing.md (hidden invoices), per-line rounding kept; suite green; no debug output. Secondary: a test red on main. The prompt carries a wrong premise (INV-7 rounding) |
| t06-bug-cache | bug-hunting, Bug fix | updating a key in a full LRU keeps the others, new keys still evict LRU; suite green; no debug output. Secondary: set refreshes recency; a test red on main |
| t07-bug-perf | bug-hunting, Perf issue | 60,000-line invoice under 1 s (main: 5.2 s) with identical output; a repeated SKU still rejected by name; suite green; no debug output |
| t08-research-why | research, Investigation | no writes; judge: the ERP stores tax per line, so subtotal rounding broke reconciliation; cites 8ccfd20 or INV-7 |
| t09-research-how | research, Investigation | no writes; judge: parseInvoice, computeTotals with the cached rateFor, renderReport; at least three `file:line` citations |
| t10-research-premise | research, Assessment | no writes; judge: `cache.maxEntries` is never read (rates.js reads `rateCacheSize`, default 16), so the change does nothing |

Proposed run: probe of t08 x2 and t01 x1, then baseline of 10 tasks x 2 reps at concurrency 5, each case capped at 3600 s. No mode run has been measured, so the size is a guess until the probe: each conversation is likely 1M to 6M input tokens, mostly cache reads, and 20k to 80k output tokens, which puts the baseline near 20M to 120M input tokens. The probe narrows it with `estimate.py`.

Decisions from the regroup (2026-10-29, the person):

- Build a headless eval: `claude -p` against a fixture repo with an isolated `HOME`. Credential: the host proxy of the cloud container, after a one-call probe.
- Fix the audit's clear bugs first, each topic its own commit, then baseline the fixed head.
- Tasks: Claude drafts about 10 on a fixture repo, and the person corrects each expected outcome before any run.
- First eval covers impl-mode, bug-hunting-mode and research-mode. ops-mode and dark-factory-mode come later.
- In the brief vs mode reply conflict, the mode's Reply sections win on content inside a mode run. brief governs style.
- poteto-mode: its Hillclimb becomes a standalone `hillclimb` skill, and its Autonomous run becomes a dark-factory playbook.

Probe (2026-10-29): `env -u CLAUDECODE HOME=<scratch> claude -p "Reply with exactly: OK" --output-format json --max-turns 1` exited 0 through the host proxy. The response served `claude-opus-5-5`, and the call used 35,377 input tokens (26,629 cache reads), 4 output tokens, and `total_cost_usd` 0.0755 at list price. The JSON's `session_id` equalled the parent session's id, so the runner must start each run from an allowlisted environment that drops the inherited `CLAUDE_CODE_*` session variables.

Second probe (2026-10-29): the same one-call check with the allowlisted environment the runner uses (`env -i` plus the proxy variables) exited 0 on `claude-opus-5-5` with its own session id, 17,215 input tokens (11,852 cache reads) and 4 output tokens.

Gaps noticed: no task checks that a mode reaches its routed skills, that a delegate's spawn-dependent step still runs, or that a prod write goes through Hand-off.

Chains with no task: all (no traces, no eval). Inferred chains: mode-agent then fresh reviewer; dark-factory lane then verifier; how explorers then explainer; why investigators then synthesizer; comment-sicko then fresh reviewer.

Break map: filled in at step 1.

| What could break | Tasks that would notice | Gap, and the task to add |
| --- | --- | --- |
| Dropped handoff | t01, t02, t04 to t07 grade the committed end state after any mode-agent and fresh-review rounds | dark-factory lane to verifier: out of this eval's scope (dark-factory comes later) |
| Lost rule | t08 to t10 and t03 (read-only, no write); t05 to t07 (debug output left in the diff) | ops prod write outside Hand-off: ops-mode comes later |
| Shortcut | t05 (a wrong premise in the request), t10 (a premise about config in force) | |
| Wrong pick | t07 (Perf issue over Bug fix), t10 (Assessment over Investigation); graded on the outcome | |
| Unwanted write | t03, t08 to t10 fail on any commit or tracked edit; every row records its writes for `compare.py` | |
| Lost thread | n/a: headless runs are single-turn | |
| Unhappy path | t03 | |

Baseline (variant `baseline`, 2026-10-30): kit `fb28d38`, `claude-opus-5-5` at `medium`, `--budget-usd 10`, 10 tasks × 2 reps, judge `claude-sonnet-5-5`. 17 of 20 rows finished on the first pass; the one rerun of the 3 errored rows finished t08 rep 1 and errored t03 twice more. Scored: 17 of 18 rows pass (t03 has no score). After the harness fixes below (approved 2026-10-30, sha `513a580902cb`): 20 of 20 pass. Results: `.claude/hillclimb/modes/baseline/`.

| Task | Pass (r0, r1) | Latency s | Input tokens | Output tokens | Model calls (main + delegates) |
| --- | --- | --- | --- | --- | --- |
| t01 impl csv | 1, 1 | 270, 153 | 1.72M, 0.97M | 28.3k, 17.1k | 41 (27 + 14), 24 (18 + 4 + 2 comment-sicko) |
| t02 impl refactor | 1, 1 | 194, 126 | 1.10M, 0.78M | 20.2k, 13.1k | 29 (20 + 9), 23 (15 + 8) |
| t03 impl no ticket | 1, 1 (after the fix) | 9, 6 | 69k, 46k | 0.6k, 0.4k | 3, 2 (main only) |
| t04 impl trim | 1, 1 | 76, 83 | 0.55M, 0.60M | 7.8k, 8.5k | 18 (13 + 5), 19 (13 + 6) |
| t05 bug discount | 1, 1 | 107, 224 | 0.56M, 1.31M | 10.8k, 25.6k | 16 (12 + 4), 35 (21 + 14) |
| t06 bug cache | 1, 1 | 71, 75 | 0.44M, 0.42M | 7.3k, 5.8k | 14 (10 + 4), 15 (11 + 4) |
| t07 bug perf | 1, 1 | 283, 118 | 1.43M, 0.69M | 22.4k, 8.4k | 33 (21 + 10 + 2 comment-sicko), 20 (15 + 5) |
| t08 research why | 1, 1 | 29, 36 | 0.22M, 0.26M | 2.7k, 3.5k | 7, 8 (main only) |
| t09 research how | 1, 1 (regraded; 1, 0 before) | 27, 81 | 0.15M, 0.42M | 2.5k, 8.7k | 5 (main only), 14 (11 + 3 general-purpose) |
| t10 research premise | 1, 1 | 53, 43 | 0.23M, 0.23M | 5.4k, 4.5k | 10 (6 + 4), 10 (6 + 4) |

Totals over the 18 scored rows: 12.06M input tokens, 203k output, CLI-reported $13.31 (the person's own prices may differ). Estimate against actual (`estimate.py ... probe --tasks 10 --reps 2 --heavy 6 --actual baseline`): likely 24M input, actual 12.06M, inside the 3.5M to 37M range; output had no upper figure, actual 203k. The estimate leaves out the judge calls and my own usage.

Noise band between reps: wide. Tokens and model calls differ by up to 2.3× on the same task (t05: 16 and 35 calls; t07: 1.43M and 0.69M input), from how many review and fix rounds a mode-agent ran. A later variant needs a change bigger than that to read as a cost move on 2 reps; pass/fail is steady except t09.

Failures, each trace read. Both fixes are applied: the person said apply and rerun on 2026-10-30. t03 reran (2 rows, both pass, CLI-reported $0.22). Both t09 rows were regraded from their saved replies with the corrected facts and keep their first grade as `grade_before_fix`; rep 1 now passes.

- **t09 rep 1, graded 0: a grader bug.** The reply walks the whole path with eight file:line citations and is correct. The judge failed `totals` because the reply says the rate goes through "the rate cache" without the word LRU, and `render` because it does not say `--summary` prints a one-line total; the prompt asks only about `node src/cli.js examples/discounted.json`, and the reply does say that without `--summary` the CLI prints the full report (`src/cli.js:14`). Proposed fix in `tasks.json` (a harness file, so it needs the person's `--approve-harness`): drop "which goes through an LRU cache" from `totals` and the `--summary` parenthesis from `render`. This rep also took a different route: research-mode ran the `how` skill's explainer as a `general-purpose` subagent (3 calls), where rep 0 answered from the main agent alone.
- **t03, both reps on both passes: a harness bug.** `runCase` raises "the impl-mode skill never loaded" unless the stream shows a path under `skills/impl-mode`. A slash command's text reaches the model without showing in `stream-json`, so a run that answers from the loaded skill alone, without opening a skill file, looks unloaded. All four t03 runs did what the task wants: each stopped, said `tickets/INV-31.md` does not exist, asked where the tier rules live, and left the repo clean. Graded offline with the same `gradeRun` (not written to `results.jsonl`), all four pass 1. t08 rep 1 hit the same check on the first pass and passed on the rerun because that run opened a playbook. Proposed fix in `run-eval.mjs`: count the skill as loaded when the init event lists `<mode>` among `slash_commands` and the reply carries no unknown-command error, then rerun t03 (2 rows, about $0.30 each at CLI prices). Also needs `--approve-harness`.

The rule check (read-only tasks leave the repo clean) held in every scored row; no row wrote outside its task.

## Worklist

Merges first, then folds, then as-tool changes. With no traffic data, lowest risk first.

- [ ] 1. `merge dark-factory lane reviewer into the verifier` · variant: · compared with: · result:
- [x] 2. `merge poteto-agent into mode-agent (remove poteto-mode)` · variant: none (no mode run sees poteto-mode or poteto-agent; every mode already spawns mode-agent) · compared with: n/a · result: removed on 2026-10-30. Its 22 playbooks: 12 live on in the task modes, the hillclimb skill and dark-factory's Autonomous run; multi-phase-plan, orchestrate and autopilot-full became dark-factory's Plan, Orchestrate and Run's `prs` grant and swarm verdict (with `check-plan.mjs` and the `orch` CLI); authoring-a-skill and pause-safely fall to skill-creator and handoff; opening-a-pr, babysit, shipping, autopilot-stack, eval, visual-parity and worktree-cleanup have no successor
- [x] 3. `merge comment-sicko into the fresh reviewer` · variant: v1 (`73dd5b2`) · compared with: baseline · result: 10/10 both sides; calls +13%, input tokens +11% (inside rep noise); comment lines left 3 to 0; kept on 2026-10-30. ops-mode still runs `/no-comments`.
- [x] 4. `fold the how explainer (upstream, needs merge_guidance)` · variant: v2 (`34bfe48`, simple path only) · compared with: v1 · result: 10/10 both sides; t09 11 to 6.5 calls, 316k to 190k input tokens; skill check v3 (no how skill) also passes t09; kept with the skill and its route on 2026-10-30. The complex path (explorers, explainer) is unchanged and has no task.
- [ ] 5. `fold the why synthesizer (upstream, needs merge_guidance)` · variant: · compared with: · result:
- [ ] 6. `mode-agent as a tool: fixed brief fields and a response shape` · variant: · compared with: · result:
- [ ] 7. `fresh reviewer as a tool: findings tagged blocking or not, with file:line` · variant: · compared with: · result:
- [ ] 8. `bulk parser as a tool: reduced finding with its source location` · variant: · compared with: · result:

Item 1 fixes a broken path today (a lane cannot spawn its reviewer). Item 2 is the person's stated goal.

## Resume point (2026-10-29, AFK runbook)

Done on the branch (gate green: `npm test` 93/0, `npm run typecheck` clean): the reference lint, this audit, the audit bug fixes (one commit per mode), upstream skills off poteto-mode, the mode eval (`.claude/evals/modes/`, commit 827fc23), and a draft `skills/hillclimb/` with three skill-creator test cases in `.claude/evals/hillclimb/` (kept outside `skills/` so installs do not ship them).

The person signed off the tasks, the spend, the harness and running unattended (see Evals). Settings for every mode eval run: `--model claude-opus-5-5 --effort medium --budget-usd 10 --kit-ref fb28d38`, with `--work /tmp/claude-0/-home-user-my-agent-kit/593d717f-ce66-55b2-9d36-c1ae470a9d80/scratchpad/eval-work` while this container lives. `fb28d38` is the head the probe ran on; the hillclimb skill and later commits are not model-visible to the three modes (every new or removed skill here sets `disable-model-invocation: true`).

Run unattended, in order. Stop and write a check-in at the end of `PLAN.md` the moment a run errors, a grader looks wrong, or a result surprises; otherwise keep going.

1. **Probe.** Done 2026-10-29 at `medium`, all three passed. t08: 25 s and 28 s, 203k and 149k input tokens, 2.3k and 2.2k output, 7 and 5 model calls, main agent only, CLI-reported $0.28 and $0.25. t01: 198 s, 1.85M input, 25.7k output, 48 model calls (main 27, mode-agent 19, comment-sicko 2), CLI-reported $1.52. `estimate.py --tasks 10 --reps 2 --heavy 6`: 3.5M to 37M input tokens, likely 24M; at least 45k output. The per-agent output counts in `by_agent` read the first streamed usage of each message and undercount; the row totals come from the CLI's `modelUsage` and hold. Was: when it finishes, run `python3 .claude/skills/single-agent-loop/scripts/estimate.py .claude/hillclimb/modes probe --tasks 10 --reps 2 --heavy 4` and record the range here.
2. **Baseline.** In the background, from the repo root:
   `node .claude/evals/modes/run-eval.mjs --flow .claude/hillclimb/modes --variant baseline --model claude-opus-5-5 --effort medium --budget-usd 10 --kit-ref fb28d38 --work <work dir> --reps 2 --concurrency 5 --timeout-s 3600`
   Afterwards record under Evals: tasks complete, latency, tokens and model calls per task, the noise band between reps, and the tokens used against the estimate (`estimate.py ... probe ... --actual baseline`). Read the trace of every failing task (`.claude/hillclimb/modes/baseline/traces/`, full stream in the row's `workdir`). A grader bug is ours to fix, but editing the harness needs the person's `--approve-harness` again, so record it and leave the fix for them. An expected outcome that looks wrong goes to the person with what the run did. Rerun `errors.jsonl` cases once by rerunning the same command (resume skips finished rows).
3. **hillclimb skill test runs** (skill-creator loop). The person said yes to their spend (6 runs at most $10 each), and `medium` effort applies to eval runs only; `pstack-models.md` roles stay as they are: 3 cases, each with the skill and without it, as headless `claude -p` runs on the invoicer fixture under the same isolation and `--budget-usd 10`. Workspace: `.claude/hillclimb/hillclimb-skill/iteration-1/<case>/{with_skill,without_skill}/`. Grade each case's `graders/` statements into `grading.json`, aggregate with skill-creator's `scripts.aggregate_benchmark`, and write the viewer with `generate_review.py --static`. The person reviews it before any rewrite.
4. **dark-factory Autonomous run.** Port `skills/poteto-mode/playbooks/autonomous-run.md` as `skills/dark-factory-mode/playbooks/autonomous-run.md`: one exit predicate driven to done unattended, under dark-factory's Gates and Any ask or pause rule (no `AskUserQuestion`; a park where no safe default exists), with `/loop` for waking. Add it to the mode's Playbooks list. dark-factory is outside this eval, so no rerun.
5. **Remove poteto-mode** in its own commit: `skills/poteto-mode/`, `upstream/poteto-mode.yaml`, `global/agents/poteto-agent.md`; README (skill count, credits: pstack's count drops by one), AGENTS.md (the agents list), LICENSE wording if it names poteto-mode, `notTaskModes` in `.claude/checks/modes.test.ts`, and any remaining `poteto` mention (`grep -rn poteto --exclude-dir=.git`). Tick worklist item 2: it changes nothing a mode run sees, so it needs no variant.
6. `npm test`, `npm run typecheck`, commit each step, push, and write the closing check-in.

Run 2026-10-30: steps 2 to 6 done (baseline, hillclimb test runs, playbook `991e583`, removal `1b0b692`); gate green, `npm test` 93/0 and `npm run typecheck` clean.

Stopped 2026-10-30 after the `v2-rerun` check-in, at the person's word. Every owner question is answered. Resume at worklist item 6 as `v4`, compared with `v2-rerun` (20 conversations, about 12M input tokens; the harness sha is approved, so no `--approve-harness`). The kit-ref commits `db82963`, `f0d6d88` and `8ae0f0c` are local to this container; to rebuild one, apply the pushed change on the previous ref: `db82963` is 73dd5b2's diff on `fb28d38`, `f0d6d88` is 34bfe48's diff on `db82963`, and `8ae0f0c` is `f0d6d88` without the how skill and research-mode's route to it.

## hillclimb skill test runs (iteration 1, 2026-10-30)

Runner: `.claude/evals/hillclimb/run.mjs`, kit `991e583` with poteto-mode left out of both homes, `claude-opus-5-5` at `medium`, `--budget-usd 10`, one run per case and configuration; judge `claude-sonnet-5-5` over the reply, the transcript, and the runner's own measurement of the base and final trees on a fresh 60k-line invoice. Workspace and review page: `.claude/hillclimb/hillclimb-skill/iteration-1/` (`review.html`, `benchmark.md`).

| Case | With skill | Without skill |
| --- | --- | --- |
| perf-to-target | 5/5; 58.5× measured, 2 commits kept, 1 reverted, decision log; 188 s, 0.96M tokens | 1/5; 52.7× measured, but one timing sample, no log, fix left uncommitted; 21 s, 0.09M tokens |
| memory-target | 4/4; 34.1% less RSS measured, 7-sample baseline, log; 588 s, 2.20M tokens | 1/4; 34.9% less RSS measured, no log, uncommitted; 476 s, 1.57M tokens |
| no-reproducing-case | 3/3; measured, proposed metric, target and floor, stopped to agree them, no edit; 34 s | 3/3; found a 30k-line workload, measured, fixed without asking, uncommitted; 63 s |

Pass rate 100% against 48%. Both configurations reach the speed and memory targets in code; the skill adds the discipline the assertions check (sampled baseline, one commit per kept change, the log, the reply's numbers) and costs more tokens for it. no-reproducing-case does not discriminate as written. My first grading pass measured the committed tree for runs that left edits uncommitted and scored both without-skill code runs at 0.9×; the runner now measures the checkout in that case, and all six were regraded (the first grading is kept in the scratchpad). The skill is unchanged: per the runbook the person reviews `review.html` before any rewrite.

## Changes

Prose fixes made outside the worklist, after this audit, on the same branch (each its own commit; none adds, removes or reroutes an agent): see `git log 14f8c94..` and the commit bodies. They change text every mode run reads, so a baseline taken later runs on them; pick the commit to baseline at step 1.

## Open questions for owners

1. ~~Adapt upstream skills.~~ Answered 2026-10-30: adapt, when the eval shows a gain. Each edit is recorded in its `upstream/<name>.yaml` `merge_guidance`. Item 4 stays; item 5 stays on the worklist and waits for an eval task.
2. ~~Explorer and investigator models.~~ Answered 2026-10-30: the user's configuration decides; `pstack-models.md`'s role lines rule, and line 4 routes only judgment and routine fan-out to sonnet. No edit.
3. ~~Fresh reviewer effort.~~ Answered 2026-10-30: name no level. `/code-review` reuses the session's last level, which is simpler; the reviewer already loads the project's context and its review rules. No edit.

## Left as it is, and why

- How explorers, why investigators, DESIGN-IT-TWICE designers and the show-me-your-work reviewer: each earns its context, and each belongs to an upstream skill.

## Check-in: after the baseline (AFK run, 2026-10-30)

**Found**
- Baseline: 17 of 18 scored rows pass; t03 has no score. 12.06M input tokens and 203k output against a 24M estimate; CLI-reported $13.31.
- Two harness bugs, not mode failures. t03's "skill never loaded" check misses runs that answer without opening a skill file (all 4 t03 runs pass when graded offline). t09 rep 1's judge facts ask for "LRU" and `--summary` wording the prompt never asked for. Fixes are written under Evals; each needs `--approve-harness`.
- Reps vary up to 2.3× in tokens and model calls on the same task, so a cost change needs to be bigger than that to read on 2 reps.
- hillclimb skill: 100% against 48% without it, one run each. The review page is `.claude/hillclimb/hillclimb-skill/iteration-1/review.html`.
- Done beyond the eval: dark-factory's Autonomous run playbook (`991e583`), poteto-mode removed (`1b0b692`, worklist item 2 ticked), the hillclimb runner and its measuring fix.

**Recommend**
- Apply both harness fixes, approve the harness, and rerun t03 (2 rows) and regrade t09 rep 1: about 2 conversations, under 0.5M input tokens on the probe's numbers. Then worklist item 1.
- Or start item 1 now on the baseline as it stands, with t03 unscored.

**Need from you**
- Apply the two harness fixes and rerun t03, 2 conversations? apply and rerun / start item 1 as is

Answer (2026-10-30): apply and rerun. Done: the skill-loaded check now reads the init event's `slash_commands` and the reply, t09's `totals` and `render` facts drop LRU and `--summary`, the README example carries the pinned flags, and the harness is approved at `513a580902cb`. t03 reran and both rows pass; both t09 rows were regraded and pass. Baseline: 20 of 20. Next: worklist item 1.

## Check-in: before item 3 (2026-10-30)

The person asked for item 3 (merge comment-sicko into the fresh reviewer). Its pre-change check found a gap.

**Found**
- Chain coverage: no production traces exist, so the chain list comes from the baseline. comment-sicko ran in 2 of 12 code runs (t01 rep 1, t07 rep 0); the `/no-comments` step in impl-mode and bug-hunting-mode's triggers was skipped in the other 10. The fresh review ran in all 12.
- No grader checks comments. The end of this chain (a diff with no narration comments) is unscored, so the merge would be measured on an eval that cannot see the break it risks.
- What the baseline left: 3 added comment lines across 12 code runs (t01 rep 0: one narration line on `renderCsv`; t05 rep 1: two lines on rounding, a defensible non-obvious why).

**Recommend**
- Add a `comments` check to the code tasks first: the judge reads each comment line the run added under `src/` and `test/` and fails one that narrates or restates the code, per mode-core's Comments rule. Regrade the baseline from its saved repos (judge calls only), approve the harness, then build item 3 and run it as `v1` (20 conversations, about 12M input tokens on the baseline).
- Or build item 3 now on the eval as it is, with the gap written in `change.md`; the result then says nothing about lost comment cleanup.


Answer (2026-10-30): "Comment check should stay with the reviewer", read as build item 3 as is. Built as `73dd5b2`; `v1` ran on `db82963` (the same diff on `fb28d38`), 20 conversations.

## Check-in: after item 3 (v1, 2026-10-30)

**Found**
- `compare.py baseline v1`: 10 of 10 tasks pass on both sides, no task worse, verdict holds. Model calls per task 17.3 to 19.5 (+13%), input tokens 608k to 673k (+11%), all of it on the code tasks (10.68M to 11.99M; research 1.50M to 1.48M). Baseline reps of one task differ by up to 2.3x, so +11% sits inside rep noise.
- Latency 103 s to 164 s comes from one run: t01 rep 0 took 1346 s with 45 calls. The main session called `ScheduleWakeup` (1200 s) while its `/simplify` agents ran, and slept it out. Baseline t01 rep 0 made the same call and returned in 270 s; v1 t06 rep 0 and t07 rep 1 also called it. Without that run, mean latency is 103 s on both sides. Not caused by this change; a headless `-p` run should never sleep on a wakeup (finding for mode-core's Stall check or the eval's tool list).
- Comment check: every v1 review brief (16) named the Comments rule; none of the 18 baseline briefs did. Both t01 reviewers flagged the new `src/csv.js` header comment and both runs cut it. Added comment lines left in final diffs: baseline 3 (t01 rep 0, t05 rep 1), v1 0. No grader scores this; counted by grep over each run's `git diff main -- src test`.
- Routes: comment-sicko gone (0.2 calls per task to 0). Other moves (t09 general-purpose 1 rep to 2) are one rep apart and off the changed path; research-mode was not edited.
- Estimate 12.0M input tokens, actual 13.47M (`estimate.py --actual v1`). CLI cost $13.53 baseline, $14.49 v1.
- ops-mode still runs `/no-comments`: no eval task covers it.

**Recommend**
- Keep: no task got worse, the extra tokens sit inside rep noise, and the comment check now runs in every code run. Nothing is left to delete, since ops-mode still uses no-comments and comment-sicko; moving ops-mode is a separate call. Next measurable item is 4 (fold the how explainer, covered by t09): `v2` at 20 conversations, about 13M input tokens on v1, plus the with and without skill check on t09, 4 conversations, about 1.3M. Item 1 (dark-factory lane reviewer into the verifier) has no eval task: dark-factory is outside the eval.

**Need from you**
- Keep item 3 and go on to item 4? keep and go on / keep and stop / fix / revert

Answer (2026-10-30): keep and go on. Item 4 scoped to the how skill's simple path (the only path t09 runs); `v2` and its skill check `v3` (t09 only) started.

## Check-in: after item 4 (v2, 2026-10-30)

**Found**
- `compare.py v1 v2`: 10 of 10 pass on both sides, no task worse, verdict holds. Calls per task 19.5 to 19.9, input tokens 673k to 691k (+3%, rep noise). On t09, the task the fold touches: 11 to 6.5 calls, 316k to 190k input tokens, 75 s to 29 s, both reps pass; the general-purpose explainer is gone (2/2 to 0/2), and no other route moved.
- Skill check (`v3`, t09 with the how skill and research-mode's route to it removed): both reps pass, 5.5 calls, 150k input tokens. On t09 the how skill's instructions do not move the score. t09 is one narrow question; the skill's explorers serve the complex path, which no task runs.
- Latency 164 s to 207 s comes from two runs (t01 rep 0, t02 rep 0, 1352 s each) where the main session called `ScheduleWakeup` for 1200 s while background agents ran, then slept it out. v1 had one such run, the baseline none that slept. Without them: 102 s (v1) and 80 s (v2). Not caused by either change.
- Estimate 13.0M input tokens, actual 13.83M; v3 used 0.30M.

**Recommend**
- Keep v2, and keep the how skill and its route: a two-rep check on one narrow task is thin grounds to drop an upstream skill whose main use (complex questions, `/how` typed directly) the eval cannot see.
- Before item 6, fix the wakeup stall: add `ScheduleWakeup` to the eval's disallowed tools (a harness edit, needs `--approve-harness`; no run of its own). It is a `/loop` tool, and a mode run waiting on a background agent gets its notification without it. Next measurable item is 6 (mode-agent as a tool), on all code tasks: `v4`, 20 conversations, about 14M input tokens on v2. Item 5 (why synthesizer) has no task on its chain: every t08 run answered from the main agent alone, so the synthesizer never ran. Item 1 has none either.

**Need from you**
- Keep item 4 and go on to item 6, with the wakeup fix first? keep and go on / keep and stop / fix / revert

Answer (2026-10-30): keep and fix, then recap. The mode eval now disallows `ScheduleWakeup`; the next run needs `--approve-harness`. Item 6 not started.

## Check-in: rerun after the wakeup fix (v2-rerun, 2026-10-30)

**Found**
- `v2-rerun` reran v2's kit (`f0d6d88`) under the fixed runner: 20 runs, 0 failed, 10 of 10 pass. No stream mentions `ScheduleWakeup`; the slowest run took 256 s.
- Against v2: latency 207 s to 102 s, calls 19.9 to 17.9, input tokens 691k to 609k. Against the baseline: 103 s to 102 s, calls 17.3 to 17.9, input tokens 608.6k to 608.9k; no task worse, and the only route moves are one-rep ones the baseline also shows.
- Estimate 14.0M input tokens, actual 12.18M.
- `v2-rerun` replaces v2 as the reference for the next change.

## Check-in: reference run in a new container (baseline, 2026-10-30)

The old container's results did not carry over, so `.claude/hillclimb/modes/` starts again. Before the run, two review fixes landed: `9b1f043` (dark-factory prose and `check-plan.mjs`, not model-visible to the three modes) and `8a1316d` (grading runs in a worker thread, so a case's grading no longer stalls the cases in flight; a tracked edit in a linked worktree now fails a read-only task). `_state.json` now lists the grader, tasks, fixture and hidden tests as `harness_paths`, so the approved sha `e9c7095ea344` covers 60 files.

**Found**
- `baseline` on kit `8a1316d`: 20 runs, 0 failed, 10 of 10 tasks pass both reps, 728 s wall at concurrency 5.
- Per task: 18.5 model calls, 609.6k input tokens, 117 s mean latency; 12.19M input and 199k output in all, CLI-reported $12.63 (judge calls not counted). Against the old container's `v2-rerun` (17.9 calls, 608.9k, 102 s): the same within rep noise. One slow row, t07 rep 1 (450 s, 34 calls, 13 on mode-agent), lifts the latency mean.
- Rep spread holds: t04 0.74M and 1.28M, t07 0.73M and 1.06M, t06 23 and 15 calls; the spread follows mode-agent calls (review and fix rounds).
- `estimate.py ... baseline --reps 2`: the next 20-conversation run is about 12.0M input and 200k output tokens.

| Task | Pass | Latency s | Input tokens | Calls (main + mode-agent) |
| --- | --- | --- | --- | --- |
| t01 impl csv | 1, 1 | 215, 205 | 1.64M, 1.57M | 24 + 18, 24 + 21 |
| t02 impl refactor | 1, 1 | 151, 202 | 0.87M, 0.89M | 17 + 6, 18 + 12 |
| t03 impl no ticket | 1, 1 | 19, 13 | 0.06M, 0.09M | 3, 4 |
| t04 impl trim | 1, 1 | 94, 217 | 0.74M, 1.28M | 17 + 6, 21 + 11 |
| t05 bug discount | 1, 1 | 66, 134 | 0.43M, 0.67M | 11 + 5, 13 + 5 |
| t06 bug cache | 1, 1 | 128, 53 | 0.75M, 0.38M | 15 + 8, 12 + 3 |
| t07 bug perf | 1, 1 | 201, 450 | 0.73M, 1.06M | 17 + 4, 21 + 13 |
| t08 research why | 1, 1 | 27, 22 | 0.19M, 0.13M | 7, 5 |
| t09 research how | 1, 1 | 28, 26 | 0.15M, 0.14M | 6, 5 |
| t10 research premise | 1, 1 | 42, 52 | 0.20M, 0.20M | 6 + 3, 6 + 3 |

**Recommend**
- Next: P1 (impl-mode and bug-hunting-mode re-review only after a `blocking` fix) as `v1`, compared with `baseline`. It targets the mode-agent rounds that drive the spread above. Then P3 (drop `/simplify` from impl's Before commit), P2 (foreground for a spawn the session waits on), worklist items 6 and 7, then P4 (the four code playbooks run `how` and `why` only for an unread subsystem or a regression) and P5 (no `brief` or `read-before-implementation` read inside a mode run). The prompt audit ranked P1 to P5 by expected saving, inferred at 40k to 80k input tokens per task for P1 down to 15k to 25k for P5. Each is 20 conversations, about 12M input tokens.

**Need from you**
- Run P1 as `v1` (about 12M input tokens, about $13 at CLI prices)? go / another order / stop

## AFK series (2026-10-30)

The person approved P1, P3, P2, P4 and P5 unattended, in that order, with an $80 cap on CLI-reported cost; worklist items 6 and 7 wait for them. Keep rule: 10 of 10 pass holds, no task worse, input tokens and calls inside rep noise or lower. Each variant is compared with the last kept one.

- `v1` P1 (`0f52380`), re-review only after a correctness fix, compared with `baseline`: 10 of 10 both sides, verdict holds. Latency 117 s to 105 s (-11%), calls 18.5 to 19.1, input tokens 610k to 623k (+2%), mode-agent calls 5.9 to 6.0. No token saving shows on 2 reps. Kept: the rule is shorter and nothing regressed. $13.24.
- `v2` P3 (`ee511ad`), drop `/simplify` from impl's Before commit, compared with `v1`: 10 of 10 both sides, verdict holds. Calls 19.1 to 14.9 (-22%), input tokens 623k to 471k (-24%), output 9.9k to 7.6k, latency 105 s to 84 s; mode-agent calls 6.0 to 3.6. Kept. $10.27.
- `v3` P2 (`79cd23c`), foreground for a spawn the session waits on, compared with `v2`: 10 of 10 both sides, verdict holds. Calls 14.9 to 13.0 (-13%), input tokens 471k to 444k (-6%), latency 84 s to 88 s; mode-agent calls 3.6 to 2.4. Kept. $9.95.
- `v4` P4 (`c98e7b1`), `how` and `why` only for an unread subsystem or a regression, compared with `v3`: 10 of 10 both sides, verdict holds. Calls 13.0 to 13.2, input tokens 444k to 429k (-3%, noise), latency flat. Kept: shorter trigger, nothing regressed. $9.95.
- `v5` P5 (`b52a355`), skip `brief` and `read-before-implementation` inside a mode run, compared with `v4`: 10 of 10 both sides, verdict holds. Calls 13.2 to 13.5, input tokens 429k to 466k (+9%, noise). No trace in `v4` or `v5` reads either file, so the change has nothing to save and adds text. Reverted. $10.72.

## Check-in: AFK series done (2026-10-30)

**Found**
- Kept: P1, P3, P2, P4 (`v1` to `v4`). Reverted: P5. Five runs, 100 conversations, 0 errors, 10 of 10 pass in every run. CLI-reported cost $54.13 of the $80 cap (judge calls not counted).
- `compare.py baseline v4`: calls per task 18.5 to 13.2 (-29%), input tokens 610k to 429k (-30%), output 9.9k to 7.3k, latency 117 s to 88 s. P3 (drop `/simplify`) carries most of it: -24% input tokens on its own. P2 cut mode-agent calls 3.6 to 2.4. P1 and P4 sit inside rep noise.
- Each run cost about $10 after P3, down from $13.

**Recommend**
- Worklist items 6 (mode-agent as a tool) and 7 (fresh reviewer as a tool), compared with `v4`. Item 7's `blocking` tag would also let P1's rule name the tag in place of "correctness finding".

**Need from you**
- Run item 6 as `v6` (20 conversations, about 9M input tokens, about $10)? go / item 7 first / stop
