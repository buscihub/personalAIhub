// L'UNICA funzione che dice "che giorno è oggi". Usa il fuso dell'utente, mai quello del server.
export const USER_TIMEZONE = process.env.USER_TIMEZONE || 'Europe/Rome';

const keyFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: USER_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

// 'YYYY-MM-DD' di un istante, nel fuso dell'utente.
export function dateKey(d = new Date()) {
  return keyFmt.format(d);
}

export function today() {
  return dateKey(new Date());
}

// Somma giorni a una chiave 'YYYY-MM-DD' (aritmetica su UTC, senza passare dal fuso del server).
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

// 0 = lunedì … 6 = domenica
export function weekdayIndex(key) {
  const [y, m, d] = key.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function startOfWeek(key = today()) {
  return addDays(key, -weekdayIndex(key));
}

export function endOfWeek(key = today()) {
  return addDays(startOfWeek(key), 6);
}

export function range(from, to) {
  const out = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

// HH:MM dell'istante nel fuso dell'utente
export function timeKey(d = new Date()) {
  return new Intl.DateTimeFormat('it-IT', { timeZone: USER_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}
