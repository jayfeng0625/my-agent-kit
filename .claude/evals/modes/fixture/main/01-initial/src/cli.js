#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { computeTotals, parseInvoice } from "./invoice.js";
import { formatCents } from "./money.js";

const file = process.argv[2];
if (!file) {
  console.error("usage: node src/cli.js <invoice.json>");
  process.exit(2);
}
try {
  const totals = computeTotals(parseInvoice(readFileSync(file, "utf8")));
  console.log(`total: ${formatCents(totals.total)}`);
} catch (err) {
  console.error(`error: ${err.message}`);
  process.exit(1);
}
