#!/usr/bin/env node
// Runs the hillclimb skill's test cases headless, with the skill and without it, in
// skill-creator's workspace layout, then grades each run with an LLM judge over its
// outputs. Each run spends model tokens; get the user's yes first.
//
//   node .claude/evals/hillclimb/run.mjs --kit-ref <sha> --work <dir> --out <workspace>/iteration-<n> \
//     [--only <case>,...] [--configs with_skill,without_skill] [--grade-only]
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { cpSync, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { isolatedEnv } from '../modes/grade.ts';

const HERE = import.meta.dirname;
const KIT_ROOT = resolve(HERE, '../../..');
const JUDGE_MODEL = 'claude-sonnet-5-5';
const BIG_JSON = `node -e 'const lines=[];for(let i=0;i<60000;i++)lines.push({sku:"SKU-"+i,description:"Item "+i,qty:1+(i%5),unitPrice:+(1+(i%997)/100).toFixed(2)});console.log(JSON.stringify({customer:"Warehouse",region:"TX",lines}))' > big.json`;

const { values: opt } = parseArgs({
  options: {
    'kit-ref': { type: 'string' }, work: { type: 'string' }, out: { type: 'string' },
    only: { type: 'string' }, configs: { type: 'string', default: 'with_skill,without_skill' },
    model: { type: 'string', default: 'claude-opus-5-5' }, effort: { type: 'string', default: 'medium' },
    'budget-usd': { type: 'string', default: '10' }, 'timeout-s': { type: 'string', default: '3600' },
    'grade-only': { type: 'boolean', default: false },
  },
});
if (!opt['kit-ref'] || !opt.work || !opt.out) throw new Error('--kit-ref, --work and --out are required');
const work = resolve(opt.work);
const out = resolve(opt.out);

// --- the case files ---------------------------------------------------------

function loadCase(name) {
  const dir = join(HERE, name);
  const prompt = readFileSync(join(dir, 'prompt.md'), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '').trim();
  const graders = readdirSync(join(dir, 'graders')).sort().map(f =>
    readFileSync(join(dir, 'graders', f), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '').trim());
  return { name, dir, prompt, graders };
}
const cases = readdirSync(HERE, { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(join(HERE, d.name, 'prompt.md')))
  .map(d => d.name)
  .filter(n => !opt.only || opt.only.split(',').includes(n))
  .map(loadCase);

// --- the kit, as a person installs it ----------------------------------------

function prepareKit() {
  const sha = execFileSync('git', ['rev-parse', opt['kit-ref']], { cwd: KIT_ROOT, encoding: 'utf8' }).trim();
  const dir = join(work, `kit-${sha.slice(0, 12)}`);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    execFileSync('sh', ['-c', 'git -C "$1" archive "$2" | tar -x -C "$3"', 'sh', KIT_ROOT, sha, dir]);
  }
  const bin = join(work, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'gh'), '#!/bin/sh\necho "gh is not available in this eval" >&2\nexit 1\n', { mode: 0o755 });
  return { sha, dir, path: `${bin}:${process.env.PATH}` };
}

// poteto-mode, in kit refs from before its removal, is left out of both homes: it carries its own hillclimb playbook.
function makeHome(home, kit, withSkill) {
  const claude = join(home, '.claude');
  mkdirSync(join(claude, 'skills'), { recursive: true });
  for (const f of ['CLAUDE.md', 'references', 'pstack-models.md', 'agents'])
    symlinkSync(join(kit.dir, 'global', f), join(claude, f));
  for (const skill of readdirSync(join(kit.dir, 'skills'))) {
    if (skill === 'poteto-mode' || (skill === 'hillclimb' && !withSkill)) continue;
    symlinkSync(join(kit.dir, 'skills', skill), join(claude, 'skills', skill));
  }
}

// --- one run -------------------------------------------------------------------

function readStream(file) {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap(l => { try { return [JSON.parse(l)]; } catch { return []; } });
}

function renderTranscript(events) {
  const agentOf = new Map();
  const lines = [];
  for (const ev of events) {
    const parent = ev.parent_tool_use_id ?? null;
    const who = parent ? `[${agentOf.get(parent) ?? 'subagent'}] ` : '';
    if (ev.type === 'assistant') {
      for (const b of ev.message?.content ?? []) {
        if (b.type === 'tool_use') {
          if (b.name === 'Agent' || b.name === 'Task') agentOf.set(b.id, b.input?.subagent_type ?? 'general-purpose');
          lines.push(`### ${who}call ${b.name}\n\`\`\`\n${JSON.stringify(b.input, null, 2).slice(0, 3000)}\n\`\`\``);
        } else if (b.type === 'text') lines.push(`### ${who}assistant\n${b.text}`);
      }
    } else if (ev.type === 'user' && Array.isArray(ev.message?.content)) {
      for (const b of ev.message.content) {
        if (b.type !== 'tool_result') continue;
        const text = typeof b.content === 'string' ? b.content : (b.content ?? []).map(c => c.text ?? '').join('\n');
        lines.push(`### ${who}result\n\`\`\`\n${text.length > 2000 ? text.slice(0, 2000) + '\n[truncated]' : text}\n\`\`\``);
      }
    }
  }
  return lines.join('\n\n') + '\n';
}

async function runOne(c, config, kit) {
  const runDir = join(out, c.name, config);
  const dir = join(work, 'hillclimb-skill', `${c.name}-${config}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  execFileSync('bash', [join(c.dir, 'place-files.sh')], { cwd: dir });
  writeFileSync(join(dir, 'base.txt'), git(join(dir, 'invoicer'), 'rev-parse', 'main', 'tax-exempt') + '\n');
  makeHome(join(dir, 'home'), kit, config === 'with_skill');
  const prompt = config === 'with_skill' ? c.prompt : c.prompt.replace(/^\/hillclimb\s+/, '');
  const args = ['-p', prompt, '--model', opt.model, '--effort', opt.effort, '--output-format', 'stream-json', '--verbose',
    '--permission-mode', 'bypassPermissions', '--no-session-persistence', '--strict-mcp-config',
    '--max-budget-usd', opt['budget-usd'], '--disallowedTools', 'Bash(git push:*)', 'Bash(gh:*)', 'WebSearch', 'WebFetch'];
  const streamFile = join(dir, 'stream.jsonl');
  const so = createWriteStream(streamFile);
  const se = createWriteStream(join(dir, 'stderr.log'));
  const started = Date.now();
  const child = spawn('claude', args, { cwd: join(dir, 'invoicer'), env: isolatedEnv(join(dir, 'home'), kit.path), stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(so);
  child.stderr.pipe(se);
  const killAt = setTimeout(() => child.kill('SIGKILL'), Number(opt['timeout-s']) * 1000);
  const code = await new Promise(res => child.on('close', res));
  clearTimeout(killAt);
  await new Promise(res => so.end(res));
  const duration = Date.now() - started;

  const events = readStream(streamFile);
  const result = events.findLast(e => e.type === 'result') ?? {};
  const mu = Object.values(result.modelUsage ?? {});
  const sum = k => mu.reduce((a, m) => a + (m[k] ?? 0), 0);
  const tokens = sum('inputTokens') + sum('cacheReadInputTokens') + sum('cacheCreationInputTokens') + sum('outputTokens');
  mkdirSync(join(runDir, 'outputs'), { recursive: true });
  writeFileSync(join(runDir, 'timing.json'), JSON.stringify({ total_tokens: tokens, duration_ms: duration,
    total_duration_seconds: +(duration / 1000).toFixed(1), exit_code: code, stop: result.subtype ?? null,
    cost_usd_reported: result.total_cost_usd ?? null, num_turns: result.num_turns ?? null, workdir: dir }, null, 2) + '\n');
  writeFileSync(join(runDir, 'outputs', 'reply.md'), (result.result ?? '(no reply)') + '\n');
  writeFileSync(join(runDir, 'outputs', 'transcript.md'), renderTranscript(events));
  console.error(`${c.name}/${config}: exit ${code}, ${result.subtype ?? 'no result'}, ${(duration / 1000).toFixed(0)} s`);
}

// --- what the run left behind, measured ---------------------------------------

const git = (repo, ...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' }).trim();
const RSS_HOOK = 'data:text/javascript,process.on("exit",()=>process.stderr.write("MAXRSS "+process.resourceUsage().maxRSS+"\\n"))';

function measure(tree, bigJson, env) {
  const times = [];
  const rss = [];
  let output = null;
  for (let i = 0; i < 5; i++) {
    const t = process.hrtime.bigint();
    const r = spawnSync('node', ['--import', RSS_HOOK, 'src/cli.js', '--summary', bigJson], { cwd: tree, env, encoding: 'utf8', maxBuffer: 1 << 28 });
    times.push(Number(process.hrtime.bigint() - t) / 1e6);
    rss.push(Number(/MAXRSS (\d+)/.exec(r.stderr)?.[1] ?? NaN) / 1024);
    output ??= `${r.status}\n${r.stdout}`;
  }
  const median = xs => [...xs].sort((a, b) => a - b)[2];
  return { ms: median(times), rss_mb: median(rss), output };
}

function inspect(c, config) {
  const dir = join(work, 'hillclimb-skill', `${c.name}-${config}`);
  const repo = join(dir, 'invoicer');
  const [base, taxExempt] = readFileSync(join(dir, 'base.txt'), 'utf8').trim().split('\n');
  const tips = git(repo, 'for-each-ref', '--format=%(objectname) %(committerdate:unix) %(refname:short)', 'refs/heads')
    .split('\n').map(l => l.split(' ')).filter(([sha]) => sha !== base && sha !== taxExempt);
  const head = git(repo, 'rev-parse', 'HEAD');
  // The tree the run left: the main checkout when it holds uncommitted edits, else the
  // checked-out HEAD when it moved, else the newest branch tip.
  const dirty = git(repo, 'status', '--porcelain', '--untracked-files=no') !== '';
  const final = dirty ? 'checkout' : head !== base && git(repo, 'branch', '--contains', head) ? head
    : (tips.sort((a, b) => b[1] - a[1])[0]?.[0] ?? base);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const md = [`# What the run left in the invoicer repo`, '', `Base (main at start): ${base}`, `Final tree measured: ${final === 'checkout' ? `the main checkout as the run left it, uncommitted edits included (HEAD ${head})` : final}`, ''];
  md.push('## Commits on every branch since the base', '```', git(repo, 'log', '--all', '--stat', '--format=%n%h %ad %s%n%b', '--date=iso', '--not', base, taxExempt) || '(none)', '```', '');
  md.push('## Uncommitted changes in the main checkout', '```', git(repo, 'status', '--short') || '(none)', '```', '');
  const tree = join(dir, 'measure');
  const big = join(dir, 'measure-big.json');
  execFileSync('sh', ['-c', BIG_JSON.replace('> big.json', '> "$1"'), 'sh', big]);
  const results = {};
  for (const [label, sha] of [['base', base], ['final', final]]) {
    rmSync(tree, { recursive: true, force: true });
    git(repo, 'worktree', 'prune');
    if (sha === 'checkout') cpSync(repo, tree, { recursive: true });
    else git(repo, 'worktree', 'add', '-q', '--detach', tree, sha);
    const test = spawnSync('npm', ['test'], { cwd: tree, env, encoding: 'utf8' });
    results[label] = { tests: test.status === 0 ? 'pass' : `FAIL (exit ${test.status})`, ...measure(tree, big, env) };
    if (sha === 'checkout') rmSync(tree, { recursive: true, force: true });
    else git(repo, 'worktree', 'remove', '--force', tree);
  }
  const same = results.base.output === results.final.output;
  md.push('## Measured by the grader on a fresh 60k-line invoice (median of 5)', '',
    '| tree | npm test | summary runtime ms | max RSS MB |', '| --- | --- | --- | --- |',
    ...['base', 'final'].map(k => `| ${k} | ${results[k].tests} | ${results[k].ms.toFixed(0)} | ${results[k].rss_mb.toFixed(1)} |`), '',
    `Speedup: ${(results.base.ms / results.final.ms).toFixed(2)}x. Max RSS change: ${(100 * (results.final.rss_mb / results.base.rss_mb - 1)).toFixed(1)}%.`,
    `Summary output (exit code and stdout) identical between base and final: ${same ? 'yes' : 'NO'}.`, '');
  if (!same) md.push('### Base output', '```', results.base.output.slice(0, 1500), '```', '### Final output', '```', results.final.output.slice(0, 1500), '```', '');
  const logs = execFileSync('sh', ['-c', 'find "$1" -name "decision*.tsv" -not -path "*/node_modules/*" -not -path "$1/home/*" 2>/dev/null; true', 'sh', dir], { encoding: 'utf8' }).trim();
  md.push('## Decision logs found in the run folder', '', logs || '(none)', '');
  const runDir = join(out, c.name, config);
  for (const f of logs.split('\n').filter(Boolean)) cpSync(f, join(runDir, 'outputs', f.slice(dir.length + 1).replaceAll('/', '__')));
  writeFileSync(join(runDir, 'outputs', 'repo-state.md'), md.join('\n'));
}

// --- grading --------------------------------------------------------------------

function grade(c, config, kit) {
  const runDir = join(out, c.name, config);
  const prompt = [
    'You grade one run of a coding agent against a list of assertions.',
    `The agent was asked: ${c.prompt.replace(/^\/hillclimb\s+/, '')}`,
    '',
    'The files in your working directory are the evidence: reply.md (its final reply), transcript.md (every tool call and a truncated result, in order; [name] marks a subagent), repo-state.md (its commits, and the grader\'s own measurements of the base and final trees), and any decision log it wrote. Use Grep on transcript.md, since it is long.',
    'An assertion passes only when the evidence shows it; cite the line or file that does. Measurements in repo-state.md outrank the agent\'s own claims.',
    '',
    'Assertions:',
    ...c.graders.map((g, i) => `${i + 1}. ${g}`),
    '',
    'Answer with JSON only: {"expectations":[{"text":"<assertion, verbatim>","passed":true,"evidence":"<one or two sentences>"}]}',
  ].join('\n');
  const home = join(work, 'judge-home');
  mkdirSync(home, { recursive: true });
  const r = spawnSync('claude', ['-p', prompt, '--model', JUDGE_MODEL, '--output-format', 'json', '--tools', 'Read,Grep,Glob',
    '--max-budget-usd', '2', '--no-session-persistence', '--strict-mcp-config', '--permission-mode', 'bypassPermissions'],
  { cwd: join(runDir, 'outputs'), env: isolatedEnv(home, kit.path), encoding: 'utf8', maxBuffer: 1 << 26, timeout: 900_000 });
  const res = JSON.parse(r.stdout);
  const text = res.result ?? '';
  const { expectations } = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  if (expectations.length !== c.graders.length) throw new Error(`${c.name}/${config}: judge returned ${expectations.length} of ${c.graders.length}`);
  const passed = expectations.filter(e => e.passed).length;
  writeFileSync(join(runDir, 'grading.json'), JSON.stringify({ expectations,
    summary: { passed, failed: expectations.length - passed, total: expectations.length, pass_rate: +(passed / expectations.length).toFixed(2) },
    judge: { model: JUDGE_MODEL, cost_usd_reported: res.total_cost_usd ?? null } }, null, 2) + '\n');
  console.error(`${c.name}/${config}: ${passed}/${expectations.length}`);
}

// --- main -----------------------------------------------------------------------

const kit = prepareKit();
const configs = opt.configs.split(',');
for (const c of cases) {
  mkdirSync(join(out, c.name), { recursive: true });
  writeFileSync(join(out, c.name, 'eval_metadata.json'), JSON.stringify({ eval_name: c.name,
    prompt: c.prompt.replace(/^\/hillclimb\s+/, ''), assertions: c.graders }, null, 2) + '\n');
}
const jobs = cases.flatMap(c => configs.map(config => ({ c, config })));
if (!opt['grade-only']) await Promise.all(jobs.map(({ c, config }) => runOne(c, config, kit)));
const failed = [];
for (const { c, config } of jobs) {
  try {
    inspect(c, config);
    grade(c, config, kit);
  } catch (e) {
    failed.push(`${c.name}/${config}`);
    console.error(`${c.name}/${config}: grading failed: ${e.message}`);
  }
}
writeFileSync(join(out, 'run.json'), JSON.stringify({ kit_ref: opt['kit-ref'], kit_sha: kit.sha, model: opt.model,
  effort: opt.effort, budget_usd: Number(opt['budget-usd']), judge_model: JUDGE_MODEL, grading_failed: failed, finished: new Date().toISOString() }, null, 2) + '\n');
