// Money is held as integer cents everywhere past parsing.
export function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

export function formatCents(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  const rest = String(abs % 100).padStart(2, "0");
  return `${sign}$${dollars}.${rest}`;
}

export function legacyRound(amount) {
  return Math.floor(amount + 0.5);
}
