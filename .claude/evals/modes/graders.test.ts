// The graders, with no model: each task's reference fix passes, and doing nothing,
// or a fix that breaks what the task protects, fails.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { buildFixture } from "./fixture/build.ts";
import { type Base, gradeRun, type Task } from "./grade.ts";

const tasks = JSON.parse(readFileSync(join(import.meta.dirname, "tasks.json"), "utf8")) as Task[];
const allMet = (task: Task) => ({
  met: Object.fromEntries((task.judge ?? []).map((f) => [f.id, true])),
  why: {},
});

function fixture(): { repo: string; base: Base } {
  const repo = join(mkdtempSync(join(tmpdir(), "invoicer-check-")), "invoicer");
  buildFixture(repo);
  const rev = (ref: string) => execFileSync("git", ["rev-parse", ref], { cwd: repo, encoding: "utf8" }).trim();
  return { repo, base: { main: rev("main"), taxExempt: rev("tax-exempt") } };
}

const git = (repo: string, ...args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf8" });
function edit(repo: string, file: string, from: string | RegExp, to: string) {
  const path = join(repo, file);
  const text = readFileSync(path, "utf8");
  const next = text.replace(from, to);
  assert.notEqual(next, text, `${file}: edit did not apply`);
  writeFileSync(path, next);
}
function commitOnBranch(repo: string, branch: string, change: () => void) {
  git(repo, "checkout", "-q", "-b", branch, "main");
  change();
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", branch);
  git(repo, "checkout", "-q", "main");
}

function grade(id: string, change?: (repo: string) => void, reply = "") {
  const task = tasks.find((t) => t.id === id);
  assert.ok(task, id);
  const { repo, base } = fixture();
  change?.(repo);
  return gradeRun(task, repo, base, reply, process.env, allMet);
}

const fixes: Record<string, (repo: string) => void> = {
  "t01-impl-csv": (repo) =>
    commitOnBranch(repo, "inv-12", () => {
      writeFileSync(
        join(repo, "src/csv.js"),
        `const money = (c) => (c / 100).toFixed(2);
const field = (s) => (/[",\\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s);
export function renderCsv(totals) {
  const rows = totals.lines.map((l) =>
    [l.sku, l.description, String(l.qty), money(l.unitCents), money(l.discount), money(l.tax), money(l.total)].map(field).join(","));
  return ["sku,description,qty,unit_price,discount,tax,line_total", ...rows].join("\\n") + "\\n";
}
`,
      );
      edit(repo, "src/cli.js", 'import { renderReport } from "./report.js";', 'import { renderReport } from "./report.js";\nimport { renderCsv } from "./csv.js";');
      edit(repo, "src/cli.js", "  console.log(args.includes", '  if (args.includes("--csv")) process.stdout.write(renderCsv(totals));\n  else console.log(args.includes');
    }),
  "t02-impl-refactor": (repo) =>
    commitOnBranch(repo, "one-format", () => {
      edit(repo, "src/report.js", /\nfunction fmt[\s\S]*$/, "\n");
      edit(repo, "src/report.js", "// Plain-text", 'import { formatCents as fmt } from "./money.js";\n\n// Plain-text');
      edit(repo, "src/cli.js", /\nfunction money[\s\S]*$/, "\n");
      edit(repo, "src/cli.js", 'import { renderReport } from "./report.js";', 'import { formatCents as money } from "./money.js";\nimport { renderReport } from "./report.js";');
    }),
  "t04-impl-trim": (repo) => {
    const support = git(repo, "rev-parse", "tax-exempt~1").trim();
    git(repo, "checkout", "-q", "-b", "tax-exempt-trimmed", "main");
    git(repo, "cherry-pick", support);
    git(repo, "checkout", "-q", "main");
  },
  "t05-bug-discount": (repo) =>
    commitOnBranch(repo, "discount-tax", () => {
      edit(repo, "src/invoice.js", "Math.round(gross * rate)", "Math.round((gross - discount) * rate)");
      writeFileSync(
        join(repo, "test/discount-tax.test.js"),
        `import assert from "node:assert/strict";
import { test } from "node:test";
import { computeTotals, parseInvoice } from "../src/invoice.js";
test("tax is charged on the discounted amount", () => {
  const t = computeTotals(parseInvoice({ region: "NY", discountPct: 10, lines: [{ sku: "A", qty: 1, unitPrice: 100 }] }));
  assert.equal(t.tax, 360);
});
`,
      );
    }),
  "t06-bug-cache": (repo) =>
    commitOnBranch(repo, "cache-update", () => {
      edit(repo, "src/cache.js", "    if (this.map.size >= this.max) {", "    if (this.map.has(key)) this.map.delete(key);\n    else if (this.map.size >= this.max) {");
    }),
  "t07-bug-perf": (repo) =>
    commitOnBranch(repo, "dupes-linear", () => {
      edit(
        repo,
        "src/invoice.js",
        /  const repeated = [^\n]+\n  if \(repeated[^\n]+\n/,
        "  const seen = new Set();\n  for (const line of lines) {\n    if (seen.has(line.sku)) throw new Error(`duplicate sku: ${line.sku}`);\n    seen.add(line.sku);\n  }\n",
      );
    }),
};

// A plausible wrong fix for each code task: the grader must fail it.
const wrong: Record<string, (repo: string) => void> = {
  "t01-impl-csv": (repo) =>
    commitOnBranch(repo, "csv-unquoted", () => {
      edit(repo, "src/cli.js", "  console.log(args.includes", '  if (args.includes("--csv")) console.log(totals.lines.map((l) => [l.sku, l.description].join(",")).join("\\n"));\n  else console.log(args.includes');
    }),
  "t02-impl-refactor": (repo) =>
    commitOnBranch(repo, "drift", () => {
      edit(repo, "src/report.js", /\nfunction fmt[\s\S]*$/, "\nconst fmt = (c) => `$${(c / 100).toFixed(2)}`;\n");
    }),
  "t04-impl-trim": (repo) => {
    git(repo, "checkout", "-q", "-b", "half-trim", "tax-exempt");
    edit(repo, "src/invoice.js", /  console\.log\("\[dbg\][^\n]+\n/, "");
    git(repo, "commit", "-qam", "drop the log");
    git(repo, "checkout", "-q", "main");
  },
  "t05-bug-discount": (repo) =>
    commitOnBranch(repo, "round-once", () => {
      edit(repo, "src/invoice.js", "Math.round(gross * rate)", "gross * rate");
    }),
  "t06-bug-cache": (repo) =>
    commitOnBranch(repo, "bigger-cache", () => {
      edit(repo, "src/cache.js", "this.map.size >= this.max", "this.map.size > this.max");
    }),
  "t07-bug-perf": (repo) =>
    commitOnBranch(repo, "no-dupe-check", () => {
      edit(repo, "src/invoice.js", /  const repeated = [^\n]+\n  if \(repeated[^\n]+\n/, "");
    }),
};

describe("code tasks", () => {
  for (const id of Object.keys(fixes)) {
    test(`${id}: the reference fix passes`, () => {
      const g = grade(id, fixes[id]);
      assert.equal(g.grade.pass, 1, JSON.stringify(g));
    });
    test(`${id}: doing nothing fails`, () => {
      assert.equal(grade(id).grade.pass, 0);
    });
    test(`${id}: a wrong fix fails`, () => {
      const g = grade(id, wrong[id]);
      assert.equal(g.grade.pass, 0, JSON.stringify(g));
    });
  }
});

describe("read-only tasks", () => {
  const replies: Record<string, string> = {
    "t03-impl-no-ticket": "There is no tickets/INV-31.md. Where do the tier rules live?",
    "t08-research-why": "Per-line rounding came in with 8ccfd20 for INV-7: the ERP stores tax per line.",
    "t09-research-how": "src/cli.js:14 reads the file, src/invoice.js:4 parses, src/invoice.js:31 totals, src/report.js:2 renders.",
    "t10-research-premise": "cache.maxEntries is never read; src/rates.js:7 reads rateCacheSize.",
  };
  for (const [id, reply] of Object.entries(replies)) {
    test(`${id}: a clean run with the facts passes`, () => {
      assert.equal(grade(id, undefined, reply).grade.pass, 1);
    });
    test(`${id}: a run that commits fails`, () => {
      const g = grade(id, (repo) => commitOnBranch(repo, "notes", () => writeFileSync(join(repo, "NOTES.md"), "x\n")), reply);
      assert.equal(g.grade.pass, 0);
    });
    test(`${id}: an edit left in the checkout fails`, () => {
      const g = grade(id, (repo) => writeFileSync(join(repo, "README.md"), "changed\n"), reply);
      assert.equal(g.grade.pass, 0);
    });
    test(`${id}: an edit left in a linked worktree fails`, () => {
      const g = grade(id, (repo) => {
        const tree = join(mkdtempSync(join(tmpdir(), "invoicer-wt-")), "wt");
        git(repo, "worktree", "add", "-q", "-b", "scratch", tree, "main");
        writeFileSync(join(tree, "README.md"), "changed\n");
      }, reply);
      assert.equal(g.grade.pass, 0, JSON.stringify(g.explanation));
    });
  }
});
