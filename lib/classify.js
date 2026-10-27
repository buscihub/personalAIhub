import 'server-only';
import { DESTINATIONS, URGENCIES } from './constants';
import { askJson, hasKey } from './llm';

const SYSTEM = `Sei lo smistatore di un sistema personale. Ricevi una frase detta o scritta dall'utente (in italiano) e decidi dove archiviarla.
Destinazioni possibili (usa ESATTAMENTE una di queste chiavi): ${DESTINATIONS.join(', ')}.
- task: il generico "da fare", per tutto ciò che non ha una casa più precisa
- persone: qualcosa da fare con/per una persona (chiamare, rispondere, ricordarsi di qualcuno)
- finanze: soldi, spese, fatture, pagamenti
- nutrizione: cosa ha mangiato o bevuto
- salute: peso, sonno, allenamento, sintomi, misure
- obiettivi: promesse/obiettivi della settimana o del mese
- memoria: pensieri, idee, riflessioni, fatti da ricordare
Urgenza: una tra ${URGENCIES.join(', ')} (oggi = oggi; settimana = entro la settimana; avanti = più avanti). Se non è chiaro: "oggi".
"persona" è il nome della persona coinvolta, oppure null.
"titolo" è una riformulazione breve (max ~8 parole) alla forma imperativa/chiara.
Rispondi SOLO con un oggetto JSON: {"destinazione":"...","titolo":"...","persona":null,"urgenza":"oggi"}. Nessun altro testo.`;

// Rete di sicurezza a regole: la cattura non fallisce mai, al massimo smista peggio.
const RULES = [
  ['finanze', /\b(euro|€|fattura|fatture|pagat[oaie]|pagare|bonifico|spes[aeo]|commercialista|bolletta|affitto)\b|€/i],
  ['nutrizione', /\b(mangiat[oaie]|mangiare|pranzo|cena|colazione|spuntino|kcal|calorie|bevuto)\b/i],
  ['salute', /\b(peso|pesato|dormito|sonno|allenamento|palestra|corsa|pressione|mal di|dolore|febbre)\b/i],
  ['obiettivi', /\b(obiettivo|obiettivi|entro (la )?settimana|entro (il )?mese)\b/i],
  ['persone', /\b(chiamar[ei]|richiamar[ei]|rispondere|scrivere a|mandare un messaggio|sentire|incontrare)\b/i],
  ['memoria', /\b(idea|ricordati che|ricordo|pensiero|riflessione|ho capito)\b/i],
];

export function classifyByRules(text) {
  const destinazione = RULES.find(([, re]) => re.test(text))?.[0] || 'task';
  let urgenza = 'oggi';
  if (/\b(domani|dopodomani|questa settimana|entro (la )?settimana|venerdì|giovedì|mercoledì)\b/i.test(text)) urgenza = 'settimana';
  if (/\b(prossimo mese|questo mese|entro (il )?mese|più avanti|un giorno|prima o poi|prossima settimana|l'anno prossimo)\b/i.test(text)) urgenza = 'avanti';
  const m = text.match(/\b(?:chiamar[ei]|richiamar[ei]|scrivere a|rispondere a|sentire)\s+([A-ZÀ-Ý][\p{L}]+)/u);
  return { destinazione, titolo: text.trim().slice(0, 80), persona: m ? m[1] : null, urgenza, via: 'regole' };
}

// Valida quello che torna dal modello contro l'elenco canonico: se la chiave non c'è, si cade sulle regole.
function validate(raw, text) {
  if (!raw || !DESTINATIONS.includes(raw.destinazione)) return null;
  return {
    destinazione: raw.destinazione,
    titolo: String(raw.titolo || text).trim().slice(0, 120) || text.slice(0, 80),
    persona: raw.persona ? String(raw.persona).trim() || null : null,
    urgenza: URGENCIES.includes(raw.urgenza) ? raw.urgenza : 'oggi',
  };
}

async function viaModel(text, model) {
  const raw = await askJson({ system: SYSTEM, user: text, maxTokens: 300, model, timeoutMs: 8000 });
  return validate(raw, text);
}

// Restituisce { destinazione, titolo, persona, urgenza, via: 'modello' | 'riserva' | 'regole' }
export async function classify(text) {
  if (hasKey()) {
    try {
      const r = await viaModel(text);
      if (r) return { ...r, via: 'modello' };
    } catch (e) {
      console.warn('[classify] modello primario ko:', e.message);
    }
    const fallback = process.env.ANTHROPIC_FALLBACK_MODEL;
    if (fallback) {
      try {
        const r = await viaModel(text, fallback);
        if (r) return { ...r, via: 'riserva' };
      } catch (e) {
        console.warn('[classify] riserva ko:', e.message);
      }
    }
  }
  return classifyByRules(text);
}
