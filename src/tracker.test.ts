import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import * as kit from "./index.ts";
import { brief, checkTicketTracker, github, gitlab, local, toTickets, type TicketTracker } from "./index.ts";

const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const exportName = (folder: string) => folder.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
const skills = kit as unknown as Record<string, (context?: { ticketTracker: TicketTracker }) => string>;

const thisRepo: TicketTracker = {
  name: "this repo's docs/agents",
  issueTracker: read("docs/agents/issue-tracker.md"),
  triageLabels: read("docs/agents/triage-labels.md"),
};

for (const tracker of [github(), gitlab(), local(), thisRepo]) {
  test(`${tracker.name} has everything the skills call on`, () => {
    assert.deepEqual(checkTicketTracker(tracker), []);
  });
}

test("a tracker with a section missing is told which one", () => {
  const issueTracker = github().issueTracker.replace('## When a skill says "fetch the relevant ticket"', "## Reading");
  assert.deepEqual(checkTicketTracker({ ...github(), issueTracker }), [
    'issueTracker lacks the section ## When a skill says "fetch the relevant ticket"',
  ]);
});

test("a tracker with a wayfinding operation missing is told which one", () => {
  const issueTracker = github().issueTracker.replace("- **Claim**", "- **Take**");
  assert.deepEqual(checkTicketTracker({ ...github(), issueTracker }), ["Wayfinding operations lacks Claim"]);
});

test("a tracker with a triage role missing is told which one", () => {
  const triageLabels = github().triageLabels.replaceAll("wontfix", "rejected");
  assert.deepEqual(checkTicketTracker({ ...github(), triageLabels }), ["triageLabels lacks the role wontfix"]);
});

test("a skill given a tracker ends with the tracker's two documents, in order", () => {
  const tracker = github();
  const expected = [toTickets().trimEnd(), tracker.issueTracker.trim(), tracker.triageLabels.trim()].join("\n\n---\n\n");
  assert.equal(toTickets({ ticketTracker: tracker }), `${expected}\n`);
});

test("a skill refuses a tracker that lacks what the skills call on", () => {
  // @ts-expect-error a tracker carries both documents
  const incomplete: TicketTracker = { name: "half a tracker", issueTracker: github().issueTracker };
  assert.throws(() => toTickets({ ticketTracker: incomplete }), /ticket tracker half a tracker: triageLabels lacks the role needs-triage/);
});

test("a skill that names no tracker takes none", () => {
  // @ts-expect-error brief declares no context
  assert.throws(() => brief({ ticketTracker: github() }), /brief takes no ticketTracker/);
});

for (const folder of readdirSync(join(root, "skills")).sort()) {
  const saysProvided = /should have been provided to you/.test(read(`skills/${folder}/SKILL.md`));
  test(`${folder} ${saysProvided ? "takes" : "takes no"} ticket tracker, as its text says`, () => {
    const render = () => skills[exportName(folder)]?.({ ticketTracker: github() });
    if (saysProvided) assert.match(render() ?? "", /# Issue tracker: GitHub/);
    else assert.throws(render, new RegExp(`${folder} takes no ticketTracker`));
  });
}
