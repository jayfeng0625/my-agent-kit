---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
disable-model-invocation: true
metadata:
  tags: [explanation, architecture, subagents]
---

# How

Explore the codebase to answer "how does X work?" questions. Produce architectural explanations at the level of a senior engineer onboarding onto a subsystem, enough to build a working mental model, not so much that it reads like annotated source code.

Every spawn is an Agent tool subagent of type `general-purpose`, with a brief that says the subagent edits no files. Explorers use the `how explorer` line in `~/.claude/pstack-models.md` (default `opus`), and every explainer uses the `how explainer` line (default `opus`). The line's value is a model and an optional effort, such as `opus high`. Set `model` and `effort` from it, or `model` from the default if the file or the line is missing. Leave `model` unset when the model is `inherit`, and leave `effort` unset when the value names none. If the Agent tool rejects a model, use `inherit` and say so. Pick each subagent's effort for the job, per the Match the effort to the job rule in `~/.claude/references/mode-subagents.md`.

## 1. Assess complexity

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple** (a single module, a small utility, a narrow question such as "how does function X work"): no subagents. Explore and explain in one pass yourself, under the User Proposal rule, Output Format and Communication Style in `references/explainer-prompt.md`. Go to step 4.
- **Complex** (a subsystem spanning multiple files or services, a cross-cutting feature, a full architectural overview): go to step 2.

When in doubt, take the simple path.

## 2. Explore (complex only)

Decompose the question into 2 to 4 angles, each a distinct slice of the subsystem. Spawn all explorers in a single message, each with `references/explorer-prompt.md` and its angle filled in.

## 3. Synthesize (complex only)

Once all explorers have returned, spawn one explainer with `references/explainer-prompt.md` and every explorer's findings filled in.

## 4. Present

Present the explanation. On the complex path that is the explainer's output: light edits for clarity or context from the conversation are fine. Do not substantially rewrite it.

## Output format

The explanation uses the sections defined in `references/explainer-prompt.md`, dropping any that do not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.
