import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { main } from "../../skills/dark-factory-mode/scripts/orch/orch.ts";
import {
  NotFoundError,
  UserError,
  openStore,
  parseVerdict,
  type Forge,
  type OpenStoreOptions,
  type Store,
} from "../../skills/dark-factory-mode/scripts/orch/store.ts";

const SCRIPT = join(
  import.meta.dirname,
  "../../skills/dark-factory-mode/scripts/orch/orch.ts"
);
const directories: string[] = [];
const handles: Store[] = [];

interface RunResult {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

async function cleanup(): Promise<void> {
  for (const store of handles.splice(0).reverse()) {
    await store.close();
  }
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
}

async function makeDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "orch-test-"));
  directories.push(directory);
  return directory;
}

function useStore(directory: string, options?: OpenStoreOptions): Store {
  const store = openStore(directory, options);
  handles.push(store);
  return store;
}

async function initializedStore(): Promise<{
  readonly directory: string;
  readonly store: Store;
}> {
  const directory = await makeDirectory();
  const store = useStore(directory);
  await store.init();
  return { directory, store };
}

function assertMatches(actual: unknown, expected: Record<string, unknown>): void {
  assert.ok(actual !== null && typeof actual === "object");
  for (const [key, value] of Object.entries(expected)) {
    assert.deepEqual((actual as Record<string, unknown>)[key], value, key);
  }
}

async function rejectsWith(
  promise: Promise<unknown>,
  substring: string
): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.ok(
      error.message.includes(substring),
      `expected "${error.message}" to include "${substring}"`
    );
    return true;
  });
}

function git({
  args,
  repo,
}: {
  args: readonly string[];
  repo: string;
}): string {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

async function makeGitStack(directory: string): Promise<{
  readonly repo: string;
  readonly mergedSha: string;
  readonly closedSha: string;
  readonly openSha: string;
  readonly draftSha: string;
}> {
  const repo = join(directory, "repo");
  await mkdir(repo);
  git({ repo, args: ["init", "--initial-branch=main"] });
  git({ repo, args: ["config", "user.name", "Orch Test"] });
  git({ repo, args: ["config", "user.email", "orch@example.com"] });
  git({ repo, args: ["config", "commit.gpgsign", "false"] });
  await writeFile(join(repo, "main.txt"), "main\n");
  git({ repo, args: ["add", "."] });
  git({ repo, args: ["commit", "-m", "main"] });

  const branches = ["stack/merged", "stack/closed", "stack/open", "stack/draft"];
  for (const [index, branch] of branches.entries()) {
    git({ repo, args: ["checkout", "-b", branch] });
    await writeFile(join(repo, `stack-${index}.txt`), `${branch}\n`);
    git({ repo, args: ["add", "."] });
    git({ repo, args: ["commit", "-m", branch] });
  }
  git({ repo, args: ["checkout", "stack/open"] });

  return {
    repo,
    mergedSha: git({ repo, args: ["rev-parse", "stack/merged"] }),
    closedSha: git({ repo, args: ["rev-parse", "stack/closed"] }),
    openSha: git({ repo, args: ["rev-parse", "stack/open"] }),
    draftSha: git({ repo, args: ["rev-parse", "stack/draft"] }),
  };
}

type FixtureState = "open" | "draft" | "merged" | "closed";

interface FixturePr {
  readonly number: number;
  readonly state: FixtureState;
  readonly head: string;
  readonly base: string;
}

const FORGE_FIXTURES: Readonly<
  Record<
    Forge,
    {
      readonly fields: string;
      readonly row: (pr: FixturePr) => Record<string, unknown>;
    }
  >
> = {
  gh: {
    fields: "number,state,headRefName,baseRefName",
    row: ({ number, state, head, base }) => ({
      number,
      state: state === "draft" ? "OPEN" : state.toUpperCase(),
      headRefName: head,
      baseRefName: base,
    }),
  },
  origin: {
    fields: "number,status,headRef,baseRef",
    row: ({ number, state, head, base }) => ({
      number,
      status: state,
      headRef: head,
      baseRef: base,
    }),
  },
};

function forgeRows(forge: Forge, prs: readonly FixturePr[]): string {
  return JSON.stringify(prs.map((pr) => FORGE_FIXTURES[forge].row(pr)));
}

async function withFakeForge<T>({
  directory,
  forge,
  operation,
  currentRows,
}: {
  directory: string;
  forge: Forge;
  operation: () => Promise<T>;
  currentRows?: string;
}): Promise<T> {
  const bin = join(directory, "bin");
  const outputPath = join(directory, "forge-output.txt");
  await mkdir(bin, { recursive: true });
  await writeFile(
    outputPath,
    `${
      currentRows ??
      forgeRows(forge, [
        { number: 11, state: "open", head: "stack/open", base: "stack/closed" },
      ])
    }\n`
  );
  const { fields } = FORGE_FIXTURES[forge];
  const list = (filter: string, branch: string): string =>
    `pr list ${filter} ${branch} --state all --json ${fields}`;
  const fake = join(bin, forge);
  await writeFile(
    fake,
    `#!/usr/bin/env bash
set -euo pipefail
if [ "$(pwd -P)" != "${realpathSync(join(directory, "repo"))}" ]; then
  printf '${forge} ran outside the fixture repo: %s\\n' "$(pwd -P)" >&2
  exit 2
fi
case "$*" in
  "${list("--head", "stack/open")}")
    cat "${outputPath}"
    ;;
  "${list("--head", "stack/closed")}")
    printf '%s\\n' '${forgeRows(forge, [{ number: 13, state: "closed", head: "stack/closed", base: "stack/merged" }])}'
    ;;
  "${list("--head", "stack/merged")}")
    printf '%s\\n' '${forgeRows(forge, [{ number: 10, state: "merged", head: "stack/merged", base: "main" }])}'
    ;;
  "${list("--base", "stack/open")}")
    printf '%s\\n' '${forgeRows(forge, [
      { number: 14, state: "draft", head: "stack/draft", base: "stack/open" },
      {
        number: 15,
        state: "closed",
        head: "stack/abandoned",
        base: "stack/open",
      },
    ])}'
    ;;
  "${list("--base", "stack/draft")}")
    printf '[]\\n'
    ;;
  *)
    printf 'unexpected ${forge} arguments: %s\\n' "$*" >&2
    exit 2
    ;;
esac
`
  );
  await chmod(fake, 0o755);

  const originalPath = process.env.PATH;
  process.env.PATH = `${bin}:${originalPath ?? ""}`;
  try {
    return await operation();
  } finally {
    if (originalPath === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = originalPath;
    }
  }
}

function runCli(
  args: readonly string[],
  env: NodeJS.ProcessEnv = process.env
): RunResult {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    env,
    encoding: "utf8",
  });
  return {
    code: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe("Store", () => {
  afterEach(cleanup);

  it("initializes an idempotent plain-file store and releases its lock", async () => {
    const directory = await makeDirectory();
    const store = useStore(directory);

    assert.deepEqual(await store.init(), { store: directory });
    const firstUnits = await readFile(join(directory, "units.tsv"), "utf8");
    const firstLedger = await readFile(join(directory, "ledger.tsv"), "utf8");

    assert.deepEqual(await store.init(), { store: directory });
    assert.equal(await readFile(join(directory, "units.tsv"), "utf8"), firstUnits);
    assert.equal(
      await readFile(join(directory, "ledger.tsv"), "utf8"),
      firstLedger
    );
    assert.deepEqual((await readdir(directory)).sort(), [
      ".orch.lock",
      "frontier.json",
      "gates.md",
      "inbox",
      "ledger.tsv",
      "preferences.md",
      "units.tsv",
    ]);

    await store.close();
    assert.ok(!(await readdir(directory)).includes(".orch.lock"));
  });

  it("composes unit add, set, get, list, and counts", async () => {
    const { store } = await initializedStore();

    assertMatches(
      await store.units.add({ id: "u1", track: "build", brief: "briefs/u1.md" }),
      { id: "u1", state: "pending" }
    );
    assertMatches(await store.units.add({ id: "=SUM(A1)", track: "+build" }), {
      id: "'=SUM(A1)",
      track: "'+build",
    });

    const updated = await store.units.set({
      id: "u1",
      state: "done",
      branch: "feature/u1",
      pr: 184530,
      sha: "abc123",
    });
    assert.deepEqual(updated, {
      id: "u1",
      track: "build",
      state: "done",
      branch: "feature/u1",
      pr: "184530",
      sha: "abc123",
      brief: "briefs/u1.md",
    });
    assert.deepEqual(await store.units.get("u1"), updated);
    assert.deepEqual(await store.units.list({ state: "done", track: "build" }), [
      updated,
    ]);
    assert.deepEqual(await store.units.counts(), { done: 1, pending: 1 });
    await rejectsWith(
      store.units.add({ id: "u1", track: "build" }),
      "unit u1 already exists"
    );
    await assert.rejects(
      store.units.set({ id: "missing", state: "done" }),
      NotFoundError
    );
  });

  it("records, replaces, checks, and summarizes typed ledger verdicts", async () => {
    const { store } = await initializedStore();

    await assert.rejects(
      store.ledger.check({ pr: 184530, sha: "abc123" }),
      (error: unknown) => {
        assert.ok(error instanceof NotFoundError);
        assert.deepEqual(error.output, {
          compact: "NOT-VERIFIED",
          json: { pr: "184530", sha: "abc123", verdict: "NOT-VERIFIED" },
        });
        return true;
      }
    );
    assert.throws(() => parseVerdict("looks-good"), /verdict must be/);

    const recorded = await store.ledger.record({
      pr: 184530,
      sha: "abc123",
      verdict: "unit-test-verified",
      evidence: "reports/verify.md",
      verifier: "opus",
    });
    assert.deepEqual(
      await store.ledger.check({ pr: 184530, sha: "abc123" }),
      recorded
    );
    assert.deepEqual(await store.ledger.summary(), { "unit-test-verified": 1 });

    await store.ledger.record({
      pr: 184530,
      sha: "abc123",
      verdict: "live-ui-verified",
      evidence: "reports/live.md",
    });
    assert.deepEqual(await store.ledger.summary(), { "live-ui-verified": 1 });
  });

  it("pushes, peeks, and atomically drains inbox pointers", async () => {
    const { directory, store } = await initializedStore();

    const first = await store.inbox.push({
      agent: "worker-1",
      unit: "u1",
      status: "done",
      report: "reports/u1.md",
    });
    assertMatches(first.pointer, { unit: "u1", status: "done" });
    assert.ok(first.filename.endsWith(".tsv"));
    await store.inbox.push({ agent: "worker-2", unit: "u2", status: "failed" });

    assert.equal(await store.inbox.count(), 2);
    assert.equal((await store.inbox.peek()).length, 2);
    assert.equal(await store.inbox.count(), 2);
    assert.equal((await store.inbox.drain()).length, 2);
    assert.equal(await store.inbox.count(), 0);
    assert.deepEqual(await readdir(join(directory, "inbox")), []);
    assert.deepEqual(
      (await readdir(directory)).filter((name) =>
        name.startsWith(".inbox-drain-")
      ),
      []
    );
  });

  it("replaces a stale lock whose holder pid is dead", async () => {
    const { directory } = await initializedStore();
    // spawnSync returns after the child exits and is reaped, so its pid is dead.
    const exited = spawnSync(process.execPath, ["-e", ""]);
    assert.equal(exited.status, 0);
    await writeFile(join(directory, ".orch.lock"), `${exited.pid}\n`);

    const stale: string[] = [];
    const recovered = useStore(directory, {
      onStaleLock: (holder) => stale.push(holder),
    });
    assertMatches(await recovered.units.add({ id: "u1", track: "build" }), {
      id: "u1",
    });
    assert.deepEqual(stale, [String(exited.pid)]);
    await recovered.close();
    assert.ok(!(await readdir(directory)).includes(".orch.lock"));
  });

  it("blocks a writer and steals the pid lock only with force", async () => {
    const { directory, store } = await initializedStore();
    await store.close();
    await writeFile(join(directory, ".orch.lock"), `${process.pid}\n`);

    const blocked = useStore(directory);
    await rejectsWith(
      blocked.units.add({ id: "u1", track: "build" }),
      `store lock held by pid ${process.pid}`
    );

    const stolen: string[] = [];
    const forced = useStore(directory, {
      force: true,
      onLockStolen: (holder) => stolen.push(holder),
    });
    assertMatches(await forced.units.add({ id: "u1", track: "build" }), {
      id: "u1",
    });
    assert.deepEqual(stolen, [String(process.pid)]);
    await forced.close();
    assert.ok(!(await readdir(directory)).includes(".orch.lock"));
  });

  it("parks gates, stores standing orders, and renders status", async () => {
    const { directory, store } = await initializedStore();
    await store.units.add({ id: "u1", track: "build" });
    assertMatches(
      await store.gates.park({
        id: "release",
        question: "Ship now?",
        options: "ship,wait",
        defaultAnswer: "wait",
      }),
      { kind: "open", id: "release" }
    );
    assert.deepEqual(await store.standing.add({ line: "Never force push." }), {
      number: 1,
      line: "Never force push.",
    });

    const first = await store.status.render();
    assert.equal(first.changed, "first render");
    assert.deepEqual(first.summary.openGateIds, ["release"]);
    assert.ok(
      (await readFile(join(directory, "status.md"), "utf8")).includes(
        "| release | open | Ship now? |"
      )
    );
    assert.equal((await store.status.render()).changed, "no derived changes");

    assertMatches(await store.gates.resolve({ id: "release", answer: "ship" }), {
      kind: "resolved",
      answer: "ship",
    });
    assert.equal((await store.status.render()).changed, "open gates 1->0");
    assert.deepEqual(await store.gates.list(), []);
    assert.deepEqual(await store.standing.show(), [
      { number: 1, line: "Never force push." },
    ]);
  });

  for (const forge of ["gh", "origin"] as const) {
    it(`resolves the ordered frontier from the ${forge} base chain and validates an optional pin`, async () => {
      const { directory, store } = await initializedStore();
      const stack = await makeGitStack(directory);
      const forgeParams = forge === "gh" ? {} : { forge };

      await withFakeForge({
        directory,
        forge,
        operation: async () => {
          assert.deepEqual(
            await store.frontier.set({ repo: stack.repo, ...forgeParams }),
            {
              generation: 1,
              prs: [
                {
                  pr: 10,
                  branches: "stack/merged",
                  sha: stack.mergedSha,
                  state: "MERGED",
                },
                {
                  pr: 13,
                  branches: "stack/closed",
                  sha: stack.closedSha,
                  state: "CLOSED",
                },
                {
                  pr: 11,
                  branches: "stack/open",
                  sha: stack.openSha,
                  state: "OPEN",
                },
                {
                  pr: 14,
                  branches: "stack/draft",
                  sha: stack.draftSha,
                  state: "OPEN",
                },
              ],
              lowestUnmerged: 11,
            }
          );
          assert.equal(
            (
              await store.frontier.set({
                repo: stack.repo,
                ...forgeParams,
                prs: [10, 13, 11, 14],
              })
            ).generation,
            2
          );
          assert.equal((await store.frontier.show()).generation, 2);
          await rejectsWith(
            store.frontier.set({
              repo: stack.repo,
              ...forgeParams,
              prs: [10, 11, 12],
            }),
            "frontier pin mismatch: missing from resolved chain: 12; extra in resolved chain: 13,14"
          );
          await rejectsWith(
            store.frontier.set({
              repo: stack.repo,
              ...forgeParams,
              prs: [13, 10, 11, 14],
            }),
            "frontier pin mismatch: order differs: expected 13,10,11,14; resolved 10,13,11,14"
          );
          await rejectsWith(
            store.frontier.set({
              repo: stack.repo,
              ...forgeParams,
              prs: [10, 10],
            }),
            "--prs must not contain duplicates"
          );
        },
      });
    });

    it(`rejects unparseable ${forge} output loudly`, async () => {
      const { directory, store } = await initializedStore();
      const stack = await makeGitStack(directory);

      await withFakeForge({
        directory,
        forge,
        currentRows: "this line is not forge output",
        operation: async () => {
          await rejectsWith(
            store.frontier.set({ repo: stack.repo, forge }),
            `${forge} pr list --head stack/open output is not valid JSON`
          );
        },
      });
    });
  }

  it("names the missing pull request when a chain branch has none", async () => {
    const { directory, store } = await initializedStore();
    const stack = await makeGitStack(directory);

    await withFakeForge({
      directory,
      forge: "gh",
      currentRows: "[]",
      operation: async () => {
        await rejectsWith(
          store.frontier.set({ repo: stack.repo }),
          "branch stack/open has no pull request; open one with gh pr create"
        );
      },
    });
  });

  it("rejects malformed TSV, verdict, frontier, and inbox data", async () => {
    const { directory, store } = await initializedStore();

    await writeFile(join(directory, "units.tsv"), "wrong\n");
    await rejectsWith(store.units.list(), "units.tsv has an invalid header");
    await writeFile(
      join(directory, "units.tsv"),
      "id\ttrack\tstate\tbranch\tpr\tsha\tbrief\nshort\trow\n"
    );
    await rejectsWith(store.units.list(), "units.tsv has a malformed row");

    await writeFile(
      join(directory, "ledger.tsv"),
      "pr\tsha\tverdict\tevidence\tverifier\tts\n1\tsha\tinvalid\treport\tme\tnow\n"
    );
    await rejectsWith(
      store.ledger.summary(),
      "ledger.tsv has invalid verdict invalid"
    );

    await writeFile(join(directory, "frontier.json"), '{"generation":"1"}\n');
    await rejectsWith(store.frontier.show(), "frontier.json has an invalid shape");

    await writeFile(join(directory, "inbox", "bad.tsv"), "too\tshort\n");
    await rejectsWith(store.inbox.peek(), "inbox pointer bad.tsv is malformed");
  });

  it("rejects operations after close", async () => {
    const { store } = await initializedStore();
    await store.close();
    await rejectsWith(store.units.list(), "store is closed");
    await assert.rejects(store.status.render(), UserError);
  });
});

describe("orch CLI", () => {
  afterEach(cleanup);

  it("prints help and rejects invalid parsing with exit 1", async () => {
    const help = runCli(["--help"]);
    assert.equal(help.code, 0);
    assert.ok(help.stdout.includes("Commands:"));
    assert.ok(help.stdout.includes("unit"));
    assert.ok(help.stdout.includes("ledger"));

    const frontierHelp = runCli(["frontier", "set", "--help"]);
    assert.equal(frontierHelp.code, 0);
    assert.ok(frontierHelp.stdout.includes("--repo <dir>"));
    assert.ok(frontierHelp.stdout.includes("--forge <forge>"));
    assert.ok(frontierHelp.stdout.includes("--prs <n,...>"));

    const directory = await makeDirectory();
    const invalid = runCli(["--store", directory, "unit", "add", "u1"]);
    assert.equal(invalid.code, 1);
    assert.ok(invalid.stderr.includes("required option '--track <track>'"));

    const badForge = runCli([
      "--store",
      directory,
      "frontier",
      "set",
      "--repo",
      directory,
      "--forge",
      "gt",
    ]);
    assert.equal(badForge.code, 1);
    assert.ok(badForge.stderr.includes("Allowed choices are gh, origin"));
  });

  it("accepts ORCH_STORE and emits complete JSON", async () => {
    const directory = await makeDirectory();
    const env = { ...process.env, ORCH_STORE: directory };
    assert.equal(runCli(["init"], env).code, 0);

    const added = runCli(["unit", "add", "u1", "--track", "build", "--json"], env);
    assert.equal(added.code, 0);
    assert.deepEqual(JSON.parse(added.stdout), {
      id: "u1",
      track: "build",
      state: "pending",
      branch: "",
      pr: "",
      sha: "",
      brief: "",
    });
  });

  it("maps user and not-found outcomes to the preserved exit codes", async () => {
    const directory = await makeDirectory();
    assert.equal(runCli(["--store", directory, "init"]).code, 0);

    const missingRepo = runCli(["--store", directory, "frontier", "set"]);
    assert.equal(missingRepo.code, 1);
    assert.ok(missingRepo.stderr.includes("set --repo <dir> or ORCH_REPO"));

    const userError = runCli([
      "--store",
      directory,
      "unit",
      "add",
      "",
      "--track",
      "build",
    ]);
    assert.equal(userError.code, 1);
    assert.ok(userError.stderr.includes("unit id must not be empty"));

    const missingUnit = runCli(["--store", directory, "unit", "get", "missing"]);
    assert.equal(missingUnit.code, 2);
    assert.ok(missingUnit.stderr.includes("unit missing not found"));

    const missingLedger = runCli([
      "--store",
      directory,
      "--json",
      "ledger",
      "check",
      "184530",
      "abc123",
    ]);
    assert.equal(missingLedger.code, 2);
    assert.deepEqual(JSON.parse(missingLedger.stdout), {
      pr: "184530",
      sha: "abc123",
      verdict: "NOT-VERIFIED",
    });
    assert.equal(missingLedger.stderr, "");
  });

  it("runs in process through main with the same outputs and exit codes", async () => {
    const directory = await makeDirectory();
    let stdout = "";
    let stderr = "";
    const io = {
      stdout: (value: string) => {
        stdout += value;
      },
      stderr: (value: string) => {
        stderr += value;
      },
    };

    assert.equal(await main(["--store", directory, "init"], io), 0);
    assert.equal(stdout, `initialized ${directory}\n`);
    assert.equal(
      await main(["--store", directory, "standing", "add", "Ask first."], io),
      0
    );
    assert.equal(stdout, `initialized ${directory}\n1. Ask first.\n`);
    assert.equal(await main(["--store", directory, "bogus"], io), 1);
    assert.ok(stderr.startsWith("error: too many arguments."));
    assert.equal(await main(["--store", directory, "gate", "resolve", "x", "--answer", "y"], io), 2);
  });
});
