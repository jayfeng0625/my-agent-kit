---
name: bug-hunting-mode
description: Bug-hunting mode for reproducible bugs, perf issues, failed CI and runtime or trace forensics, with every fix traced to runtime evidence. Needs my-agent-kit's global files linked.
disable-model-invocation: true
metadata:
  tags: [workflow, debugging, performance, playbooks]
---

# Bug-hunting mode

Read `~/.claude/references/mode-core.md` first; it holds the todolist, autonomy and message rules, and points to the subagent rules. Playbooks live in `playbooks/` beside this file. Put this file's absolute path in every `mode-agent` prompt.

## Playbooks

- **Bug fix** (`playbooks/bug-fix.md`). A reported defect, a failed CI job or a flaky test to reproduce, root-cause and fix.
- **Perf issue** (`playbooks/perf-issue.md`). A measured slowness to trace and improve against a baseline.
- **Runtime forensics** (`playbooks/runtime-forensics.md`). A live symptom (leak, idle-CPU spin, glitch) to diagnose from instrumentation. The deliverable is a diagnosis.
- **Trace forensics** (`playbooks/trace-forensics.md`). A captured artifact (cpuprofile, trace, spindump, heap snapshot) to diagnose after the fact. The deliverable is a diagnosis.

## Triggers

- **Reproduce it yourself.** Drive the bug on its own surface with the verify or drive tooling the project context names, or a script against the local service. Ask the user only after driving the surface as far as it goes, with the specific reason it cannot reach the target.
- **Loop first.** For Bug fix and a perf regression, the **diagnosing-bugs** skill's loop: a tight loop that goes red on this bug, reproduced and minimised, before any hypothesis. For a CI-only failure the CI job counts as that loop. The rest of its method runs inside the playbook, which owns the fix and the commits.
- **Failed CI job.** The **diagnosing-bugs** skill's method for a failed CI job, then Bug fix with the failing step run locally as the loop. A step that fails only in CI has the CI job as its loop, and the user runs every push. Work each round from the job's logs and local evidence, commit each tagged probe or fix on the branch, drop or revert the probes before hand-off, and hand back with the commits to push and the job to rerun.
- **Empirical fork.** mode-core's Observe forks runs here as a probe on the loop: change one variable, rerun, and cite the red or green output. With no loop (Trace forensics, Runtime forensics, a non-regression Perf issue), the probe is a query on the artifact or a rerun of the capture.
- **Debug logs.** Tag each with a unique prefix such as `[DEBUG-a4f2]`, and grep it out before commit (a CI-only loop commits its probes, per the Failed CI job trigger).
- **A measured number.** The **benchmark-checklist** skill before you report or act on it.
- **Large artifact or log.** Parse it in a `mode-agent` and keep the reduced finding in the main thread (**Guard the Context Window**).
- **A feature request surfaced mid-hunt.** It goes to the Deferred list for `/impl-mode`.
- **Any code.** Name the data shape first. A fix that changes a module's interface takes the **codebase-design** skill's `DESIGN-IT-TWICE.md`, and `.ts` or `.tsx` takes the **typescript-best-practices** skill.
- **Prose.** The **unslop** skill. Commit messages also take `/technical-writing`. PR bodies take the **pr** skill, with the hypothesis that proved correct, the measurement for perf, and open review findings with their severity added after its paragraphs.
- **Before commit.** `/deslop`, on every commit including review-round fixes.

## Principles

- **Fix Root Causes.** A symptom: trace it to the first place the system went wrong and fix it there.
- **Attack the Premise.** Two fixes that share one premise have failed: test the premise before a third.
- **Prove It Works.** A fix counts once the original repro passes on its own surface.
- **Explain the Number.** A measured number: name the result that would change a decision before the run, and find what limits the number before you trust it.
- **Laziness Protocol.** Sizing the fix: the smallest change the evidence justifies.
- **Build the Lever.** A hunt that repeats a manual check: script the loop, the bisect or the parser.
- **Test Behavior, Not Implementation.** Writing the regression test.
- **Sequence Work into Verifiable Units** (**principle-sequence-verifiable-units**). For a bug or regression, the failing test first and the fix on top; each perf attempt verified before the next.
- **Guard the Context Window.** Traces, heap snapshots, CI logs and transcripts.

## Evidence

- Every shipped line traces to runtime evidence: loop output, a trace, a log line or a profile. A guard that "might help" is a hypothesis and leaves the diff.
- When evidence refutes a hypothesis, revert what it motivated.
- A diagnosis cites its artifact and the source location it maps to (file, symbol, line). A cause the artifact cannot confirm is labelled the strongest hypothesis it supports.
- Before you quote any output, log or artifact, redact its secrets.

## Scope

- Work in a git worktree of the branch the bug was reported on (the PR branch for a failed CI job), or off the base branch when none is named.
- A fix of 1 or 2 source files (tests and fixtures not counted) with an obvious approach runs in the main thread. A larger fix goes to a `mode-agent` in its own worktree, with the loop command as its success criterion, and you review its diff. A main-thread fix that grows past 2 source files mid-hunt stays in the main thread, and the reply says it grew.
- The forensics playbooks change no tracked file. Instrumentation and live hotfixes run in a scratch copy, or on the live process when it is not production. A production process pauses for the user first.

## Commits

- For Bug fix and a perf regression, the failing regression test lands before the fix, when a seam reaches the real bug pattern (per diagnosing-bugs). An existing test already red on the bug counts as that test. With no such seam, the reply names the missing seam.
- The commit or PR message states the hypothesis that proved correct.
- Follow the repo's commit-message conventions.

## Verify

Done means all four hold. Runtime forensics and Trace forensics meet items 1, 2 and 4.

1. **Red, then green.** The loop's red output before the fix and its green output after, on the surface the bug was reported on, both kept for the reply. When the loop runs below that surface (a seam test), add one run on the reported surface. A CI-only failure needs its red job output and the green rerun output; without the rerun, the reply labels the fix unverified and names the job to rerun. For perf, the baseline and post-fix numbers, each vetted by benchmark-checklist. For forensics, the mechanism proved on the live process or the paired capture, or labelled per **Evidence**. An inconclusive result, or a pass on the wrong surface, is a fail to flag.
2. **Clean.** The debug-prefix grep over `git diff <base>...HEAD` finds nothing, throwaway harnesses are gone, and `git status` and `git diff --stat <base>...HEAD` show only the fix's files (none for forensics).
3. **Fresh review.** A fix diff of at most 15 changed lines outside tests, with no added comment or suppression, skips this item, and the Reply says so. For any other diff, run `/code-review` over the diff yourself; it reviews in its own forked context. Then flag each comment the diff adds that mode-core's **Comments** rule cuts, and each lint or type suppression whose rule guards correctness. Fix accepted findings. Run another round only after fixing a correctness finding, at most 3 rounds. Findings still open after round 3 go into the PR body as open items, each with its severity.
4. **Hand-off.** For a fix, a committed branch, reviewed per item 3, and a PR body written with the **pr** skill; the user pushes and opens the PR. For a diagnosis, the cited finding in the reply, routed to Bug fix or Perf issue when a fix is wanted.

**Reply:** the playbook's deliverable, a VERIFIED list (ran it, saw the output) and a REASONED list (read it, believe it), and a Deferred list of improvements you noticed and skipped.
