---
name: dark-factory-mode
description: Dark-factory mode for unattended runs, including overnight ones, that turn a queue of ready tickets, or one exit condition, into independently verified branches the user lands. Needs my-agent-kit's global files linked.
disable-model-invocation: true
metadata:
  tags: [workflow, autonomy, implementation, playbooks]
---

# Dark-factory mode

Read `~/.claude/references/mode-core.md` first; it holds the todolist, autonomy, subagent, reply and comment rules. Playbooks live in `playbooks/` beside this file. Put this file's absolute path in every verifier and reviewer `mode-agent` prompt; a lane's prompt names impl-mode's `SKILL.md` instead (see Roles and context).

The user is present at the start gate and at the digest, and nowhere between.

## Playbooks

- **Run** (`playbooks/run.md`). A queue of tickets, worked from claim to a verified branch while the user is away.
- **Autonomous run** (`playbooks/autonomous-run.md`). One exit condition, driven to done while the user is away, one kept or reset change at a time.

## Ticket states

The tracker holds the run's state, so a dead or compacted session loses nothing. The target repo's `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md` map each role below to a tracker status and give the commands.

| Stage | Tracker role | Who moves it |
| --- | --- | --- |
| Queued | `ready-for-agent` | the user |
| Claimed | In Progress | the runner, as its first write on the ticket |
| Verified | Ready For Human Review | the runner, after a PASS on the branch's current head |
| Parked | `ready-for-human` or `needs-info` | the runner, with a comment naming what the user must decide or supply |
| Landed | Done | the user |

Each move gets a run comment: the marker `dark-factory <run-id>`, the branch, the head SHA, the stage (`claimed`, `attempt <n>/3`, `verdict <PASS|FAIL|INCONCLUSIVE> @<sha>`, `verified`, `parked`), and the reason. A fresh runner rebuilds the run from these comments alone.

## Roles and context

Four kinds of agent, and none of them shares a context window:

- **Runner.** The session that received this mode. It holds ticket ids, stages, branches and SHAs, and nothing larger. It never reads a diff, a test log or a lane's transcript; mode-core's diff review goes to the verifier.
- **Lane.** One fresh `mode-agent` per ticket attempt, on the `code` role in place of mode-core's fan-out roles, since each lane writes a whole ticket. Its prompt names `~/.claude/skills/impl-mode/SKILL.md` as its mode, with its Feature or Refactoring playbook run in its own worktree, and names this file only for its Gates, the Any ask or pause trigger and this report format. impl-mode's Verify items 1 and 2 bind it. It hands back a committed branch and a report of at most 15 lines, which replaces impl-mode's Reply: head SHA, proof command and result, the count of tests proven red under a break, the defaults it chose, the PR body file, and any question it parked on. Run step 9 replaces impl-mode's Verify item 4.
- **Reviewer.** A fresh `mode-agent` per round, on the `judgment and prose` role, that runs `/code-review medium` on the lane's head, under any review instructions the project's context names. A lane has no Agent tool, so the runner spawns impl-mode's Verify item 3 review after the lane hands back and before the verifier.
- **Verifier.** A fresh `mode-agent` per verdict, on the `judgment and prose` role, on any model other than the lane's; when the role line names the lane's model, use another `model` value. It never sees the lane's context. It reads the ticket and the diff, reruns the proof in a detached throwaway worktree at the head SHA, and returns PASS, FAIL or INCONCLUSIVE with up to 10 lines of evidence. The author never verifies its own branch.

Bulk stays in the agent that produced it. The runner keeps its working set in the tracker and the run directory, so after a compaction it rereads this file and resumes at Run step 2.

## Triggers

- **Any ask or pause.** Every ask in mode-core and impl-mode (Missing skill, which surface to prove on, an extra capability, Always pause) becomes the safest reversible default when one exists, recorded as a run comment, and a park when none does. mode-core's Observe forks still runs inside the lane, through impl-mode's Prototype playbook.
- **Dependent tickets.** A ticket blocked by another ticket in this run starts once its blocker is Verified, and branches from the blocker's branch. A ticket whose blocker is Parked or open outside the run, or whose in-run blockers sit on more than one branch, is Parked with a comment naming the blockers.
- **Long, unattended work.** The **show-me-your-work** skill keeps the trail in the run directory. At the digest step a `mode-agent` runs its cross-model review of the trail, and its Attention section goes into `digest.md`, so the runner never reads a night-long transcript.
- **Prose.** The **unslop** skill. PR bodies take the **pr** skill.

## Run directory

`~/.dark-factory/<repo>/<run-id>/`, where `<run-id>` is the run's start time as `YYYY-MM-DD-HHMM`. It sits outside every worktree and every temp folder, and the Claimed comment names it:

- `decisions.tsv`: the show-me-your-work trail.
- `pr/<ticket>.md`: each verified ticket's PR body.
- `land.sh`: the push and `gh pr create` commands for every verified branch, bottom of the stack first. A dependent's `gh pr create` passes `--base df/<blocker-id>`.
- `digest.md`: the reply.

## Gates

The run asks the user once, at Run step 1. Past it, the user is reachable only through the digest and a push notification.

The runner alone writes tracker moves, comments and the run directory. Lanes and verifiers report; the runner writes. The runner creates each lane's and verifier's worktree, since `git worktree add` writes the shared `.git`. It resets a lane's worktree to the branch head before a retry and removes a verifier's worktree after its verdict. Every agent leaves these for the user, except those writes and the worktrees the runner assigns:

- `git push`, every `gh` write, and every merge.
- Moving a ticket to Done.
- Any other write outside the agent's own worktree.

## Principles

- **Never Block on the Human.** Every ask becomes a default or a park.
- **Guard the Context Window.** The runner keeps ids and stages; diffs and logs stay in lanes and verifiers.
- **Make Operations Idempotent.** Each step rereads the tracker and converges on the same state after a crash.
- **Separate Before Serializing Shared State.** One worktree and one writer per branch; one writer for the tracker and the run directory.
- **Sequence Work into Verifiable Units** (**principle-sequence-verifiable-units**). A dependent starts from a verified blocker, so the stack never restacks mid-run.
- **Prove It Works.** A verdict counts only on the head SHA it names.

## Verify

Done means all four hold.

1. **Terminal.** Every queued ticket is Verified or Parked. A Parked ticket's comment names the decision or input the user owes.
2. **Independent verdict.** Each Verified ticket has a PASS from a verifier on a model other than its lane's, recorded against a head SHA that `git rev-parse <branch>` still returns.
3. **Lane proof.** impl-mode's Verify items 1 and 2 held in every Verified lane, and its fresh review of the Verified head came back clean or after 3 rounds.
4. **Hand-off.** `land.sh` passes `bash -n` and lists every Verified branch bottom first. `git ls-remote --heads origin <branch>` is empty for each. `digest.md` is written, and the user got a push notification, or the digest says the tool was missing.

**Reply:** the contents of `digest.md`, per Run step 11.
