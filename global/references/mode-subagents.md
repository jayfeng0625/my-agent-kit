# Mode subagents

How a `-mode` session spawns and owns subagents. Read it before your first `Agent` call; `mode-core.md` still applies.

- The session that receives the mode runs the playbook itself. Spawn every delegate and ad-hoc helper with `subagent_type: "mode-agent"`, including subagents a skill you invoke spawns without naming a type, and put the absolute path of the mode's `SKILL.md` in every prompt. A skill that names its own `subagent_type`, role lines or lane count keeps them. If the Agent tool offers no `mode-agent` type, tell the user to link `global/agents/mode-agent.md` from my-agent-kit into `~/.claude/agents/`.
- Every `Agent` call: file pointers over inlined context, and `run_in_background: false` when your next step waits on that one result. Spawns that run side by side go in the background, and so does a steer or resume of a running agent, because a foreground call holds your turn while other reports wait.
- **Roles.** Each spawn takes its role's model and effort from the role's line in `~/.claude/pstack-models.md`. A role with no line keeps its default:
  - `code`: `opus`. Code delegates and mechanical edits.
  - `hardest tasks`: `fable`. Cross-cutting design, concurrency, subtle algorithms.
  - `judgment and prose`: `opus`. Reviews, plans and prose.
  - `fan-out routine`: `opus low`. Batch lanes of mechanical work, such as one edit across tickets.
  - `fan-out investigate`: `opus medium`. Batch lanes that read and judge, such as audits or competing sketches.

  A spawn the mode names no role for takes the closest one: a reviewer, checker or verifier takes `judgment and prose`, a parser of a large log, transcript or artifact takes `fan-out investigate`, and a code delegate takes `code`. A line of `inherit` runs the role on the parent model, so omit `model`. Pass the line's effort as `effort`; a line that names none omits `effort`, and the spawn runs at the session's effort.
- **Match the effort to the job.** A role's effort fits its usual job. Raise it a step, up to `max`, for harder or subtler work, and lower it a step for lighter work. Change only the effort, so the role keeps its model. If the Agent tool rejects an effort, use the role's line or default and say so. If it rejects that too, omit `model` so the spawn runs on the parent model, and say so.
- **Code delegate brief.** Give a code `mode-agent` these fields: the mode `SKILL.md` path, the playbook, the worktree and its base ref, the goal (the ticket text or the user's words), the success check as a command, and the files or behavior to leave alone. Its report follows `mode-code.md`'s **Code delegate report**.
- **Fresh by default.** New work, a fix round or a retry goes to a fresh subagent with consolidated scope: the original brief, every later directive, and the prior agent's report and branch. Resume an agent only for state that is costly to move: its checkout, its uncommitted changes, or a process it runs.
- **Fan-out.** Run at most 5 subagents at once, each lane in its own worktree. A batch of similar lanes takes the `fan-out routine` or `fan-out investigate` role, whichever fits its lanes, in place of each lane's own role. Lanes carry independent artifacts (separate tickets, audits, competing sketches); one code-coupled change goes to a single owner.
- **Frozen briefs.** A brief a running delegate reads stays as written. A changed directive goes into the next agent's scope. The same holds for a checkout running sessions load (a plugin dir, a linked package, a symlinked skill).
- **Stall check.** On each wake, read each running delegate's output file mtime with `stat -L`. A delegate idle past its longest expected step: read its last lines, stop it, and give its consolidated scope to a fresh agent.
- **Delegates cannot spawn.** A subagent has no Agent tool. A delegate runs a routed skill's subagent steps itself, one after another. A step that needs a context independent of the author's work, such as a fresh review or a verdict, is spawned by the session that runs the playbook.
- You own every subagent's work. Review its diff and write your own summary.
