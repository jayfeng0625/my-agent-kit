### Migration

**You own convergence. One phase, one parity read, before the next.**

1. Inventory: size the data, list every reader and writer of what moves, and read the live schema in each target environment.
2. Phase it: expand, dual-write, backfill, switch reads, contract, skipping the phases with nothing to move (a data fix may need only the backfill). Each phase stays reversible until contract.
3. Get the script. A migration a feature needs comes from that feature's `/impl-mode` slice. A standalone one (a data fix, a cutover) you build here with the project's migration tooling. Either way it has a dry run, resumes after a stop, and carries a parity or count check that prints the target identity.
4. Prove the parity check red: break the backfill locally, see the check fail, restore.
5. Run each phase before contract in the environments below prod that the project context lets you write, with a parity read after each.
6. Write the prod runbook as one **Hand-off** block per phase, with a phase of more than one step as its own **wizard**, and commit it on the branch that carries the script; a slice-built migration's runbook gets completed on its slice. Run **Verify**'s fresh review before the first prod phase. Hand off the branch and PR body for the code that dual-writes or switches reads per item 5 of **Verify**, so the user deploys pushed, reviewed code.
7. The user runs each prod phase before contract, and deploys that pushed code at its phase. Read parity after each, and stop on a mismatch.
8. Contract once the user confirms reads switched: below prod first, then in prod through the user, with a parity read after each. A contract that waits on a later `/impl-mode` slice goes in what is left.
9. Meet every item in **Verify**.

**Reply:** the phases run in each environment, the parity output for each, and what is left.
