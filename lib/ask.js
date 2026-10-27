import 'server-only';
import { ask, hasKey } from './llm';
import * as store from './store';
import { today, addDays } from './date';
import { effectiveBand } from './tasks';

const SYSTEM = `Sei la memoria personale dell'utente. Rispondi in italiano alla domanda usando SOLO il contesto fornito (profilo, memoria, catture, task, persone, obiettivi, salute).
Regole: cita sempre da quale voce arriva ogni affermazione, tra parentesi quadre, es. [memoria 2026-10-27], [task: Titolo], [obiettivi], [profilo]. Se un dato non c'è, dillo ("non lo so / non risulta") invece di inventarlo. Sii breve e concreto.`;

// Percorso "passa tutto": con qualche centinaio di voci il modello vede il quadro intero.
export async function answer(question) {
  if (!hasKey()) throw Object.assign(new Error('chiave API mancante'), { code: 'nokey' });
  const t = today();
  const [profile, memory, captures, tasks, persons, goals, logs] = await Promise.all([
    store.getProfile(), store.getMemory(), store.getCaptures(60), store.getTasks(), store.getPersons(), store.getGoals(),
    store.getDailyLogs(addDays(t, -29), t),
  ]);
  const ctx = {
    oggi: t, profilo: profile,
    memoria: memory.slice(0, 400).map((m) => ({ data: m.createdAt.slice(0, 10), testo: m.text, dest: m.destination })),
    catture_recenti: captures.map((c) => ({ data: c.createdAt.slice(0, 10), testo: c.text, dest: c.destination })),
    task: tasks.map((x) => ({ titolo: x.title, fascia: effectiveBand(x, t), persona: x.person, nota: x.note, completato: Boolean(x.completedAt), tag: x.tags })),
    persone: persons.map((p) => p.name),
    obiettivi: goals,
    pasti_30gg: Object.fromEntries(Object.entries(logs).filter(([, l]) => l.meals?.length).map(([d, l]) => [d, l.meals.map((m) => `${m.name} ${m.kcal}kcal`)])),
  };
  return ask({ system: SYSTEM, user: `Contesto:\n${JSON.stringify(ctx)}\n\nDomanda: ${question}`, maxTokens: 3000, timeoutMs: 40000 });
}
