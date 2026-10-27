// Tutta la formattazione dei numeri vive qui. minimumGroupingDigits:1 → 7.150 e 12.400 si allineano.
const int = new Intl.NumberFormat('it-IT', { minimumGroupingDigits: 1, maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat('it-IT', { minimumGroupingDigits: 1, maximumFractionDigits: 1 });
const eur = new Intl.NumberFormat('it-IT', { minimumGroupingDigits: 1, maximumFractionDigits: 0 });

export const fmtInt = (n) => int.format(n ?? 0);
export const fmtDec = (n) => dec1.format(n ?? 0);
export function fmtMoney(n, currency = 'EUR') {
  const sym = currency === 'EUR' ? '€' : currency;
  const s = eur.format(Math.abs(n ?? 0));
  return `${n < 0 ? '− ' : ''}${sym} ${s}`;
}
export function fmtDelta(n, currency = 'EUR') {
  const sym = currency === 'EUR' ? '€' : currency;
  const s = eur.format(Math.abs(n ?? 0));
  return `${n < 0 ? '−' : '+'} ${sym} ${s}`;
}
