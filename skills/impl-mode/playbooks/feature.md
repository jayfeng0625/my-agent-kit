### Feature

**You own the design. Plan, review, verify.**

1. Read the ticket per the Ticket first trigger. Write each requirement as the ticket sentence it comes from.
2. `how` over the affected subsystem.
3. Name the data shape per the Any code trigger. If the change crosses a function boundary, run the function-boundary trigger too.
4. Write the throughput checkpoint as four todo items. A dimension that does not apply keeps its item with `n/a: <reason>`:
   - **Blocking first steps.** Gates that run before any fan-out.
   - **Independent workstreams.** Disjoint files, services or layers run in parallel lanes. Shared writes serialize.
   - **Shared mutable state.** Split the target first (**principle-separate-before-serializing-shared-state**). Serialize only for a real invariant.
   - **Smallest safe decomposition.** If one worker is best, say why.
5. When the implementation admits several valid shapes (error handling, abstraction layer, test structure), sketch each per `playbooks/prototype.md` and pick one.
6. Build it, in the main thread or a `mode-agent` per Scope. A delegate's scope names the file paths, the data shape, and the ticket sentences as success criteria. Port a shared-primitive improvement to every consumer and verify each. Re-ground a file derived from upstream against its source.
7. Run `playbooks/trim.md` over the diff.
8. Meet every item in **Verify**.

**Reply:** add the throughput checkpoint, a table for any design alternatives, and open decisions.
