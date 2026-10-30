#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const RULE =
	"Tests alone are not sufficient verification. A ticket is verified only when its unit, live, and perf boxes are all checked.";
const LANES = /^(?:.*\s)?(\d+) lanes at the ticket head/;
const MIN_LANES = 2;
const SUB_BLOCKS = [
	"Depends on.",
	"Files.",
	"Build.",
	"You see.",
	"Verify, unit.",
	"Verify, live.",
	"Verify, perf.",
	"Review gate.",
	"Land.",
];
const BOOT = "Boot recipe.";
const PROGRAM_H3 = ["Arm the program", "Tickets", "Verdict", "Boot recipe"];
const PROGRAM_MARKERS = ["Re-read them at every tick"];
const HOW_TO_READ_MARKERS = [
	"One box is one unit of work",
	"names the evidence",
	"Check a box only when its evidence exists",
	"playbooks/",
	RULE,
];
const PERF_ITEMS = ["Metric.", "Probe.", "Baseline.", "Rule."];
const BOX = /^\s*- \[[ x]\] (.*)$/;

const args = process.argv.slice(2);
const ticketMode = args[0] === "--ticket";
const file = ticketMode ? args[1] : args[0];
if (!file || args.length !== (ticketMode ? 2 : 1)) {
	console.error("Usage: node check-plan.mjs <plan.md>\n       node check-plan.mjs --ticket <ticket-body.md | ->");
	process.exit(2);
}
const label = file === "-" ? "stdin" : file;

const raw = fs.readFileSync(file === "-" ? 0 : file, "utf8").split(/\r?\n/);
const problems = [];
const fail = (line, message) => problems.push(`${label}:${line}: ${message}`);

let start = 0;
// A ticket body has no frontmatter, and its first line may be a horizontal rule.
if (!ticketMode && raw[0] === "---") {
	start = raw.indexOf("---", 1) + 1;
}

const lines = [];
let fence = null;
const openingFence = (text) => {
	const match = text.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
	if (!match || (match[1][0] === "`" && match[2].includes("`"))) return null;
	return { char: match[1][0], length: match[1].length };
};
const closingFence = (text, opening) => {
	const match = text.match(/^ {0,3}(`+|~+)[ \t]*$/);
	return Boolean(
		match &&
		match[1][0] === opening.char &&
		match[1].length >= opening.length,
	);
};
for (let i = start; i < raw.length; i++) {
	const text = raw[i];
	const n = i + 1;
	let code = Boolean(fence);
	if (fence && closingFence(text, fence)) {
		code = false;
		fence = null;
	} else if (!fence) {
		fence = openingFence(text);
		code = Boolean(fence);
	}
	lines.push({ n, text, code });
	if (code || ticketMode) continue;
	const prose = text
		.replace(/(?<!`)(`+)(?!`)(.*?)(?<!`)\1(?!`)/g, "`")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\]\([^)]*\)/g, "]");
	if (/[\u2013\u2014]/.test(prose)) fail(n, "long dash");
	if (/[\u2018\u2019\u201c\u201d]/.test(prose)) fail(n, "curly quote");
	if (/: \S/.test(prose)) fail(n, "mid-sentence colon");
}

const boxes = (ls) => ls.filter((l) => !l.code && BOX.test(l.text)).map((l) => ({ n: l.n, text: l.text.match(BOX)[1] }));

const checkTicket = (title, n, body, needBoot) => {
	const heads = [];
	let boot = null;
	for (const l of body) {
		if (l.code) continue;
		const m = l.text.match(/^\*\*([^*]+)\*\*(.*)$/);
		if (m && m[1] === BOOT) boot = { n: l.n, lines: [] };
		else if (boot) boot.lines.push(l);
		else if (m && SUB_BLOCKS.includes(m[1])) heads.push({ name: m[1], n: l.n, rest: m[2].trim(), lines: [] });
		else if (heads.length) heads.at(-1).lines.push(l);
	}
	if (needBoot && !boot) fail(n, `${title}: no **${BOOT}** block after Land, so the live lanes have no recipe`);
	else if (needBoot && boxes(boot.lines).length === 0) fail(boot.n, `${title}: ${BOOT} has no box`);
	const names = heads.map((h) => h.name);
	if (names.join("|") !== SUB_BLOCKS.join("|")) {
		fail(n, `${title}: sub-blocks are [${names.join(", ")}], expected [${SUB_BLOCKS.join(", ")}]`);
	}
	const block = (name) => heads.find((h) => h.name === name);
	const counts = {};
	for (const h of heads) counts[h.name] = boxes(h.lines).length;

	const depends = block("Depends on.");
	if (depends && depends.rest === "") fail(depends.n, `${title}: Depends on names nothing`);
	for (const name of ["Files.", "Build.", "You see.", "Verify, unit.", "Land."]) {
		const b = block(name);
		if (b && boxes(b.lines).length === 0) fail(b.n, `${title}: ${name} has no box`);
	}
	for (const name of ["Verify, unit.", "Verify, live.", "Verify, perf."]) {
		const b = block(name);
		if (b && !b.rest.startsWith(RULE)) fail(b.n, `${title}: ${name} does not open with the rule`);
	}

	const live = block("Verify, live.");
	if (live) {
		const declared = live.rest.match(LANES);
		const count = declared ? Number(declared[1]) : 0;
		if (!declared) fail(live.n, `${title}: Verify, live lacks "<N> lanes at the ticket head"`);
		else if (count < MIN_LANES) fail(live.n, `${title}: Verify, live declares ${count} lanes, at least ${MIN_LANES} required`);
		const lanes = boxes(live.lines).map((b) => ({ ...b, m: b.text.match(/^Lane (\d+)\. /) }));
		const numbers = lanes.filter((b) => b.m).map((b) => Number(b.m[1])).sort((a, b) => a - b);
		const expected = Array.from({ length: Math.max(count, MIN_LANES) }, (_, i) => i + 1);
		if (numbers.join(",") !== expected.join(",")) fail(live.n, `${title}: lanes are [${numbers.join(",")}], expected 1 to ${expected.length}`);
		for (const lane of lanes) {
			if (!lane.m) fail(lane.n, `${title}: live box is not a lane`);
			else if (lane.m[1] === "1" && !lane.text.startsWith("Lane 1. Regression lane against trunk.")) fail(lane.n, `${title}: lane 1 is not the regression lane against trunk`);
			else if (!/Save `[^`]+`/.test(lane.text)) fail(lane.n, `${title}: lane ${lane.m[1]} names no screenshot`);
			else if (!lane.text.includes("Pass when")) fail(lane.n, `${title}: lane ${lane.m[1]} has no pass predicate`);
		}
	}

	const perf = block("Verify, perf.");
	if (perf) {
		const items = boxes(perf.lines).map((b) => b.text.split(" ")[0]);
		if (items.join("|") !== PERF_ITEMS.join("|")) fail(perf.n, `${title}: perf boxes are [${items.join(", ")}], expected [${PERF_ITEMS.join(", ")}]`);
	}

	const gate = block("Review gate.");
	if (gate) {
		const gateBoxes = boxes(gate.lines);
		if (gate.rest.startsWith("None.")) {
			if (gateBoxes.length) fail(gate.n, `${title}: Review gate says None but has boxes`);
		} else {
			const text = gate.lines.map((l) => l.text).join("\n");
			if (gateBoxes.length === 0) fail(gate.n, `${title}: Review gate has no box`);
			for (const word of ["screenshot", "user"]) {
				if (!text.includes(word)) fail(gate.n, `${title}: Review gate lacks "${word}"`);
			}
		}
	}

	const total = boxes(body).length;
	const cells = SUB_BLOCKS.filter((s) => s !== "Depends on.").map((s) => `${s.replace(/[ ,.]+/g, "-").replace(/-$/, "").toLowerCase()}=${counts[s] ?? 0}`);
	return `${title}  boxes=${total}  ${cells.join(" ")}`;
};

if (ticketMode) {
	const heading = lines.find((l) => !l.code && /^#{1,3} /.test(l.text));
	const title = heading ? heading.text.replace(/^#+ /, "").trim() : file === "-" ? "ticket" : path.basename(file, ".md");
	console.log(checkTicket(title, heading ? heading.n : 1, lines, true));
	console.log(`1 ticket, ${problems.length} problems`);
	for (const p of problems) console.error(p);
	process.exit(problems.length ? 1 : 0);
}

const h2 = (l) => (!l.code && l.text.startsWith("## ") ? l.text.slice(3).trim() : null);
const sections = [];
for (const l of lines) {
	const title = h2(l);
	if (title !== null) sections.push({ title, n: l.n, body: [] });
	else if (sections.length) sections.at(-1).body.push(l);
}
const find = (title) => sections.find((s) => s.title === title);
const bodyText = (s) => s.body.map((l) => l.text).join("\n");

const h1 = lines.findIndex((l) => !l.code && l.text.startsWith("# "));
if (h1 === -1) fail(1, "no H1 title");
const howToRead = find("How to read this");
if (!howToRead) fail(1, 'no "## How to read this" section');
if (h1 !== -1 && howToRead) {
	const intro = lines.slice(h1 + 1).filter((l) => l.n < howToRead.n && l.text.trim() !== "");
	if (intro.length >= 10) fail(lines[h1].n, `intro is ${intro.length} lines, under ten required`);
	for (const marker of HOW_TO_READ_MARKERS) {
		if (!bodyText(howToRead).includes(marker)) fail(howToRead.n, `How to read this lacks "${marker}"`);
	}
}

const program = find("Program checklist");
if (!program) fail(1, 'no "## Program checklist" section');
else {
	const h3s = program.body.filter((l) => !l.code && l.text.startsWith("### ")).map((l) => l.text.slice(4).trim());
	let cursor = 0;
	for (const name of PROGRAM_H3) {
		const at = h3s.findIndex((t, i) => i >= cursor && t.startsWith(name));
		if (at === -1) fail(program.n, `Program checklist lacks "### ${name}" in order`);
		else cursor = at + 1;
	}
	for (const marker of PROGRAM_MARKERS) {
		if (!bodyText(program).includes(marker)) fail(program.n, `Program checklist lacks "${marker}"`);
	}
}

const close = find("Close the program");
if (!close) fail(1, 'no "## Close the program" section');
const programIndex = sections.indexOf(program);
const closeIndex = sections.indexOf(close);
const ticketSections = programIndex === -1 || closeIndex === -1 ? [] : sections.slice(programIndex + 1, closeIndex);
if (ticketSections.length === 0) fail(1, "no ticket sections between Program checklist and Close the program");

const report = ticketSections.map((t) => checkTicket(t.title, t.n, t.body, false));

if (closeIndex !== -1) {
	const tail = sections.slice(closeIndex + 1);
	for (const s of tail) {
		if (!s.title.startsWith("Appendix")) fail(s.n, `"## ${s.title}" after Close the program is not an appendix`);
	}
	if (!tail.some((s) => s.title.includes("Prototype evidence"))) fail(close.n, 'no "## Appendix ... Prototype evidence" section');
}

for (const line of report) console.log(line);
console.log(`${ticketSections.length} ticket sections, ${problems.length} problems`);
for (const p of problems) console.error(p);
process.exit(problems.length ? 1 : 0);
