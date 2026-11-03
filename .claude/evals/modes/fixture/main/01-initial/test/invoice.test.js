import assert from "node:assert/strict";
import { test } from "node:test";
import { computeTotals, parseInvoice } from "../src/invoice.js";

const invoice = (lines, extra = {}) => parseInvoice({ region: "CA", lines, ...extra });

test("parseInvoice rejects an invoice with no lines", () => {
  assert.throws(() => parseInvoice({ lines: [] }), /no lines/);
});

test("parseInvoice rejects a fractional qty", () => {
  assert.throws(() => invoice([{ sku: "A", qty: 1.5, unitPrice: 1 }]), /bad qty/);
});

test("computeTotals adds tax to the gross", () => {
  const totals = computeTotals(invoice([{ sku: "A", qty: 2, unitPrice: 10 }]));
  assert.equal(totals.gross, 2000);
  assert.equal(totals.tax, 145);
  assert.equal(totals.total, 2145);
});
