### Plan

**You own the plan, never the code. The plan is a checklist the runner works box by box and the user audits from the evidence.** The user is present for this playbook. The plan and its tickets are the deliverable; do not implement.

1. **Prototype open questions first.** Settle each by impl-mode's Prototype playbook (`~/.claude/skills/impl-mode/playbooks/prototype.md`), and keep the branch, the SHA and the screenshots for Appendix A. Ask the user only about a product or preference call no run can settle, with options.
2. **Explore in subagents.** Spawn `mode-agent` per `~/.claude/references/mode-subagents.md`. Each returns file pointers, conventions, test commands and entry points, with no inlined dumps.
3. **Write the plan.** Copy the skeleton below into `~/.dark-factory/<repo>/plans/<slug>.md` unless the user names a path, and fill every placeholder. Keep every heading and sub-block in the order shown. One section per ticket; one ticket is one change with its own evidence (**principle-sequence-verifiable-units**), so a single change still gets a one-section plan. Name the execution playbook in **How to read this**: `playbooks/run.md` for a queue one session can drain, `playbooks/orchestrate.md` for a program that outlives one session. Name the landing grant the Run start gate will confirm.
4. **Prose.** Write under the **technical-writing** skill, then run the **unslop** skill. The body is a how-to; the appendices hold explanation and reference. Each heading states the task or the finding. No long dashes and no mid-sentence colons.
5. **Check.** Run `node ~/.claude/skills/dark-factory-mode/scripts/check-plan.mjs <plan.md>` and fix every line it prints (**principle-encode-lessons-in-structure**).
6. **Publish.** Create one tracker ticket per section, per the target repo's `docs/agents/issue-tracker.md`, blockers first. The title is the section heading; the body is the section verbatim, from **Depends on.** through **Land.**, then a `**Boot recipe.**` line and the plan's Boot recipe boxes, so Run's start gate and the live lanes can work from the ticket alone; each Depends on becomes the tracker's blocking edge. File each in the `ready-for-human` role with a comment naming the plan path. Never file one as `ready-for-agent`: the user's move to `ready-for-agent` is the go.
7. **Hand back** and stop.

**Verification.** Tests alone are not sufficient verification. A ticket is verified only when its unit, live, and perf boxes are all checked (**principle-prove-it-works**). That sentence is the verification rule, and every verification block opens with it. The live block is mandatory and declares its lane count, at least 2. Each lane drives the real surface through its control skill at the ticket head, as a parallel `mode-agent` on the `fan-out investigate` role, and is one box with a concrete scenario, the screenshot it saves and its pass predicate. Lane 1 is the **Regression lane against trunk**: the same load-bearing scenario on trunk and head. If trunk lacks the feature, the lane records that fact and gates the behavior the diff adds plus the end state the user waits for. Add lanes where the surface has more states worth proving. The perf gate is two-sided: trunk and head both produce the named metric, trunk first, interleaved. If trunk lacks the feature, also set an absolute budget for the work the diff adds and for the end state the user waits for, and claim no ratio between unlike scenarios. A ticket that changes an interaction is review-gated: its lanes' screenshots go into the digest for the user to review before landing. A ticket that changes no interaction writes `**Review gate.** None. <ticket id> is not review-gated.` and no boxes under it.

**Control skill.** Pick it by surface: `control-ui` for browser, Electron and web UIs, `control-cli` for CLIs and TUIs, and the repo's simulator-driving skill for native mobile. A ticket that touches two surfaces gets lanes on both. A surface with no control skill is a risk in Appendix C, and its live block still names how each lane drives it.

````markdown
# <Program> plan

<Under ten lines. What changes, for whom, the rule the program enforces, and the ticket ids in order.>

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `~/.claude/skills/dark-factory-mode/playbooks/<run or orchestrate>.md` under the landing grant `<none or prs>`. The user lands every ticket.

Tests alone are not sufficient verification. A ticket is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] Confirm the queue, the base branch and the landing grant at the start gate, then start only on the user's go.
- [ ] Read these from the installed skills at program start. Re-read them at every tick.
  - [ ] `~/.claude/skills/dark-factory-mode/SKILL.md`
  - [ ] `~/.claude/skills/dark-factory-mode/playbooks/<execution playbook>.md`
  - [ ] `~/.claude/skills/<control skill>/SKILL.md`
  - [ ] `~/.claude/skills/<each other leaf skill the program uses>/SKILL.md`

### Tickets

- [ ] Follow this dependency graph. A dependent starts from its blocker's verified branch.
  - [ ] <ticket id> and <ticket id> are independent and first. Both branch from `<base branch>`.
  - [ ] <ticket id> after <ticket id>.
- [ ] Hold the file boundaries. <ticket id or class> touches only `<glob>`.
- [ ] Hold the review gate. <ticket ids> change an interaction, and their screenshots go into the digest.

### Verdict

- [ ] A full swarm runs once, at the code-ready head, per Run step 7. It runs one gates lane, every live lane, the perf lane and two audit lanes.
- [ ] Judge every finding by the blocking rule in **Roles and context**. The verdict is clean when none blocks. A failure on trunk behavior in a lane marked `Regression lane against trunk.` is recorded against trunk and does not block the ticket. A new head gets a fresh verdict unless the patch-id rule carries it.

### Boot recipe

Each live lane runs in its own detached worktree at the ticket head and drives the surface through `<control skill>`.

- [ ] `git -C <worktree> checkout --detach <head SHA>`.
- [ ] <Start the backend and the surface. Wait for ready.>
- [ ] <Deliver input only through the control skill's commands. Name the read-only diagnostics.>
- [ ] Save every screenshot to `~/.dark-factory/<repo>/<run-id>/verdicts/<ticket id>/<head SHA>/lane-<n>/<slug>.png` and return the paths with the report.

## <Task as a verb phrase> (<ticket id>)

**Depends on.** <ticket id, or None.>

**Files.**

- [ ] Edit `<path>`.
- [ ] Create `<path>`.
- [ ] Delete `<path>`.

**Build.**

- [ ] <One change. Name the symbol and the file.>

**You see.**

- [ ] <One observable result, with the exact log line or screen state.>

**Verify, unit.** Tests alone are not sufficient verification. A ticket is verified only when its unit, live, and perf boxes are all checked.

- [ ] <Test file and the case it gains.> Run `<command>`.

**Verify, live.** Tests alone are not sufficient verification. A ticket is verified only when its unit, live, and perf boxes are all checked. <N> lanes at the ticket head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. Run <the same load-bearing scenario> at trunk and head. If trunk lacks the feature, record that and gate <the behavior the diff adds plus the end state the user waits for>. Save `<slug>.png`. Pass when <predicate>.
- [ ] Lane 2. <Scenario.> Save `<slug>.png`. Pass when <predicate>.

**Verify, perf.** Tests alone are not sufficient verification. A ticket is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. <What is measured at both trunk and head. If trunk lacks the feature, also name the diff-added work and the end-to-end state the user waits for.>
- [ ] Probe. <The command or procedure, run at trunk and at the head, interleaved. Both sides must produce the metric.>
- [ ] Baseline. Record the trunk <value> first.
- [ ] Rule. <Head against trunk, with the number that fails. If the scenarios differ, absolute budgets for the diff-added work and the user-visible end state.>

**Review gate.** The user reviews before landing.

- [ ] Copy lane <n> screenshots into `~/.dark-factory/<repo>/<run-id>/review/<ticket id>-<slug>.png`.
- [ ] List the screenshots in the digest beside the ticket, for the user to review before landing.

**Land.**

- [ ] A clean verdict at the exact head SHA.
- [ ] <Grant none. The branch is in `land.sh`. Grant prs. The PR is open and its CI is green on that head.>

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply with the digest the execution playbook names.

## Appendix A. Prototype evidence

<Each open question a prototype answered, with the branch, the SHA, and the artifact links. Each question that stays unproven.>

## Appendix B. Alternatives rejected

<Each approach weighed and why it lost.>

## Appendix C. Risks

<Each risk with the ticket it lands in and what the lane watches.>

## Appendix D. Links and reading list

<Docs to read before editing, and the trail per the show-me-your-work skill.>
````

**Reply:** the plan path, the ticket ids with their dependencies and the review-gated set, what the prototypes proved and what stays unproven, and the check script's output.
