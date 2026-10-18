import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parse } from "yaml";

type Manifest = {
  repo: string;
  path: string;
  commit: string;
  tags: string[];
  merge_guidance?: string;
  /** Local path in the skill folder, mapped to an upstream path outside `path`. */
  extra_files?: Record<string, string>;
};

type GitOptions = { env?: Record<string, string>; input?: string };

function git(cwd: string, args: string[], { env = {}, input = "" }: GitOptions = {}) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
    input,
    stdio: "pipe",
  }).trim();
}

const requiredStrings = ["repo", "path", "commit", "author", "license"] as const;

function validateManifest(file: string, data: unknown): Manifest {
  const fields = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  const isText = (value: unknown) => typeof value === "string" && value.trim() !== "";
  for (const key of requiredStrings) {
    if (!isText(fields[key])) throw new Error(`${file}: ${key} must be a non-empty string`);
  }
  const { tags, merge_guidance, extra_files } = fields;
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) {
    throw new Error(`${file}: tags must be a list of strings`);
  }
  if (merge_guidance !== undefined && !isText(merge_guidance)) {
    throw new Error(`${file}: merge_guidance must be a non-empty string`);
  }
  const isPathMap = (value: unknown) =>
    typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every(isText);
  if (extra_files !== undefined && !isPathMap(extra_files)) {
    throw new Error(`${file}: extra_files must map local paths to upstream paths`);
  }
  return fields as Manifest;
}

function readManifests(root: string) {
  const manifests = new Map<string, Manifest>();
  for (const file of readdirSync(join(root, "upstream")).filter((file) => file.endsWith(".yaml"))) {
    const relative = `upstream/${file}`;
    const data = parse(readFileSync(join(root, relative), "utf8"));
    manifests.set(basename(file, ".yaml"), validateManifest(relative, data));
  }
  return manifests;
}

function select(manifests: Map<string, Manifest>, names: string[], tags: string[], all: boolean) {
  if (all) {
    if (names.length > 0 || tags.length > 0) {
      throw new Error("--all cannot be combined with skill names or --tag");
    }
    return [...manifests.keys()].sort();
  }
  if (names.length === 0 && tags.length === 0) {
    throw new Error("select skills by name, --tag, or --all");
  }
  for (const name of names) {
    if (!manifests.has(name)) throw new Error(`no manifest at upstream/${name}.yaml`);
  }
  const selected = new Set(names);
  for (const tag of tags) {
    const tagged = [...manifests].filter(([, manifest]) => manifest.tags.includes(tag));
    if (tagged.length === 0) throw new Error(`no skill has tag: ${tag}`);
    for (const [name] of tagged) selected.add(name);
  }
  return [...selected].sort();
}

type Clone = { dir: string; head: string };

type Skill = {
  name: string;
  manifest: Manifest;
  clone: Clone;
  /** Tree-ish of the skill folder at the pinned commit, upstream HEAD, and in this repo. */
  pinnedTree: string;
  headTree: string | null;
  localTree: string;
  /** The upstream path that is gone at HEAD, when headTree is null. */
  missingPath: string;
};

function treeExists(clone: string, treeish: string) {
  try {
    git(clone, ["cat-file", "-e", treeish]);
    return true;
  } catch {
    return false;
  }
}

function cloneRepo(temp: string, repo: string, index: number): Clone {
  const dir = join(temp, `clone-${index}`);
  // A blob fetch ends in detached auto maintenance, which would write into the clone while main deletes it.
  const options = ["--quiet", "--no-checkout", "--filter=blob:none", "--config", "maintenance.auto=false"];
  git(temp, ["clone", ...options, repo, dir]);
  return { dir, head: git(dir, ["rev-parse", "HEAD"]) };
}

function inspectSkill(root: string, temp: string, name: string, manifest: Manifest, clone: Clone): Skill {
  // Hash the local skill folder into the clone's object store so all three trees diff alike.
  const skillDir = resolve(root, "skills", name);
  const localEnv = { GIT_INDEX_FILE: join(temp, `${name}.index`) };
  const gitDir = join(clone.dir, ".git");
  git(skillDir, ["--git-dir", gitDir, "--work-tree", skillDir, "add", "--all"], { env: localEnv });
  const localTree = git(skillDir, ["--git-dir", gitDir, "write-tree"], { env: localEnv });

  const pinned = upstreamTree(temp, `${name}.pinned`, manifest, clone, manifest.commit);
  const head = upstreamTree(temp, `${name}.head`, manifest, clone, clone.head);
  return {
    name,
    manifest,
    clone,
    pinnedTree: pinned.tree ?? `${manifest.commit}:${manifest.path}`,
    headTree: head.tree,
    localTree,
    missingPath: head.missingPath,
  };
}

/** The skill folder at `commit`, with each extra file laid over it at its local path. */
function upstreamTree(temp: string, label: string, manifest: Manifest, clone: Clone, commit: string) {
  const folder = `${commit}:${manifest.path}`;
  if (!treeExists(clone.dir, folder)) return { tree: null, missingPath: manifest.path };
  const extras = Object.entries(manifest.extra_files ?? {});
  if (extras.length === 0) return { tree: folder, missingPath: manifest.path };

  const env = { GIT_INDEX_FILE: join(temp, `${label}.index`) };
  git(clone.dir, ["read-tree", folder], { env });
  for (const [localPath, upstreamPath] of extras) {
    // ls-tree reads trees only, so the partial clone fetches no blob here.
    const entry = git(clone.dir, ["ls-tree", commit, "--", upstreamPath]);
    if (entry === "") return { tree: null, missingPath: upstreamPath };
    const [mode = "", , sha = ""] = entry.split(/\s+/);
    git(clone.dir, ["update-index", "--add", "--cacheinfo", `${mode},${sha},${localPath}`], { env });
  }
  return { tree: git(clone.dir, ["write-tree", "--missing-ok"], { env }), missingPath: manifest.path };
}

/** A lazy fetch from diff would cost a round trip per skill. */
function fetchBlobs(skills: Skill[], blobTrees: NonNullable<Command["blobTrees"]>) {
  for (const [clone, cloneSkills] of Map.groupBy(skills, (skill) => skill.clone)) {
    const trees = cloneSkills.flatMap(blobTrees).filter((tree) => tree !== null);
    const objects = git(clone.dir, ["rev-list", "--objects", "--missing=print", ...trees]).split("\n");
    const missing = objects.filter((line) => line.startsWith("?")).map((line) => line.slice(1));
    if (missing.length === 0) continue;
    // The flags git itself passes for a lazy fetch, less the filter, which the clone's config supplies.
    const options = ["--no-tags", "--no-write-fetch-head", "--recurse-submodules=no"];
    const input = missing.join("\n");
    git(clone.dir, ["-c", "fetch.negotiationAlgorithm=noop", "fetch", ...options, "--stdin", "origin"], { input });
  }
}

function diffTrees(skill: Skill, from: string, to: string, ...options: string[]) {
  return git(skill.clone.dir, ["diff", "--no-color", "--no-ext-diff", ...options, from, to]);
}

function countFiles(skill: Skill, from: string, to: string) {
  const output = diffTrees(skill, from, to, "--name-only");
  return output === "" ? 0 : output.split("\n").length;
}

function missingNote(skill: Skill) {
  return `${skill.missingPath} not found at HEAD`;
}

function printStatus(skill: Skill) {
  if (skill.headTree === null) {
    console.log(`${skill.name}: missing upstream (${missingNote(skill)})`);
    return;
  }
  const upstreamCount = countFiles(skill, skill.pinnedTree, skill.headTree);
  const localCount = countFiles(skill, skill.pinnedTree, skill.localTree);
  const state = upstreamCount === 0 ? "up to date" : "changed upstream";
  console.log(`${skill.name}: ${state} (upstream ${upstreamCount} files, local ${localCount} files)`);
}

function printSource(skill: Skill) {
  console.log(`== ${skill.name}`);
  console.log(`repo: ${skill.manifest.repo}`);
  console.log(`path: ${skill.manifest.path}`);
}

function printSection(skill: Skill, title: string, from: string | null, to: string | null) {
  console.log(`-- ${title}`);
  console.log(from === null || to === null ? `(${missingNote(skill)})` : diffTrees(skill, from, to) || "(none)");
}

function printDiff(skill: Skill) {
  const { manifest } = skill;
  printSource(skill);
  console.log(`commit: ${manifest.commit}`);
  console.log(`head: ${skill.clone.head}`);
  if (manifest.merge_guidance !== undefined) {
    console.log(`merge_guidance:\n${manifest.merge_guidance.trimEnd()}`);
  }
  printSection(skill, "upstream changes (commit..head)", skill.pinnedTree, skill.headTree);
  printSection(skill, `local edits (commit..skills/${skill.name})`, skill.pinnedTree, skill.localTree);
}

function printVerbatimDiff(skill: Skill) {
  printSource(skill);
  console.log(`head: ${skill.clone.head}`);
  printSection(skill, `verbatim (head..skills/${skill.name})`, skill.headTree, skill.localTree);
}

type Command = {
  print: (skill: Skill) => void;
  /** Upstream trees whose blobs print reads. */
  blobTrees?: (skill: Skill) => (string | null)[];
  /** Verbatim drops merge_guidance, so it is limited to skills the caller names one by one. */
  namesOnly?: boolean;
};

const commands: Record<string, Command> = {
  status: { print: printStatus },
  diff: { print: printDiff, blobTrees: (skill) => [skill.pinnedTree, skill.headTree] },
  verbatim: { print: printVerbatimDiff, blobTrees: (skill) => [skill.headTree], namesOnly: true },
};

function main(args: string[]) {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      tag: { type: "string", multiple: true, default: [] },
      all: { type: "boolean", default: false },
    },
  });
  const [command = "", ...names] = positionals;
  const { print, blobTrees, namesOnly = false } = commands[command] ?? {};
  if (print === undefined) throw new Error(`unknown command: ${command}`);
  if (namesOnly) {
    if (values.all || values.tag.length > 0) throw new Error(`${command} takes skill names only`);
    if (names.length === 0) throw new Error(`${command} needs at least one skill name`);
  }
  const root = process.cwd();
  const manifests = readManifests(root);
  const selected = select(manifests, names, values.tag, values.all);

  // One clone per repo, so every skill from that repo is compared against the same HEAD.
  const temp = mkdtempSync(join(tmpdir(), "upstream-diff-"));
  try {
    const clones = new Map<string, Clone>();
    const skills = selected.map((name) => {
      const manifest = manifests.get(name)!;
      let clone = clones.get(manifest.repo);
      if (clone === undefined) {
        clone = cloneRepo(temp, manifest.repo, clones.size);
        clones.set(manifest.repo, clone);
      }
      return inspectSkill(root, temp, name, manifest, clone);
    });
    if (blobTrees !== undefined) fetchBlobs(skills, blobTrees);
    for (const skill of skills) print(skill);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
