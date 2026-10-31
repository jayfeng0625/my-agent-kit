### Prototype

**You own the decision; the code is a throwaway instrument.** Speed over polish. The rigor is in picking the right design cheaply. Code quality, planning, tests and abstractions stay out of a sketch: impl-mode's Triggers, Scope and Tests bind the real build only. Propose variations the user did not ask for, and throw an approach away to try another.

1. Scope the decision the prototype makes: which layout, interaction, behavior, timing or approach. With no decision to make, route to Feature.
2. When the design space is open, gather prior art and let the user pick directions before you build.
3. Build in a scratch dir outside production source, with the lightest stack that shows the idea: a static page for a visual question, the smallest script for a behavior or timing question. The **prototype** skill's branches fit a logic or UI question; the scratch dir overrides its rules on where code goes and its throwaway branch (rules 1 and 6).
4. Put alternatives behind one switcher, each variant labeled (**principle-exhaust-the-design-space**).
5. Observe each variant on its surface: screenshots and a driven interaction for a visual decision, logged timing or printed output for a behavioral one.
6. Present the alternatives, tradeoffs and a recommendation. Hand the chosen direction to Feature.

**Reply:** the variants, the evidence for each, your recommendation, and the scratch path, marked throwaway. This playbook skips **Verify**.
