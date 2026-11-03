// Plain-text invoice report: one row per line, then the totals.
export function renderReport(totals) {
  const header = `${"SKU".padEnd(10)}${"QTY".padStart(5)}${"AMOUNT".padStart(14)}`;
  const rows = totals.lines.map(
    (line) => `${line.sku.padEnd(10)}${String(line.qty).padStart(5)}${fmt(line.gross).padStart(14)}`,
  );
  const sums = [
    ["subtotal", totals.gross],
    ["discount", -totals.discount],
    ["tax", totals.tax],
    ["total", totals.total],
  ].map(([label, cents]) => `${label.padEnd(15)}${fmt(cents).padStart(14)}`);
  return [header, ...rows, "-".repeat(29), ...sums].join("\n");
}

function fmt(cents) {
  const negative = cents < 0;
  const whole = Math.trunc(Math.abs(cents) / 100);
  const frac = Math.abs(cents) % 100;
  return (negative ? "-$" : "$") + whole.toLocaleString("en-US") + "." + (frac < 10 ? "0" + frac : String(frac));
}
