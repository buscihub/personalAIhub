import 'server-only';
import { promises as fs } from 'node:fs';
import { askJson, hasKey } from './llm';
import { readSheets, sheetsConfigured } from './sheets';
import { today, timeKey } from './date';
import * as store from './store';

export const TYPES = ['liquidità', 'investito', 'debito'];

// ---------- sorgente ----------
export const financeSource = () => (sheetsConfigured() ? 'sheets' : process.env.FINANCE_FILE_PATH ? 'file' : null);

// CSV minimale (virgolette, virgole e punto e virgola come separatore)
function parseCsv(text) {
  const sep = (text.split('\n', 1)[0].match(/;/g) || []).length > (text.split('\n', 1)[0].match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

async function readFileSheets() {
  const p = process.env.FINANCE_FILE_PATH;
  if (/\.csv$/i.test(p)) return [{ name: p.split('/').pop(), rows: parseCsv(await fs.readFile(p, 'utf8')) }];
  throw new Error('formato non supportato: esporta il foglio in .csv oppure usa Google Sheets (account di servizio)');
}

// ogni foglio → griglia di testo (con tetto: righe e colonne)
export function toGrids(sheets) {
  return sheets.map((s) => {
    const rows = s.rows.slice(0, 400).map((r) => r.slice(0, 30).join('\t').replace(/\s+$/, '')).filter((l) => l.trim());
    return `### Foglio: ${s.name}\n${rows.join('\n')}`;
  }).join('\n\n').slice(0, 150_000);
}

// ---------- estrazione ----------
const SYSTEM = `Hai il contenuto di un foglio di calcolo personale (uno o più fogli, come griglie di testo separate da tab). Estrai la situazione patrimoniale.
Regole:
- Non contare due volte gli stessi importi: se c'è un foglio di riepilogo e fogli di dettaglio per conto, usa una sola delle due fonti per ogni importo.
- Da un foglio con serie storica (righe con date) usa SOLO la riga più recente, non la somma della colonna.
- Il patrimonio netto = liquidità + investito − debiti. I debiti vanno come numeri NEGATIVI nelle categorie.
- Importi come numeri (niente simboli, punto per i decimali). Valuta in codice ISO (es. EUR).
- "data" è la data di riferimento dei dati nel formato YYYY-MM-DD (quella dell'ultima riga/colonna aggiornata), oppure null se non si capisce.
- "note": segnala in italiano le ambiguità che hai incontrato (es. "non è chiaro se il foglio X sia già incluso nel totale"). Stringa vuota se nessuna.
Rispondi SOLO con un JSON: {"patrimonio":n,"valuta":"EUR","data":"YYYY-MM-DD"|null,"categorie":[{"nome":"...","valore":n,"tipo":"liquidità"|"investito"|"debito"}],"note":"..."}`;

function validate(raw) {
  const net = Number(raw?.patrimonio);
  if (!Number.isFinite(net)) throw new Error('JSON senza patrimonio numerico');
  const cats = (Array.isArray(raw.categorie) ? raw.categorie : [])
    .map((c) => ({ name: String(c.nome || '').slice(0, 80), value: Number(c.valore), type: TYPES.includes(c.tipo) ? c.tipo : 'investito' }))
    .filter((c) => c.name && Number.isFinite(c.value));
  let note = String(raw.note || '').trim();
  // controllo di coerenza: la somma delle categorie deve tornare col patrimonio
  if (cats.length) {
    const sum = cats.reduce((a, c) => a + c.value, 0);
    if (Math.abs(sum - net) > Math.max(1, Math.abs(net) * 0.005)) {
      note = `${note ? `${note} ` : ''}⚠ La somma delle categorie (${Math.round(sum)}) non torna col patrimonio (${Math.round(net)}).`.trim();
    }
  }
  return { netWorth: net, currency: String(raw.valuta || 'EUR').toUpperCase().slice(0, 3), referenceDate: /^\d{4}-\d{2}-\d{2}$/.test(raw.data || '') ? raw.data : null, categories: cats, notes: note };
}

export async function refreshFinance() {
  const source = financeSource();
  if (!source) throw new Error('nessuna sorgente configurata (GOOGLE_SHEETS_FINANCE_ID + account di servizio, oppure FINANCE_FILE_PATH)');
  if (!hasKey()) throw new Error('ANTHROPIC_API_KEY mancante: l\'estrazione usa il modello');
  const grids = toGrids(source === 'sheets' ? await readSheets() : await readFileSheets());
  if (!grids.trim()) throw new Error('il foglio è vuoto');
  const snap = validate(await askJson({ system: SYSTEM, user: grids, maxTokens: 3000, timeoutMs: 90000 }));
  const date = today();
  const saved = { ...snap, extractedAt: new Date().toISOString() };
  // un'istantanea al giorno: sovrascrive quella di oggi, conserva tutte le precedenti
  await store.updateDailyLog(date, (log) => { log.finance = saved; });
  await store.addRegistry({ type: 'finanze_aggiornate', netWorth: snap.netWorth });
  return { date, ...saved };
}

// ---------- lettura (mai il modello) ----------
export async function readFinance() {
  const logs = await store.getDailyLogs('2000-01-02', '2999-12-31'); // esclude la riga sentinella degli obiettivi
  const snaps = Object.entries(logs).filter(([, l]) => l.finance).map(([date, l]) => ({ date, ...l.finance })).sort((a, b) => a.date.localeCompare(b.date));
  const latest = snaps.at(-1) || null;
  const previous = latest ? snaps.at(-2) || null : null;
  // storico mensile: l'ultima istantanea di ogni mese
  const byMonth = new Map();
  for (const s of snaps) byMonth.set(s.date.slice(0, 7), s);
  const months = [...byMonth.values()].map((s, i, arr) => ({ month: s.date.slice(0, 7), date: s.date, netWorth: s.netWorth, delta: i ? s.netWorth - arr[i - 1].netWorth : null })).reverse();
  return {
    configured: financeSource(), hasKey: hasKey(), latest, previous,
    delta: latest && previous ? { value: latest.netWorth - previous.netWorth, since: previous.date } : null,
    spark: snaps.slice(-12).map((s) => s.netWorth), months,
    updatedAt: latest?.extractedAt || null,
  };
}
