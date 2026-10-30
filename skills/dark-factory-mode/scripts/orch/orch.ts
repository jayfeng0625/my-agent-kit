#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  NotFoundError,
  UsageError,
  openStore,
  parseForge,
  parseVerdict,
  type Counts,
  type Frontier,
  type InboxPointer,
  type OpenGate,
  type StandingLine,
  type StatusReport,
  type Store,
  type Unit,
} from "./store.ts";

const DISPLAY_LIMIT = 4;
const PROGRAM_USAGE = "[--store <dir>] [--json] [--force] <command>";
const HELP_FLAGS = "-h, --help";
const HELP_DESCRIPTION = "display help for command";

interface Io {
  readonly stdout: (value: string) => void;
  readonly stderr: (value: string) => void;
}

// The parser below follows commander 14 semantics, which the original CLI
// used: every level consumes its own options anywhere after it, the first
// unknown option sends later arguments to the next level, and parse errors
// print the failing command's help to stderr and exit 1.

type Values = Record<string, unknown>;

interface OptionSpec {
  readonly flags: string;
  readonly long: string;
  readonly key: string;
  readonly description: string;
  readonly takesValue: boolean;
  readonly mandatory: boolean;
  readonly env: string | undefined;
  readonly choices: readonly string[] | undefined;
  readonly defaultValue: string | boolean | undefined;
  readonly parse: ((value: string) => unknown) | undefined;
}

interface OptionExtras {
  readonly mandatory?: boolean;
  readonly env?: string;
  readonly choices?: readonly string[];
  readonly defaultValue?: string | boolean;
  readonly parse?: (value: string) => unknown;
}

interface ArgumentSpec {
  readonly name: string;
  readonly description: string;
  readonly parse: ((value: string) => unknown) | undefined;
}

type Action = (
  args: readonly unknown[],
  options: Readonly<Values>
) => Promise<void>;

interface CommandSpec {
  readonly name: string;
  readonly description: string;
  readonly parent: CommandSpec | null;
  readonly args: readonly ArgumentSpec[];
  readonly options: readonly OptionSpec[];
  readonly commands: CommandSpec[];
  action: Action;
}

interface ParseContext {
  readonly io: Io;
  readonly values: Map<CommandSpec, Values>;
}

interface ParsedCommand {
  readonly command: CommandSpec;
  readonly args: readonly unknown[];
}

class InvalidArgumentError extends Error {}

class CliExit extends Error {
  public readonly exitCode: number;

  public constructor(exitCode: number) {
    super(`exit ${exitCode}`);
    this.exitCode = exitCode;
  }
}

function option(
  flags: string,
  description: string,
  extras: OptionExtras = {}
): OptionSpec {
  const long = flags.split(" ")[0] ?? flags;
  const key = long
    .slice(2)
    .replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
  return {
    flags,
    long,
    key,
    description,
    takesValue: flags.includes("<"),
    mandatory: extras.mandatory ?? false,
    env: extras.env,
    choices: extras.choices,
    defaultValue: extras.defaultValue,
    parse:
      extras.choices === undefined
        ? extras.parse
        : choiceParser(extras.choices),
  };
}

function choiceParser(choices: readonly string[]): (value: string) => string {
  return (value) => {
    if (!choices.includes(value)) {
      throw new InvalidArgumentError(
        `Allowed choices are ${choices.join(", ")}.`
      );
    }
    return value;
  };
}

function argument(
  name: string,
  description = "",
  parse?: (value: string) => unknown
): ArgumentSpec {
  return { name, description, parse };
}

async function noAction(): Promise<void> {}

function command(
  parent: CommandSpec | null,
  name: string,
  description: string,
  spec: {
    readonly args?: readonly ArgumentSpec[];
    readonly options?: readonly OptionSpec[];
  } = {}
): CommandSpec {
  const created: CommandSpec = {
    name,
    description,
    parent,
    args: spec.args ?? [],
    options: spec.options ?? [],
    commands: [],
    action: noAction,
  };
  parent?.commands.push(created);
  return created;
}

function lineage(cmd: CommandSpec): readonly CommandSpec[] {
  const result: CommandSpec[] = [];
  for (let current: CommandSpec | null = cmd; current; current = current.parent) {
    result.push(current);
  }
  return result;
}

function optionDescription(spec: OptionSpec): string {
  const extra: string[] = [];
  if (spec.choices !== undefined) {
    extra.push(
      `choices: ${spec.choices.map((choice) => JSON.stringify(choice)).join(", ")}`
    );
  }
  if (spec.defaultValue !== undefined) {
    extra.push(`default: ${JSON.stringify(spec.defaultValue)}`);
  }
  if (spec.env !== undefined) {
    extra.push(`env: ${spec.env}`);
  }
  return extra.length === 0
    ? spec.description
    : `${spec.description} (${extra.join(", ")})`;
}

function commandTerm(cmd: CommandSpec): string {
  return [
    cmd.name,
    ...(cmd.options.length > 0 ? ["[options]"] : []),
    ...cmd.args.map((arg) => `<${arg.name}>`),
  ].join(" ");
}

function helpText(cmd: CommandSpec): string {
  const usage =
    cmd.parent === null
      ? `${cmd.name} ${PROGRAM_USAGE}`
      : [
          ...lineage(cmd)
            .map((item) => item.name)
            .reverse(),
          "[options]",
          ...(cmd.commands.length > 0 ? ["[command]"] : []),
          ...cmd.args.map((arg) => `<${arg.name}>`),
        ].join(" ");
  const argumentItems = cmd.args.some((arg) => arg.description.length > 0)
    ? cmd.args.map((arg) => [arg.name, arg.description] as const)
    : [];
  const optionItems = [
    ...cmd.options.map((spec) => [spec.flags, optionDescription(spec)] as const),
    [HELP_FLAGS, HELP_DESCRIPTION] as const,
  ];
  const commandItems = cmd.commands.map(
    (child) => [commandTerm(child), child.description] as const
  );
  const width = Math.max(
    ...[...argumentItems, ...optionItems, ...commandItems].map(
      ([term]) => term.length
    )
  );
  const section = (
    title: string,
    items: readonly (readonly [string, string])[]
  ): string[] =>
    items.length === 0
      ? []
      : [
          title,
          ...items.map(
            ([term, description]) => `  ${term.padEnd(width)}  ${description}`
          ),
          "",
        ];
  return [
    `Usage: ${usage}`,
    "",
    cmd.description,
    "",
    ...section("Arguments:", argumentItems),
    ...section("Options:", optionItems),
    ...section("Commands:", commandItems),
  ].join("\n");
}

function editDistance(left: string, right: string): number {
  if (Math.abs(left.length - right.length) > 3) {
    return Math.max(left.length, right.length);
  }
  const first: number[] = [];
  for (let j = 0; j <= right.length; j += 1) {
    first[j] = j;
  }
  const rows: number[][] = [first];
  for (let i = 1; i <= left.length; i += 1) {
    rows[i] = [i];
  }
  const at = (i: number, j: number): number => rows[i]?.[j] ?? 0;
  for (let j = 1; j <= right.length; j += 1) {
    for (let i = 1; i <= left.length; i += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      let best = Math.min(
        at(i - 1, j) + 1,
        at(i, j - 1) + 1,
        at(i - 1, j - 1) + cost
      );
      if (
        i > 1 &&
        j > 1 &&
        left[i - 1] === right[j - 2] &&
        left[i - 2] === right[j - 1]
      ) {
        best = Math.min(best, at(i - 2, j - 2) + 1);
      }
      const row = rows[i] ?? [];
      row[j] = best;
    }
  }
  return at(left.length, right.length);
}

function suggestOption(flag: string, candidates: readonly string[]): string {
  const word = flag.slice(2);
  let similar: string[] = [];
  let bestDistance = 3;
  for (const candidate of new Set(candidates.map((item) => item.slice(2)))) {
    if (candidate.length <= 1) {
      continue;
    }
    const distance = editDistance(word, candidate);
    const length = Math.max(word.length, candidate.length);
    if ((length - distance) / length > 0.4) {
      if (distance < bestDistance) {
        bestDistance = distance;
        similar = [candidate];
      } else if (distance === bestDistance) {
        similar.push(candidate);
      }
    }
  }
  similar.sort((left, right) => left.localeCompare(right));
  const flags = similar.map((candidate) => `--${candidate}`);
  if (flags.length > 1) {
    return `\n(Did you mean one of ${flags.join(", ")}?)`;
  }
  return flags.length === 1 ? `\n(Did you mean ${flags[0]}?)` : "";
}

function fail(context: ParseContext, cmd: CommandSpec, text: string): never {
  context.io.stderr(`${text}\n`);
  context.io.stderr("\n");
  context.io.stderr(helpText(cmd));
  throw new CliExit(1);
}

function valuesOf(context: ParseContext, cmd: CommandSpec): Values {
  let values = context.values.get(cmd);
  if (values === undefined) {
    values = {};
    for (const spec of cmd.options) {
      if (spec.defaultValue !== undefined) {
        values[spec.key] = spec.defaultValue;
      }
    }
    context.values.set(cmd, values);
  }
  return values;
}

function setOption(
  context: ParseContext,
  cmd: CommandSpec,
  spec: OptionSpec,
  value: string
): void {
  let parsed: unknown = value;
  if (spec.parse !== undefined) {
    try {
      parsed = spec.parse(value);
    } catch (error) {
      if (error instanceof InvalidArgumentError) {
        fail(
          context,
          cmd,
          `error: option '${spec.flags}' argument '${value}' is invalid. ${error.message}`
        );
      }
      throw error;
    }
  }
  valuesOf(context, cmd)[spec.key] = parsed;
}

function maybeOption(arg: string): boolean {
  return arg.length > 1 && arg[0] === "-";
}

function negativeNumber(arg: string): boolean {
  return /^-\d*\.?\d+(e[+-]?\d+)?$/.test(arg);
}

function parseOptions(
  context: ParseContext,
  cmd: CommandSpec,
  argv: readonly string[]
): { readonly operands: string[]; readonly unknown: string[] } {
  const values = valuesOf(context, cmd);
  const operands: string[] = [];
  const unknown: string[] = [];
  let dest = operands;
  const args = [...argv];
  for (let arg = args.shift(); arg !== undefined; arg = args.shift()) {
    if (arg === "--") {
      if (dest === unknown) {
        dest.push(arg);
      }
      dest.push(...args);
      break;
    }
    const known = maybeOption(arg)
      ? cmd.options.find((spec) => spec.long === arg)
      : undefined;
    if (known !== undefined) {
      if (known.takesValue) {
        const value = args.shift();
        if (value === undefined) {
          fail(context, cmd, `error: option '${known.flags}' argument missing`);
        }
        setOption(context, cmd, known, value);
      } else {
        values[known.key] = true;
      }
      continue;
    }
    if (/^--[^=]+=/.test(arg)) {
      const index = arg.indexOf("=");
      const inline = cmd.options.find(
        (spec) => spec.long === arg.slice(0, index)
      );
      if (inline?.takesValue) {
        setOption(context, cmd, inline, arg.slice(index + 1));
        continue;
      }
    }
    if (
      dest === operands &&
      maybeOption(arg) &&
      !(cmd.commands.length === 0 && negativeNumber(arg))
    ) {
      dest = unknown;
    }
    dest.push(arg);
  }
  return { operands, unknown };
}

function parseCommand(
  context: ParseContext,
  cmd: CommandSpec,
  inheritedOperands: readonly string[],
  inheritedUnknown: readonly string[]
): ParsedCommand {
  const parsed = parseOptions(context, cmd, inheritedUnknown);
  const values = valuesOf(context, cmd);
  for (const spec of cmd.options) {
    const fromEnv = spec.env === undefined ? undefined : process.env[spec.env];
    if (fromEnv !== undefined && values[spec.key] === undefined) {
      values[spec.key] = fromEnv;
    }
  }
  const operands = [...inheritedOperands, ...parsed.operands];
  const all = [...operands, ...parsed.unknown];
  const child = cmd.commands.find((item) => item.name === operands[0]);
  if (child !== undefined) {
    return parseCommand(context, child, operands.slice(1), parsed.unknown);
  }
  if (parsed.unknown.some((arg) => arg === "-h" || arg === "--help")) {
    context.io.stdout(helpText(cmd));
    throw new CliExit(0);
  }
  for (const owner of lineage(cmd)) {
    for (const spec of owner.options) {
      if (spec.mandatory && valuesOf(context, owner)[spec.key] === undefined) {
        fail(
          context,
          owner,
          `error: required option '${spec.flags}' not specified`
        );
      }
    }
  }
  const firstUnknown = parsed.unknown[0];
  if (firstUnknown !== undefined) {
    const suggestion = firstUnknown.startsWith("--")
      ? suggestOption(
          firstUnknown,
          lineage(cmd).flatMap((owner) => [
            ...owner.options.map((spec) => spec.long),
            "--help",
          ])
        )
      : "";
    fail(context, cmd, `error: unknown option '${firstUnknown}'${suggestion}`);
  }
  cmd.args.forEach((spec, index) => {
    if (all[index] === undefined) {
      fail(context, cmd, `error: missing required argument '${spec.name}'`);
    }
  });
  if (all.length > cmd.args.length) {
    const expected = cmd.args.length;
    const scope = cmd.parent === null ? "" : ` for '${cmd.name}'`;
    fail(
      context,
      cmd,
      `error: too many arguments${scope}. Expected ${expected} argument${expected === 1 ? "" : "s"} but got ${all.length}.`
    );
  }
  const args = cmd.args.map((spec, index) => {
    const value = all[index] ?? "";
    if (spec.parse === undefined) {
      return value;
    }
    try {
      return spec.parse(value);
    } catch (error) {
      if (error instanceof InvalidArgumentError) {
        fail(
          context,
          cmd,
          `error: command-argument value '${value}' is invalid for argument '${spec.name}'. ${error.message}`
        );
      }
      throw error;
    }
  });
  return { command: cmd, args };
}

function text(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("expected a string value");
  }
  return value;
}

function optionalText(value: unknown): string | undefined {
  return value === undefined ? undefined : text(value);
}

function integer(value: unknown): number {
  if (typeof value !== "number") {
    throw new Error("expected a number value");
  }
  return value;
}

function integerList(value: unknown): readonly number[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error("expected a number list");
  }
  return value.map(integer);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function positiveInteger(value: string): number {
  const parsed = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(parsed)) {
    throw new InvalidArgumentError("must be a positive integer");
  }
  return parsed;
}

function prList(value: string): readonly number[] {
  const parts = value.split(",");
  if (parts.some((part) => part.length === 0)) {
    throw new InvalidArgumentError("requires a comma-separated PR list");
  }
  return parts.map(positiveInteger);
}

function countLine(value: Counts): string {
  const entries = Object.entries(value);
  return entries.length === 0
    ? "none"
    : entries.map(([name, count]) => `${name}=${count}`).join(", ");
}

function unitLine(unit: Unit): string {
  return [
    unit.id,
    unit.track,
    unit.state,
    unit.branch,
    unit.pr,
    unit.sha,
    unit.brief,
  ].join("\t");
}

function pointerLine(pointer: InboxPointer): string {
  return [
    pointer.ts,
    pointer.agent,
    pointer.unit,
    pointer.status,
    pointer.report,
  ].join("\t");
}

function gateLine(gate: OpenGate): string {
  return [gate.id, gate.question, gate.options, gate.defaultAnswer].join(
    "\t"
  );
}

function compactRows<T>(
  rows: readonly T[],
  format: (row: T) => string,
  empty: string,
  limit: number | null = DISPLAY_LIMIT
): string {
  if (rows.length === 0) {
    return empty;
  }
  const visible = limit === null ? rows : rows.slice(0, limit);
  const lines = visible.map(format);
  if (limit !== null && rows.length > limit) {
    lines.push(`... ${rows.length - limit} more; use --json`);
  }
  return lines.join("\n");
}

function frontierLine(value: Frontier): string {
  const prs =
    value.prs.length === 0
      ? "none"
      : value.prs
          .map((row) => `${row.branches}#${row.pr}@${row.sha}:${row.state}`)
          .join(",");
  return `generation=${value.generation} prs=${prs} lowest-unmerged=${value.lowestUnmerged ?? "none"}`;
}

function statusLines(report: StatusReport): string {
  const visible = report.summary.openGateIds.slice(0, DISPLAY_LIMIT);
  const more =
    report.summary.openGateIds.length > DISPLAY_LIMIT
      ? `,+${report.summary.openGateIds.length - DISPLAY_LIMIT} more`
      : "";
  return [
    `counts: units=${report.units.length}; states=${countLine(report.summary.unitStates)}; ledger=${countLine(report.summary.ledgerVerdicts)}`,
    `changed: ${report.changed}`,
    `gates open: ${report.summary.openGateIds.length}${
      visible.length > 0 ? `; ids=${visible.join(",")}${more}` : ""
    }`,
  ].join("\n");
}

function emit<T>(
  io: Io,
  json: boolean,
  value: T,
  compact: (result: T) => string,
  jsonValue: (result: T) => unknown = (result) => result
): void {
  const rendered = json
    ? JSON.stringify(jsonValue(value), null, 2)
    : compact(value);
  io.stdout(rendered.endsWith("\n") ? rendered : `${rendered}\n`);
}

interface GlobalOptions {
  readonly store: string | undefined;
  readonly json: boolean;
  readonly force: boolean;
}

function createProgram(io: Io, context: ParseContext): CommandSpec {
  const program = command(null, "orch", "Plain-file orchestrate bookkeeping", {
    options: [
      option("--store <dir>", "store directory (or ORCH_STORE)", {
        env: "ORCH_STORE",
      }),
      option("--json", "print complete rows as JSON", { defaultValue: false }),
      option("--force", "steal an existing store lock", {
        defaultValue: false,
      }),
    ],
  });

  const globals = (): GlobalOptions => {
    const values = valuesOf(context, program);
    return {
      store: optionalText(values.store),
      json: values.json === true,
      force: values.force === true,
    };
  };

  const storeDirectory = (): string => {
    const value = globals().store;
    if (value === undefined || value.trim().length === 0) {
      throw new UsageError("set --store <dir> or ORCH_STORE");
    }
    return value;
  };

  const requireSubcommand = async (): Promise<void> => {
    storeDirectory();
    throw new UsageError("a valid command is required");
  };

  const runStore = async <T>(
    operation: (store: Store) => Promise<T>,
    compact: (result: T) => string,
    jsonValue?: (result: T) => unknown
  ): Promise<void> => {
    const options = globals();
    const store = openStore(storeDirectory(), {
      force: options.force,
      onLockStolen: (holder) =>
        io.stderr(`stealing store lock held by pid ${holder}\n`),
      onStaleLock: (holder) =>
        io.stderr(`replacing stale store lock (pid ${holder} is dead)\n`),
    });
    try {
      const result = await operation(store);
      emit(io, options.json, result, compact, jsonValue);
    } finally {
      await store.close();
    }
  };

  const group = (name: string, description: string): CommandSpec => {
    const created = command(program, name, description);
    created.action = requireSubcommand;
    return created;
  };

  command(program, "init", "initialize the store").action = () =>
    runStore(
      (store) => store.init(),
      (result) => `initialized ${result.store}`
    );

  const unit = group("unit", "manage work units");
  command(unit, "add", "add a unit", {
    args: [argument("id")],
    options: [
      option("--track <track>", "unit track", { mandatory: true }),
      option("--brief <path>", "brief path"),
    ],
  }).action = ([id], options) =>
    runStore(
      (store) =>
        store.units.add({
          id: text(id),
          track: text(options.track),
          brief: optionalText(options.brief),
        }),
      unitLine
    );
  command(unit, "set", "update a unit", {
    args: [argument("id")],
    options: [
      option("--state <state>", "unit state", { mandatory: true }),
      option("--branch <branch>", "branch name"),
      option("--pr <number>", "pull request number", {
        parse: positiveInteger,
      }),
      option("--sha <sha>", "commit SHA"),
    ],
  }).action = ([id], options) =>
    runStore(
      (store) =>
        store.units.set({
          id: text(id),
          state: text(options.state),
          branch: optionalText(options.branch),
          pr: options.pr === undefined ? undefined : integer(options.pr),
          sha: optionalText(options.sha),
        }),
      unitLine
    );
  command(unit, "get", "get a unit", { args: [argument("id")] }).action = ([
    id,
  ]) => runStore((store) => store.units.get(text(id)), unitLine);
  command(unit, "list", "list units", {
    options: [
      option("--state <state>", "filter by state"),
      option("--track <track>", "filter by track"),
    ],
  }).action = (_args, options) =>
    runStore(
      (store) =>
        store.units.list({
          state: optionalText(options.state),
          track: optionalText(options.track),
        }),
      (rows) => compactRows(rows, unitLine, "(no units)")
    );
  command(unit, "counts", "count units by state").action = () =>
    runStore((store) => store.units.counts(), countLine);

  const ledger = group("ledger", "manage verification records");
  command(ledger, "record", "record a verification verdict", {
    args: [
      argument("pr", "pull request number", positiveInteger),
      argument("sha", "commit SHA"),
      argument("verdict", "verification verdict", parseVerdict),
    ],
    options: [
      option("--evidence <path>", "evidence path", { mandatory: true }),
      option("--verifier <name>", "verifier name"),
    ],
  }).action = ([pr, sha, verdict], options) =>
    runStore(
      (store) =>
        store.ledger.record({
          pr: integer(pr),
          sha: text(sha),
          verdict: parseVerdict(text(verdict)),
          evidence: text(options.evidence),
          verifier: optionalText(options.verifier),
        }),
      (row) => `${row.pr}\t${row.sha}\t${row.verdict}`
    );
  command(ledger, "check", "check a verification verdict", {
    args: [
      argument("pr", "pull request number", positiveInteger),
      argument("sha", "commit SHA"),
    ],
  }).action = ([pr, sha]) =>
    runStore(
      (store) => store.ledger.check({ pr: integer(pr), sha: text(sha) }),
      (row) => row.verdict
    );
  command(ledger, "summary", "count verification verdicts").action = () =>
    runStore((store) => store.ledger.summary(), countLine);

  const inbox = group("inbox", "manage agent pointers");
  command(inbox, "push", "push an inbox pointer", {
    args: [argument("agent"), argument("unit"), argument("status")],
    options: [option("--report <path>", "report path")],
  }).action = ([agent, unitId, status], options) =>
    runStore(
      (store) =>
        store.inbox.push({
          agent: text(agent),
          unit: text(unitId),
          status: text(status),
          report: optionalText(options.report),
        }),
      (result) =>
        `${result.pointer.unit}\t${result.pointer.status}\t${result.filename}`,
      (result) => result.pointer
    );
  command(inbox, "drain", "drain inbox pointers", {
    options: [
      option("--peek", "read without draining", { defaultValue: false }),
    ],
  }).action = (_args, options) =>
    runStore(
      (store) =>
        options.peek === true ? store.inbox.peek() : store.inbox.drain(),
      (rows) => compactRows(rows, pointerLine, "(empty)", null)
    );
  command(inbox, "count", "count inbox pointers").action = () =>
    runStore(
      (store) => store.inbox.count(),
      String,
      (count) => ({ count })
    );

  const gate = group("gate", "manage decision gates");
  command(gate, "park", "park a decision gate", {
    args: [argument("id")],
    options: [
      option("--question <question>", "gate question", { mandatory: true }),
      option("--options <options>", "gate options", { mandatory: true }),
      option("--default <answer>", "default answer", { mandatory: true }),
    ],
  }).action = ([id], options) =>
    runStore(
      (store) =>
        store.gates.park({
          id: text(id),
          question: text(options.question),
          options: text(options.options),
          defaultAnswer: text(options.default),
        }),
      (result) => `${result.id}\topen`
    );
  command(gate, "list", "list open decision gates").action = () =>
    runStore(
      (store) => store.gates.list(),
      (rows) => compactRows(rows, gateLine, "(no open gates)")
    );
  command(gate, "resolve", "resolve a decision gate", {
    args: [argument("id")],
    options: [option("--answer <answer>", "chosen answer", { mandatory: true })],
  }).action = ([id], options) =>
    runStore(
      (store) =>
        store.gates.resolve({ id: text(id), answer: text(options.answer) }),
      (result) => `${result.id}\tresolved\t${result.answer}`
    );

  const frontier = group("frontier", "manage the stack frontier");
  command(
    frontier,
    "set",
    "resolve the pull request base chain and set the frontier",
    {
      options: [
        option("--repo <dir>", "repository directory (or ORCH_REPO)", {
          env: "ORCH_REPO",
        }),
        option("--forge <forge>", "pull request forge", {
          choices: ["gh", "origin"],
          defaultValue: "gh",
        }),
        option("--prs <n,...>", "optional expected pull request order pin", {
          parse: prList,
        }),
      ],
    }
  ).action = (_args, options) =>
    runStore(
      (store) => {
        const repo = optionalText(options.repo);
        if (repo === undefined || repo.trim().length === 0) {
          throw new UsageError("set --repo <dir> or ORCH_REPO");
        }
        return store.frontier.set({
          repo,
          forge: parseForge(text(options.forge)),
          prs: integerList(options.prs),
        });
      },
      frontierLine
    );
  command(frontier, "show", "show the frontier").action = () =>
    runStore((store) => store.frontier.show(), frontierLine);

  command(program, "status", "render status.md and print a summary").action =
    () => runStore((store) => store.status.render(), statusLines);

  const standing = group("standing", "manage standing orders");
  command(standing, "show", "show standing orders").action = () =>
    runStore(
      (store) => store.standing.show(),
      (rows) =>
        compactRows(
          rows,
          (item: StandingLine) => `${item.number}. ${item.line}`,
          "(no standing orders)"
        )
    );
  command(standing, "add", "add a standing order", {
    args: [argument("line")],
  }).action = ([line]) =>
    runStore(
      (store) => store.standing.add({ line: text(line) }),
      (item) => `${item.number}. ${item.line}`
    );

  program.action = requireSubcommand;
  return program;
}

function handleError(
  error: unknown,
  program: CommandSpec,
  context: ParseContext
): number {
  const { io } = context;
  if (error instanceof CliExit) {
    return error.exitCode === 0 ? 0 : 1;
  }
  const json = valuesOf(context, program).json === true;
  if (error instanceof NotFoundError) {
    const output = error.output;
    if (output === undefined) {
      io.stderr(`error: ${error.message}\n`);
    } else {
      emit(io, json, output.json, () => output.compact);
    }
    return 2;
  }
  io.stderr(`error: ${message(error)}\n`);
  if (error instanceof UsageError) {
    io.stderr(helpText(program));
  }
  return 1;
}

export async function main(
  argv: readonly string[],
  io: Io = {
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
  }
): Promise<number> {
  const context: ParseContext = { io, values: new Map() };
  const program = createProgram(io, context);
  try {
    const parsed = parseCommand(context, program, [], argv);
    await parsed.command.action(
      parsed.args,
      valuesOf(context, parsed.command)
    );
    return 0;
  } catch (error) {
    return handleError(error, program, context);
  }
}

function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  process.exitCode = await main(process.argv.slice(2));
}
