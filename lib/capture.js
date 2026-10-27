import 'server-only';
import { randomUUID } from 'node:crypto';
import { classify } from './classify';
import { today, timeKey } from './date';
import { dueDateFor } from './tasks';
import * as store from './store';
import { estimateMeal } from './nutritionAi';

// Pipeline di cattura, usata da dashboard e (poi) Telegram: classifica → scrive in tre posti
// (catture grezze, memoria, scheda di destinazione) → registra l'evento.
async function ensurePerson(name) {
  if (!name) return null;
  const persons = await store.getPersons();
  return persons.find((p) => p.name.toLowerCase() === name.toLowerCase()) || (await store.addPerson({ name }));
}

const HANDLERS = {
  async task(c) {
    return addTaskFrom(c);
  },
  async persone(c) {
    return addTaskFrom(c);
  },
  async nutrizione(c) {
    // stima dal modello; se non c'è, il pasto entra comunque con valori a zero da completare a mano
    const est = (await estimateMeal(c.testo)) || { name: c.titolo, p: 0, c: 0, f: 0, kcal: 0, estimated: true, pending: true };
    const meal = { id: randomUUID(), time: timeKey(), ...est };
    await store.updateDailyLog(today(), (log) => { (log.meals ||= []).push(meal); });
    return { mealId: meal.id, kcal: meal.kcal };
  },
  async obiettivi(c) {
    const bucket = c.urgenza === 'avanti' ? 'month' : 'week';
    await store.updateGoals((g) => g[bucket].push({ id: randomUUID(), name: c.titolo, done: false }));
    return { goal: bucket };
  },
};

async function addTaskFrom(c) {
  const person = await ensurePerson(c.persona);
  const task = await store.addTask({
    title: c.titolo,
    note: c.testo !== c.titolo ? c.testo : '',
    band: c.urgenza,
    dueDate: dueDateFor(c.urgenza, today()),
    person: person?.name || null,
    personId: person?.id || null,
  });
  return { taskId: task.id };
}

// Hook per le schede aggiunte dopo (nutrizione, salute…): HANDLERS[dest] = async (classificazione) => esito
export function registerHandler(dest, fn) {
  HANDLERS[dest] = fn;
}

export async function processCapture(text, source = 'dashboard') {
  const testo = String(text || '').trim().slice(0, 2000);
  if (!testo) throw new Error('testo vuoto');
  const c = { ...(await classify(testo)), testo };
  const capture = await store.addCapture({
    text: testo, source, destination: c.destinazione, title: c.titolo,
    person: c.persona, urgency: c.urgenza, via: c.via,
  });
  await store.addMemory({ text: testo, source: `cattura:${capture.id}`, destination: c.destinazione });
  let outcome = {};
  try {
    outcome = (await HANDLERS[c.destinazione]?.(c)) || {};
  } catch (e) {
    // La cattura è già salvata: un errore nella scheda di destinazione non la fa perdere.
    console.error('[capture] handler', c.destinazione, e);
    outcome = { error: e.message };
  }
  await store.addRegistry({ type: 'cattura', ref: capture.id, destination: c.destinazione, via: c.via });
  return { id: capture.id, destinazione: c.destinazione, titolo: c.titolo, persona: c.persona, urgenza: c.urgenza, via: c.via, ...outcome };
}
