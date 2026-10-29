// Builds the invoicer fixture repo: each folder under main/ and tax-exempt/ is one
// commit, its files laid over the tree before it and COMMIT_MSG as the message.
// Fixed authors and dates keep every commit SHA the same across builds.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const here = import.meta.dirname;
const start = Date.parse("2026-03-02T10:00:00Z");
const day = 86_400_000;

type Author = { name: string; email: string };
const dana: Author = { name: "Dana Reyes", email: "dana@invoicer.example" };
const sam: Author = { name: "Sam Okafor", email: "sam@invoicer.example" };

export function buildFixture(target: string): void {
  rmSync(target, { recursive: true, force: true });
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
}

if (process.argv[1] === import.meta.filename) {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: node build.ts <target dir>");
    process.exit(2);
  }
  buildFixture(target);
}
