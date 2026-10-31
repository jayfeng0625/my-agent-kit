import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInvoice } from "../src/invoice.js";

test("a repeated SKU is rejected by name", () => {
  const lines = [
    { sku: "A", qty: 1, unitPrice: 1 },
    { sku: "B", qty: 1, unitPrice: 1 },
    { sku: "A", qty: 2, unitPrice: 1 },
  ];
  assert.throws(() => parseInvoice({ lines }), /duplicate sku: A/);
});
