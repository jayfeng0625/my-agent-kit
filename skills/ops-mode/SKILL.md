---
name: ops-mode
description: Ops mode for incidents, live verification, migrations and infra changes, where prod is read-only and the user applies every prod write. Needs my-agent-kit's global files linked.
disable-model-invocation: true
metadata:
  tags: [workflow, operations, incidents, migrations, playbooks]
---

# Ops mode

Read `~/.claude/references/mode-core.md` first; it holds the todolist, autonomy and message rules, and points to the subagent, code and reply rules. Playbooks live in `playbooks/` beside this file. Put this file's absolute path in every `mode-agent` prompt.

## Playbooks

- **Incident** (`playbooks/incident.md`). A live symptom in a deployed environment: scope it, mitigate it through the user, verify recovery, then route the root cause.
- **Live verification** (`playbooks/live-verification.md`). Prove a deployed or applied change behaves in a named environment.
- **Migration** (`playbooks/migration.md`). Run a schema or data migration, or a cutover, through each environment with a parity read per phase.
- **Infra change** (`playbooks/infra-change.md`). An IaC, config, access, secret or CI change, applied below prod by you and in prod by the user.

## Triggers

- **Target first.** Before any command, name the environment and the resource. Take the environment from the user, the ticket or the project context, and ask when none names one. A prod target, staging included per **Prod boundary**, comes only from the user or the ticket; a parent ticket's environment stays with the parent.
- **Project context.** Logs, metrics, deploy records, verify tooling, migration tooling and writable environments: use what the project context names, and ask when it names nothing.
- **Blocked read.** An expired login or a denied command: name every credential or permission that blocks it, ask the user to unblock it, and wait. Report, sign off or close only after the read runs. A denial stands until the user approves the command; rewording it to pass, or editing permission settings, is a bypass.
- **Empty result.** Before widening a log or metric query, read what gates the signal in the deployed config: a flag, an env var, a log level, sampling.
- **Bounded reads.** Sample before a full scan. Pin the service, time range and row limit on every prod query.
- **Alert fired.** Run the alert's own query first.
- **Deploy times.** Read them from the platform's deployment record. Commit and release times mislead a timeline.
- **Billable create.** A create that costs money or quota, in any environment: state the cost and pause.
- **Empirical fork.** mode-core's Observe forks runs here as a read-only probe on the lowest environment that shows the answer, with its output and target identity cited. A fork only prod can answer takes a prod read. A fork that needs a prod write goes to the user as a question.
- **Large log or export.** Parse it in a `mode-agent` and keep the reduced result in the main thread (**Guard the Context Window**).
- **A measured number.** The **benchmark-checklist** skill before you report or act on a number you produced by running a benchmark. An observed prod signal, such as an error rate or a latency, takes **Explain the Number**.
- **Secrets.** Read a secret's metadata and leave its value unread. Redact secrets from any output before you quote it.
- **Any code.** Name the data shape first. Code crossing a function boundary takes the **codebase-design** skill, `.ts` or `.tsx` takes **typescript-best-practices**, and a test takes the **tdd** skill.
- **Prose.** The **unslop** skill. Runbooks and commit messages also take `/technical-writing`. PR bodies take the **pr** skill alone.
- **Before commit.** `/deslop`, then `/no-comments`.

## Principles

- **Prove It Works.** A verdict names the system its signal came from.
- **Make Operations Idempotent.** Every migration step and apply converges on rerun.
- **Outcome-Oriented Execution.** A migration converges on its target through explicit phases.
- **Sequence Work into Verifiable Units** (**principle-sequence-verifiable-units**). One phase, one check, before the next.
- **Fix Root Causes.** A mitigation buys time; the cause still gets traced and routed.
- **Attack the Premise.** Which environment, revision and config are live: check each before building on it.
- **Explain the Number.** Error rates, latencies and row counts: name the result that would change a decision before the run.
- **Build the Lever.** A repeated check or a multi-step apply: script it.
- **Separate Before Serializing Shared State.** Shared tables, queues and environments that other sessions use.
- **Migrate Callers Then Delete Legacy APIs.** The contract phase of a migration.
- **Guard the Context Window.** Logs, exports and audit trails.
- **Laziness Protocol.** The smallest mitigation and the smallest infra diff.

## Prod boundary

- Against prod you run read verbs only: describe, list, get, logs, plan, diff and dry-run modes, bounded queries, and read-only API calls.
- Restarts, cache purges, flag flips, scaling, billable query jobs, a dry run that executes the change and rolls it back, and every mutating API call are writes, however harmless they look. Each goes through **Hand-off**.
- A script that takes its target from config or a variable: resolve the target before you run it. A prod target makes the run a prod write.
- Staging counts as prod unless the project context says otherwise. In other shared environments, write only where the project context allows, and ask before the first write when it is silent.

## Hand-off

One block per apply step:

1. **Purpose**, in one sentence.
2. **Preconditions**: the reads you already ran, with their output and the target identity.
3. **Command**: exact, one line and non-interactive (the tool's own auto-approve or yes flag), since a `! ` command cannot answer a prompt. The user types it as `! <command>`.
4. **Expected**: the output that means success.
5. **Rollback**: the exact command that undoes it. An irreversible step writes `none`, names the backup or restore path, and waits for the user to confirm it exists.
6. **Then**: the read you run after, and "reply done once it finishes".

More than one dependent step, a dashboard walk or a captured secret goes to the **wizard** skill. A wizard prompts, so the user runs it in their own terminal as `bash <path>`. A step that runs for minutes, such as a backfill, also runs there. A wizard that writes prod in more than one stage lists one Then read per stage that writes, and item 2 of **Verify** counts each.

On "done", run the step's Then read, print the target identity, and compare with Expected. A match logs the step. A mismatch stops the playbook: report both outputs and offer the Rollback block. A retry is a new block for the user to run.

## Evidence

- Each check prints the identity of what it ran against (an image digest, a revision, a resource's describe line), and the verdict names it.
- Each applied step has a before read and an after read of the same signal.
- A cause the reads cannot confirm is labelled the strongest hypothesis they support.

## Scope

- Code changes run in a git worktree off the base branch.
- Incident and Live verification change no tracked file, except a revert, an incident note the user wants kept, or mode-core's broken-skill fix.
- Scratch probes and other wizards live outside the repo unless the user asks to keep one. A migration runbook, its wizards included, is committed with the code it drives.

## Commits

- Each migration or infra commit matches one phase, and its runbook lands with it.
- Follow the repo's commit-message conventions.

## Verify

Done means all five hold, or the items the playbook names.

1. **Observed.** Every check and applied step meets **Evidence**. Incident: the symptom signal back to baseline over a stated window. Migration: parity per phase. Infra change: an empty plan after the apply, or with no plan tool, the changed setting's after read against its before read. Live verification: the verdict with its identity. An inconclusive read, or a read on the wrong target, is a fail to flag.
2. **Prod writes went through the user.** Every command you ran against prod was a read. Every prod write, each writing stage of a wizard included, is in the hand-off log with the user's done and the after read.
3. **Clean.** Debug output, scratch resources and temp wizards are gone, or listed for the user with their delete commands. `git status` shows only the change's files.
4. **Fresh review.** Run `/code-review` yourself over the diff: code, IaC, migration script and runbook. It reviews in its own forked context. Fix accepted findings and re-review, until a round comes back clean or after 3 rounds. Findings still open after the last round stop any prod apply until the user has read them.
5. **Hand-off.** For a code or IaC change, a reviewed, committed branch and a PR body written with the **pr** skill that carries the apply steps and the evidence; the user pushes and opens the PR. For an incident, the note in the reply and the root cause routed per Incident. For a live verification, the verdict in the reply.

**Reply:** the playbook's deliverable, the hand-off log, a VERIFIED list (ran it, saw the output) and a REASONED list (read it, believe it), and a Deferred list of improvements you noticed and skipped.
