### Bug fix

**You own the fix. Reproduce, root-cause, verify.** The smallest change the evidence justifies ships, per **Evidence**.

1. Reproduce it yourself per the Reproduce it yourself trigger, and build the loop per the Loop first trigger. If it won't reproduce directly, synthesize the trigger, tighten conditions, or instrument until it fires.
2. Binary-search the cause. Seed 3 to 5 ranked, falsifiable hypotheses from the loop's output. Add `how` for a subsystem you have not read, and the **why** skill when the bug is a regression. Show the ranked list to the user and keep going. Each pass, take the split that cuts the most remaining problem space, get runtime evidence, and eliminate. When program state is unclear, instrument per the Debug logs trigger and read it as the code runs. Confirm the surviving mechanism with runtime evidence before planning the fix.
3. Plan the fix at the root cause, per the Any code trigger.
4. Build it in the main thread or a `mode-agent` per Scope, the regression test first per Commits.
5. Rerun the original, un-minimised loop and keep its green output. A CI-only failure ends at its red job output, per the Failed CI job trigger.
6. Meet every item in **Verify**.

**Reply:** what was broken and for whom, the root cause, the fix, and the failing-then-passing loop output verbatim (for a CI-only failure, the red job output and the job to rerun).
