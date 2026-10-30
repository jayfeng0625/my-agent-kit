# Single loop plan

Audit date: 2026-10-29
Repo and commit: jayfeng0625/my-agent-kit at 14f8c94 (branch `claude/routers-audit-poteto-removal-gcddj7`)

What blocks the plan: two harness fixes the baseline turned up (see Evals) wait on the person's `--approve-harness`; worklist item 1 waits on the check-in at the end of this file.

## Status

- [ ] Verdicts agreed with the person (end of step 0)
- [x] Main eval agreed and baseline measured (end of step 1); two harness fixes wait on the person, see Evals

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

Baseline (variant `baseline`, 2026-10-30): kit `fb28d38`, `claude-opus-5-5` at `medium`, `--budget-usd 10`, 10 tasks × 2 reps, judge `claude-sonnet-5-5`. 17 of 20 rows finished on the first pass; the one rerun of the 3 errored rows finished t08 rep 1 and errored t03 twice more. Scored: 17 of 18 rows pass (t03 has no score). Results: `.claude/hillclimb/modes/baseline/`.

| Task | Pass (r0, r1) | Latency s | Input tokens | Output tokens | Model calls (main + delegates) |
| --- | --- | --- | --- | --- | --- |
| t01 impl csv | 1, 1 | 270, 153 | 1.72M, 0.97M | 28.3k, 17.1k | 41 (27 + 14), 24 (18 + 4 + 2 comment-sicko) |
| t02 impl refactor | 1, 1 | 194, 126 | 1.10M, 0.78M | 20.2k, 13.1k | 29 (20 + 9), 23 (15 + 8) |
| t03 impl no ticket | error, error | 6 to 9 | small | small | main only |
| t04 impl trim | 1, 1 | 76, 83 | 0.55M, 0.60M | 7.8k, 8.5k | 18 (13 + 5), 19 (13 + 6) |
| t05 bug discount | 1, 1 | 107, 224 | 0.56M, 1.31M | 10.8k, 25.6k | 16 (12 + 4), 35 (21 + 14) |
| t06 bug cache | 1, 1 | 71, 75 | 0.44M, 0.42M | 7.3k, 5.8k | 14 (10 + 4), 15 (11 + 4) |
| t07 bug perf | 1, 1 | 283, 118 | 1.43M, 0.69M | 22.4k, 8.4k | 33 (21 + 10 + 2 comment-sicko), 20 (15 + 5) |
| t08 research why | 1, 1 | 29, 36 | 0.22M, 0.26M | 2.7k, 3.5k | 7, 8 (main only) |
| t09 research how | 1, 0 | 27, 81 | 0.15M, 0.42M | 2.5k, 8.7k | 5 (main only), 14 (11 + 3 general-purpose) |
| t10 research premise | 1, 1 | 53, 43 | 0.23M, 0.23M | 5.4k, 4.5k | 10 (6 + 4), 10 (6 + 4) |

Totals over the 18 scored rows: 12.06M input tokens, 203k output, CLI-reported $13.31 (the person's own prices may differ). Estimate against actual (`estimate.py ... probe --tasks 10 --reps 2 --heavy 6 --actual baseline`): likely 24M input, actual 12.06M, inside the 3.5M to 37M range; output had no upper figure, actual 203k. The estimate leaves out the judge calls and my own usage.

Noise band between reps: wide. Tokens and model calls differ by up to 2.3× on the same task (t05: 16 and 35 calls; t07: 1.43M and 0.69M input), from how many review and fix rounds a mode-agent ran. A later variant needs a change bigger than that to read as a cost move on 2 reps; pass/fail is steady except t09.

Failures, each trace read:

- **t09 rep 1, graded 0: a grader bug.** The reply walks the whole path with eight file:line citations and is correct. The judge failed `totals` because the reply says the rate goes through "the rate cache" without the word LRU, and `render` because it does not say `--summary` prints a one-line total; the prompt asks only about `node src/cli.js examples/discounted.json`, and the reply does say that without `--summary` the CLI prints the full report (`src/cli.js:14`). Proposed fix in `tasks.json` (a harness file, so it needs the person's `--approve-harness`): drop "which goes through an LRU cache" from `totals` and the `--summary` parenthesis from `render`. This rep also took a different route: research-mode ran the `how` skill's explainer as a `general-purpose` subagent (3 calls), where rep 0 answered from the main agent alone.
- **t03, both reps on both passes: a harness bug.** `runCase` raises "the impl-mode skill never loaded" unless the stream shows a path under `skills/impl-mode`. A slash command's text reaches the model without showing in `stream-json`, so a run that answers from the loaded skill alone, without opening a skill file, looks unloaded. All four t03 runs did what the task wants: each stopped, said `tickets/INV-31.md` does not exist, asked where the tier rules live, and left the repo clean. Graded offline with the same `gradeRun` (not written to `results.jsonl`), all four pass 1. t08 rep 1 hit the same check on the first pass and passed on the rerun because that run opened a playbook. Proposed fix in `run-eval.mjs`: count the skill as loaded when the init event lists `<mode>` among `slash_commands` and the reply carries no unknown-command error, then rerun t03 (2 rows, about $0.30 each at CLI prices). Also needs `--approve-harness`.

The rule check (read-only tasks leave the repo clean) held in every scored row; no row wrote outside its task.

## Worklist

Merges first, then folds, then as-tool changes. With no traffic data, lowest risk first.

- [ ] 1. `merge dark-factory lane reviewer into the verifier` · variant: · compared with: · result:
- [x] 2. `merge poteto-agent into mode-agent (remove poteto-mode)` · variant: none (no mode run sees poteto-mode or poteto-agent; every mode already spawns mode-agent) · compared with: n/a · result: removed on 2026-10-30; the hillclimb skill and dark-factory's Autonomous run playbook carry over its two playbooks no other mode had
- [ ] 3. `merge comment-sicko into the fresh reviewer` · variant: · compared with: · result:
- [ ] 4. `fold the how explainer (upstream, needs merge_guidance)` · variant: · compared with: · result:
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

Open owner questions 1 and 3 below still stand.

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

1. Upstream skills (how, why, no-comments, show-me-your-work, codebase-design) are pulled from pstack and mattpocock/skills. Items 4 and 5 adapt them locally through `merge_guidance`. Adapt, or leave them as upstream ships them?
2. pstack-models.md:4 says explorers, investigators and judgment run on sonnet, but its lines put `how explorer` and `why investigators` on opus. Which is intended?
3. Should `/code-review` inside a fresh reviewer name an effort level? With none, it reuses the last level typed.

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

