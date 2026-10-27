// Parser iCal in puro JavaScript (nessuna libreria: quelle diffuse si rompono nel bundler serverless).
// Gestisce: righe spezzate, TZID, UTC, date "tutto il giorno", RRULE (DAILY/WEEKLY/MONTHLY/YEARLY con
// INTERVAL/COUNT/UNTIL/BYDAY/BYMONTHDAY/BYMONTH), EXDATE e RECURRENCE-ID (istanze modificate).

const DAY = 86400000;
const WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// ---------- tempo ----------
const dtfCache = new Map();
function dtf(tz) {
  if (!dtfCache.has(tz)) {
    dtfCache.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    }));
  }
  return dtfCache.get(tz);
}
// offset (ms) del fuso rispetto a UTC in un dato istante
function tzOffset(ms, tz) {
  const p = Object.fromEntries(dtf(tz).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}
// ora "a muro" in un fuso → istante UTC (ms). Due passate per gestire il cambio ora legale.
export function zonedToUtc(y, mo, d, h, mi, s, tz) {
  if (tz === 'UTC') return Date.UTC(y, mo - 1, d, h, mi, s);
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  let t = guess - tzOffset(guess, tz);
  t = guess - tzOffset(t, tz);
  return t;
}
export function partsInTz(ms, tz) {
  const p = Object.fromEntries(dtf(tz).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}
const pad = (n) => String(n).padStart(2, '0');
export const keyOf = (y, mo, d) => `${y}-${pad(mo)}-${pad(d)}`;
const utcDay = (y, mo, d) => Math.floor(Date.UTC(y, mo - 1, d) / DAY);

// ---------- parsing righe ----------
function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}
function parseLine(line) {
  const i = line.indexOf(':');
  if (i < 0) return null;
  const head = line.slice(0, i);
  const value = line.slice(i + 1);
  const [name, ...params] = head.split(';');
  const p = {};
  for (const x of params) { const [k, v] = x.split('='); p[k.toUpperCase()] = (v || '').replace(/^"|"$/g, ''); }
  return { name: name.toUpperCase(), params: p, value };
}
const unescape = (s) => s.replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\;/g, ';').replace(/\\\\/g, '\\');

// '20261027T093000Z' | '20261027T093000' | '20261027' → { y, mo, d, h, mi, s, utc, allDay }
function parseDate(value, params) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const allDay = !m[4] || params.VALUE === 'DATE';
  return { y: +m[1], mo: +m[2], d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0), s: +(m[6] || 0), utc: Boolean(m[7]), allDay, tz: m[7] ? 'UTC' : params.TZID || null };
}

export function parseIcs(text) {
  const lines = unfold(text);
  const events = [];
  let cal = { name: '' };
  let cur = null;
  for (const raw of lines) {
    const l = parseLine(raw);
    if (!l) continue;
    if (l.name === 'BEGIN' && l.value === 'VEVENT') { cur = { exdates: [] }; continue; }
    if (l.name === 'END' && l.value === 'VEVENT') { if (cur?.start) events.push(cur); cur = null; continue; }
    if (!cur) { if (l.name === 'X-WR-CALNAME') cal.name = unescape(l.value); continue; }
    switch (l.name) {
      case 'UID': cur.uid = l.value; break;
      case 'SUMMARY': cur.title = unescape(l.value); break;
      case 'LOCATION': cur.location = unescape(l.value); break;
      case 'STATUS': cur.status = l.value.toUpperCase(); break;
      case 'DTSTART': cur.start = parseDate(l.value, l.params); break;
      case 'DTEND': cur.end = parseDate(l.value, l.params); break;
      case 'RRULE': cur.rrule = Object.fromEntries(l.value.split(';').map((x) => x.split('='))); break;
      case 'EXDATE': for (const v of l.value.split(',')) { const d = parseDate(v, l.params); if (d) cur.exdates.push(d); } break;
      case 'RECURRENCE-ID': cur.recurrenceId = parseDate(l.value, l.params); break;
    }
  }
  return { name: cal.name, events };
}

// ---------- espansione ----------
function dateToMs(d, tz) {
  if (d.allDay) return Date.UTC(d.y, d.mo - 1, d.d);
  return zonedToUtc(d.y, d.mo, d.d, d.h, d.mi, d.s, d.utc ? 'UTC' : d.tz || tz);
}

function matchesRule(rule, start, y, mo, d) {
  const interval = Math.max(1, parseInt(rule.INTERVAL || '1', 10));
  const dayNum = utcDay(y, mo, d);
  const startNum = utcDay(start.y, start.mo, start.d);
  if (dayNum < startNum) return false;
  const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  const byday = rule.BYDAY ? rule.BYDAY.split(',') : null;
  const bymonthday = rule.BYMONTHDAY ? rule.BYMONTHDAY.split(',').map(Number) : null;
  const bymonth = rule.BYMONTH ? rule.BYMONTH.split(',').map(Number) : null;
  if (bymonth && !bymonth.includes(mo)) return false;
  switch (rule.FREQ) {
    case 'DAILY':
      return (dayNum - startNum) % interval === 0;
    case 'WEEKLY': {
      const startWd = new Date(Date.UTC(start.y, start.mo - 1, start.d)).getUTCDay();
      const weekStart = (n, w) => n - ((w + 6) % 7); // lunedì della settimana
      const weeks = Math.floor((weekStart(dayNum, wd) - weekStart(startNum, startWd)) / 7);
      if (weeks % interval !== 0) return false;
      const days = byday ? byday.map((x) => WD.indexOf(x.slice(-2))) : [startWd];
      return days.includes(wd);
    }
    case 'MONTHLY': {
      const months = (y - start.y) * 12 + (mo - start.mo);
      if (months % interval !== 0) return false;
      if (byday) {
        return byday.some((x) => {
          if (WD.indexOf(x.slice(-2)) !== wd) return false;
          const n = parseInt(x, 10);
          if (!n) return true;
          const nth = Math.floor((d - 1) / 7) + 1;
          if (n > 0) return nth === n;
          const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
          return Math.floor((dim - d) / 7) + 1 === -n;
        });
      }
      return (bymonthday || [start.d]).includes(d);
    }
    case 'YEARLY': {
      if ((y - start.y) % interval !== 0) return false;
      if (byday) return mo === (bymonth?.[0] ?? start.mo) && byday.some((x) => WD.indexOf(x.slice(-2)) === wd);
      return mo === (bymonth?.[0] ?? start.mo) && (bymonthday || [start.d]).includes(d);
    }
    default:
      return false;
  }
}

// Espande gli eventi nell'intervallo [fromMs, toMs). Restituisce occorrenze con istante di inizio/fine.
export function expand(parsed, { fromMs, toMs, tz }) {
  const out = [];
  const overrides = new Set(
    parsed.events.filter((e) => e.recurrenceId).map((e) => `${e.uid}|${keyOf(e.recurrenceId.y, e.recurrenceId.mo, e.recurrenceId.d)}`)
  );
  for (const ev of parsed.events) {
    if (ev.status === 'CANCELLED') continue;
    const durMs = ev.end
      ? Math.max(0, dateToMs(ev.end, tz) - dateToMs(ev.start, tz))
      : ev.start.allDay ? DAY : 0;
    const push = (startMs) => {
      const endMs = startMs + durMs;
      if (endMs > fromMs && startMs < toMs || (durMs === 0 && startMs >= fromMs && startMs < toMs)) {
        out.push({ uid: ev.uid, title: ev.title || '(senza titolo)', location: ev.location || '', startMs, endMs, allDay: ev.start.allDay });
      }
    };
    if (!ev.rrule) { push(dateToMs(ev.start, tz)); continue; }

    const rule = ev.rrule;
    const until = rule.UNTIL ? parseDate(rule.UNTIL, {}) : null;
    const untilMs = until ? dateToMs(until, tz) : Infinity;
    const count = rule.COUNT ? parseInt(rule.COUNT, 10) : Infinity;
    const ex = new Set(ev.exdates.map((x) => keyOf(x.y, x.mo, x.d)));
    const startNum = utcDay(ev.start.y, ev.start.mo, ev.start.d);
    // finestra in giorni "a muro" (con margine di un giorno per i fusi)
    const wFrom = Math.floor(fromMs / DAY) - 2;
    const wTo = Math.ceil(toMs / DAY) + 1;
    let n = 0;
    for (let dn = startNum; dn <= wTo && n < count; dn++) {
      const dt = new Date(dn * DAY);
      const y = dt.getUTCFullYear(), mo = dt.getUTCMonth() + 1, d = dt.getUTCDate();
      if (!matchesRule(rule, ev.start, y, mo, d)) continue;
      const ms = dateToMs({ ...ev.start, y, mo, d }, tz);
      if (ms > untilMs) break;
      n++;
      if (dn < wFrom) continue;
      const k = keyOf(y, mo, d);
      if (ex.has(k) || overrides.has(`${ev.uid}|${k}`)) continue;
      push(ms);
    }
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}
