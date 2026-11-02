---
name: shape
description: "Shape what to build and how before a side project or agent tool starts: one job, subtraction, portfolio fit, capability contracts, code or model. Writes BRIEF.md. Use for /shape."
disable-model-invocation: true
argument-hint: "<idea, or path to an existing project>"
metadata:
  tags: [planning, scoping, product]
---

# Shape

Turn an idea into a one-page `BRIEF.md` that passes five principles. The build starts from the brief's first verifiable step.

## Principles

Every run applies all five.

### 1. One job

A complete solution to a narrow problem beats an incomplete solution to many. State the job as _start state → result the user can rely on_, with the exceptions that belong to that result. Name who it is for and who it is not for. The **boundary** encloses the whole job: be complete inside it, ruthless at its edges.

Example: a captioning tool takes a recording through transcription, timing, correction, and a usable subtitle export. A social feed, campaign planner, or general video editor sits outside.

### 2. Subtraction

Adding is cheap. Removing the right thing takes judgment, because it requires knowing where the value comes from. Put every feature, step, and decision through four questions:

- Does this feature need to exist?
- Can this step disappear?
- Can this decision be eliminated?
- Is this complexity necessary for the outcome?

Remove work; hiding it counts as no removal. An empty prompt box replacing five controls hands the user everything those controls explained. An opinionated default, automatic context retrieval, or a dropped redundant approval removes more. Keep decisions with meaningful consequences. Cut the ones the product resolves dependably from context, policy, or a default. Measure by completion, errors, and the steps the user still does by hand outside the product.

Subtraction applies at the boundary, to internal seams (3), and to the portfolio (4).

### 3. Nintendo outside, Unix inside

Outside: one opinionated, coherent experience designed around an activity, with no tour of every capability. Inside: capabilities with narrow contracts and deep insides, each hiding a design decision that could change (Parnas), so swapping a transcription provider or renderer leaves the user's workflow untouched. A capability's contract states what it accepts, what it returns, how it fails, and which permissions it needs.

A seam has a cost. Draw one around a decision likely to change (provider, renderer, storage); everything else stays a plain function until it earns a contract. For deep-module vocabulary, load the `codebase-design` skill.

### 4. Portfolio over sprawl

Build more products, fewer features. Extend an existing product when the customer, context, and outcome match. Start a new one when the job, audience, interaction, permissions, or operating requirements differ materially. Each product carries overhead (maintenance, and remembering which tool to reach for); keep it low with shared conventions: repo layout, verification pattern, data formats. Extract a shared capability when a second product needs it. Merge or retire products that no longer earn a separate existence.

### 5. Code or model

Label each capability. When input, rules, and expected output are defined, it is **code**: direct and testable. When it interprets a request, extracts meaning from varied documents, or adapts a plan to incomplete information, it is a **model**. Orchestration is a capability too: a known sequence and routing are code; choosing the next action by judgment is a model. One experience can combine both.

## Steps

1. **Scan the portfolio.** List sibling projects (the parent of the current repo, or the workspace root) and installed skills, then read the README or description of the closest few. Done when you can name the closest existing match and give a verdict (extend, new, merge, or retire) with the principle-4 dimension that decides it. On extend, the brief scopes the change inside that project.
2. **Draft, then interview the gaps.** Fill every template section from the argument, the conversation, and the scan. Ask only what remains open, in one `AskUserQuestion` round with the recommended option first. Where an answer breaks a principle, push back and name the principle. Done when each section holds content the user stated or accepted.
3. **Subtraction pass.** Run the four questions over every feature, step, decision, capability, and seam in the draft. Done when each item has survived a question or sits under Cut with the question that removed it.
4. **Write `BRIEF.md`** at the target project's root; for a new project, confirm the folder name first. Show the user the job line, the verdict, and the cut list. Done when the user accepts or corrections are applied.

## Template

```markdown
# <Name>

**Job:** <start state> → <result the user can rely on>
**Owned exceptions:** <edge cases the result must handle>
**For:** <who> | **Not for:** <who>

## Portfolio

<extend | new | merge | retire>: <closest existing project>. <dimension that decides it>.

## Experience (outside)

- Activity: <the one thing the user does>
- Defaults: <decisions the product makes, and from what: context, policy, or default>
- Kept decisions: <decisions left to the user, each with its consequence>

## Capabilities (inside)

| Capability | Code or model | Accepts | Returns | Fails how | Permissions | Hides decision |
| ---------- | ------------- | ------- | ------- | --------- | ----------- | -------------- |

## Cut

- <feature, step, or decision>: <question that removed it>

## Non-goals

- <outside the boundary>

## Done when

- Smallest complete slice: <the whole job, end to end, for the narrowest case>
- Measure: <completion, errors, steps still done by hand>

## First verifiable step

<one check that goes red now and green when the slice works>
```
