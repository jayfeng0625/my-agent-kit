---
name: research-mode
description: Research mode for investigations, assessments, triage, PR explanations and session pickups, with every claim traced to a source read this session. Needs my-agent-kit's global files linked.
disable-model-invocation: true
metadata:
  tags: [workflow, research, playbooks]
---

# Research mode

Read `~/.claude/references/mode-core.md` first; it holds the todolist, autonomy, subagent, reply and comment rules. Playbooks live in `playbooks/` beside this file. Put this file's absolute path in every `mode-agent` prompt.

## Playbooks

- **Investigation** (`playbooks/investigation.md`). A read-only question: how X works, why Y was built this way, what an external API or spec says.
- **Assessment** (`playbooks/assessment.md`). A judgment call: are we sure about Z, should we do X or Y, does this plan hold.
- **Triage** (`playbooks/triage.md`). Issues or external PRs to verify, categorise and label.
- **PR explanation** (`playbooks/pr-explanation.md`). What a PR changes, how and why, and what its reviewer should check.
- **Session pickup** (`playbooks/session-pickup.md`). Resume a prior agent's work from a handoff, a transcript or a pushed branch.

## Triggers

- **Read-only.** Research changes no tracked file. The files a routed skill writes as its output (a research file, triage's out-of-scope notes, a glossary or ADR edit during grilling) and mode-core's broken-skill fix are the only exceptions. The reply lists each out-of-scope note for the user to commit, and a posted comment links one only after the user pushes it. A PR checkout, a build or a test run goes in a worktree outside the repo.
- **Routing a question.** A how question takes the **how** skill, a motivation question the **why** skill, and docs, APIs or specs outside the repo the **research** skill. A question that spans two of them takes both, and the deliverable carries both outputs.
- **User-named source.** When the user names a source or a section, open the answer with what it offers for their question.
- **Explaining code.** Reuse the names and diagrams the code already uses, and map each new term to them the first time you use it.
- **Empirical fork.** mode-core's Observe forks runs here as the smallest script that shows the answer, in a scratch dir outside the repo, with its output cited.
- **Labelling a ticket.** Use the project's triage labels; with none, follow the triage skill's own path (it names `/setup-issue-tracker`). Map each verification outcome to a state per the triage skill: confirmed to a ready state, refuted to wontfix, insufficient detail from the reporter to needs-info with what is missing. A ready-for-agent label needs an established approach, and for a bug an established cause too. A check your own environment blocks goes to the user with what it needs.
- **Long transcript or bulk output.** Parse it in a `mode-agent` and keep the reduced result in the main thread (**Guard the Context Window**).
- **Prose.** The **unslop** skill, the reply included. A research file also takes `/technical-writing`.

## Principles

- **Attack the Premise.** A choice backed by a stated premise: test the premise before building on it.
- **Prove It Works.** A claim that something works or runs: show it on the real artifact.
- **Explain the Number.** A number you measure or report: name the result that would change a decision before the run, and find what limits the number before you trust it.
- **Guard the Context Window.** Long files, transcripts and outputs.
- **Minimize Reader Load.** Explaining code that is hard to trace: count its layers and hidden state.
- **Experience First.** Product or scope tradeoffs in an assessment.
- **Exhaust the Design Space.** An assessment with no precedent: compare 2 or 3 options before you recommend one.

## Evidence

- Cite each claim to where it lives: a `file:line`, a commit, a PR or ticket thread, a doc URL, or a command and its output. Read the primary source; a write-up of it is a lead to follow.
- A premise counts as a claim. Which store is the source of truth, which code path runs live, which config is in force: trace each in the code before an answer or a plan builds on it.
- A claim from a prior session, a ticket or a subagent report is an input to check. Re-read its source before you repeat it.

## Verify

Done means all three hold.

1. **Traced.** Every premise in the deliverable is traced per **Evidence**. Every other claim meets **Evidence** or, when it cannot be traced, carries mode-core's label.
2. **Fresh check.** For every playbook but Investigation, a fresh `mode-agent` opens each citation in the deliverable and confirms it backs its claim. Fix or relabel each one that fails.
3. **Hand-off.** The deliverable is in the reply, or in the file a routed skill writes. `git status` shows only the exceptions **Read-only** allows. Follow-up code work names the mode that owns it, such as `/impl-mode`.

**Reply:** the playbook's deliverable.
