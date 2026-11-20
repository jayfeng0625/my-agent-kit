---
name: principle-prove-it-works
description: "Apply after completing a task, before declaring done. Verify against the real artifact (run the feature, read the actual value, inspect the diff), not a proxy, self-report, or 'it compiles.'"
disable-model-invocation: true
metadata:
  tags: [principle]
---

# Prove It Works

Verify every output by checking the real thing directly: run the feature, read the actual value, inspect the diff. Proxies (file mtimes, self-reports, cached output, "it compiles") do not count. When a check fails, suspect the observation method before the system.

Script the check when you can. A deterministic script that reruns the comparison beats a one-time look. Keep its output where the human can see it, and commit it only when the trail must be auditable later.

## Name the system the signal came from

A verdict such as pre-existing, fixed, done or works in the target environment cites a runtime signal read from the system it names. Matching config, an assumed target and a ticket status are proxies.

To call a failure pre-existing, run the same repro on the baseline, or compare one runtime signal of the mechanism between a baseline run and the failing run.
