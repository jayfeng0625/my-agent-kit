# Triage labels

The skills name five canonical triage roles. In this repo each role is a workflow state on team `JA`.

| Canonical role    | `JA` state      | Meaning                                  |
| ----------------- | --------------- | ---------------------------------------- |
| `needs-triage`    | Backlog         | Maintainer needs to evaluate this issue  |
| `needs-info`      | Needs Info      | Waiting on reporter for more information |
| `ready-for-agent` | Ready For Agent | Fully specified, ready for an AFK agent  |
| `ready-for-human` | Ready For Human | Requires human implementation            |
| `wontfix`         | Won't Do        | Will not be actioned                     |

When a skill applies or queries a role, set or filter the issue's state. Do not create labels for these roles.
Other states (`In Progress`, `Ready For Human Review`, `Done`, `Canceled`, `Duplicate`) are lifecycle stages. Triage sets none of them.
