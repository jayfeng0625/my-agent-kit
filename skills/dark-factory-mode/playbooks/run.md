### Run

**You own the queue. Claim, delegate, verify, park.**

1. **Start gate.** In one message, confirm the queue (a tracker query or a ticket list), the base branch, and that the runner's tracker commands and the lanes' commands (tests, builds, local services) run without permission prompts, through auto mode or an allowlist. Check that every tracker status in **Ticket states** exists, and that `ScheduleWakeup` and `PushNotification` are available. Then create the run directory and start the trail.
2. **Resume.** List In Progress and Ready For Human Review tickets whose latest run comment carries the `dark-factory` marker, and reuse the run-id and run directory their `claimed` comments name. Carry each In Progress ticket forward from the stage its comment names; a Verified one stays Verified.
3. **Frontier.** Take every queued ticket whose blockers are Done or Verified in this run, and park the ones the Dependent tickets trigger parks. Order by blocking edges, then tracker order.
4. **Claim.** Post a `claimed` comment naming the branch `df/<ticket-id>` and the run directory, then move the ticket to In Progress. A `df/<ticket-id>` branch already on the remote parks the ticket.
5. **Lane.** Spawn the ticket's lane per **Roles and context**. Its scope names the ticket, the base or blocker branch, the worktree path, and the defaults this run has recorded. Every live agent counts against mode-core's Fan-out limit of 5, lane reviewers and verifiers included, so start a lane only when its reviewer fits too.
6. **Heartbeat.** Lane notifications wake the runner. A fallback `ScheduleWakeup` of 20 to 30 minutes covers a hung lane, and each wake runs mode-core's Stall check. A stalled lane counts toward the ticket's 3 lanes, and a lane that stalls twice parks its ticket.
7. **Verdict.** When a lane hands back, spawn its verifier per **Roles and context** and post the verdict with its head SHA. An INCONCLUSIVE gets one fresh verifier; a second INCONCLUSIVE parks the ticket with the evidence.
8. **Retry or park.** A FAIL goes to a fresh lane with consolidated scope: the brief, the verdict's findings and the branch, in the same worktree path. A ticket gets 3 lanes in total, then parks with the last verdict. A lane that parked on a question parks its ticket at once.
9. **Verified.** Write `pr/<ticket>.md` with the **pr** skill from the lane's report and the verdict, then move the ticket to Ready For Human Review with a `verified` comment.
10. **Loop.** Return to step 3 until the frontier is empty and no lane is running. Then park every ticket still queued, naming the blocker or cycle that held it.
11. **Digest.** Regenerate `land.sh` from the Verified tickets in stack order, write `digest.md`, send a `PushNotification`, and meet every item in **Verify**.

A tracker write that still fails after 3 retries with backoff stops new lanes. Running lanes finish, and the digest leads with the outage.

**Reply:** the digest, which leads with what the user must do and in what order:

- the land command (`bash ~/.dark-factory/<repo>/<run-id>/land.sh`) and the stack order;
- each Parked ticket, with the decision or input it waits on;
- each Verified ticket, with its branch, head SHA, diff stat, the proof the verifier reran, the defaults the lane chose, and the two models (lane and verifier);
- the run's cost in lanes, retries and wall time, and any missing tool.
