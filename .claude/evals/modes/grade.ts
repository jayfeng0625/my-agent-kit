// Grades one mode run on the invoicer fixture by its outcome: the commits and files it
// left, hidden tests against each new commit, and a judge for facts the reply must state.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const here = import.meta.dirname;
export const JUDGE_MODEL = "claude-sonnet-5-5";

export type Base = { main: string; taxExempt: string };
export type Fact = { id: string; fact: string };
export type Task = { id: string; prompt: string; tags: string[]; done: string; judge?: Fact[] };
export type Action = { name: string; detail: string };
export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
};
export type Graded = {
  grade: Record<string, number>;
  explanation: Record<string, string>;
  actions: Action[];
  judge_model?: string;
  judge_usage?: Usage;
};

type Run = { status: number | null; stdout: string; stderr: string; seconds: number };

function run(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env, timeoutS = 180): Run {
  const t0 = performance.now();
  // A grader run inside node:test would otherwise make every child `node --test` report to it and exit 0.
  const { NODE_TEST_CONTEXT: _, ...clean } = env;
  const r = spawnSync(cmd, args, { cwd, env: clean, encoding: "utf8", timeout: timeoutS * 1000, maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", seconds: (performance.now() - t0) / 1000 };
}

function git(repo: string, ...args: string[]): string {
  const r = run("git", args, repo);
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr.trim()}`);
  return r.stdout.trim();
}

// The environment every model call in the eval gets: the host proxy credential and
// nothing from the session that launched it (no CLAUDE_CODE_* ids, no GitHub tokens).
export function isolatedEnv(home: string, path: string): NodeJS.ProcessEnv {
  const keep = ["ANTHROPIC_BASE_URL", "HTTPS_PROXY", "https_proxy", "NO_PROXY", "no_proxy", "NODE_EXTRA_CA_CERTS", "NODE_OPTIONS"];
  const env: NodeJS.ProcessEnv = { PATH: path, HOME: home, LANG: "C.UTF-8", TERM: "dumb", IS_SANDBOX: "1" };
  for (const key of keep) if (process.env[key] !== undefined) env[key] = process.env[key];
  env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST = process.env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST;
  env.CLAUDE_CODE_PROXY_RESOLVES_HOSTS = process.env.CLAUDE_CODE_PROXY_RESOLVES_HOSTS;
  return env;
}

type Inspection = { candidates: { label: string; sha: string }[]; commits: string[]; dirty: string[]; actions: Action[] };

export function inspectRepo(repo: string, base: Base): Inspection {
  const heads = new Map<string, string>();
  for (const line of git(repo, "for-each-ref", "--format=%(objectname) %(refname:short)", "refs/heads").split("\n")) {
    const [sha, name] = line.split(" ");
    if (sha && name) heads.set(sha, heads.has(sha) ? `${heads.get(sha)},${name}` : name);
  }
  const linked: string[] = [];
  for (const block of git(repo, "worktree", "list", "--porcelain").split("\n\n")) {
    const sha = /^HEAD (\w+)/m.exec(block)?.[1];
    const path = /^worktree (.+)$/m.exec(block)?.[1];
    if (sha && !heads.has(sha)) heads.set(sha, `worktree ${path}`);
    if (path && block !== "" && existsSync(path) && realpathSync(path) !== realpathSync(repo)) linked.push(path);
  }
  const candidates = [...heads]
    .filter(([sha]) => sha !== base.main && sha !== base.taxExempt)
    .map(([sha, label]) => ({ sha, label }));
  const tips = candidates.map((c) => c.sha);
  const commits = tips.length
    ? git(repo, "rev-list", "--format=%s", "--no-commit-header", ...tips, "--not", base.main, base.taxExempt)
        .split("\n")
        .filter(Boolean)
    : [];
  // A tracked edit left in a linked worktree counts too.
  const status = (dir: string) => git(dir, "status", "--porcelain", "--untracked-files=no").split("\n").filter(Boolean);
  const dirty = [
    ...status(repo),
    ...linked.flatMap((dir) => status(dir).map((line) => `${line.slice(0, 3)}${join(dir, line.slice(3))}`)),
  ];
  const actions: Action[] = [
    ...commits.map((subject) => ({ name: "commit", detail: subject })),
    ...dirty.map((line) => ({ name: "edit", detail: line.slice(3) })),
  ];
  return { candidates, commits, dirty, actions };
}

function extract(repo: string, sha: string): string {
  const dir = mkdtempSync(join(tmpdir(), "invoicer-tree-"));
  const r = run("sh", ["-c", 'git -C "$1" archive "$2" | tar -x -C "$3"', "sh", repo, sha, dir], repo);
  if (r.status !== 0) throw new Error(`extract ${sha}: ${r.stderr}`);
  return dir;
}

const suite = (tree: string) => run("node", ["--test"], tree).status === 0;
const hidden = (file: string, tree: string) =>
  run("node", ["--test", join(here, "hidden", file)], tree, { ...process.env, TREE: tree }).status === 0;
const cli = (tree: string, ...args: string[]) => run("node", ["src/cli.js", ...args], tree, process.env, 60);
const changedFiles = (repo: string, from: string, to: string) =>
  git(repo, "diff", "--name-only", from, to).split("\n").filter(Boolean);
const read = (tree: string, file: string) => {
  try {
    return readFileSync(join(tree, file), "utf8");
  } catch {
    return "";
  }
};

// Debug output a fix left behind: a tagged probe anywhere, or a new console call in src
// outside the CLI, which prints by design.
function debugLeft(repo: string, from: string, to: string): boolean {
  const added = git(repo, "diff", "-U0", from, to).split("\n");
  let file = "";
  for (const line of added) {
    if (line.startsWith("+++ ")) file = line.slice(6);
    else if (line.startsWith("+")) {
      if (/\[DEBUG-\w+\]|\[dbg\]/.test(line)) return true;
      if (file.startsWith("src/") && file !== "src/cli.js" && /console\.(log|debug|error)/.test(line)) return true;
    }
  }
  return false;
}

// The candidate's tests run against main's source: a regression test goes red there.
function testRedOnMain(repo: string, mainTree: string, tree: string): boolean {
  const dir = mkdtempSync(join(tmpdir(), "invoicer-red-"));
  try {
    cpSync(mainTree, dir, { recursive: true });
    rmSync(join(dir, "test"), { recursive: true, force: true });
    cpSync(join(tree, "test"), join(dir, "test"), { recursive: true });
    return !suite(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

let mainTreeCache: string | undefined;
function mainTree(repo: string, base: Base): string {
  mainTreeCache ??= extract(repo, base.main);
  return mainTreeCache;
}

const scratch = mkdtempSync(join(tmpdir(), "invoicer-inputs-"));
function input(name: string, data: unknown): string {
  const path = join(scratch, name);
  writeFileSync(path, typeof data === "string" ? data : JSON.stringify(data));
  return path;
}

// The 60,000-line invoice from t07's prompt, built the same way.
function bigInvoice(dupe = false): string {
  const lines = [];
  for (let i = 0; i < 60000; i++)
    lines.push({ sku: `SKU-${i}`, description: `Item ${i}`, qty: 1 + (i % 5), unitPrice: +(1 + (i % 997) / 100).toFixed(2) });
  if (dupe) lines.push({ sku: "SKU-123", description: "again", qty: 1, unitPrice: 1 });
  return input(dupe ? "big-dupe.json" : "big.json", { customer: "Warehouse", region: "TX", lines });
}

const RATES: Record<string, number> = { CA: 0.0725, NY: 0.04, TX: 0.0625, OR: 0, WA: 0.065 };
type RawLine = { sku: string; description?: string; qty: number; unitPrice: number };

// INV-12, written from the ticket alone.
function referenceCsv(region: string, lines: RawLine[]): string {
  const money = (c: number) => `${Math.trunc(c / 100)}.${String(c % 100).padStart(2, "0")}`;
  const field = (s: string) => (/[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);
  const rows = lines.map((l) => {
    const unit = Math.round(l.unitPrice * 100);
    const gross = l.qty * unit;
    const tax = Math.round(gross * (RATES[region] ?? 0));
    return [l.sku, l.description ?? "", String(l.qty), money(unit), money(0), money(tax), money(gross + tax)].map(field).join(",");
  });
  return ["sku,description,qty,unit_price,discount,tax,line_total", ...rows].join("\n") + "\n";
}

const csvHidden: RawLine[] = [
  { sku: "BK-1", description: 'Book "Dune", 1st ed.', qty: 2, unitPrice: 18.99 },
  { sku: "CRD-4", description: "Card\nwith a fold", qty: 10, unitPrice: 0.35 },
  { sku: "MUG", description: "Mug", qty: 1, unitPrice: 12 },
];

type Judge = (task: Task, reply: string, env: NodeJS.ProcessEnv) => JudgeResult;
type Ctx = { task: Task; repo: string; base: Base; reply: string; inspection: Inspection; env: NodeJS.ProcessEnv; judge: Judge };
type Checks = Record<string, boolean>;
type Partial = { grade: Record<string, number>; explanation: Record<string, string>; judge?: JudgeResult };

// Scores every new commit and keeps the best: pass needs every required check on one commit.
function bestCommit(ctx: Ctx, required: string[], check: (tree: string, sha: string) => Checks): Partial {
  const scored = ctx.inspection.candidates.map(({ sha, label }) => {
    const tree = extract(ctx.repo, sha);
    try {
      const checks = check(tree, sha);
      return { sha, label, checks, met: required.filter((k) => checks[k]).length };
    } finally {
      rmSync(tree, { recursive: true, force: true });
    }
  });
  scored.sort((a, b) => b.met - a.met);
  const best = scored[0];
  if (!best) {
    const grade = Object.fromEntries([["pass", 0], ...required.map((k) => [k, 0])]);
    return { grade, explanation: { pass: "no commit beyond the fixture's branches" } };
  }
  const failed = Object.entries(best.checks).filter(([, ok]) => !ok).map(([k]) => k);
  const pass = required.every((k) => best.checks[k]);
  return {
    grade: { pass: pass ? 1 : 0, ...Object.fromEntries(Object.entries(best.checks).map(([k, v]) => [k, v ? 1 : 0])) },
    explanation: {
      pass: `${best.label} (${best.sha.slice(0, 7)}) of ${scored.length} new tip(s)` + (failed.length ? `; failed: ${failed.join(", ")}` : ""),
    },
  };
}

type JudgeResult = { met: Record<string, boolean>; why: Record<string, string>; model?: string; usage?: Usage };

export function judge(task: Task, reply: string, env: NodeJS.ProcessEnv): JudgeResult {
  const facts = task.judge ?? [];
  const prompt = [
    "You grade one reply from a coding agent against a fixed list of facts.",
    "For each fact, decide whether the reply states it. A paraphrase counts. A fact stated wrongly, or only hinted at, does not.",
    "",
    `The agent's task: ${task.prompt}`,
    "",
    "Facts:",
    ...facts.map((f) => `- ${f.id}: ${f.fact}`),
    "",
    "The reply, between the markers:",
    "<<<REPLY",
    reply,
    "REPLY>>>",
    "",
    'Answer with JSON only: {"facts":[{"id":"<id>","met":true,"why":"<one sentence>"}]}',
  ].join("\n");
  const cwd = mkdtempSync(join(tmpdir(), "invoicer-judge-"));
  const r = run(
    "claude",
    ["-p", prompt, "--model", JUDGE_MODEL, "--output-format", "json", "--max-turns", "1", "--tools", "", "--no-session-persistence", "--strict-mcp-config"],
    cwd,
    env,
    300,
  );
  const out = JSON.parse(r.stdout) as { result?: string; usage?: Usage; modelUsage?: Record<string, unknown> };
  const text = out.result ?? "";
  const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { facts: { id: string; met: boolean; why: string }[] };
  const result: JudgeResult = { met: {}, why: {} };
  for (const f of parsed.facts) {
    result.met[f.id] = f.met === true;
    result.why[f.id] = f.why;
  }
  for (const f of facts) if (!(f.id in result.met)) throw new Error(`judge left out fact ${f.id}`);
  result.model = Object.keys(out.modelUsage ?? {})[0] ?? JUDGE_MODEL;
  if (out.usage) result.usage = out.usage;
  return result;
}

// Research and no-ticket runs must leave the repo as they found it.
function readOnly(ctx: Ctx, required: string[], extra: Checks = {}): Partial {
  const clean = ctx.inspection.commits.length === 0 && ctx.inspection.dirty.length === 0;
  const j = ctx.judge(ctx.task, ctx.reply, ctx.env);
  const checks: Checks = { clean, ...j.met, ...extra };
  const pass = ["clean", ...required].every((k) => checks[k]);
  const explanation: Record<string, string> = { ...j.why };
  if (!clean) explanation.clean = `wrote: ${ctx.inspection.actions.map((a) => `${a.name} ${a.detail}`).join("; ")}`;
  return {
    grade: { pass: pass ? 1 : 0, ...Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, v ? 1 : 0])) },
    explanation,
    judge: j,
  };
}

const graders: Record<string, (ctx: Ctx) => Partial> = {
  "t01-impl-csv": (ctx) => {
    const main = mainTree(ctx.repo, ctx.base);
    const basic = JSON.parse(read(main, "examples/basic.json")) as { region: string; lines: RawLine[] };
    const hiddenPath = input("csv.json", { region: "WA", lines: csvHidden });
    const golden = cli(main, "examples/basic.json").stdout;
    const trim = (s: string) => s.replace(/\n+$/, "\n");
    return bestCommit(ctx, ["suite", "csv_example", "csv_quoting", "report_same", "scope"], (tree, sha) => {
      const files = changedFiles(ctx.repo, ctx.base.main, sha);
      return {
        suite: suite(tree),
        csv_example: trim(cli(tree, "--csv", "examples/basic.json").stdout) === referenceCsv(basic.region, basic.lines),
        csv_quoting: trim(cli(tree, "--csv", hiddenPath).stdout) === referenceCsv("WA", csvHidden),
        report_same: cli(tree, "examples/basic.json").stdout === golden,
        scope: !files.some((f) => /^(src\/(cache|rates|config)\.js|config\/)/.test(f)),
        test_added: files.some((f) => f.startsWith("test/")),
      };
    });
  },

  "t02-impl-refactor": (ctx) => {
    const main = mainTree(ctx.repo, ctx.base);
    const inputs = [
      "examples/basic.json",
      "examples/discounted.json",
      input("refactor.json", { region: "OR", discountPct: 5, lines: [{ sku: "SRV-1", qty: 3, unitPrice: 4321.07 }, { sku: "FEE", qty: 1, unitPrice: 0.05 }] }),
    ];
    const outputs = (tree: string) => inputs.flatMap((f) => [cli(tree, f).stdout, cli(tree, "--summary", f).stdout]).join("\0");
    const golden = outputs(main);
    return bestCommit(ctx, ["suite", "output_same", "one_impl"], (tree) => ({
      suite: suite(tree),
      output_same: outputs(tree) === golden,
      one_impl:
        ["src/report.js", "src/cli.js"].every((f) => !/toLocaleString|%\s*100|\/\s*100/.test(read(tree, f))) &&
        /export function formatCents/.test(read(tree, "src/money.js")),
    }));
  },

  "t03-impl-no-ticket": (ctx) => readOnly(ctx, ["asks"]),

  "t04-impl-trim": (ctx) =>
    bestCommit(ctx, ["suite", "inv15", "scope", "no_noise"], (tree, sha) => ({
      suite: suite(tree),
      inv15: hidden("t04-tax-exempt.test.mjs", tree),
      scope: changedFiles(ctx.repo, ctx.base.main, sha).every((f) => f === "src/invoice.js" || f === "src/report.js" || f.startsWith("test/")),
      no_noise: !/\[dbg\]|legacyRound/.test(["src/invoice.js", "src/money.js", "src/report.js"].map((f) => read(tree, f)).join("")) &&
        !/\[dbg\]/.test(run("grep", ["-r", "dbg", "test"], tree).stdout),
    })),

  "t05-bug-discount": (ctx) => {
    const main = mainTree(ctx.repo, ctx.base);
    return bestCommit(ctx, ["suite", "rules", "clean_diff"], (tree, sha) => ({
      suite: suite(tree),
      rules: hidden("t05-discount.test.mjs", tree),
      clean_diff: !debugLeft(ctx.repo, ctx.base.main, sha),
      regression_test: testRedOnMain(ctx.repo, main, tree),
      src_scope: changedFiles(ctx.repo, ctx.base.main, sha).filter((f) => f.startsWith("src/")).every((f) => f === "src/invoice.js"),
    }));
  },

  "t06-bug-cache": (ctx) => {
    const main = mainTree(ctx.repo, ctx.base);
    return bestCommit(ctx, ["suite", "update_keeps", "clean_diff"], (tree, sha) => ({
      suite: suite(tree),
      update_keeps: hidden("t06-cache-update.test.mjs", tree),
      clean_diff: !debugLeft(ctx.repo, ctx.base.main, sha),
      recency: hidden("t06-cache-recency.test.mjs", tree),
      regression_test: testRedOnMain(ctx.repo, main, tree),
    }));
  },

  "t07-bug-perf": (ctx) => {
    const big = bigInvoice();
    const dupe = bigInvoice(true);
    const golden = cli(mainTree(ctx.repo, ctx.base), "--summary", big).stdout;
    return bestCommit(ctx, ["suite", "fast", "same_output", "dupes", "clean_diff"], (tree, sha) => {
      const timed = [1, 2, 3].map(() => cli(tree, "--summary", big));
      const d = cli(tree, "--summary", dupe);
      return {
        suite: suite(tree),
        fast: Math.min(...timed.map((t) => t.seconds)) < 1,
        same_output: timed.every((t) => t.stdout === golden),
        dupes: d.status !== 0 && d.stderr.includes("duplicate sku: SKU-123"),
        clean_diff: !debugLeft(ctx.repo, ctx.base.main, sha),
      };
    });
  },

  "t08-research-why": (ctx) => readOnly(ctx, ["reason", "cites"], { cites: /8ccfd20|INV-7/.test(ctx.reply) }),

  "t09-research-how": (ctx) =>
    readOnly(ctx, ["parse", "totals", "render", "cites"], {
      cites: (ctx.reply.match(/\b[\w/.-]+\.js:\d+/g) ?? []).length >= 3,
    }),

  "t10-research-premise": (ctx) => readOnly(ctx, ["unread", "verdict"]),
};

export function gradeRun(task: Task, repo: string, base: Base, reply: string, env: NodeJS.ProcessEnv, judgeFn: Judge = judge): Graded {
  const grader = graders[task.id];
  if (!grader) throw new Error(`no grader for ${task.id}`);
  const inspection = inspectRepo(repo, base);
  const g = grader({ task, repo, base, reply, inspection, env, judge: judgeFn });
  const out: Graded = { grade: g.grade, explanation: g.explanation, actions: inspection.actions };
  if (g.judge?.model) out.judge_model = g.judge.model;
  if (g.judge?.usage) out.judge_usage = g.judge.usage;
  return out;
}
