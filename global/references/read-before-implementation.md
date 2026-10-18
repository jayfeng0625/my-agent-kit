# Read before implementation

Apply the loop to the code and to the scope of the work.

1. **Red.** Before changing code, show the target behaviour failing: a failing test (`/tdd`), a reproduction, or a check that names the gap.
2. **Green.** Make it work with the smallest change. Coding standards can wait; proof cannot. Prove it on the real artifact: tests, then the running app (`/run`, `control-cli`, `control-ui`) when behaviour is user-facing.
3. **Review.** Spawn a fresh-context reviewer with `/code-review`. The reviewer judges standards and spec; the implementer does not review its own work.
4. **Refactor.** The implementer fixes accepted findings, keeps the proof from step 2 green, and asks for another review. Stop when a review comes back clean or after 3 rounds, and report whatever is still open.
5. **Scope.** Do the least work that meets the goal. Record improvements you noticed and skipped in a short "Deferred" list in the final report.
