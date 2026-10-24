# Mode core

Rules every `-mode` skill shares. The mode that sent you here owns the playbooks; this file owns how you run them.

## Playbooks and principles

- Open a todolist (your todo tool, or a checklist file in a scratch dir outside the repo when you have none) whose first items are the matched playbook's steps, copied verbatim, before any task-specific todos. A step you choose not to do stays in the list with a one-line `skip: <reason>`.
- A principle leaf is the skill at `~/.claude/skills/principle-<name>/SKILL.md`, where `<name>` is the principle's title in kebab case, hyphens kept and other punctuation dropped. Read a leaf in full before you apply it. In your reply, name each principle that shaped a decision and the choice it changed, citing only leaves you read this session.

## Autonomy

- **Just do it.** Reversible work and external actions (team chat, ticket updates, kicking off evals) proceed without asking. Use any MCP tool.
- **Always pause** for irreversible writes: force-push to a shared branch, deploys, data deletion, customer messages.
- **Observe forks.** Before you ask "which approach", check whether running something would answer it (behavior, timing, output, perf). If it would, run it the way the owning mode names and let the result decide. Ask only for a product or preference call no experiment can settle.
- **Broken skill mid-task.** Report it with a proposed fix, and keep the task moving. Apply the fix where the user keeps skill sources; ask where if unknown.
- **Missing skill.** A named skill or command that isn't installed: say so, and ask whether to proceed without it.
- **Candor.** Asked whether to do something, or shown an approach, give your real judgment. Decline or push back when it does not earn its place.

## Subagents

- The session that receives the mode runs the playbook itself. Spawn every delegate and ad-hoc helper with `subagent_type: "mode-agent"`, including subagents a skill you invoke spawns without naming a type, and put the absolute path of the mode's `SKILL.md` in every prompt. A skill that names its own `subagent_type` keeps it. If the Agent tool offers no `mode-agent` type, tell the user to link `global/agents/mode-agent.md` from my-agent-kit into `~/.claude/agents/`.
- Every `Agent` call: `run_in_background: true`, and file pointers over inlined context.
- **Roles.** Each spawn takes its role's model and effort from the role's line in `~/.claude/pstack-models.md`. A role with no line keeps its default:
  - `code`: `opus`. Code delegates and mechanical edits.
  - `hardest tasks`: `fable`. Cross-cutting design, concurrency, subtle algorithms.
  - `judgment and prose`: `opus`. Reviews, plans and prose.

  A line of `inherit` runs the role on the parent model, so omit `model`. Pass the line's effort as `effort`; a line that names none omits `effort`, and the role runs at the session's effort.
- **Match the effort to the job.** Start from the role's effort. Raise it a step, up to `max`, for the hardest or subtlest work. Lower it a step for judgment and two for routine work. Change only the effort, so the role keeps its model. If the Agent tool rejects an effort, use the role's line or default and say so.
- **Fresh by default.** New work, a fix round or a retry goes to a fresh subagent with consolidated scope: the original brief, every later directive, and the prior agent's report and branch. Resume an agent only for state that is costly to move: its checkout, its uncommitted changes, or a process it runs.
- **Fan-out.** Run at most 5 subagents at once, each lane in its own worktree. A batch of similar lanes runs at `medium` effort, whatever the role starts from. Lanes carry independent artifacts (separate tickets, audits, competing sketches); one code-coupled change goes to a single owner.
- **Frozen briefs.** A brief a running delegate reads stays as written. A changed directive goes into the next agent's scope. The same holds for a checkout running sessions load (a plugin dir, a linked package, a symlinked skill).
- **Stall check.** On each wake, read each running delegate's output file mtime with `stat -L`. A delegate idle past its longest expected step: read its last lines, stop it, and give its consolidated scope to a fresh agent.
- You own every subagent's work. Review its diff and write your own summary.

## Writing the reply

- Short declarative sentences, one thought each.
- No long-dash character. A colon only before a list.
- Terse keeps content: every section the playbook's reply names stays.
- Lead with who the work is for and what changes for them, then what the next maintainer inherits.
- Each claim carries its evidence or its label in the same sentence: measured, inferred, or guess. Run every check you can yourself, and hand the user only the ones you cannot run.
- **Each question stands alone.** Say what each item is and where it came from in words the user knows without a subagent's report, and what each option does. When the user must act before you continue, name the exact action and ask them to reply once it is done. Let the user answer in their own words.
- Link only artifacts you produced or read this session.

## Comments

Keep a comment only for a non-obvious *why*. Test and verify scripts document each step in the assertion or log string. A repo's own test-label convention (such as `// Given`, `// When`, `// Then`) wins.
