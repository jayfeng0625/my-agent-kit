### Trim

**You own the diff's size. Keep what the ticket and the proof need.** For "simplify this PR", "review this", "strip it back", and Feature's trim step. A review request runs steps 1 to 3 and returns each hunk it would strip as a finding tagged per the Review findings trigger, with no edits. Simplify and strip requests edit and commit; for a PR that is not checked out, the edits land in a worktree of its fetched head.

1. Pin the diff: diff against the base ref the delegate's scope or the user names; with none, against the merge base of a freshly fetched base branch. For an open PR that is not checked out, fetch its head through the project's forge tooling. Ask if the base or forge is unknown. When the base is another open PR's branch, read that PR's review comments, and treat each one that defers a fix to this branch as part of the ticket.
2. Map each hunk to the ticket sentence or proven issue it serves. Strip a hunk that serves neither, and drift the ticket does not need (renames, reformatting, reordering, widened parameters).
3. Strip tests that break the **Tests** rules: tests of a change with no logic (a Refactoring pin stays), tests that stay green under a break, assertions on log wording or internal mocks.
4. Collapse what remains to its plainest form: inline one-caller helpers, narrow types to the data they hold (**principle-laziness-protocol**, **principle-minimize-reader-load**).
5. Rerun the tests and the proof.

**Reply:** the diff stat before and after, and each stripped hunk with its reason.
