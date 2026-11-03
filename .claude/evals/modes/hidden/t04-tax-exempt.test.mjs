// INV-15 on the trimmed branch. TREE is the extracted commit under test.
import assert from "node:assert/strict";
import { test } from "node:test";

const { computeTotals, parseInvoice } = await import(`${process.env.TREE}/src/invoice.js`);
const { renderReport } = await import(`${process.env.TREE}/src/report.js`);
const lines = [{ sku: "A", qty: 2, unitPrice: 10 }];

test("an exempt invoice charges no tax and the report says so", () => {
  const totals = computeTotals(parseInvoice({ region: "CA", taxExempt: true, lines }));
  assert.equal(totals.tax, 0);
  assert.equal(totals.total, 2000);
  assert.match(renderReport(totals), /^tax\s+tax exempt$/m);
});

test("a taxed invoice is unchanged", () => {
  const totals = computeTotals(parseInvoice({ region: "CA", lines }));
  assert.equal(totals.tax, 145);
  assert.match(renderReport(totals), /^tax\s+\$1\.45$/m);
});
