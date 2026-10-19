// Prove a test red: apply a one-line break to a file, run a command, then restore the file from a copy taken first.
//
//   node break-proof.mjs [--timeout <seconds>] <file> <search> <replace> -- <command...>
//   node break-proof.mjs [--timeout <seconds>] --table <breaks.tsv> -- <command...>
//
// A table row is `<file>\t<search>\t<replace>`, and each row's break runs alone. It exits 0 when the command fails under
// every break, 1 when it passes under one, and 2 when a break cannot apply, a file cannot be read or written, the command
// outlives the timeout (300 seconds by default), a signal ends the command or the run, or a backup from a run that never
// restored is still on disk. The search must match exactly once, so a line that a formatter has rewrapped fails loudly.
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { stripVTControlCharacters } from 'node:util'

const USAGE =
    'Usage: node break-proof.mjs [--timeout <seconds>] <file> <search> <replace> -- <command...>, or [--timeout <seconds>] --table <breaks.tsv> -- <command...>'
const args = process.argv.slice(2)
const separator = args.indexOf('--')
const command = separator === -1 ? [] : args.slice(separator + 1)
let head = separator === -1 ? args : args.slice(0, separator)
let timeoutSeconds = 300
if (head[0] === '--timeout') {
    timeoutSeconds = Number(head[1])
    head = head.slice(2)
}
let breaks = [head]
if (head[0] === '--table' && head.length === 2) {
    try {
        breaks = readFileSync(head[1], 'utf-8')
            .split(/\r?\n/)
            .filter((row) => row.trim())
            .map((row) => row.split('\t'))
    } catch (error) {
        console.error(`The table cannot be read: ${error.message}`)
        process.exit(2)
    }
}
if (
    command.length === 0 ||
    !(timeoutSeconds > 0) ||
    breaks.length === 0 ||
    breaks.some((row) => row.length !== 3 || !row[0] || !row[1])
) {
    console.error(USAGE)
    process.exit(2)
}

// The command runs in its own process group, so a timeout or a signal ends the runner and every worker under it.
// SIGTERM goes first; a group still alive after 5 seconds gets SIGKILL.
let endCommand = () => {}
const run = () =>
    new Promise((resolve) => {
        const child = spawn(command[0], command.slice(1), { detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
        let output = ''
        for (const stream of [child.stdout, child.stderr]) {
            stream.setEncoding('utf-8')
            stream.on('data', (chunk) => {
                output += chunk
            })
        }
        const killGroup = (signal) => {
            try {
                process.kill(-child.pid, signal)
            } catch {}
        }
        endCommand = (signal) => {
            killGroup(signal)
            setTimeout(() => killGroup('SIGKILL'), 5000).unref()
        }
        let timedOut = false
        const timer = setTimeout(() => {
            timedOut = true
            endCommand('SIGTERM')
        }, timeoutSeconds * 1000)
        const settle = (result) => {
            clearTimeout(timer)
            endCommand = () => {}
            resolve(result)
        }
        child.on('error', (error) => settle({ error }))
        child.on('close', (status, signal) => settle({ status, signal, output, timedOut }))
    })

// Node exits on these signals before a finally block runs. With a handler, it ends the command, restores the file, and
// stops before the next break. A SIGKILL skips all of this, so the backup on disk is the copy to restore from.
let stopped = null
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
        stopped = signal
        endCommand(signal)
    })
}

// The file stays bytes end to end, so the restore is exact for any encoding.
const prove = async ([file, search, replace]) => {
    let original
    try {
        original = readFileSync(file)
    } catch (error) {
        console.error(`${file} cannot be read: ${error.message}`)
        return 2
    }
    const needle = Buffer.from(search)
    const at = original.indexOf(needle)
    let matches = 0
    for (let i = at; i !== -1; i = original.indexOf(needle, i + 1)) {
        matches++
    }
    if (matches !== 1) {
        console.error(`The search matches ${matches} times in ${file}, and a break needs exactly one match: ${search}`)
        return 2
    }
    const backup = `${file}.break-proof-orig`
    if (existsSync(backup)) {
        console.error(`${backup} exists, so an earlier run never restored ${file}. Restore it from the backup, then delete the backup.`)
        return 2
    }
    try {
        writeFileSync(backup, original)
    } catch (error) {
        console.error(`The backup cannot be written: ${error.message}`)
        return 2
    }
    try {
        writeFileSync(file, Buffer.concat([original.subarray(0, at), Buffer.from(replace), original.subarray(at + needle.length)]))
    } catch (error) {
        rmSync(backup)
        console.error(`${file} cannot be written: ${error.message}`)
        return 2
    }
    let result
    try {
        result = await run()
    } finally {
        writeFileSync(file, original)
        rmSync(backup)
    }
    // A runner that traps the same Ctrl-C exits non-zero without having gone red, so check for a stop first.
    if (stopped) {
        console.error(`A ${stopped} stopped the run, so the command's exit proves nothing. ${file} is restored.`)
        return 2
    }
    if (result.timedOut) {
        console.error(`The command ran past ${timeoutSeconds} seconds and was killed. ${file} is restored.`)
        return 2
    }
    if (result.signal) {
        console.error(`A ${result.signal} ended the command, which proves nothing about the test. ${file} is restored.`)
        return 2
    }
    if (result.error) {
        console.error(`The command did not run: ${result.error.message}`)
        return 2
    }
    const lines = stripVTControlCharacters(result.output).split('\n')
    const failures = lines.filter((line) => /^\s*(×|✖|not ok\b|FAIL\b)|AssertionError|Error:|^\s*Tests\s+\d/.test(line))
    console.log((failures.length > 0 ? failures : lines.slice(-20)).join('\n'))
    if (result.status === 0) {
        console.error(`The command passed under the break ${search} => ${replace}, so no test has shown that it can fail. ${file} is restored.`)
        return 1
    }
    console.log(`The command failed under the break ${search} => ${replace} with exit ${result.status}. ${file} is restored.`)
    return 0
}

let worst = 0
for (const row of breaks) {
    worst = Math.max(worst, await prove(row))
    if (stopped) {
        process.exit(2)
    }
}
process.exit(worst)
