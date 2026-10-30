---
name: impl-mode
description: Implementation mode for tickets, refactors, PR trims and prototypes, with the smallest diff the ticket needs and one real proof. Needs my-agent-kit's global files linked.
disable-model-invocation: true
metadata:
  tags: [workflow, implementation, playbooks]
---

# Impl mode

Read `~/.claude/references/mode-core.md` first; it holds the todolist, autonomy, subagent, reply and comment rules. Playbooks live in `playbooks/` beside this file. Put this file's absolute path in every `mode-agent` prompt.

## Playbooks

- **Feature** (`playbooks/feature.md`). New or changed behavior from a ticket. A batch of tickets runs one lane per ticket, each lane this playbook, under mode-core's Fan-out rule.
- **Refactoring** (`playbooks/refactoring.md`). A behavior-preserving change to structure: rename, extract, inline, dedupe, move.
- **Trim** (`playbooks/trim.md`). Simplify or review an existing diff or PR down to what the ticket and the proof need.
- **Prototype** (`playbooks/prototype.md`). A throwaway sketch that settles a design or behavior fork by observing it. mode-core's Observe forks runs through it.

## Triggers

- **Ticket first.** Read the ticket, the decisions on its parent and related tickets, and the threads on linked PRs, verbatim. With no ticket, ask where the requirement lives. Each plan item maps to a ticket sentence. A capability the ticket does not ask for goes to the user as an option, and no brief asks for it until the user accepts it.
- **Any code.** Name the data shape first and pick its organizing structure per **principle-model-the-domain**. Use the plainest type that holds it.
- **Function boundary.** Code crossing a function boundary takes the **codebase-design** skill before implementing.
- **`.ts` or `.tsx`.** The **typescript-best-practices** skill.
- **Any test.** The **tdd** skill, plus **Tests** below.
- **A bug surfaced mid-task.** The **diagnosing-bugs** skill's red loop and minimal repro before any fix. The fix then follows Feature, with the red loop as its test.
- **Large or cross-cutting effort** (a migration across many call sites, an ambitious multi-part change). The **figure-it-out** skill.
- **Contested design.** The **grilling** skill before shipping.
- **A slice that needs a migration.** The migration ships in the slice, built with the project's migration tooling under **Make Operations Idempotent** and **Outcome-Oriented Execution**: a dry run, resumable, and a parity check that prints its target. Prove it locally, and ask when the project names no way to. Commit its runbook with the code; its environment runs go through `/ops-mode` Migration. The contract phase is a later slice while old and new code run side by side during rollout, and joins this slice when the deploy is atomic.
- **Prose.** The **unslop** skill. Docs and commit messages also take `/technical-writing`. PR bodies take the **pr** skill alone.
- **Before commit.** `/deslop`, then `/simplify` over the diff.
- **Review findings** you write: tag each `blocking` or `not blocking` for merge, and name the runtime condition the tag depends on, such as a flag being on or a caller existing.

## Principles

- **Laziness Protocol.** Sizing a diff, or tempted to add a layer. The smallest change that solves the ticket.
- **Subtract Before You Add.** Remove dead weight before building on it.
- **Minimize Reader Load.** Code that is hard to trace: collapse one-caller wrappers, shrink mutable scope.
- **Foundational Thinking.** Core types and data structures before logic.
- **Redesign from First Principles.** Fitting a new requirement into an existing design: redesign as if it had been there from day one.
- **Build the Lever.** Non-trivial work: build the codemod, script or harness that does or proves it.
- **Model the Domain.** Stateful or branchy logic goes into a structure (state machine, typed model, table).
- **Type System Discipline.** Designing a type or signature.
- **Boundary Discipline.** Validation, error handling, framework adapters.
- **Migrate Callers Then Delete Legacy APIs.** A new internal API while old callers exist.
- **Test Behavior, Not Implementation.** Writing, changing or keeping a test.
- **Prove It Works.** Before declaring done.
- **Fix Root Causes.** A symptom: trace it to the first place the system went wrong and fix it there.
- **Attack the Premise.** Two fixes that share one premise have failed: test the premise before a third.
- **Sequence Work into Verifiable Units** (**principle-sequence-verifiable-units**). Ordering commits and lanes.
- **Separate Before Serializing Shared State.** Lanes that might write the same file, branch or key.
- **Exhaust the Design Space.** A decision with no precedent: 2 or 3 sketches before committing.

## Scope

- Keep the diff as close to the base branch as the ticket allows. Every changed line serves a ticket sentence, the user's request, or a proven issue.
- Work in a git worktree off the base branch. With unrelated work on the current branch, move your patch to a fresh worktree.
- Fix what the evidence proves. A guard that "might help" leaves the diff.
- A change of 1 or 2 files with an obvious approach runs in the main thread. Larger work goes to a `mode-agent` in its own worktree, and you review its diff.

## Tests

- A change that adds no logic of its own gets no new test, no exported helper and no test-only switch. A Refactoring pin is exempt. The rule covers a pure deletion, a wrapper that only hands values to a library, and a branch the current config never takes. Prove it with the existing suite or a grep that finds no remaining reference. An untaken branch's tests wait for the ticket that turns it on.
- **Prove each test red.** Break the behavior it guards with a one-line change, run it, see it go red, and revert, with `node <this skill dir>/scripts/break-proof.mjs [--timeout <seconds>] <file> <search> <replace> -- <test command>` (or `--table <breaks.tsv>`, whose search and replace cells decode `\n`, `\t` and `\\`, so a search can add a neighbouring line to match once). It stops a command after 300 seconds. For a slower suite, pass a larger `--timeout <seconds>`, which the script accepts only as its first argument, and run the script in the background, since a foreground Bash call ends at 600 seconds. A `mode-agent` runs checks in the foreground, so in a delegate split a slow suite into `--table` rows that each finish under 600 seconds. The script restores the file from its own copy. Run it in a worktree no other session edits. Keep each break and its red output for the PR.
  - An absence assertion ("no difference") needs inputs that give the code a reason to act; assert that reason in the same test and break the input as well.
  - A normalising or comparing function: break each step in turn. A step that stays green gets deleted or gets the case that needs it.
- Assert what the code's users observe. Put a logged value's logic (a diff, a cap, a size) in a function that returns it, and test that function. Leave log wording, log calls and internal mocks out of assertions.
- Red means a failing assertion. A break that stops the code compiling, or a crash before any test runs, proves nothing.

## Commits

- Small, ordered commits. A failing test lands with or before its fix.
- Fold a fixup into the commit that owns its topic.
- Follow the repo's commit-message conventions.

## Verify

Done means all four hold.

1. **One real proof.** Run the change on the real artifact the ticket names, with the verify or drive tooling the project context names; ask which surface and tool if it names none. Behavior tests count only when the change has no runnable surface. One proof that would go red if the change were wrong, then stop. An inconclusive result, or a proof on the wrong surface, is a fail to flag.
2. **Tests proven red.** Each new or changed test went red under a break.
3. **Fresh review.** A fresh-context `mode-agent` runs `/code-review` over the diff and flags each comment the diff adds that mode-core's **Comments** rule cuts, and each lint or type suppression whose rule guards correctness. Fix accepted findings. Run another round only after fixing a correctness finding, at most 3 rounds; a correctness finding still open after round 3 is a fail to flag.
4. **Hand-off.** A reviewed, committed branch and a PR body written with the **pr** skill. The user pushes and opens the PR.

**Reply:** what you built and for whom, what you chose and why, the diff stat, a VERIFIED list (ran it, saw the output) and a REASONED list (read it, believe it), and a Deferred list of improvements you noticed and skipped.
