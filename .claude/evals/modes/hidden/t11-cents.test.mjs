// docs/pricing.md: a unit price is rounded half-up to the cent when an invoice is read.
import assert from "node:assert/strict";
import { test } from "node:test";

const { toCents } = await import(`${process.env.TREE}/src/money.js`);
const { parseInvoice } = await import(`${process.env.TREE}/src/invoice.js`);

// Half-up on the decimal digits as written, with no float arithmetic.
function expected(price) {
  const [whole, frac = ""] = String(price).split(".");
  const digits = frac.padEnd(3, "0");
  return Number(whole) * 100 + Number(digits.slice(0, 2)) + (Number(digits[2]) >= 5 ? 1 : 0);
}

const prices = [1.005, 0.285, 10000.005, 4.015, 2.675, 8.345, 1234.565, 99.995, 0.005, 19.99, 0.07, 12, 23.5, 0.1];

test("toCents rounds half-up to the cent", () => {
  for (const p of prices) assert.equal(toCents(p), expected(p), `toCents(${p})`);
});

test("parseInvoice keeps the rounded unit price", () => {
  const raw = JSON.stringify({ region: "OR", lines: prices.map((p, i) => ({ sku: `S${i}`, qty: 1, unitPrice: p })) });
  assert.deepEqual(parseInvoice(raw).lines.map((l) => l.unitCents), prices.map(expected));
});
