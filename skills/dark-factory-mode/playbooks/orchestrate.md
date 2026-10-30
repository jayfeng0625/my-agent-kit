### Orchestrate

**You own the program, never the code. Author briefs, drain the queue, keep the frontier green, decide.** For a program handed to one standing runner: days of work, dozens to hundreds of tickets on several tracks, the user reading a checkpoint twice a day. A queue one session can drain is Run; one exit condition is Autonomous run. Ceremony scales with the program: on cheap near-identical tickets, collapse it as each section directs.

Three rules carry the rest.

- Completions are queue events, drained in batches.
- Every spawn and every resume carries the standing orders verbatim.
- The brief is the product. A vague brief fails quietly, because a lane cannot ask you a question.

Run's steps, **Ticket states**, **Gates** and verdicts hold for every ticket; this playbook adds the program around them. Run the program's tickets through `playbooks/plan.md` first, so each carries its Verify blocks.

#### Roles

- **Runner (this session).** Frames, authors briefs, drains the inbox, owns the checkpoints and makes judgment calls. It never authors or edits code: conflicted rebases and code changes are lanes. It is also the one stacker, per **Stack safety**.
- **Lanes, reviewers and verifiers** per **Roles and context** in `SKILL.md`. Prefer fewer, broader lanes, one writer per worktree and branch.
- **No sub-coordinators.** A `mode-agent` has no Agent tool, so the runner drains every track itself. A program past what one runner's drains can manage splits into one Orchestrate run per track, each its own session, run directory and store, sharing no branch.

Tracks are labels on units. Author the decomposition per program; build, landing and verification are common cuts.

#### Store

`orch/` in the run directory, written only by the runner, through `node ~/.claude/skills/dark-factory-mode/scripts/orch/orch.ts --store ~/.dark-factory/<repo>/<run-id>/orch`, written `orch` below; it needs Node 22.18 or later, which runs TypeScript directly. Its plain TSV and JSON stay readable without the CLI. A unit is one ticket, keyed by its ticket id; the tracker stays each ticket's stage record, per **Ticket states**.

- `preferences.md` is the standing-orders register (`orch standing add <line>`, `orch standing show`): numbered lines, one constraint each (model policy, stack shape, landing grant, verification bar, forbidden paths, escalation policy). Paste it verbatim into every spawn and every resume. When you catch yourself restating an instruction, append the line before you act (**principle-encode-lessons-in-structure**).
- `units.tsv` has one row per unit (`orch unit add <id> --track <track> --brief <path>`, `orch unit set <id> --state <state> --branch <branch> --pr <n> --sha <sha>`): id, track, state, branch, PR, head SHA, brief path.
- `frontier.json` is the computed merge frontier, per **Stack safety**.
- `ledger.tsv` is the verdict ledger, per **Verification**.
- `inbox/` holds completion pointers. `gates.md` parks the user's calls (`orch gate park <id> --question <q> --options <o> --default <answer>`, `orch gate resolve <id> --answer <a>`).

The show-me-your-work trail stays in the run directory's `decisions.tsv`.

#### The brief

Every spawn carries all of it. A field you cannot fill is a ticket you have not scoped yet, and a missing field is a refusal to spawn.

```
GOAL         one sentence, the outcome, executable by a stranger with no chat access
SCOPE        paths this lane may write; paths it may not; its worktree and branch
CONTEXT      pointers to files, tickets and PRs; upstream reports pasted in full when
             this ticket depends on them, because lanes cannot see siblings
ACCEPTANCE   the ticket's You see boxes, one per line
VERIFY       the ticket's Verify, unit commands, and its live and perf blocks for reference
TIMEBOX      rough cap on runtime; on expiry, return partial findings and stop
FORBIDDEN    the Gates list and the Any ask or pause trigger, verbatim, plus ticket bans
REPORT       Roles and context's lane report
STANDING     <preferences.md pasted verbatim>
```

Size the brief to the ticket: a one-command ticket collapses to a paragraph that still names the goal, the scope, the verify command and the report shape. A dependency is a context relay: paste the blocker's report into the dependent's CONTEXT. Never resume-chain a brief; respawn fresh with consolidated scope. Audit one sampled brief per wave while the wave runs; a failing brief stops the next refill and fixes the brief template.

#### Steps

1. **Frame.** Run step 1's start gate, plus a countable done predicate ("all 126 tickets Verified or Parked"), the tracks, the wall-clock budget and the checkpoint times. If one Run session could finish inside the budget, run Run. Settle a contested decomposition before the pilot: 2 or 3 `mode-agent` drafts, you pick one, and the framing names the pick.
2. **Install the runtime.** `orch init`, write the standing orders before any spawn, and seed the frontier with `orch frontier set --repo <repo-dir>` once PRs exist.
3. **Pilot.** Push one ticket through the whole path: brief, lane, review, swarm, ledger row, and the landing step the grant allows. Fix the brief template, the verify recipe and the ticket size from its evidence before any fan-out. On near-identical cheap tickets, the first ticket is the pilot, and fan-out starts when it is Verified.
4. **Scale.** Keep a rolling window of lanes and verdict lanes under mode-core's Fan-out limit, refilling as each finishes. Recompute ready work after each drain and relay upstream reports into downstream briefs.
5. **Drain** per **Queue and drain** at every drain point.
6. **Land, continuously.** Landing starts with the first Verified ticket and runs beside the waves. Under grant `none`, regenerate `land.sh` at each drain. Under `prs`, publish each Verified ticket per Run step 9 and keep the frontier green before upper-stack work. By about 70% of the budget, stop spawning and finish what is in flight.
7. **Checkpoint.** At each checkpoint time, write `digest.md` per Run step 11 from the tables and send a `PushNotification`. Do not wait for an answer: read the user's replies on parked tickets and `gates.md` at the next drain.
8. **Close.** Drain the final inbox, reconcile every spawned agent to a terminal row (done, abandoned, reconciled), confirm the predicate on the real artifact, confirm each Verified ticket's ledger row matches its current head, run the trail review per **Long, unattended work**, append recurring corrections to `preferences.md`, and write the final digest. Leave the store; it is the postmortem.

#### Queue and drain

- On a completion notification, run `orch inbox push <agent> <unit> <status> [--report PATH]` and return to what you were doing. Never review inline: a completion that needs review becomes a reviewer or a verdict lane.
- Drain in batches at four points: the end of a critical section, a heartbeat wake, a frontier change, and before a checkpoint. Begin each with `orch inbox drain`; arrivals during a drain wait for the next one.
- Critical sections you finish first: authoring a brief, a stack operation, a conflict decision, writing a gate, updating the ledger or the frontier.
- Each drain classifies every pointer (landed, needs-verify, failed, zombie, noise), writes rows through `orch unit add`, `orch unit set` and `orch ledger record`, runs `orch status`, then spawns the next wave in one message.
- Account for every spawned agent: arrived, respawned, or its scope explicitly absorbed.
- A drain ends with the three lines from `orch status`: counts against the states, what changed, gates open.

#### Stack safety

- The frontier is computed, never narrated. Under `prs`, recompute it with `orch frontier set` after every push and stack change; it walks the PR base chain with `gh` and reads head SHAs from local refs.
- The runner is the only stacker: it alone rebases a chain, retargets one of its PR bases, or force-pushes a `df/` branch, one chain rebase at a time. Lanes and verdict lanes never rebase, retarget, push or merge.
- Nobody in the run merges or closes a PR. A conflict a rebase cannot settle mechanically is a lane with a brief.

#### Verification

Every Verified ticket holds Run step 7's swarm PASS. Under `prs`, `orch ledger record <pr> <sha> live-ui-verified --evidence <verdicts dir> --verifier <model>` writes it, and `orch ledger check <pr> <sha>` reads it back (exit 2 with `NOT-VERIFIED` when no row matches). The ledger keys on a PR number, so under grant `none` the `verdict` run comment and the unit's state and head SHA in `units.tsv` hold it. The other states keep their meaning: `unit-test-verified` and `type-check-only` never make a ticket Verified, `verifier-blocked` is not a pass and is retried when the environment heals, and `verifier-failed` gets a fix lane. A new head voids its row unless Run step 7's patch-id rule carries it.

A ticket's output is externalized when it lands in the run: the lane commits its branch, the verdict lanes write their reports under `verdicts/`, and the runner writes the ledger row.

#### Liveness and failure

- Never resume an agent to check on it. Probe read-only, per mode-core's Stall check: the ledger, `units.tsv`, the lane's output file, its branch.
- A silent death gets a synthetic inbox row (unit, failure mode, last evidence, options). Replan on evidence as it arrives.
- Retry by mode: a context or time cap, respawn with smaller scope; a network drop, retry as is; a tool error, retry on another model; unknown, retry once. Each retry counts toward Run's 3 lanes per ticket, then the ticket parks.
- A zombie that returns late reconciles against the current frontier and ledger before anything it made is accepted.
- When further spawning would make garbage program-wide (bad upstream output, broken acceptance, dead infrastructure), write a stop line at the top of `preferences.md`, let in-flight lanes finish, fix the cause, and clear it.
- After a restart, running agents are dead. Reread `SKILL.md`, this file, the standing orders and `units.tsv`, recompute the frontier, reattach work by ticket and branch, and resume at Run step 2.

#### Escalation

The user's calls park as a `gates.md` entry and a parked ticket, and reach the user at the next checkpoint: irreversible actions, product or preference calls no experiment settles, a standing order that contradicts what the run observes, and a program-level dead end that survived a replan. Route work around each. Rebase mechanics, retries, CI flakes, review-thread triage and format fixes never reach the user. Mid-run discoveries fix only what blocks the frontier; everything else becomes a follow-up line in the digest.

**Reply:** the digest, which adds to Run's: the predicate and the count against it from `units.tsv` and `ledger.tsv`, each track and what it Verified, the frontier, what was abandoned and why, the open gates, and the store path.
