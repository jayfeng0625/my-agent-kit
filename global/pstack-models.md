# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# Entry: `<model> [effort]`. Model: opus, fable, sonnet, or haiku (the Agent tool's `model` values). Effort: low, medium, high, xhigh, or max (its `effort` values). An entry with no effort runs at the session's effort.
# `inherit` as a model: the entry runs on the parent session's model (omit `model`).
# Routing: explorers, investigators and judgment on sonnet; hardest tasks on fable; everything else on opus.
code: opus medium
hardest tasks: fable medium
judgment and prose: sonnet high
fan-out routine: sonnet high
fan-out investigate: opus medium
how explorer: opus low
how explainer: opus medium
why investigators: opus medium
why synthesizer: opus medium
