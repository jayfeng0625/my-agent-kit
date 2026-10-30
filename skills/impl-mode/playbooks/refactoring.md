### Refactoring

**You own the contract. The structure changes; the behavior holds.** A missing feature or a real bug found on the way splits out: ship the structural change first, then route the rest to Feature.

1. Pin the behavior first. Run `how` over the affected subsystem if you have not read it, then write a characterization test, snapshot, or equivalence harness that captures current behavior. If the area has no test, land the pin as a test in a commit before the reshape; a harness kept outside the tree guards only this session. Type check and lint are no pin.
2. Name the structure the code is missing (**principle-model-the-domain**). Code whose shape is already clear and local stays. The reshape deletes branches or invalid states.
3. Name the target shape: module layout, types and call graph as if built today (**principle-foundational-thinking**, **principle-redesign-from-first-principles**). Crossing a function boundary, run the Function boundary trigger first.
4. Subtract first: dead code, one-caller wrappers, redundant validators, orphan references (**principle-subtract-before-you-add**).
5. Move in small steps, each keeping the pin green. For an API reshape, migrate every caller and delete the old API in the same wave (**principle-migrate-callers-then-delete-legacy-apis**). Grep every rename across strings, prose and back-references.
6. Prove behavior is unchanged on the real artifact, with an equivalence check for a larger reshape: a script that diffs old and new outputs, or a recorded baseline replayed.
7. Keep the change only if it lowers reader load somewhere (**principle-minimize-reader-load**). Otherwise revert it.
8. Order the commits: subtraction, then reshape, then follow-on cleanup. Meet every item in **Verify**.

**Reply:** add the pin, the equivalence proof, the reader-load delta, and what got reverted.
