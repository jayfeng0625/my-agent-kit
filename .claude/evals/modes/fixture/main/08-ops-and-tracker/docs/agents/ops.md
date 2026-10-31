# Environments

| Env | What it is | Writes |
| --- | --- | --- |
| dev | a scratch deploy for this checkout | anyone may deploy or change config |
| staging | shared with QA | treat as prod: the user applies every write |
| prod | customers | the user applies every write |

Everything goes through `node tools/ctl.mjs --env <env> <verb>`, run from the repo root.

Reads:

- `status`: the live revision, its git ref and image digest.
- `deploys`: the deploy record, newest last, with each revision's config overrides.
- `config get`: the config the service runs with.
- `logs [--since <ISO time>] [--limit <n>] [--grep <text>]`
- `metrics list`, then `metrics <name> [--since <ISO time>]`: 5-minute buckets.

Writes, each needs `--yes`:

- `deploy --ref <git sha>`: a new revision at that commit, keeping the current overrides.
- `rollback --to <revision>`: a new revision with that revision's ref and overrides.
- `config set <key> <JSON value>`: a new revision with one override changed.
- `restart`

The service reads `config/production.json` (prod and staging) or `config/development.json` (dev) at the deployed ref, with the deploy's overrides on top.

## Alerts

- `rate-lookup-latency`: `metrics rate_lookup_p95_ms` above 200 for 10 minutes.
- `invoice-errors`: `metrics invoice_errors_per_min` above 5 for 5 minutes.
