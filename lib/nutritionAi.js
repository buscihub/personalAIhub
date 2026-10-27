import 'server-only';
import { askJson, hasKey } from './llm';
import { kcalFrom, num, splitKcal } from './nutrition';

const EST_SYSTEM = `Sei un nutrizionista pratico. Ricevi la descrizione (in italiano) di un pasto e stimi calorie e macro per le porzioni plausibili indicate (se non indicate, porzioni normali).
Rispondi SOLO con un JSON: {"nome":"nome breve del pasto","proteine":g,"carboidrati":g,"grassi":g}. Numeri, nessun altro testo. Le calorie le calcola il codice.`;

const RED_SYSTEM = `Hai il nome di un pasto e le sue calorie totali CORRETTE dall'utente (la porzione stimata era sbagliata).
Restituisci SOLO un JSON {"proteine":g,"carboidrati":g,"grassi":g} con una composizione plausibile per quel pasto che rispetti il più possibile 4*proteine + 4*carboidrati + 9*grassi = calorie. Nessun altro testo.`;

// → { name, kcal, p, c, f, estimated, via } oppure null se il modello non è disponibile
export async function estimateMeal(text) {
  if (!hasKey()) return null;
  try {
    const r = await askJson({ system: EST_SYSTEM, user: text, maxTokens: 300, timeoutMs: 15000 });
    const p = num(r.proteine), c = num(r.carboidrati), f = num(r.grassi);
    return { name: String(r.nome || text).slice(0, 80), p, c, f, kcal: kcalFrom(p, c, f), estimated: true, via: 'modello' };
  } catch (e) {
    console.warn('[nutrition] stima ko:', e.message);
    return null;
  }
}

// → { p, c, f, via }
export async function redistribute(name, kcal) {
  if (hasKey()) {
    try {
      const r = await askJson({ system: RED_SYSTEM, user: `Pasto: ${name}\nCalorie: ${kcal}`, maxTokens: 200, timeoutMs: 15000 });
      const p = num(r.proteine), c = num(r.carboidrati), f = num(r.grassi);
      if (p + c + f > 0) return { p, c, f, via: 'modello' };
    } catch (e) {
      console.warn('[nutrition] ridistribuzione ko:', e.message);
    }
  }
  return { ...splitKcal(kcal), via: 'proporzioni' };
}
