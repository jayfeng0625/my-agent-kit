# invoicer

A small invoicing library and CLI. Plain Node (ESM), no dependencies.

- Tickets live in `tickets/` as markdown files named by id, such as `tickets/INV-12.md`. There is no issue tracker and no forge remote; the user pushes and opens PRs.
- Tests: `npm test` (node:test).
- The runnable surface is the CLI: `node src/cli.js <invoice.json>`. Sample invoices are in `examples/`.
- Base branch: `main`.
- Commit messages: imperative subject line; the body says why.
