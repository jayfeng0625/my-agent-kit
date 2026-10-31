---
name: hillclimb
description: Sustained, measured improvement of one number (latency, memory, bundle size, a pass rate) toward a target, one attempt at a time, each kept or reverted on a frozen harness. Needs my-agent-kit's global files linked.
disable-model-invocation: true
argument-hint: "<what to improve, and the target if you have one>"
metadata:
  tags: [workflow, performance, measurement, autonomy]
---

# Hillclimb

Read `~/.claude/references/mode-core.md` first and follow its rules and the files it points to; this file is the playbook. Put this file's absolute path in every `mode-agent` prompt.

**You own the metric and the experiment's integrity. Supervise and review; delegates make the attempts.** Use it to climb one measurable thing toward a target over many iterations. A one-off bug or slowness goes to `/bug-hunting-mode`. Tuning a prompt or tool description in an app that calls the Claude API goes to `/claude-api hillclimb`; a skill, subagent or `CLAUDE.md` scored by a judge climbs here, on the harness in **Judged metrics**.

The discipline: one change, one measurement, keep or revert. Every claimed win comes from a measurement on the frozen harness; reading the code proves nothing (**principle-prove-it-works**).

## Judged metrics

When the number is a pass rate on agent behavior, step 2's harness is an eval built this way, and step 1 agrees its cost per run with the user, since every run spends tokens.

- **Rubric.** 3 to 6 concrete criteria per case, held by the grader alone. Grade from what the run left behind (tests, files, commits) where code can check it, and give a judge only the rest.
- **Blind the candidate.** Each case runs in its own working dir with project-shaped names, on an organic prompt a user would type. No path or prompt it sees says eval, test, judge, rubric, score, benchmark or candidate, hints that other runs exist, or asks it to list the skills or files it used.
- **Blind the judge.** It runs on a model no candidate used, sees outputs by sanitized label, and scores every variant in one pass on one scale.
- **Read the chain from transcripts.** Which files a run opened comes from its transcript under `~/.claude/projects/<project>/`, the project path with every non-alphanumeric character as `-`: a session is `<session-id>.jsonl`, and a subagent is `<session-id>/subagents/agent-<id>.jsonl`. Its own claims prove nothing. Read only the project folders of the case dirs you created.
- **Read a sample yourself** each round. A judge you disagree with means a biased model or an ambiguous rubric; fix it, and record a new baseline, before the next attempt.

## Steps

1. **Ground the workload, then fix the metric.** Run the **how** skill over the target. Name the workload dimensions that can move the result (data size, history, state, concurrency) and pick a case that reproduces the user's complaint. When no case reproduces it, fix the repro first. Then fix one metric, the direction that counts as better, and a checkable stop predicate that pairs a target with a floor on attempts, so a lucky early win cannot end the run: "at least 50% better than baseline and at least 10 iterations". Use the user's numbers when given; otherwise propose them and agree them.
2. **Build the harness, prove it can see the problem, freeze it** (**principle-build-the-lever**). Run contrasting realistic workloads: the target case reproduces the symptom and easier cases separate as expected. When they do not separate, revise the workload or the metric. Vet the harness with the **benchmark-checklist** skill, and make it print its error count and a count of the work it did. Frozen means one repeatable command emits the metric, sampled enough to clear the noise (the median of N runs). Record the baseline and a green run of the regression gate (the tests that must keep passing) before any change.
3. **Open the decision log** with the **show-me-your-work** skill: `decision.tsv`, one row per attempt with the columns id, hypothesis, change, before, after, delta, tests, verdict (kept or reverted), note. Keep it outside the tree or gitignored. Read it before each attempt.
4. **Ground each hypothesis in a mechanism** from step 1's model: "defer X off the boot path because it blocks first paint", where "try memoizing something" names none. For a performance metric, order hypotheses by these, cheapest first:
   1. Don't do it: stop work whose result nothing uses.
   2. Do it, but don't do it again.
   3. Do it less.
   4. Do it later.
   5. Do it when they're not looking.
   6. Do it concurrently.
   7. Do it cheaper.
5. **Loop, one hypothesis per iteration.**
   - A `mode-agent` on the `code` role makes the change in a tight scope. You review its diff (**principle-guard-the-context-window**). Several independent hypotheses can fan out to parallel delegates, each in its own worktree (**principle-separate-before-serializing-shared-state**).
   - Measure before and after with the frozen harness, and run the regression gate.
   - Keep the change only when the metric moves past the noise and the gate stays green. Otherwise revert it in full; a tweak that "might help" goes.
   - One commit per kept change, staging only the files it changed (`git add <files>`). Log the row either way.
   - Each iteration ends in that check before the next begins (**principle-sequence-verifiable-units**). For an unattended run, wake with Claude Code's `/loop`: a watcher on the event when there is one, else a heartbeat sized to when a result is worth rechecking.
6. **Push past the first plateau.** After several rejects in a row, pivot category, combine near-misses, re-read the source, or try something more radical before you call the hill climbed. Correctness and simplicity outrank the number: revert a win that breaks behavior, and keep a simplification that holds the number (**principle-laziness-protocol**).
7. **Stop** when the predicate holds, or when the remaining ideas are marginal and not worth their cost. Keep the predicate as agreed, and keep going while cheap untried hypotheses remain. When stuck, say so to the user with what you tried.
8. **Hand off** the kept commits stacked in the order they landed, with a PR body written by the **pr** skill. The user pushes and opens the PR.

**Reply:** the metric and target, baseline to final with the percent change, iterations run (kept and reverted), each kept change on one line, the `decision.tsv` path, and the best idea you would try next.
