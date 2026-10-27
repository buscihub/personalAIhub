// Una abitudine è di due tipi: 'check' (spunta) oppure 'counter' (contatore con obiettivo).
export function progress(habit, value) {
  if (habit.type === 'counter') return Math.min((Number(value) || 0) / (habit.target || 1), 1);
  return value ? 1 : 0;
}

export const isDone = (habit, value) => progress(habit, value) >= 1;

// Percentuale di completamento della giornata: spunte piene, contatori in proporzione.
export function completionPct(habits, log) {
  if (!habits.length) return 0;
  const sum = habits.reduce((a, h) => a + progress(h, log?.habits?.[h.id]), 0);
  return Math.round((sum / habits.length) * 100);
}

// Striscia: giorni consecutivi, all'indietro, con almeno un'abitudine completata.
// Se oggi non c'è ancora nulla di completato, non spezza la striscia: si parte da ieri.
export function streak(habits, logs, todayKey, addDays) {
  const anyDone = (k) => habits.some((h) => isDone(h, logs[k]?.habits?.[h.id]));
  let k = anyDone(todayKey) ? todayKey : addDays(todayKey, -1);
  let n = 0;
  while (anyDone(k)) { n++; k = addDays(k, -1); }
  return n;
}
