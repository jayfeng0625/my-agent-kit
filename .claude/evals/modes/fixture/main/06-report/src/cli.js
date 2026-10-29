#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { computeTotals, parseInvoice } from "./invoice.js";
import { renderReport } from "./report.js";

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
if (!file) {
  console.error("usage: node src/cli.js [--summary] <invoice.json>");
  process.exit(2);
}
try {
  const totals = computeTotals(parseInvoice(readFileSync(file, "utf8")));
  console.log(args.includes("--summary") ? `total: ${money(totals.total)}` : renderReport(totals));
} catch (err) {
  console.error(`error: ${err.message}`);
  process.exit(1);
}

function money(cents) {
  const abs = Math.abs(cents);
  const text = `$${Math.floor(abs / 100).toLocaleString("en-US")}.${String(abs % 100).padStart(2, "0")}`;
  return cents < 0 ? `-${text}` : text;
}
