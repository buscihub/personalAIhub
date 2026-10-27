import 'server-only';
import { parseIcs, expand, partsInTz, keyOf } from './ical';
import { USER_TIMEZONE, today, startOfWeek, addDays } from './date';

// Cache in memoria, 5 minuti. Sul serverless è per-istanza (nasce e muore): un sollievo, non una garanzia.
const TTL = 5 * 60 * 1000;
let cache = null; // { at, parsed }

async function feed() {
  if (cache && Date.now() - cache.at < TTL) return cache.parsed;
  const res = await fetch(process.env.GOOGLE_CALENDAR_ICAL_URL, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`feed iCal ${res.status}`);
  const parsed = parseIcs(await res.text());
  cache = { at: Date.now(), parsed };
  return parsed;
}

const pad = (n) => String(n).padStart(2, '0');

export async function getCalendar() {
  const tz = USER_TIMEZONE;
  const t = today();
  const weekStart = startOfWeek(t);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const base = { tz, today: t, weekDays, days: {}, calendar: '', configured: Boolean(process.env.GOOGLE_CALENDAR_ICAL_URL) };
  if (!base.configured) return base;

  const parsed = await feed();
  const [fy, fm, fd] = weekStart.split('-').map(Number);
  const [ty, tm, td] = addDays(t, 14).split('-').map(Number);
  // finestra: dall'inizio della settimana corrente a 14 giorni da oggi (le ricorrenze senza fine non esplodono)
  const fromMs = Date.UTC(fy, fm - 1, fd) - 86400000;
  const toMs = Date.UTC(ty, tm - 1, td) + 86400000;

  const days = {};
  const put = (key, ev) => (days[key] ||= []).push(ev);
  for (const o of expand(parsed, { fromMs, toMs, tz })) {
    if (o.allDay) {
      // tutto il giorno: le date sono "a muro" in UTC; DTEND è esclusivo
      for (let ms = o.startMs; ms < o.endMs; ms += 86400000) {
        const d = new Date(ms);
        put(keyOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()), { title: o.title, allDay: true, time: null, endTime: null, location: o.location });
      }
      continue;
    }
    const s = partsInTz(o.startMs, tz);
    const e = partsInTz(o.endMs, tz);
    put(keyOf(s.y, s.mo, s.d), {
      title: o.title, allDay: false, location: o.location,
      time: `${pad(s.h)}:${pad(s.mi)}`, endTime: o.endMs > o.startMs ? `${pad(e.h)}:${pad(e.mi)}` : null,
    });
  }
  for (const k of Object.keys(days)) days[k].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  return { ...base, days, calendar: parsed.name || 'Google Calendar', fetchedAt: new Date(cache.at).toISOString() };
}
