// Formula esatta: dove esiste una formula, la formula vince sul modello. Vale lato client e server.
export const kcalFrom = (p, c, f) => Math.round(4 * (Number(p) || 0) + 4 * (Number(c) || 0) + 9 * (Number(f) || 0));

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
};

// Ripartizione di ripiego (senza modello): 25% proteine, 45% carboidrati, 30% grassi dell'energia.
export function splitKcal(kcal) {
  const k = Number(kcal) || 0;
  return { p: num((k * 0.25) / 4), c: num((k * 0.45) / 4), f: num((k * 0.3) / 9) };
}
