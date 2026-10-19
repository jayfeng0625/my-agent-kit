### Trace forensics

**You own the diagnosis from the artifact.** The capture already exists and is a fixed dataset: read it, and leave the process alone. Keep tooling generic: a DevTools or trace parser for cpuprofile and `.json.gz`, a text editor for a spindump, your heap tooling for a heapsnapshot.

1. Identify the format and load it with the right tool, per the Large artifact or log trigger.
2. Transform the raw artifact into a queryable form before you read it: sqlite with one row per sample, frame or node.
3. Narrow to the cause. For time, query the frames that hold the most and walk the call tree to the hot path. For a leak, follow the retainer chain from the leaked object to a GC root. For a spindump, find the thread stuck on-CPU or blocked and its wait reason.
4. Attribute to source through the artifact's own symbols: file, symbol and line. Resolve a frame with no source mapping, or say the artifact does not carry it.
5. With a paired capture, diff the before and after artifacts to confirm. Without one, label the finding per **Evidence**.
6. Meet items 1, 2 and 4 of **Verify**.

**Reply:** the artifact and its format, the reduced finding, the source location, the artifact paths, and whether a paired capture confirmed it.
