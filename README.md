# my-agent-kit

Agent skills and a global Claude Code setup, installed together on every machine.

## What's in the repo

- `skills/`: 69 skills. Each one installs through the [skills CLI](https://github.com/vercel-labs/skills) for Claude Code, Codex, and other agents.
- `global/`: the files that link into `~/.claude/`.
	- `CLAUDE.md`: the output rule and ways of working that load in every session.
	- `references/read-before-implementation.md`: the red, green, review, refactor loop.
	- `pstack-models.md`: the model and effort for each subagent role that the `how` and `why` skills spawn.
	- `agents/`: links to the subagents that skills spawn by type (`comment-sicko`, `poteto-agent`).
- `upstream/`: one manifest per skill pulled from another repo. A manifest records the source repo, the commit, and the local changes that the next merge must keep.

To check the skill count, run `ls skills | wc -l`.

## Install the skills

```sh
npx skills add jayfeng0625/my-agent-kit -g
```

To get changes after they merge, run `npx skills update`.

## Link the global files

Clone the repo, then link its `global/` files into `~/.claude/`:

```sh
git clone git@github.com:jayfeng0625/my-agent-kit.git ~/D/my-agent-kit
for f in CLAUDE.md references pstack-models.md agents; do ln -sfn ~/D/my-agent-kit/global/$f ~/.claude/$f; done
```

Restart Claude Code to load the new `CLAUDE.md` and subagents. The links point at the clone, so keep it on `main`.

## Change a skill

`AGENTS.md` has the rules: the skill folder standard, the manifest format, and the writing rules.

- To merge new upstream changes into pulled skills, run `/sync-upstream` in Claude Code from the repo root.
- Before you commit, run `npm test` and `npm run typecheck`.

## Credits

Most skills come from other repos. Each pulled skill keeps its upstream `LICENSE`, and its manifest names the author.

- [mattpocock/skills](https://github.com/mattpocock/skills), by Matt Pocock: 23 skills.
- [cursor/plugins](https://github.com/cursor/plugins): 40 pstack skills by Lauren Tan, and 3 cursor-team-kit skills by Eric Zakariasson.
- [lisbeth718/agent-setup](https://github.com/lisbeth718/agent-setup), by Mari Luukkainen: the `brief` skill. The output rule and em-dash line in `global/CLAUDE.md`, and `global/references/read-before-implementation.md`, adapt the same repo.

`mod-it` and `pr` are local skills.

## License

MIT. See [`LICENSE`](LICENSE), which also carries the lisbeth718/agent-setup notice for the two adapted `global/` files.
