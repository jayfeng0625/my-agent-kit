# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# Entry: `<model> [effort]`. Model: opus, fable, sonnet, or haiku (the Agent tool's `model` values). Effort: low, medium, high, xhigh, or max (its `effort` values). An entry with no effort runs at the session's effort.
# `inherit` as a model: the entry runs on the parent session's model (omit `model`).
# Routing: explorers and investigators on sonnet; everything else on opus.
how explorer: sonnet medium
how explainer: opus medium
why investigators: sonnet medium
why synthesizer: opus medium
