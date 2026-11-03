#!/usr/bin/env node
// The local issue tracker. See docs/agents/issue-tracker.md.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const STATUSES = ["Backlog", "needs-info", "ready-for-agent", "ready-for-human", "In Progress", "Ready For Human Review", "Done", "wontfix"];

const commonDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
  cwd: import.meta.dirname,
  encoding: "utf8",
}).trim();
const repo = dirname(commonDir);
const file = join(dirname(repo), "tracker.json");

function fail(message) {
  console.error(`tracker: ${message}`);
  process.exit(2);
}

// The tracker starts from the ticket files on the base branch.
function seed() {
  const issues = [];
  const dir = join(repo, "tickets");
  for (const name of existsSync(dir) ? readdirSync(dir).sort() : []) {
    const text = readFileSync(join(dir, name), "utf8");
    const id = name.replace(/\.md$/, "");
    const status = /^Status: (\w+)/m.exec(text)?.[1];
    issues.push({
      id,
      title: /^# (.*)$/m.exec(text)?.[1].replace(`${id}: `, "") ?? id,
      status: status === "done" ? "Done" : status === "in" ? "In Progress" : "Backlog",
      body: text,
      blockedBy: [],
      comments: [],
    });
  }
  return { issues };
}

const db = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : seed();
const save = () => writeFileSync(file, JSON.stringify(db, null, 2) + "\n");
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  const value = argv[i + 1];
  if (value === undefined) fail(`${name} needs a value`);
  argv.splice(i, 2);
  return value;
};
const find = (id) => db.issues.find((x) => x.id === id) ?? fail(`no issue ${id}`);
const status = (s) => (STATUSES.includes(s) ? s : fail(`unknown status: ${s}; run statuses`));
function body() {
  const text = flag("--body");
  const path = flag("--body-file");
  if (text !== undefined) return text;
  if (path !== undefined) return readFileSync(path === "-" ? 0 : path, "utf8");
  fail("needs --body or --body-file");
}

const cmd = argv.shift();
switch (cmd) {
  case "statuses":
    console.log(STATUSES.join("\n"));
    break;
  case "list": {
    const s = flag("--status");
    for (const x of db.issues) if (!s || x.status === s) console.log(`${x.id}\t${x.status}\t${x.title}`);
    break;
  }
  case "show": {
    const x = find(argv[0]);
    console.log(`${x.id}: ${x.title}\nstatus: ${x.status}\nblocked by: ${x.blockedBy.join(", ") || "none"}\n\n${x.body}`);
    for (const c of x.comments) console.log(`\n--- comment ${c.at}\n${c.body}`);
    break;
  }
  case "create": {
    const title = flag("--title") ?? fail("create needs --title");
    const s = status(flag("--status") ?? "Backlog");
    const blockedBy = (flag("--blocked-by") ?? "").split(",").filter(Boolean);
    for (const b of blockedBy) find(b);
    const next = Math.max(0, ...db.issues.map((x) => Number(x.id.replace(/\D/g, "")) || 0)) + 1;
    const issue = { id: `INV-${next}`, title, status: s, body: body(), blockedBy, comments: [] };
    db.issues.push(issue);
    save();
    console.log(issue.id);
    break;
  }
  case "move": {
    const x = find(argv[0]);
    x.status = status(argv[1]);
    save();
    console.log(`${x.id} -> ${x.status}`);
    break;
  }
  case "comment": {
    const x = find(argv.shift());
    x.comments.push({ at: new Date().toISOString(), body: body() });
    save();
    console.log(`commented on ${x.id}`);
    break;
  }
  default:
    fail("usage: list | show <id> | create | move <id> <status> | comment <id> | statuses");
}
