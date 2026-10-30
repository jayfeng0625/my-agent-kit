import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const checker = join(import.meta.dirname, "../../skills/dark-factory-mode/scripts/check-plan.mjs");
const rule =
  "Tests alone are not sufficient verification. A ticket is verified only when its unit, live, and perf boxes are all checked.";

const lanes = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    i === 0
      ? "- [ ] Lane 1. Regression lane against trunk. Save `lane-1.png`. Pass when evidence exists."
      : `- [ ] Lane ${i + 1}. Save \`lane-${i + 1}.png\`. Pass when evidence exists.`,
  ).join("\n");

const ticket = (live = `${rule} 2 lanes on \`example-model\` at the ticket head.\n${lanes(2)}`) => `**Depends on.** None.
**Files.**
- [ ] Do the thing.
**Build.**
- [ ] Do the thing.
**You see.**
- [ ] Do the thing.
**Verify, unit.** ${rule}
- [ ] Check the thing.
**Verify, live.** ${live}
**Verify, perf.** ${rule}
- [ ] Metric. Recorded.
- [ ] Probe. Recorded.
- [ ] Baseline. Recorded.
- [ ] Rule. Recorded.
**Review gate.** None.
**Land.**
- [ ] Land when verified.
`;

const plan = (body = ticket()) => `# Demo

## How to read this
One box is one unit of work and names the evidence. Check a box only when its evidence exists. See playbooks/.
${rule}

## Program checklist
### Arm the program
### Tickets
### Verdict
### Boot recipe
Re-read them at every tick

## Ticket 1
${body}
## Close the program
Close.

## Appendix Prototype evidence
Recorded.
`;

const check = (text: string, expectedExit: number, mode: string[] = []) => {
  const directory = mkdtempSync(join(tmpdir(), "check-plan-test-"));
  const file = join(directory, "plan.md");
  writeFileSync(file, text);
  try {
    const result = spawnSync(process.execPath, [checker, ...mode, file], { encoding: "utf8" });
    assert.equal(result.status, expectedExit, result.stdout + result.stderr);
    return result;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

test("accepts the minimal plan", () => {
  check(plan(), 0);
});

test("accepts ordinary, indented, and longer closing fences", () => {
  for (const indent of ["", " ", "  ", "   "]) check(plan() + `${indent}\`\`\`markdown\n## Example only\n${indent}\`\`\`\n`, 0);
  check(plan() + "```markdown\n## Example only\n````\n", 0);
});

test("accepts nested backticks and tilde info strings", () => {
  check(plan() + "````markdown\n```markdown\n## Example only\n```\n````\n", 0);
  check(plan() + "~~~markdown `info`\n## Example only\n ~~~\n", 0);
});

test("keeps mismatched, shorter, and suffixed closers inside the fence", () => {
  check(plan() + "````markdown\n~~~\n## Example only\n````\n", 0);
  check(plan() + "````markdown\n```\n## Example only\n````\n", 0);
  check(plan() + "````markdown\n``` info\n## Example only\n````\n", 0);
});

test("rejects headings and prose outside a proper close", () => {
  for (const suffix of ["  ", "\t"]) {
    const heading = check(plan() + `\`\`\`markdown\n## Example only\n\`\`\`${suffix}\n## Example only\n`, 1);
    assert.match(heading.stderr, /"## Example only" after Close the program is not an appendix/);
  }
  const prose = check(plan() + "```markdown\nThis prose has a mid-sentence colon: inside code\n```\nThis prose has a mid-sentence colon: bad.\n", 1);
  assert.match(prose.stderr, /mid-sentence colon/);
});

test("rejects backtick info strings containing a backtick", () => {
  const result = check(plan() + "```markdown `invalid`\n## Example only\n```\n", 1);
  assert.match(result.stderr, /"## Example only" after Close the program is not an appendix/);
});

test("accepts more lanes than the minimum when the count matches", () => {
  check(plan(ticket(`${rule} 4 lanes on \`example-model\` at the ticket head.\n${lanes(4)}`)), 0);
});

test("rejects fewer than two live lanes", () => {
  const result = check(plan(ticket(`${rule} 1 lanes on \`example-model\` at the ticket head.\n${lanes(1)}`)), 1);
  assert.match(result.stderr, /declares 1 lanes, at least 2 required/);
});

test("rejects a lane count that does not match the boxes", () => {
  const result = check(plan(ticket(`${rule} 3 lanes on \`example-model\` at the ticket head.\n${lanes(2)}`)), 1);
  assert.match(result.stderr, /lanes are \[1,2\], expected 1 to 3/);
});

test("rejects a first lane that is not the regression lane against trunk", () => {
  const live = `${rule} 2 lanes on \`example-model\` at the ticket head.\n${lanes(2).replace("Regression lane against trunk. ", "")}`;
  const result = check(plan(ticket(live)), 1);
  assert.match(result.stderr, /lane 1 is not the regression lane against trunk/);
});

test("rejects a verify block that does not open with the rule", () => {
  const result = check(plan(ticket().replace(`**Verify, unit.** ${rule}`, "**Verify, unit.**")), 1);
  assert.match(result.stderr, /Verify, unit\. does not open with the rule/);
});

test("ticket mode accepts a ticket body", () => {
  const result = check(`## Add the thing\n\n${ticket()}`, 0, ["--ticket"]);
  assert.match(result.stdout, /^Add the thing {2}boxes=/);
});

test("ticket mode rejects a ticket without verify blocks", () => {
  const result = check("## Add the thing\n\nJust do it.\n", 1, ["--ticket"]);
  assert.match(result.stderr, /sub-blocks are \[\]/);
});

test("ticket mode reads stdin", () => {
  const result = spawnSync(process.execPath, [checker, "--ticket", "-"], { input: ticket(), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

test("the Plan playbook's skeleton passes once its lane count and model are filled", () => {
  const playbook = readFileSync(join(import.meta.dirname, "../../skills/dark-factory-mode/playbooks/plan.md"), "utf8");
  const skeleton = playbook.split("````markdown\n")[1]?.split("\n````")[0] ?? "";
  check(skeleton.replace("<N> lanes", "2 lanes").replace("`<swarm workers model>`", "`opus`"), 0);
});
