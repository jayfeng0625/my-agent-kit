import assert from "node:assert/strict";
import { test } from "node:test";
import { computeTotals, parseInvoice } from "../src/invoice.js";
import { renderReport } from "../src/report.js";

const lines = [{ sku: "A", qty: 2, unitPrice: 10 }];

test("an exempt invoice charges no tax", () => {
  const totals = computeTotals(parseInvoice({ region: "CA", taxExempt: true, lines }));
  assert.equal(totals.tax, 0);
  assert.equal(totals.total, 2000);
});

test("the report says tax exempt on the tax row", () => {
  const totals = computeTotals(parseInvoice({ region: "CA", taxExempt: true, lines }));
  assert.match(renderReport(totals), /^tax\s+tax exempt$/m);
});
