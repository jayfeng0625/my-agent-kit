import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test, type TestContext } from "node:test";
import { pathToFileURL } from "node:url";
import { stringify } from "yaml";

const script = join(import.meta.dirname, "upstream-diff.ts");

const gitEnv = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

type Files = Record<string, string | null>;

function writeFiles(root: string, files: Files) {
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path);
    if (content === null) {
      rmSync(target);
    } else {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
  }
}

function setup(t: TestContext) {
  const base = mkdtempSync(join(tmpdir(), "upstream-diff-"));
  t.after(() => rmSync(base, { recursive: true, force: true }));

  const upstreamDir = join(base, "upstream");
  mkdirSync(upstreamDir);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: upstreamDir, env: gitEnv, encoding: "utf8" }).trim();
  git("init", "--quiet", "--initial-branch=main");
  // Serve partial clones, as GitHub does.
  git("config", "uploadpack.allowFilter", "true");

  const upstream = {
    url: pathToFileURL(upstreamDir).href,
    commit(files: Files) {
      writeFiles(upstreamDir, files);
      git("add", "--all");
      git("commit", "--quiet", "--message=update");
      return git("rev-parse", "HEAD");
    },
  };

  const repoDir = join(base, "repo");
  mkdirSync(repoDir);
  let runs = 0;
  const repo = {
    root: repoDir,
    addSkill(
      name: string,
      manifest: { commit: string; tags?: string[]; mergeGuidance?: string; extraFiles?: Record<string, string> },
      files: Files,
    ) {
      writeFiles(join(repoDir, "skills", name), files);
      this.writeManifest(name, {
        repo: upstream.url,
        path: `skills/${name}`,
        commit: manifest.commit,
        author: "Test Author",
        license: "MIT",
        tags: manifest.tags ?? [],
        merge_guidance: manifest.mergeGuidance,
        extra_files: manifest.extraFiles,
      });
    },
    writeManifest(name: string, fields: Record<string, unknown>) {
      writeFiles(repoDir, { [`upstream/${name}.yaml`]: stringify(fields) });
    },
    run(...args: string[]) {
      const trace = join(base, `git-trace-${runs++}.log`);
      const result = spawnSync(process.execPath, [script, ...args], {
        cwd: repoDir,
        env: { ...gitEnv, GIT_TRACE: trace },
        encoding: "utf8",
      });
      return { ...result, readTrace: () => readFileSync(trace, "utf8") };
    },
  };

  return { upstream, repo };
}

const upToDate = (name: string) => `${name}: up to date (upstream 0 files, local 0 files)\n`;

test("status reports a skill as up to date when upstream has not changed since the pinned commit", (t) => {
  const { upstream, repo } = setup(t);
  const pinned = upstream.commit({ "skills/arena/SKILL.md": "arena v1\n" });
  repo.addSkill("arena", { commit: pinned }, {
    "SKILL.md": "arena v1\n",
  });

  const result = repo.run("status", "arena");

  assert.equal(result.stderr, "");
  assert.equal(result.stdout, upToDate("arena"));
  assert.equal(result.status, 0);
});

const sectionHeader = /^-- .*\n/m;

function sections(stdout: string) {
  const [header = "", upstreamChanges = "", localEdits = ""] = stdout.split(sectionHeader);
  return { header, upstreamChanges, localEdits };
}

test("diff shows upstream changes between the pinned commit and upstream HEAD", (t) => {
  const { upstream, repo } = setup(t);
  const pinned = upstream.commit({ "skills/arena/SKILL.md": "arena v1\n" });
  const head = upstream.commit({ "skills/arena/SKILL.md": "arena v2\n" });
  repo.addSkill("arena", { commit: pinned }, {
    "SKILL.md": "arena v1\n",
  });

  const result = repo.run("diff", "arena");
  const { header, upstreamChanges, localEdits } = sections(result.stdout);

  assert.equal(result.stderr, "");
  assert.match(header, new RegExp(`^head: ${head}$`, "m"));
  assert.doesNotMatch(header, /merge_guidance/);
  assert.match(upstreamChanges, /^diff --git a\/SKILL\.md b\/SKILL\.md$/m);
  assert.match(upstreamChanges, /^-arena v1\n\+arena v2$/m);
  assert.equal(localEdits.trim(), "(none)");
  assert.equal(result.status, 0);
});

test("diff shows local edits against the pinned commit, including nested and local-only files", (t) => {
  const { upstream, repo } = setup(t);
  const pinned = upstream.commit({
    "skills/arena/SKILL.md": "arena v1\n",
    "skills/arena/references/guide.md": "read .cursor/rules\n",
  });
  repo.addSkill("arena", { commit: pinned }, {
    "SKILL.md": "arena v1\n",
    "references/guide.md": "read .claude/rules\n",
    LICENSE: "MIT License\n",
  });

  const result = repo.run("diff", "arena");
  const { upstreamChanges, localEdits } = sections(result.stdout);

  assert.equal(result.stderr, "");
  assert.equal(upstreamChanges.trim(), "(none)");
  assert.match(localEdits, /^diff --git a\/LICENSE b\/LICENSE\nnew file mode/m);
  assert.match(localEdits, /^-read \.cursor\/rules\n\+read \.claude\/rules$/m);
  assert.doesNotMatch(localEdits, /SKILL\.md/);
  assert.equal(result.status, 0);
});

test("diff prints the manifest's merge guidance ahead of the diffs", (t) => {
  const { upstream, repo } = setup(t);
  const pinned = upstream.commit({ "skills/arena/SKILL.md": "arena v1\n" });
  repo.addSkill("arena", {
    commit: pinned,
    mergeGuidance: "Keep the local .claude/ paths.\nDrop Grok model slugs.\n",
  }, { "SKILL.md": "arena v1\n" });

  const result = repo.run("diff", "arena");
  const { header } = sections(result.stdout);

  assert.equal(result.stderr, "");
  assert.match(header, /^merge_guidance:\nKeep the local \.claude\/ paths\.\nDrop Grok model slugs\.\n$/m);
  assert.equal(result.status, 0);
});

test("a skill whose path is gone at upstream HEAD is reported as missing upstream", (t) => {
  const { upstream, repo } = setup(t);
  const pinned = upstream.commit({ "skills/arena/SKILL.md": "arena v1\n", "README.md": "x\n" });
  upstream.commit({ "skills/arena/SKILL.md": null });
  repo.addSkill("arena", { commit: pinned }, {
    "SKILL.md": "arena v1\n",
  });

  const status = repo.run("status", "arena");
  const diff = repo.run("diff", "arena");

  assert.equal(status.stderr, "");
  assert.equal(status.stdout, "arena: missing upstream (skills/arena not found at HEAD)\n");
  assert.equal(status.status, 0);
  assert.equal(diff.stderr, "");
  assert.equal(sections(diff.stdout).upstreamChanges.trim(), "(skills/arena not found at HEAD)");
  assert.equal(diff.status, 0);
});

test("extra_files compares upstream files outside the skill path at their local paths", (t) => {
  const { upstream, repo } = setup(t);
  const pinned = upstream.commit({ "skills/arena/SKILL.md": "arena v1\n", "agents/sicko.md": "sicko v1\n" });
  upstream.commit({ "agents/sicko.md": "sicko v2\n" });
  repo.addSkill("arena", { commit: pinned, extraFiles: { "subagents/sicko.md": "agents/sicko.md" } }, {
    "SKILL.md": "arena v1\n",
    "subagents/sicko.md": "sicko v1\n",
  });

  const status = repo.run("status", "arena");
  const diff = repo.run("diff", "arena");
  const { upstreamChanges, localEdits } = sections(diff.stdout);

  assert.equal(status.stderr, "");
  assert.equal(status.stdout, "arena: changed upstream (upstream 1 files, local 0 files)\n");
  assert.equal(diff.stderr, "");
  assert.match(upstreamChanges, /^diff --git a\/subagents\/sicko\.md b\/subagents\/sicko\.md$/m);
  assert.match(upstreamChanges, /^-sicko v1\n\+sicko v2$/m);
  assert.equal(localEdits.trim(), "(none)");
  assert.equal(diff.status, 0);
});

test("a skill whose extra file is gone at upstream HEAD is reported as missing upstream", (t) => {
  const { upstream, repo } = setup(t);
  const pinned = upstream.commit({ "skills/arena/SKILL.md": "arena v1\n", "agents/sicko.md": "sicko v1\n" });
  upstream.commit({ "agents/sicko.md": null });
  repo.addSkill("arena", { commit: pinned, extraFiles: { "subagents/sicko.md": "agents/sicko.md" } }, {
    "SKILL.md": "arena v1\n",
    "subagents/sicko.md": "sicko v1\n",
  });

  const status = repo.run("status", "arena");

  assert.equal(status.stderr, "");
  assert.equal(status.stdout, "arena: missing upstream (agents/sicko.md not found at HEAD)\n");
  assert.equal(status.status, 0);
});

test("a blob fetch into the clone starts no background maintenance", (t) => {
  const { upstream, repo } = setup(t);
  const pinned = upstream.commit({ "skills/arena/SKILL.md": "arena v1\n" });
  upstream.commit({ "skills/arena/SKILL.md": "arena v2\n" });
  repo.addSkill("arena", { commit: pinned }, {
    "SKILL.md": "arena v1\n",
  });

  const result = repo.run("diff", "arena");
  const log = result.readTrace();

  assert.equal(result.status, 0);
  assert.match(log, /built-in: git fetch /);
  assert.doesNotMatch(log, /git maintenance run/);
});

test("diff fetches the blobs for every skill from one upstream in a single fetch", (t) => {
  const { upstream, repo } = setup(t);
  const pinned = upstream.commit({ "skills/arena/SKILL.md": "arena v1\n", "skills/how/SKILL.md": "how v1\n" });
  upstream.commit({ "skills/arena/SKILL.md": "arena v2\n", "skills/how/SKILL.md": "how v2\n" });
  repo.addSkill("arena", { commit: pinned }, { "SKILL.md": "arena v1\n" });
  repo.addSkill("how", { commit: pinned }, { "SKILL.md": "how v1\n" });

  const result = repo.run("diff", "arena", "how");
  const fetches = result.readTrace().match(/built-in: git fetch /g) ?? [];

  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^-arena v1\n\+arena v2$/m);
  assert.match(result.stdout, /^-how v1\n\+how v2$/m);
  assert.equal(fetches.length, 1);
  assert.equal(result.status, 0);
});

function addThreeSkills(t: TestContext) {
  const fixture = setup(t);
  const pinned = fixture.upstream.commit({
    "skills/arena/SKILL.md": "arena\n",
    "skills/how/SKILL.md": "how\n",
    "skills/tdd/SKILL.md": "tdd\n",
  });
  const add = (name: string, tags: string[]) =>
    fixture.repo.addSkill(name, { commit: pinned, tags }, {
      "SKILL.md": `${name}\n`,
    });
  add("arena", ["pstack", "verifiers"]);
  add("how", ["pstack"]);
  add("tdd", ["testing"]);
  return fixture;
}

test("names and repeated --tag flags select every skill matching any of them, in name order", (t) => {
  const { repo } = addThreeSkills(t);

  const result = repo.run("status", "tdd", "--tag", "verifiers", "--tag", "pstack");

  assert.equal(result.stderr, "");
  assert.equal(result.stdout, upToDate("arena") + upToDate("how") + upToDate("tdd"));
  assert.equal(result.status, 0);
});

test("--tag selects only the skills carrying that tag", (t) => {
  const { repo } = addThreeSkills(t);

  const result = repo.run("status", "--tag", "verifiers");

  assert.equal(result.stdout, upToDate("arena"));
  assert.equal(result.status, 0);
});

test("--all selects every skill with a manifest", (t) => {
  const { repo } = addThreeSkills(t);

  const result = repo.run("status", "--all");

  assert.equal(result.stderr, "");
  assert.equal(result.stdout, upToDate("arena") + upToDate("how") + upToDate("tdd"));
  assert.equal(result.status, 0);
});

test("--all combined with names or tags is rejected", (t) => {
  const { repo } = addThreeSkills(t);

  const result = repo.run("status", "--all", "--tag", "pstack");

  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "error: --all cannot be combined with skill names or --tag\n");
  assert.equal(result.status, 1);
});

const validFields = { repo: "x", path: "skills/arena", commit: "abc", author: "A", license: "MIT", tags: [] };

for (const { title, fields, error } of [
  {
    title: "a missing required key",
    fields: { ...validFields, commit: undefined },
    error: "upstream/arena.yaml: commit must be a non-empty string",
  },
  {
    title: "tags that are not a list of strings",
    fields: { ...validFields, tags: "pstack" },
    error: "upstream/arena.yaml: tags must be a list of strings",
  },
  {
    title: "merge guidance that is not a string",
    fields: { ...validFields, merge_guidance: ["a"] },
    error: "upstream/arena.yaml: merge_guidance must be a non-empty string",
  },
  {
    title: "extra files that are not a map of paths",
    fields: { ...validFields, extra_files: ["agents/sicko.md"] },
    error: "upstream/arena.yaml: extra_files must map local paths to upstream paths",
  },
]) {
  test(`a manifest with ${title} is rejected`, (t) => {
    const { repo } = setup(t);
    repo.writeManifest("arena", fields);

    const result = repo.run("status", "arena");

    assert.equal(result.stdout, "");
    assert.equal(result.stderr, `error: ${error}\n`);
    assert.equal(result.status, 1);
  });
}

for (const { title, args, error } of [
  {
    title: "a name without a manifest",
    args: ["status", "arena", "nope"],
    error: "no manifest at upstream/nope.yaml",
  },
  {
    title: "a tag no skill carries",
    args: ["status", "--tag", "pstack", "--tag", "nope"],
    error: "no skill has tag: nope",
  },
  { title: "an empty selection", args: ["status"], error: "select skills by name, --tag, or --all" },
  { title: "verbatim with --all", args: ["verbatim", "--all"], error: "verbatim takes skill names only" },
  {
    title: "verbatim with --tag",
    args: ["verbatim", "arena", "--tag", "pstack"],
    error: "verbatim takes skill names only",
  },
  { title: "verbatim with no skill names", args: ["verbatim"], error: "verbatim needs at least one skill name" },
]) {
  test(`${title} is rejected before any upstream is fetched`, (t) => {
    const { repo } = addThreeSkills(t);

    const result = repo.run(...args);

    assert.equal(result.stdout, "");
    assert.equal(result.stderr, `error: ${error}\n`);
    assert.equal(result.status, 1);
  });
}

function runVerbatimOnEditedArena(t: TestContext) {
  const { upstream, repo } = setup(t);
  const pinned = upstream.commit({ "skills/arena/SKILL.md": "arena v1\n" });
  const head = upstream.commit({ "skills/arena/SKILL.md": "arena v2\n" });
  repo.addSkill("arena", {
    commit: pinned,
    mergeGuidance: "Keep the local .claude/ paths.\n",
  }, { "SKILL.md": "arena local\n", LICENSE: "MIT License\n" });

  const result = repo.run("verbatim", "arena");
  const [header = "", ...diffs] = result.stdout.split(sectionHeader);
  return { head, result, header, diffs };
}

test("verbatim prints one diff from upstream HEAD to the local folder", (t) => {
  const { head, result, header, diffs } = runVerbatimOnEditedArena(t);

  assert.equal(result.stderr, "");
  assert.match(header, new RegExp(`^head: ${head}$`, "m"));
  assert.equal(diffs.length, 1);
  assert.match(diffs[0]!, /^-arena v2\n\+arena local$/m);
  assert.match(diffs[0]!, /^diff --git a\/LICENSE b\/LICENSE\nnew file mode/m);
  assert.equal(result.status, 0);
});

test("verbatim omits merge guidance and the pinned commit", (t) => {
  const { header } = runVerbatimOnEditedArena(t);

  assert.doesNotMatch(header, /merge_guidance|^commit:/m);
});

test("verbatim reports a skill whose path is gone at upstream HEAD", (t) => {
  const { upstream, repo } = setup(t);
  const pinned = upstream.commit({ "skills/arena/SKILL.md": "arena v1\n", "README.md": "x\n" });
  upstream.commit({ "skills/arena/SKILL.md": null });
  repo.addSkill("arena", { commit: pinned }, {
    "SKILL.md": "arena v1\n",
  });

  const result = repo.run("verbatim", "arena");

  assert.equal(result.stderr, "");
  assert.equal(result.stdout.split(sectionHeader)[1]?.trim(), "(skills/arena not found at HEAD)");
  assert.equal(result.status, 0);
});
