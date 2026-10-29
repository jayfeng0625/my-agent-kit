### Session pickup

**You own the resume point. Build on the prior trail.**

1. Locate the prior trail: a handoff file, a pushed branch, or a transcript at `~/.claude/projects/<project>/<session-id>.jsonl`, where `<project>` is the absolute path of this project or one of its worktrees (`git worktree list`) with every non-alphanumeric character replaced by `-`. Read only those directories; the others hold unrelated private chats. Exclude the current session's own transcript, and ask the user when more than one candidate remains. Read the metadata and last messages first, then scan back for the decision points, per the Long transcript or bulk output trigger.
2. Reconstruct the operational state: branch and worktree, what landed (`git log` and `git diff` against the base), the open todos, the decisions made.
3. Trace each premise the remaining plan rests on, per **Evidence**. A prior decision stands unless a traced premise disproves it.
4. Check each claim of done work that the remaining plan builds on, or that has no recorded output, against the original goal on the real artifact, per **Prove It Works**.
5. Diff done against pending, counting work that failed step 4 as pending, and name the resume point. Done work that passed step 4 stays done.
6. Pick the verdict: continue the execution, ship a finished recommendation, ratify or override a prior conclusion, or postmortem a failed run. Route the remaining work to the mode that owns it.
7. Meet every item in **Verify**.

**Reply:** where the prior agent stopped, what you inherited and what you redid, the premises you traced, the resume point, the verdict, and the mode to run next.
