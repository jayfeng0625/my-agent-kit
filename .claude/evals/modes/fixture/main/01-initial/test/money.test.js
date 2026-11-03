import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCents, toCents } from "../src/money.js";

test("toCents rounds dollars to whole cents", () => {
  assert.equal(toCents(1.15), 115);
  assert.equal(toCents("4.99"), 499);
});

test("formatCents groups thousands and keeps the sign", () => {
  assert.equal(formatCents(123456), "$1,234.56");
  assert.equal(formatCents(-705), "-$7.05");
  assert.equal(formatCents(0), "$0.00");
});
