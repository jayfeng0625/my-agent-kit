### Orchestrate

**You run the program, never the code. Decide which agent does each piece of work, then check what each one produces.** For a standing project handed to one coordinator session: multi-day, many stacked PRs, dozens to hundreds of subagents, few human turns. One task driven to a predicate is Autonomous run. One ambitious run that needs a bespoke workflow is the **figure-it-out** skill. Work that one agent could finish inside the session's budget is not a program.

Run it with your own tools. Spawn workers with `Agent`. Keep the program's state in the tracker, per **Ticket states**, and the run directory. Watch each PR with the `Monitor` tool, which wakes you on each new check result. Call no scripts, run no polling loops, and never relay messages or status between agents. Run's steps, **Ticket states**, **Gates** and verdicts hold for every ticket; this playbook adds the program around them.

#### Topology

- **One owner per PR.** The owner is the only writer of its branch and carries the PR from build to a verified head. Only the owner rebases it; the runner pushes its head and retargets its PR on the owner's report, per **Gates**. Closing or retargeting a base PR orphans every PR above it, so do that only on evidence from its owner. You never author or edit code. Conflicted merges, chain rebases, and fixes go to owners.
- **A fresh worker for each independent task.** Its kickoff carries everything it needs, including each upstream report it depends on, pasted in full. Workers can't see their siblings. Run each worker in its own worktree, which the runner creates per **Gates**. Pick each subagent's effort for the job, per mode-subagents' Match the effort to the job rule.
- **No sub-coordinators.** A `mode-agent` has no Agent tool, so you own every worker and kickoff. Keep workers in flight up to mode-subagents' Fan-out limit, and start the next one as each finishes instead of waiting on a whole batch.
- **Resume a worker only when new work needs its built state,** such as its checkout, uncommitted changes, or a running process. Message a worker only for a follow-up on the same work. Never message one to check on it, because a message restarts an idle agent.
- **Each PR gets a verifier that isn't its author,** on another model: the verification swarm per **Roles and context**. The ticket is Verified only on that swarm's PASS at the current head.
- **Start with one unit.** Take it through kickoff, owner, verifier, and the landing step the grant allows before you fan out, so a flaw in the kickoff costs one agent instead of fifty. On near-identical cheap units, the first unit is that test.

#### Supervision

- **Each kickoff names the evidence that proves the work is done,** such as a command and its expected output, a control-skill check, or an artifact. It also names the goal, the paths the worker may and may not write, and the actions it must not take. If you can't name the evidence, the unit isn't scoped yet.
- **Read the diff or the artifact, not only the worker's summary.** Green CI is an input to a verdict, not a verdict. Behavioral work needs more than a type check. A verdict covers one head SHA, so a new push needs a new verdict.
- **Send back work that drifts from scope or grows past what was asked.** Keep only the fixes that block the program, and park the rest as follow-ups.
- **Check a PR's live state before you report on it,** with `gh pr view` and `gh pr checks` or your forge's equivalents, not the worker's last report. Account for every worker you spawned as done, replaced, or absorbed into another worker's scope.
- **Stop or replace a worker that stalls or loops.** Judge it by its pushes and PR activity, not its status text. Retry by cause: a smaller scope after a context or memory limit, the same kickoff after a dropped connection, and a different model after a tool error. After two retries, drop the unit and replan around it. When a stopped worker returns late, check its result against the PR's current state, and hand any unique findings to a fresh worker.
- **Reach the user, through the digest, only for a real decision or a blocker,** such as an irreversible action, a product or preference call that no experiment settles, or a dead end that survived a replan. Rebase mechanics, retries, CI flakes, review triage, and "should I keep going" never reach the user.

**Reply:** what landed against the goal, each PR's live state and verdict with its link, what was dropped and why, and the decisions waiting on the user.
