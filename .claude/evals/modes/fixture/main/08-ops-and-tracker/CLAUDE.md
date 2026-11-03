# invoicer

A small invoicing library and CLI. Plain Node (ESM), no dependencies.

- Issues live in the local tracker, `node tools/tracker.mjs`; see `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`. Each ticket also has a markdown file in `tickets/` named by id, such as `tickets/INV-12.md`. There is no forge remote; the user pushes and opens PRs.
- Environments (dev, staging, prod), deploys, logs and metrics: `docs/agents/ops.md`.
- Tests: `npm test` (node:test).
- The runnable surface is the CLI: `node src/cli.js <invoice.json>`. Sample invoices are in `examples/`.
- Base branch: `main`.
- Commit messages: imperative subject line; the body says why.
