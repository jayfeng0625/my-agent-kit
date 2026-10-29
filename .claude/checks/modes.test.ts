import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const skills = join(import.meta.dirname, "../../skills");
const notTaskModes = new Set(["poteto-mode", "afk-mode"]);

const taskModes = readdirSync(skills).filter(
  (name) => name.endsWith("-mode") && !notTaskModes.has(name),
);

const read = (mode: string) => readFileSync(join(skills, mode, "SKILL.md"), "utf8").replace(/^```[\s\S]*?^```/gm, "");

const section = (body: string, heading: string) => body.split(/^## /m).find((part) => part.startsWith(`${heading}\n`)) ?? "";

const playbookTexts = (mode: string) => {
  const playbooks = join(skills, mode, "playbooks");
  return readdirSync(playbooks).map((name) => readFileSync(join(playbooks, name), "utf8"));
};

const verifyCount = (mode: string) => section(read(mode), "Verify").match(/^\d+\. /gm)?.length ?? 0;

const numbers = (list: string) => {
  const range = list.match(/^(\d+) to (\d+)$/);
  return range ? [Number(range[1]), Number(range[2])] : [...list.matchAll(/\d+/g)].map((match) => Number(match[0]));
};

test("at least one task mode exists", () => {
  assert.ok(taskModes.length > 0);
});

for (const mode of taskModes) {
  const body = read(mode);
  const texts = [body, ...playbookTexts(mode)];

  test(`${mode} ends with ## Verify`, () => {
    const headings = body.match(/^## .+$/gm) ?? [];
    assert.equal(headings.at(-1), "## Verify");
  });

  test(`${mode} opens by reading mode-core`, () => {
    const paragraphs = body.replace(/^---\n[\s\S]*?\n---\n/, "").split(/\n\s*\n/);
    const opening = paragraphs.find((paragraph) => paragraph.trim() && !paragraph.trimStart().startsWith("#"));
    assert.match(opening ?? "", /^Read `~\/\.claude\/references\/mode-core\.md`/);
  });

  test(`${mode} names how mode-core's Observe forks runs`, () => {
    assert.match(body, /Observe forks/);
  });

  test(`${mode} names only playbooks that exist`, () => {
    const named = (text: string) => [...text.matchAll(/`(playbooks\/[\w-]+\.md)`/g)].map((match) => match[1] ?? "");
    assert.ok(named(body).length > 0);
    for (const path of texts.flatMap(named)) {
      assert.ok(existsSync(join(skills, mode, path)), path);
    }
  });

  test(`${mode} names only triggers it defines`, () => {
    const triggers = new Set(
      [...section(body, "Triggers").matchAll(/\*\*(.+?)\*\*/g)].map((match) => (match[1] ?? "").replace(/\.$/, "")),
    );
    for (const text of texts) {
      for (const match of text.matchAll(/\bthe ((?:[\w`.'-]+ ){0,6}?[\w`.'-]+) trigger\b/g)) {
        const name = (match[1] ?? "").split(/\bthe /).at(-1) ?? "";
        assert.ok(triggers.has(name), `"the ${name} trigger" names no trigger in ${mode}'s Triggers`);
      }
    }
  });

  test(`${mode} names only Verify items that exist`, () => {
    const references = texts.flatMap((text) => [
      ...[...text.matchAll(/\bitems? ([\d, and to]+?) of \*\*Verify\*\*/g)].map((match) => [mode, match]),
      ...[...text.matchAll(/\b([a-z-]+-mode)'s Verify items? ([\d, and to]+\d)/g)].map((match) => [match[1], match]),
    ]) as [string, RegExpMatchArray][];
    for (const [target, match] of references) {
      const list = match.at(-1) ?? "";
      for (const item of numbers(list.trim())) {
        assert.ok(item >= 1 && item <= verifyCount(target), `"${match[0]}" in ${mode}: ${target} has ${verifyCount(target)} Verify items`);
      }
    }
  });
}
