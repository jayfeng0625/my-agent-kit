import { toCents } from "./money.js";

const RATES = { CA: 0.0725, NY: 0.04, TX: 0.0625, OR: 0, WA: 0.065 };

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
  return { customer: data.customer ?? "", region: data.region ?? "CA", lines };
}

export function computeTotals(invoice) {
  const rate = RATES[invoice.region];
  if (rate === undefined) throw new Error(`unknown region: ${invoice.region}`);
  const lines = invoice.lines.map((line) => ({ ...line, gross: line.qty * line.unitCents }));
  const gross = lines.reduce((sum, line) => sum + line.gross, 0);
  const tax = Math.round(gross * rate);
  return { lines, gross, tax, total: gross + tax };
}
