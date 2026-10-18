# my-agent-kit

Agent skills, and the global Claude Code setup that goes with them.

## What's in the repo

- `skills/`: 70 skills. Each one installs through the [skills CLI](https://github.com/vercel-labs/skills) for Claude Code, Codex, and other agents.
- `global/`: the files that link into `~/.claude/`.
	- `CLAUDE.md`: the output rule and ways of working that load in every session.
	- `references/read-before-implementation.md`: the red, green, review, refactor, and scope steps to follow before implementing.
	- `pstack-models.md`: the model and effort for each subagent role that the `how` and `why` skills spawn.
	- `agents/`: links to the subagents that skills spawn by type (`comment-sicko`, `poteto-agent`).
- `upstream/`: one manifest per skill pulled from another repo. A manifest records the source repo and the commit the skill was last merged from. Some also carry merge guidance: the local changes that the next merge must keep.

To check the skill count, run `ls skills | wc -l`.

## Install the skills

```sh
npx skills add jayfeng0625/my-agent-kit -g
```

The CLI asks which skills and agents to install. To install every skill with no prompts, add `-s '*' -y`.

To get changes after they merge, run `npx skills update -g`.

## Link the global files

If `~/.claude/` already has a `CLAUDE.md`, `references/`, `pstack-models.md`, or `agents/`, move it out first. `ln -sfn` replaces a file at the link path, and puts the link inside a directory that is already there.

Clone the repo, then link its `global/` files into `~/.claude/`:

```sh
git clone git@github.com:jayfeng0625/my-agent-kit.git ~/D/my-agent-kit
for f in CLAUDE.md references pstack-models.md agents; do ln -sfn ~/D/my-agent-kit/global/$f ~/.claude/$f; done
```

Restart Claude Code to load the new `CLAUDE.md` and subagents. The links point at the clone, so keep it on `main`.

## Change a skill

`AGENTS.md` has the rules: the skill folder standard, the manifest format, and the writing rules.

- To merge new upstream changes into pulled skills, run `/sync-upstream --all` in Claude Code from the repo root. To merge only some skills, pass their names or `--tag <tag>`.
- Before you commit, run `npm test` and `npm run typecheck`. Run `npm install` once first.

## Credits

Most skills come from other repos. Each pulled skill keeps its upstream `LICENSE`, and its manifest names the author.

- [mattpocock/skills](https://github.com/mattpocock/skills), by Matt Pocock: 23 skills.
- [cursor/plugins](https://github.com/cursor/plugins): 41 pstack skills by Lauren Tan, and 3 cursor-team-kit skills by Eric Zakariasson.
- [lisbeth718/agent-setup](https://github.com/lisbeth718/agent-setup), by Mari Luukkainen: the `brief` skill. The output rule and em-dash line in `global/CLAUDE.md`, and `global/references/read-before-implementation.md`, adapt the same repo.

`mod-it` and `pr` are local skills.

## License

MIT. See [`LICENSE`](LICENSE), which also carries the lisbeth718/agent-setup notice for the two adapted `global/` files.
