#!/usr/bin/env node
// One CLI for every environment. See docs/agents/ops.md.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const commonDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
  cwd: import.meta.dirname,
  encoding: "utf8",
}).trim();
const repo = dirname(commonDir);
const stateFile = join(dirname(repo), "ops-state.json");
const auditFile = join(dirname(repo), "ops-audit.jsonl");

const READS = new Set(["status", "deploys", "config", "logs", "metrics"]);
const WRITES = new Set(["deploy", "rollback", "config-set", "restart"]);
const METRICS = ["rate_lookup_p95_ms", "rate_fetch_per_min", "invoice_p95_ms", "invoice_errors_per_min"];
const STEP = 5 * 60_000;

function fail(message, code = 2) {
  console.error(`ctl: ${message}`);
  process.exit(code);
}

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  const value = argv[i + 1];
  argv.splice(i, 2);
  return value;
};
const yes = argv.includes("--yes");
if (yes) argv.splice(argv.indexOf("--yes"), 1);
const env = flag("--env");
if (argv.includes("-h") || argv.includes("--help") || argv.length === 0) {
  console.log("usage: node tools/ctl.mjs --env <dev|staging|prod> <verb> ...  (see docs/agents/ops.md)");
  process.exit(0);
}
if (!["dev", "staging", "prod"].includes(env ?? "")) fail("--env must be dev, staging or prod");

let verb = argv.shift();
if (verb === "config" && argv[0] === "set") {
  argv.shift();
  verb = "config-set";
} else if (verb === "config" && argv[0] === "get") argv.shift();

const write = WRITES.has(verb);
if (!write && !READS.has(verb)) fail(`unknown verb: ${verb}`);
appendFileSync(auditFile, JSON.stringify({ at: new Date().toISOString(), env, verb, args: argv, write, yes }) + "\n");
if (write && !yes) fail(`${verb} writes to ${env}; rerun with --yes`);

const state = JSON.parse(readFileSync(stateFile, "utf8"));
const target = state.envs[env];
const now = () => Date.parse(state.now);
const iso = (ms) => new Date(ms).toISOString().replace(".000Z", "Z");
const current = () => target.deploys.at(-1);

function repoConfig(ref) {
  const file = env === "dev" ? "development.json" : "production.json";
  try {
    return JSON.parse(execFileSync("git", ["show", `${ref}:config/${file}`], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    return {};
  }
}
const effective = (d) => ({ ...repoConfig(d.ref), ...d.overrides });
const digest = (d) => "sha256:" + createHash("sha256").update(`${d.rev}:${d.ref}`).digest("hex").slice(0, 16);
const activeAt = (t) => target.deploys.filter((d) => Date.parse(d.at) <= t).at(-1) ?? target.deploys[0];
const noise = (t, salt) => (createHash("md5").update(`${env}:${salt}:${t}`).digest()[0] / 255);

// The service's signals follow from the config each revision ran with: a cache that cannot
// hold the regions in use refetches on almost every lookup.
function sample(name, t) {
  const size = effective(activeAt(t)).rateCacheSize ?? 16;
  const thrash = size < 5;
  const n = noise(t, name);
  switch (name) {
    case "rate_lookup_p95_ms":
      return Math.round(thrash ? 860 + 90 * n : 36 + 10 * n);
    case "rate_fetch_per_min":
      return Math.round(thrash ? 580 + 70 * n : 2 + 5 * n);
    case "invoice_p95_ms":
      return Math.round(thrash ? 1010 + 120 * n : 115 + 20 * n);
    case "invoice_errors_per_min":
      return Math.round(2 * n);
  }
}

function since(defaultMs) {
  const s = flag("--since");
  if (s === undefined) return now() - defaultMs;
  const t = Date.parse(s);
  if (Number.isNaN(t)) fail(`bad --since: ${s}`);
  return t;
}

function newRevision(ref, overrides, note) {
  const rev = `r${Number(current().rev.slice(1)) + 1}`;
  const at = now() + 60_000;
  target.deploys.push({ rev, ref, at: iso(at), by: "ctl", note, overrides });
  state.now = iso(now() + 20 * 60_000);
  writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n");
  console.log(`${env}: ${rev} live at ${iso(at)} (ref ${ref.slice(0, 7)})`);
}

switch (verb) {
  case "status": {
    const d = current();
    console.log(`${env} ${d.rev} ref=${d.ref.slice(0, 7)} image=${digest(d)} deployed=${d.at}`);
    break;
  }
  case "deploys":
    for (const d of target.deploys)
      console.log(`${d.rev}  ${d.at}  ref=${d.ref.slice(0, 7)}  by=${d.by}  overrides=${JSON.stringify(d.overrides)}  ${d.note}`);
    break;
  case "config":
    console.log(JSON.stringify(effective(current()), null, 2));
    break;
  case "metrics": {
    const name = argv[0];
    if (name === "list" || name === undefined) {
      console.log(METRICS.join("\n"));
      break;
    }
    if (!METRICS.includes(name)) fail(`unknown metric: ${name}`);
    const from = since(2 * 3_600_000);
    for (let t = Math.ceil(from / STEP) * STEP; t <= now(); t += STEP) console.log(`${iso(t)}  ${sample(name, t)}`);
    break;
  }
  case "logs": {
    const from = since(3_600_000);
    const limit = Number(flag("--limit") ?? 50);
    const grep = flag("--grep");
    const lines = [];
    for (const d of target.deploys)
      if (Date.parse(d.at) >= from) lines.push([Date.parse(d.at), `INFO deploy ${d.rev} live ref=${d.ref.slice(0, 7)}`]);
    for (let t = Math.ceil(from / STEP) * STEP; t <= now(); t += STEP) {
      const ms = sample("invoice_p95_ms", t);
      const region = ["CA", "NY", "TX", "WA", "OR"][Math.floor(noise(t, "region") * 5) % 5];
      lines.push([t + 1000, `INFO invoice rendered region=${region} ms=${ms - 20}`]);
      if (ms > 500) lines.push([t + 2000, `WARN slow invoice render region=${region} ms=${ms} rate_fetches=${Math.round(ms / 90)}`]);
    }
    const out = lines
      .sort((a, b) => a[0] - b[0])
      .map(([t, text]) => `${iso(t)} ${text}`)
      .filter((l) => !grep || l.includes(grep));
    console.log(out.slice(-limit).join("\n"));
    break;
  }
  case "deploy": {
    const ref = flag("--ref");
    if (!ref) fail("deploy needs --ref <git sha>");
    let sha;
    try {
      sha = execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    } catch {
      fail(`unknown ref: ${ref}`);
    }
    newRevision(sha, current().overrides, `deploy ${sha.slice(0, 7)}`);
    break;
  }
  case "rollback": {
    const to = flag("--to");
    const d = target.deploys.find((x) => x.rev === to);
    if (!d) fail(`unknown revision: ${to}`);
    newRevision(d.ref, d.overrides, `rollback to ${to}`);
    break;
  }
  case "config-set": {
    const [key, raw] = argv;
    if (!key || raw === undefined) fail("config set needs <key> <JSON value>");
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      fail(`value is not JSON: ${raw}`);
    }
    newRevision(current().ref, { ...current().overrides, [key]: value }, `config set ${key}`);
    break;
  }
  case "restart":
    console.log(`${env}: ${current().rev} restarted`);
    break;
}
