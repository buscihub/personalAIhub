import 'server-only';
import { ask, hasKey } from './llm';
import { getCalendar } from './calendar';
import * as store from './store';
import { today } from './date';
import { effectiveBand } from './tasks';

const SYSTEM = `Scrivi il briefing del mattino dell'utente: breve, in italiano, MASSIMO 10 righe, senza convenevoli né saluti lunghi.
Usa solo i dati forniti: eventi di oggi, task in scadenza oggi, obiettivi della settimana, cose slittate da ieri (in ritardo). Se una sezione è vuota, salta la riga.`;

export async function buildBriefing() {
  const t = today();
  const [tasks, goals, cal] = await Promise.all([
    store.getTasks(), store.getGoals(),
    getCalendar().catch(() => null), // il calendario non deve far saltare il briefing
  ]);
  const open = tasks.filter((x) => !x.completedAt);
  const data = {
    data: t,
    eventi: (cal?.days?.[t] || []).map((e) => `${e.allDay ? 'tutto il giorno' : e.time} ${e.title}`),
    task_oggi: open.filter((x) => effectiveBand(x, t) === 'oggi').map((x) => x.title + (x.person ? ` (${x.person})` : '')),
    slittati: open.filter((x) => effectiveBand(x, t) === 'ritardo').map((x) => x.title + (x.person ? ` (${x.person})` : '')),
    obiettivi_settimana: (goals.week || []).filter((g) => !g.done).map((g) => g.name),
  };
  if (hasKey()) {
    try {
      const text = (await ask({ system: SYSTEM, user: JSON.stringify(data), maxTokens: 800, timeoutMs: 20000 })).trim();
      if (text) return text;
    } catch (e) { console.warn('[briefing] modello ko, uso il testo a regole:', e.message); }
  }
  const line = (label, arr) => (arr.length ? `${label}: ${arr.join('; ')}` : null);
  return [`Buongiorno — ${t}`, line('Agenda', data.eventi), line('Oggi', data.task_oggi), line('Slittati', data.slittati), line('Obiettivi settimana', data.obiettivi_settimana)].filter(Boolean).join('\n');
}
