import assert from "node:assert/strict";
import { test } from "node:test";
import { computeTotals, parseInvoice } from "../src/invoice.js";
import { renderReport } from "../src/report.js";

test("the report ends with the invoice total", () => {
  const totals = computeTotals(parseInvoice({ region: "OR", lines: [{ sku: "A", qty: 3, unitPrice: 2.5 }] }));
  const last = renderReport(totals).split("\n").at(-1);
  assert.match(last, /^total\s+\$7\.50$/);
});
