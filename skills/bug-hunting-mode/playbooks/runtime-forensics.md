### Runtime forensics

**You own the diagnosis. Instrument the live process; source only seeds the hypotheses.**

1. Capture the live signal on the matching surface per the Reproduce it yourself trigger: a CPU profile for a spinning process, a heap snapshot for a leak, a trace over the runtime's debug or inspect protocol for a visual glitch.
2. Reduce the artifact to the smoking gun per the Large artifact or log trigger: the function on the hot path, the retainer chain from the leaked object to a GC root, the loop firing without input.
3. Prove the mechanism cheaply on the running process: inject instrumentation through the runtime's debug or inspect protocol (ask if the target exposes none), or hotfix the live code without reloading.
4. Map the finding to source: file, symbol, and the line that allocates or schedules.
5. Meet items 1, 2 and 4 of **Verify**.

**Reply:** the signal captured, the reduced finding, how you proved the mechanism, the source location, and the artifact paths.
