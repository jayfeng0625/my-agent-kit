import { toCents } from "./money.js";
import { rateFor } from "./rates.js";

export function parseInvoice(raw) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(data.lines) || data.lines.length === 0) {
    throw new Error("invoice has no lines");
  }
  const lines = data.lines.map((line, i) => {
    if (!line.sku) throw new Error(`line ${i + 1}: missing sku`);
    const qty = Number(line.qty);
    if (!Number.isInteger(qty) || qty <= 0) throw new Error(`line ${i + 1}: bad qty`);
    return {
      sku: line.sku,
      description: line.description ?? "",
      qty,
      unitCents: toCents(line.unitPrice),
    };
  });
  const repeated = lines.filter((line, i) => lines.findIndex((other) => other.sku === line.sku) !== i);
  if (repeated.length > 0) throw new Error(`duplicate sku: ${repeated[0].sku}`);
  return {
    customer: data.customer ?? "",
    region: data.region ?? "CA",
    discountPct: Number(data.discountPct ?? 0),
    lines,
  };
}

export function computeTotals(invoice) {
  const rate = rateFor(invoice.region);
  const lines = invoice.lines.map((line) => {
    const gross = line.qty * line.unitCents;
    const discount = Math.round((gross * invoice.discountPct) / 100);
    const tax = Math.round(gross * rate);
    return { ...line, gross, discount, tax, total: gross - discount + tax };
  });
  const sum = (key) => lines.reduce((acc, line) => acc + line[key], 0);
  return {
    lines,
    gross: sum("gross"),
    discount: sum("discount"),
    tax: sum("tax"),
    total: sum("total"),
  };
}
