import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import * as kit from "./index.ts";

const root = join(import.meta.dirname, "..");
const folders = readdirSync(join(root, "skills")).sort();
const exportName = (folder: string) => folder.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
const skills = kit as Record<string, () => string>;
const render = (folder: string) => skills[exportName(folder)]?.() ?? "";

test("every skill folder has one export, named for the folder in camelCase", () => {
  assert.deepEqual(Object.keys(kit).sort(), folders.map(exportName).sort());
});

for (const folder of folders) {
  test(`${folder} renders its SKILL.md with only the frontmatter removed`, () => {
    const source = readFileSync(join(root, "skills", folder, "SKILL.md"), "utf8").trimEnd();
    const body = render(folder).split("\n\nThe skill's directory is `")[0]?.trimEnd() ?? "";
    assert.ok(body.length > 0 && source.endsWith(body), "the text is not the tail of SKILL.md");
    const removed = source.slice(0, source.length - body.length);
    assert.match(removed, /^---\n[\s\S]*\n---\n+$/);
    assert.equal(removed.match(/^---$/gm)?.length, 2, "more than the frontmatter was removed");
    assert.ok(removed.includes(`name: ${folder}\n`));
  });
}

test("a skill with supporting files names its directory", () => {
  const directory = render("prototype").match(/The skill's directory is `(.+?)`\./)?.[1] ?? "";
  assert.ok(existsSync(join(directory, "LOGIC.md")), `no LOGIC.md under "${directory}"`);
});

test("a skill with no supporting files names no directory", () => {
  assert.doesNotMatch(render("brief"), /The skill's directory is/);
});

test("a project that links the repo into node_modules imports the skills by package name", (t) => {
  const project = mkdtempSync(join(tmpdir(), "kit-consumer-"));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  mkdirSync(join(project, "node_modules"));
  symlinkSync(root, join(project, "node_modules/my-agent-kit"), "dir");
  writeFileSync(join(project, "main.mjs"), 'import { toTickets } from "my-agent-kit";\nprocess.stdout.write(toTickets());\n');
  const run = spawnSync(process.execPath, ["main.mjs"], { cwd: project, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, render("to-tickets"));
});
