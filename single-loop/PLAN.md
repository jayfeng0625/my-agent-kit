# Single loop plan

Audit date: 2026-10-29
Repo and commit: jayfeng0625/my-agent-kit at 14f8c94 (branch `claude/routers-audit-poteto-removal-gcddj7`)

What blocks the plan: no eval exists and no runner can score a mode run. Step 1 needs a safe way to run a mode on a test request and some real requests (see Evals).

## Status

- [ ] Verdicts agreed with the person (end of step 0)
- [ ] Main eval agreed and baseline measured (end of step 1)

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
| none found for behavior | | Build in step 1 |

Main metric: not set.

Decisions from the regroup (2026-10-29, the person):

- Build a headless eval: `claude -p` against a fixture repo with an isolated `HOME`. Credential: the host proxy of the cloud container, after a one-call probe.
- Fix the audit's clear bugs first, each topic its own commit, then baseline the fixed head.
- Tasks: Claude drafts about 10 on a fixture repo, and the person corrects each expected outcome before any run.
- First eval covers impl-mode, bug-hunting-mode and research-mode. ops-mode and dark-factory-mode come later.
- In the brief vs mode reply conflict, the mode's Reply sections win on content inside a mode run. brief governs style.
- poteto-mode: its Hillclimb becomes a standalone `hillclimb` skill, and its Autonomous run becomes a dark-factory playbook.

Probe (2026-10-29): `env -u CLAUDECODE HOME=<scratch> claude -p "Reply with exactly: OK" --output-format json --max-turns 1` exited 0 through the host proxy. The response served `claude-opus-5-5`, and the call used 35,377 input tokens (26,629 cache reads), 4 output tokens, and `total_cost_usd` 0.0755 at list price. The JSON's `session_id` equalled the parent session's id, so the runner must start each run from an allowlisted environment that drops the inherited `CLAUDE_CODE_*` session variables.

What step 1 needs from the person:

1. A safe runner. Proposed: `claude -p` headless against a throwaway fixture repo, with `HOME` pointed at a scratch dir that links `global/` and installs `skills/`, so no real tracker, forge or prod is reachable. Needs a credential for paid runs; this container has no `ANTHROPIC_API_KEY` and no `ant`.
2. Real requests: 10 to 20 mode invocations from transcripts (`~/.claude/projects/<project>/*.jsonl` on the person's machine), or the most common request per mode.

Gaps noticed: no task checks that a mode reaches its routed skills, that a delegate's spawn-dependent step still runs, or that a prod write goes through Hand-off.

Chains with no task: all (no traces, no eval). Inferred chains: mode-agent then fresh reviewer; dark-factory lane then verifier; how explorers then explainer; why investigators then synthesizer; comment-sicko then fresh reviewer.

Break map: filled in at step 1.

| What could break | Tasks that would notice | Gap, and the task to add |
| --- | --- | --- |
| Dropped handoff | none | lane report to verifier: a verdict that names the lane's head SHA |
| Lost rule | none | ops prod write attempted outside Hand-off; graded on no write |
| Shortcut | none | |
| Wrong pick | none | a request worded to fit two modes; graded on the outcome |
| Unwanted write | none | research-mode run graded on `git status` clean |
| Lost thread | n/a | |
| Unhappy path | none | impl-mode with no ticket; graded on asking where the requirement lives |

Baseline (variant `baseline`): not run.

## Worklist

Merges first, then folds, then as-tool changes. With no traffic data, lowest risk first.

- [ ] 1. `merge dark-factory lane reviewer into the verifier` · variant: · compared with: · result:
- [ ] 2. `merge poteto-agent into mode-agent (remove poteto-mode)` · variant: · compared with: · result:
- [ ] 3. `merge comment-sicko into the fresh reviewer` · variant: · compared with: · result:
- [ ] 4. `fold the how explainer (upstream, needs merge_guidance)` · variant: · compared with: · result:
- [ ] 5. `fold the why synthesizer (upstream, needs merge_guidance)` · variant: · compared with: · result:
- [ ] 6. `mode-agent as a tool: fixed brief fields and a response shape` · variant: · compared with: · result:
- [ ] 7. `fresh reviewer as a tool: findings tagged blocking or not, with file:line` · variant: · compared with: · result:
- [ ] 8. `bulk parser as a tool: reduced finding with its source location` · variant: · compared with: · result:

Item 1 fixes a broken path today (a lane cannot spawn its reviewer). Item 2 is the person's stated goal.

## Resume point (2026-10-29, paused for compaction)

Done on the branch (`git log 9c85537..`, gate green: `npm test` 63/0, `npm run typecheck` clean):

- Reference lint in `.claude/checks/modes.test.ts`, proven red under three breaks.
- This audit; the single-agent-loop skill in `.claude/skills/single-agent-loop/`.
- Audit bug fixes: the shared layer (mode-core, mode-agent, pstack-models comment), then one commit per mode (impl, dark-factory, bug-hunting, research, ops), from three independent auditors' 74 findings. Findings the kit wants measured (merges, as-tool) stay in the worklist below.
- how, why, show-me-your-work, no-comments, automate-me and figure-it-out no longer cite poteto-mode; each manifest's `merge_guidance` records it.
- `npm test` and `typecheck` no longer sweep `.claude/worktrees/`.

Next, in order:

1. Port poteto-mode's Hillclimb playbook (`skills/poteto-mode/playbooks/hillclimb.md`) as a standalone local skill `skills/hillclimb/` (SKILL.md, `agents/openai.yaml`, pstack MIT `LICENSE`; README credits and skill count). Port its Autonomous run playbook (`playbooks/autonomous-run.md`) into dark-factory-mode as a second playbook under the same Gates and Any ask or pause rules.
2. Delete poteto-mode in its own last commit: `skills/poteto-mode/`, `upstream/poteto-mode.yaml`, the `global/agents/poteto-agent.md` link; update README, AGENTS.md, LICENSE wording, and `notTaskModes` in `.claude/checks/modes.test.ts`.
3. Step 1 of the kit: build the eval per the regroup decisions (fixture repo, about 10 drafted tasks across impl, bug-hunting and research, runner with an allowlisted environment writing `.claude/hillclimb/modes/<variant>/results.jsonl`). Then stop for the person to correct the tasks before any paid run.

Open owner questions 1 and 3 below still stand. Question 2 was answered by the person's last commit, which changed the values, so the comment was updated to match.

## Changes

Prose fixes made outside the worklist, after this audit, on the same branch (each its own commit; none adds, removes or reroutes an agent): see `git log 14f8c94..` and the commit bodies. They change text every mode run reads, so a baseline taken later runs on them; pick the commit to baseline at step 1.

## Open questions for owners

1. Upstream skills (how, why, no-comments, show-me-your-work, codebase-design) are pulled from pstack and mattpocock/skills. Items 4 and 5 adapt them locally through `merge_guidance`. Adapt, or leave them as upstream ships them?
2. pstack-models.md:4 says explorers, investigators and judgment run on sonnet, but its lines put `how explorer` and `why investigators` on opus. Which is intended?
3. Should `/code-review` inside a fresh reviewer name an effort level? With none, it reuses the last level typed.

## Left as it is, and why

- How explorers, why investigators, DESIGN-IT-TWICE designers and the show-me-your-work reviewer: each earns its context, and each belongs to an upstream skill.
