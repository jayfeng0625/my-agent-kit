// Builds the invoicer fixture repo: each folder under main/ and tax-exempt/ is one
// commit, its files laid over the tree before it and COMMIT_MSG as the message.
// Fixed authors and dates keep every commit SHA the same across builds.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const here = import.meta.dirname;
const start = Date.parse("2026-03-02T10:00:00Z");
const day = 86_400_000;

type Author = { name: string; email: string };
const dana: Author = { name: "Dana Reyes", email: "dana@invoicer.example" };
const sam: Author = { name: "Sam Okafor", email: "sam@invoicer.example" };

export type Scenario = "steady" | "incident";

// The live environments tools/ctl.mjs reads, beside the repo so no commit or checkout reaches
// them. In "incident", prod's latest deploy shrank the tax-rate cache to one entry.
function seedOps(target: string, main: string, scenario: Scenario): void {
  const deploy = (rev: string, at: string, note: string, overrides: Record<string, unknown> = {}) =>
    ({ rev, ref: main, at, by: "dana", note, overrides });
  const state = {
    now: "2026-10-30T15:30:00Z",
    envs: {
      dev: { deploys: [deploy("r1", "2026-10-30T08:00:00Z", "scratch")] },
      staging: {
        deploys: [
          deploy("r18", "2026-10-27T09:40:00Z", "weekly release"),
          deploy("r19", "2026-10-29T08:45:00Z", "weekly release"),
          deploy("r20", "2026-10-30T13:20:00Z", "weekly release"),
        ],
      },
      prod: {
        deploys: [
          deploy("r40", "2026-10-27T10:05:00Z", "weekly release"),
          deploy("r41", "2026-10-29T09:10:00Z", "weekly release"),
          scenario === "incident"
            ? deploy("r42", "2026-10-30T13:52:00Z", "OPS-88 trim cache memory", { rateCacheSize: 1 })
            : deploy("r42", "2026-10-30T13:52:00Z", "weekly release"),
        ],
      },
    },
  };
  writeFileSync(join(dirname(target), "ops-state.json"), JSON.stringify(state, null, 2) + "\n");
}

export function buildFixture(target: string, scenario: Scenario = "steady"): void {
  rmSync(target, { recursive: true, force: true });
  for (const f of ["ops-state.json", "ops-audit.jsonl", "tracker.json"]) rmSync(join(dirname(target), f), { force: true });
  mkdirSync(target, { recursive: true });
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: target, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-q", "-b", "main");
  git("config", "user.name", dana.name);
  git("config", "user.email", dana.email);
  git("config", "commit.gpgsign", "false");

  let n = 0;
  const commitAll = (branch: string, author: Author) => {
    for (const step of readdirSync(join(here, branch)).sort()) {
      const dir = join(here, branch, step);
      cpSync(dir, target, { recursive: true, filter: (src) => !src.endsWith("COMMIT_MSG") });
      git("add", "-A");
      const date = new Date(start + n++ * day).toISOString();
      execFileSync("git", ["commit", "-q", "-F", "-"], {
        cwd: target,
        input: readFileSync(join(dir, "COMMIT_MSG"), "utf8"),
        env: {
          ...process.env,
          GIT_AUTHOR_NAME: author.name,
          GIT_AUTHOR_EMAIL: author.email,
          GIT_COMMITTER_NAME: author.name,
          GIT_COMMITTER_EMAIL: author.email,
          GIT_AUTHOR_DATE: date,
          GIT_COMMITTER_DATE: date,
        },
      });
    }
  };

  commitAll("main", dana);
  git("checkout", "-q", "-b", "tax-exempt");
  commitAll("tax-exempt", sam);
  git("checkout", "-q", "main");
  seedOps(target, git("rev-parse", "main"), scenario);
}

if (process.argv[1] === import.meta.filename) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node build.ts <target dir>");
    process.exit(2);
  }
  buildFixture(target);
}
