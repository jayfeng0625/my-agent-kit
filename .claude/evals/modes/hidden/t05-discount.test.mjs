// docs/pricing.md: tax is charged on the discounted amount, rounded per line.
import assert from "node:assert/strict";
import { test } from "node:test";

const { computeTotals, parseInvoice } = await import(`${process.env.TREE}/src/invoice.js`);
const RATES = { CA: 0.0725, NY: 0.04, TX: 0.0625, OR: 0, WA: 0.065 };

function expected(raw) {
  const lines = raw.lines.map((l) => {
    const gross = l.qty * Math.round(l.unitPrice * 100);
    const discount = Math.round((gross * (raw.discountPct ?? 0)) / 100);
    const tax = Math.round((gross - discount) * RATES[raw.region]);
    return { gross, discount, tax, total: gross - discount + tax };
  });
  const sum = (k) => lines.reduce((a, l) => a + l[k], 0);
  return { lineTax: lines.map((l) => l.tax), discount: sum("discount"), tax: sum("tax"), total: sum("total") };
}

const cases = [
  { region: "NY", discountPct: 10, lines: [{ sku: "DESK-2", qty: 2, unitPrice: 349 }, { sku: "LAMP-9", qty: 4, unitPrice: 24.75 }] },
  { region: "CA", discountPct: 15, lines: [{ sku: "A", qty: 3, unitPrice: 19.99 }, { sku: "B", qty: 1, unitPrice: 0.1 }] },
  { region: "WA", discountPct: 33, lines: [{ sku: "A", qty: 7, unitPrice: 2.35 }] },
  { region: "CA", lines: [{ sku: "A", qty: 1, unitPrice: 0.1 }, { sku: "B", qty: 1, unitPrice: 0.1 }] },
];

for (const [i, raw] of cases.entries()) {
  test(`invoice ${i + 1} follows the pricing rules`, () => {
    const totals = computeTotals(parseInvoice(raw));
    const want = expected(raw);
    assert.deepEqual(totals.lines.map((l) => l.tax), want.lineTax);
    assert.equal(totals.discount, want.discount);
    assert.equal(totals.tax, want.tax);
    assert.equal(totals.total, want.total);
  });
}
