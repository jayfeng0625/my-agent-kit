import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const skills = join(import.meta.dirname, "../../skills");
const notTaskModes = new Set(["poteto-mode", "afk-mode"]);

const taskModes = readdirSync(skills).filter(
  (name) => name.endsWith("-mode") && !notTaskModes.has(name),
);

test("at least one task mode exists", () => {
  assert.ok(taskModes.length > 0);
});

for (const mode of taskModes) {
  const body = readFileSync(join(skills, mode, "SKILL.md"), "utf8").replace(/^```[\s\S]*?^```/gm, "");

  test(`${mode} ends with ## Verify`, () => {
    const headings = body.match(/^## .+$/gm) ?? [];
    assert.equal(headings.at(-1), "## Verify");
  });

  test(`${mode} opens by reading mode-core`, () => {
    const paragraphs = body.replace(/^---\n[\s\S]*?\n---\n/, "").split(/\n\s*\n/);
    const opening = paragraphs.find((paragraph) => paragraph.trim() && !paragraph.trimStart().startsWith("#"));
    assert.match(opening ?? "", /^Read `~\/\.claude\/references\/mode-core\.md`/);
  });

  test(`${mode} names only playbooks that exist`, () => {
    const named = (text: string) => [...text.matchAll(/`(playbooks\/[\w-]+\.md)`/g)].map((match) => match[1] ?? "");
    assert.ok(named(body).length > 0);
    const playbooks = join(skills, mode, "playbooks");
    const texts = [body, ...readdirSync(playbooks).map((name) => readFileSync(join(playbooks, name), "utf8"))];
    for (const path of texts.flatMap(named)) {
      assert.ok(existsSync(join(skills, mode, path)), path);
    }
  });
}
