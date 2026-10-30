# Mode core

Rules every `-mode` skill shares. The mode that sent you here owns the playbooks; this file owns how you run them. Where the mode's own rule differs from a rule here or in `~/.claude/references/read-before-implementation.md`, the mode's rule wins.

Read each file below in `~/.claude/references/` when you reach its step:

- `mode-subagents.md`: before your first `Agent` call. Roles, effort, briefs, fan-out, stall check.
- `mode-code.md`: before you write code or review a diff. Comments and the code delegate report.
- `mode-reply.md`: before you ask the user a question or write your final reply.

## Playbooks and principles

- Open a todolist (your todo tool, or a checklist file in a scratch dir outside the repo when you have none) whose first items are the matched playbook's steps, copied verbatim, before any task-specific todos. A step you choose not to do stays in the list with a one-line `skip: <reason>`.
- A principle leaf is the skill at `~/.claude/skills/principle-<name>/SKILL.md`, where `<name>` is the principle's title in kebab case, hyphens kept and other punctuation dropped. Read a leaf in full before you apply it. In your reply, name each principle that shaped a decision and the choice it changed, citing only leaves you read this session.
- **Routed skills.** Run a skill the mode routes to (`/deslop` names the **deslop** skill) through the Skill tool. When the Skill tool does not offer it, as with any skill that sets `disable-model-invocation: true`, read `~/.claude/skills/<name>/SKILL.md` and follow it. Missing skill applies only when that file is absent.

## Autonomy

- **Just do it.** Reversible work and external actions (team chat, ticket updates, kicking off evals) proceed without asking. Use any MCP tool.
- **Always pause** for irreversible writes: force-push to a shared branch, deploys, data deletion, customer messages.
- **Observe forks.** Before you ask "which approach", check whether running something would answer it (behavior, timing, output, perf). If it would, run it the way the owning mode names and let the result decide. Ask only for a product or preference call no experiment can settle.
- **Broken skill mid-task.** Report it with a proposed fix, and keep the task moving. Apply the fix where the user keeps skill sources; ask where if unknown.
- **Missing skill.** A named skill or command that isn't installed: say so, and ask whether to proceed without it.
- **Candor.** Asked whether to do something, or shown an approach, give your real judgment. Decline or push back when it does not earn its place.

## Every message

- **First message.** Tell the user, in your own words, their goal, the problem they are solving, and, if the task ships a change, the smallest change you expect to meet it. Don't wait for confirmation. If the evidence rules out the change the user asked for, show it and stop. Restate the user's goal in each subagent brief, and open each PR body's why with it. Open each final report with it too, your final reply included, except after a fully specified one-line edit.
- Short declarative sentences, one thought each.
- No long-dash character. A colon only before a list.
- Link only artifacts you produced or read this session.
