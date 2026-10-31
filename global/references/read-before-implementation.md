# Read before implementation

Apply the loop to the code and to the scope of the work.

1. **Red.** Before changing code, show the target behaviour failing: a failing test (`/tdd`), a reproduction, or a check that names the gap.
2. **Green.** Make it work with the smallest change. Prove it on the real artifact: tests, then the running app when behaviour is user-facing, through the project's `verify-<app>` skill if it has one (`/create-verification-skill` makes one), else `/run`, `control-cli`, or `control-ui`.
3. **Review.** Spawn a fresh-context reviewer with the built-in `/code-review`. The reviewer is never the builder: a builder reviewing its own work misses what it already rationalized, and a separate, clean reviewer does not share those assumptions.
4. **Refactor.** The implementer fixes accepted findings, keeps the proof from step 2 green, and asks for another review only after fixing a correctness finding, at most 3 rounds. Report two lists: VERIFIED (ran it, saw the output) and REASONED (read the code, believe it works). The main session re-runs the checks anyway.
5. **Scope.** Do the least work that meets the goal. Record improvements you noticed and skipped in a short "Deferred" list in the final report.
