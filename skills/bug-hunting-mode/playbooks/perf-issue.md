### Perf issue

**You own the measurement story. Measure, fix, measure again.** Tie every fix to a measurement; source reading only seeds hypotheses.

1. Capture a baseline trace on the matching surface per the Reproduce it yourself trigger, and vet it per the A measured number trigger. For a regression, build the loop per the Loop first trigger.
2. The **how** skill to ground hypotheses. Claim a perf ceiling only after running it. Try the performance mantras in order, cheapest first, and stop at the first that meets the target:
   1. Don't do it. Stop work whose result nothing uses.
   2. Do it, but don't do it again.
   3. Do it less.
   4. Do it later.
   5. Do it when they're not looking.
   6. Do it concurrently.
   7. Do it cheaper.
3. Plan the fix from the trace, per the Any code trigger. Build it in the main thread or a `mode-agent` per Scope, one attempt at a time, each measured before the next.
4. Capture a post-fix trace on the same surface. Parse and compare both artifacts (JSON into sqlite, or a diff).
5. Cite the measurement in the PR body.
6. Meet every item in **Verify**.

**Reply:** who feels the slowness, the baseline number, the post-fix number, the delta, and the artifact paths.
