# Issue tracker

Issues live in a local tracker. Every command runs from the repo root:

    node tools/tracker.mjs list [--status <status>]
    node tools/tracker.mjs show <id>
    node tools/tracker.mjs create --title <title> (--body <text> | --body-file <path or ->) [--status <status>] [--blocked-by <id,id>]
    node tools/tracker.mjs move <id> <status>
    node tools/tracker.mjs comment <id> (--body <text> | --body-file <path or ->)
    node tools/tracker.mjs statuses

`create` prints the new id. A new issue starts in `Backlog` unless `--status` names another. `--blocked-by` records blocking edges, which `show` prints.
