### Autonomous run

**You own the exit condition. Define done, then drive to it while the user is away.**

There is no ticket queue: the run directory holds the state, and after a compaction the runner rereads `decisions.tsv` and resumes at step 3.

1. **Start gate.** In one message, agree the exit condition as a checkable predicate (tests green, a repro fixed, a metric past its target, a pixel diff of zero), the one command that checks it, and the base branch, and confirm the commands run without permission prompts, as in Run step 1. Then create the run directory, the branch `df/<run-id>` from the base, and the trail, and record the predicate's starting state. Past this step the **Gates** hold and **Any ask or pause** applies.
2. **Wake.** Use Claude Code's `/loop`. An event to watch (CI, a merge, a ref advancing) gets a watcher that wakes the runner on it, with a 20 to 30 minute heartbeat as fallback; with no event, size the heartbeat to when the result is worth rechecking. Each wake runs mode-core's Stall check.
3. **Iterate.** Each iteration is one lane per **Roles and context**, in the branch's worktree, scoped to the smallest change the evidence justifies. The lane reruns the predicate command and reports it before and after, with the gate result. Keep a commit that moved the predicate with the gate green; otherwise reset the branch to its previous head, so a change that "might help" goes. Verify each unit before the next starts (**principle-sequence-verifiable-units**).
4. **Side fixes.** A mid-run discovery that supports the goal is yours: a broken skill, a related bug, a flaky verifier or a tooling failure gets its own lane on `df/<run-id>-<slug>` from the base, and its own line in `land.sh`. Return to the predicate after each one. A finding with no safe default and no reversible branch parks as a line in the digest.
5. **Checkpoint** every iteration as a `decisions.tsv` row: the change, the predicate before and after, and kept or reset.
6. **Plateau.** After several resets in a row, pivot the approach: another category of change, a combination of near-misses, a reread of the source. Stop on the predicate, or on a dead end you can name with what you tried. Keep the predicate as agreed.
7. **Verdict.** When a lane reports the predicate met, one verifier, a fresh `mode-agent` on the `judgment and prose` role and a model other than the lane's, reruns the predicate command at the branch head in a detached worktree; with no ticket there are no Verify blocks, so the swarm's other lanes do not run. A FAIL returns to step 3. After a PASS, the lane's PR body goes to `pr/<run-id>.md`, then write the digest as in Run step 11.

**Reply:** the digest, which leads with the land command, then the exit condition and its final state, iterations run (kept and reset), each kept commit on one line, the side branches, and any dead end or park.
