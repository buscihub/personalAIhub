import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// UNICO punto di accesso ai dati. Backend attuale: file JSON.
// Quando si passa a Supabase si riscrive SOLO questo file, mantenendo le stesse firme.

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'personalos.json');
const SEED = path.join(DATA_DIR, 'seed.json');

// Riga sentinella con data fissa: ci vivono gli obiettivi, che non si azzerano mai da soli (vedi CLAUDE.md).
export const GOALS_KEY = '2000-01-01';

// Serializza le scritture: due richieste simultanee non si sovrascrivono a vicenda.
let queue = Promise.resolve();

async function load() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    await fs.copyFile(SEED, FILE);
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  }
}

async function save(state) {
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2));
  await fs.rename(tmp, FILE);
}

// Legge-modifica-scrive in coda. fn riceve lo stato, lo muta, e restituisce il risultato.
function mutate(fn) {
  const run = queue.then(async () => {
    const state = await load();
    const result = await fn(state);
    await save(state);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

const read = async (fn) => {
  await queue;
  return fn(await load());
};

const now = () => new Date().toISOString();

// ---------- stato intero / reset ----------
export const getState = () => read((s) => s);
export async function resetState() {
  await queue;
  await fs.copyFile(SEED, FILE);
}

// ---------- profilo ----------
export const getProfile = () => read((s) => s.profile);
export const updateProfile = (patch) =>
  mutate((s) => { s.profile = { ...s.profile, ...patch }; return s.profile; });

// ---------- catture ----------
export const getCaptures = (limit = 20) => read((s) => s.captures.slice(0, limit));
export const addCapture = (c) =>
  mutate((s) => {
    const row = { id: randomUUID(), createdAt: now(), ...c };
    s.captures.unshift(row);
    return row;
  });
export const updateCapture = (id, patch) =>
  mutate((s) => {
    const c = s.captures.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
    return c;
  });
export const getCapture = (id) => read((s) => s.captures.find((x) => x.id === id) || null);

// ---------- task (CRM) ----------
export const getTasks = () => read((s) => s.tasks);
export const addTask = (t) =>
  mutate((s) => {
    const row = {
      id: randomUUID(), title: '', note: '', band: 'oggi', temp: 'tiepido',
      person: null, tags: [], createdAt: now(), completedAt: null, dueDate: null, ...t,
    };
    // nuovo elemento → in testa alla sua fascia
    const min = Math.min(0, ...s.tasks.filter((x) => x.band === row.band).map((x) => x.position ?? 0));
    row.position = min - 1;
    s.tasks.push(row);
    return row;
  });
export const updateTask = (id, patch) =>
  mutate((s) => {
    const t = s.tasks.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
    return t || null;
  });
export const deleteTask = (id) =>
  mutate((s) => { s.tasks = s.tasks.filter((x) => x.id !== id); return true; });
// positions: { [id]: position } — riscrive le posizioni (e opzionalmente la fascia) in blocco
export const reorderTasks = (updates) =>
  mutate((s) => {
    for (const u of updates) {
      const t = s.tasks.find((x) => x.id === u.id);
      if (t) { t.position = u.position; if (u.band) t.band = u.band; if ('dueDate' in u) t.dueDate = u.dueDate; }
    }
    return true;
  });

// ---------- persone ----------
export const getPersons = () => read((s) => s.persons);
export const addPerson = (p) =>
  mutate((s) => {
    const row = { id: randomUUID(), name: '', organization: '', type: '', meta: {}, createdAt: now(), ...p };
    s.persons.push(row);
    return row;
  });
export const updatePerson = (id, patch) =>
  mutate((s) => {
    const p = s.persons.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    return p || null;
  });

// ---------- memoria ----------
export const getMemory = () => read((s) => s.memory);
export const addMemory = (m) =>
  mutate((s) => {
    const row = { id: randomUUID(), createdAt: now(), ...m };
    s.memory.unshift(row);
    return row;
  });

// ---------- registro ----------
export const getRegistry = (limit = 200) => read((s) => s.registry.slice(0, limit));
export const addRegistry = (event) =>
  mutate((s) => {
    const row = { id: randomUUID(), at: now(), ...event };
    s.registry.unshift(row);
    return row;
  });

// ---------- log giornalieri ----------
const emptyLog = () => ({ habits: {}, meals: [], goals: null, finance: null });

// Legge il log di una data; se la riga non esiste la crea.
export const getDailyLog = (date) =>
  mutate((s) => {
    if (!s.dailyLogs[date]) s.dailyLogs[date] = emptyLog();
    return s.dailyLogs[date];
  });
// fn(log) muta il log e può restituire un valore
export const updateDailyLog = (date, fn) =>
  mutate((s) => {
    if (!s.dailyLogs[date]) s.dailyLogs[date] = emptyLog();
    const out = fn(s.dailyLogs[date]);
    return out === undefined ? s.dailyLogs[date] : out;
  });
// Solo righe esistenti, mai crea. Chiavi 'YYYY-MM-DD' comprese tra from e to.
export const getDailyLogs = (from, to) =>
  read((s) =>
    Object.fromEntries(Object.entries(s.dailyLogs).filter(([k]) => k >= from && k <= to))
  );

// ---------- obiettivi (riga sentinella) ----------
export const getGoals = () =>
  read((s) => s.dailyLogs[GOALS_KEY]?.goals || { week: [], month: [] });
export const setGoals = (goals) =>
  mutate((s) => {
    if (!s.dailyLogs[GOALS_KEY]) s.dailyLogs[GOALS_KEY] = emptyLog();
    s.dailyLogs[GOALS_KEY].goals = goals;
    return goals;
  });
// Modifica atomica (dentro la coda di scrittura): evita che due clic ravvicinati si sovrascrivano.
export const updateGoals = (fn) =>
  mutate((s) => {
    if (!s.dailyLogs[GOALS_KEY]) s.dailyLogs[GOALS_KEY] = emptyLog();
    const log = s.dailyLogs[GOALS_KEY];
    log.goals ||= { week: [], month: [] };
    log.goals.week ||= []; log.goals.month ||= [];
    fn(log.goals);
    return log.goals;
  });
