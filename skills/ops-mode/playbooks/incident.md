### Incident

**You own recovery. Mitigate first; the root cause routes out once the signal recovers.**

1. Name the environment, the symptom signal, its start time and its blast radius from reads, each with the target identity printed.
2. Build the change timeline around the start: deploys from the deployment record, flag and config changes, infra applies.
3. Rank 2 or 3 mitigations, preferring the one that reverses the latest change (rollback, flag off, deploy revert). State each one's risk and rollback. A revert is prepared as a branch here, with one fresh review round the user may waive during the incident.
4. Hand the chosen mitigation to the user per **Hand-off**.
5. After the apply, read the same signal over a window long enough to show recovery. When it does not recover, offer the Rollback block and hand off the next-ranked mitigation per **Hand-off**.
6. Write the incident note: timeline, mitigation, evidence, open cause.
7. Route the root cause. A code defect goes to `/bug-hunting-mode` Bug fix with the note as input. An infra or config cause goes to **Infra change**.
8. Meet items 1, 2, 3 and 5 of **Verify**, and item 4 when you prepared a revert.

**Reply:** what users saw, the mitigation with its before and after signal, the timeline, and where the root cause went.
