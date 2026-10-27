// Tutta la formattazione dei numeri vive qui. 7.150 e 12.400 devono allinearsi: it-IT non raggruppa le
// quattro cifre e `minimumGroupingDigits` non è onorato da tutti i browser → si usa de-DE (stessa notazione,
// punto per le migliaia e virgola per i decimali, ma raggruppa anche da quattro cifre).
const LOCALE = 'de-DE';
const int = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const eur = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

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
