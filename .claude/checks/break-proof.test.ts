import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";

const script = join(import.meta.dirname, "../../skills/impl-mode/scripts/break-proof.mjs");

const setup = (t: TestContext, content: string) => {
  const dir = mkdtempSync(join(tmpdir(), "break-proof-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "target.txt");
  writeFileSync(file, content);
  return { dir, file };
};

const breakProof = (args: string[], command: string[]) =>
  spawnSync(process.execPath, [script, ...args, "--", ...command], { encoding: "utf-8" });

// Exits 1 when the file holds BROKEN, so a break that applies goes red.
const failsWhenBroken = (file: string) => [
  process.execPath,
  "-e",
  "process.exit(require('fs').readFileSync(process.argv[1], 'utf-8').includes('BROKEN') ? 1 : 0)",
  file,
];

const repeated = "function a() {\n  name: user.name,\n}\nfunction b() {\n  name: user.name,\n}\n";

test("a repeated search fails and names the neighbouring line fix", (t) => {
  const { file } = setup(t, repeated);
  const result = breakProof([file, "  name: user.name,", "  name: BROKEN,"], failsWhenBroken(file));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /matches 2 times/);
  assert.match(result.stderr, /neighbouring line/);
  assert.equal(readFileSync(file, "utf-8"), repeated);
});

test("a table row disambiguates a repeated line with a \\n neighbour", (t) => {
  const { dir, file } = setup(t, repeated);
  const table = join(dir, "breaks.tsv");
  writeFileSync(table, `${file}\tfunction b() {\\n  name: user.name,\tfunction b() {\\n  name: BROKEN,\n`);
  const result = breakProof(["--table", table], failsWhenBroken(file));
  assert.equal(result.status, 0, result.stderr);
  const failed = result.stdout.split("\n").find((line) => line.startsWith("The command failed under the break"));
  assert.ok(failed?.includes(JSON.stringify("function b() {\n  name: user.name,")), result.stdout);
  assert.equal(readFileSync(file, "utf-8"), repeated);
});

test("a table cell keeps \\d literal and decodes \\\\ to one backslash", (t) => {
  const content = "const digits = /\\d+/\nconst text = 'a\\nb'\n";
  const { dir, file } = setup(t, content);
  const table = join(dir, "breaks.tsv");
  writeFileSync(table, `${file}\t/\\d+/\t/BROKEN/\n${file}\t'a\\\\nb'\t'BROKEN'\n`);
  const result = breakProof(["--table", table], failsWhenBroken(file));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(file, "utf-8"), content);
});

test("a table row keeps its file path cell raw", (t) => {
  const { dir } = setup(t, "");
  const file = join(dir, "a\\tb.txt");
  writeFileSync(file, "ok\n");
  const table = join(dir, "breaks.tsv");
  writeFileSync(table, `${file}\tok\tBROKEN\n`);
  const result = breakProof(["--table", table], failsWhenBroken(file));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(file, "utf-8"), "ok\n");
});

test("a table search that misses after decoding names the \\\\ fix", (t) => {
  const content = "x.split('\\n')\n";
  const { dir, file } = setup(t, content);
  const table = join(dir, "breaks.tsv");
  writeFileSync(table, `${file}\t.split('\\n')\t.split(BROKEN)\n`);
  const result = breakProof(["--table", table], failsWhenBroken(file));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /matches 0 times/);
  assert.match(result.stderr, /a literal backslash is written \\\\/);
  assert.equal(readFileSync(file, "utf-8"), content);
});

test("a command-line search that misses gets no table decoding hint", (t) => {
  const { file } = setup(t, "x.split('\\n')\n");
  const result = breakProof([file, "\\d", "BROKEN"], failsWhenBroken(file));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /matches 0 times/);
  assert.doesNotMatch(result.stderr, /a literal backslash is written/);
});
