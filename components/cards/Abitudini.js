'use client';

import { useEffect, useRef, useState } from 'react';
import { REFRESH, post } from '../useApi';
import { completionPct, isDone, progress } from '@/lib/habits';

// (chiave versionata: se cambia la forma dei dati si cambia la versione)
const CACHE_KEY = 'pos:habits:v1';

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}
function writeCache(v) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch {}
}

// Stato: { date, habits:[...], values:{id:valore} } — copia locale per rispondere all'istante.
export default function Abitudini() {
  const [st, setSt] = useState(null);
  // Una lettura vecchia non deve mai sovrascrivere un clic appena fatto: si scarta se, tra la partenza e
  // l'arrivo, c'è stato un gesto (epoch cambiato) oppure c'è ancora una scrittura in corso.
  const epoch = useRef(0);
  const pending = useRef(0);

  async function load() {
    const startedAt = epoch.current;
    try {
      const res = await fetch('/api/habits?days=30', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const d = await res.json();
      if (epoch.current !== startedAt || pending.current > 0) return;
      const next = { date: d.today, habits: d.habits, values: d.logs[d.today]?.habits || {} };
      setSt(next);
      writeCache(next);
    } catch (e) {
      console.warn('[abitudini] lettura fallita', e.message);
    }
  }

  useEffect(() => {
    const c = readCache();
    if (c) setSt(c); // render immediato dalla copia locale (se il giorno è cambiato la lettura la sostituisce)
    load();
    window.addEventListener(REFRESH, load);
    // al ritorno sulla scheda (telefono ↔ computer) rilegge lo stato vero
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener(REFRESH, load); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  async function click(h) {
    epoch.current++; // invalida le letture in volo
    pending.current++;
    // 1) risposta immediata (stessa logica del server)
    setSt((s) => {
      const cur = s.values[h.id];
      const nv = h.type === 'counter' ? ((Number(cur) || 0) + 1 > h.target ? 0 : (Number(cur) || 0) + 1) : !cur;
      const next = { ...s, values: { ...s.values, [h.id]: nv } };
      writeCache(next);
      return next;
    });
    // 2) scrittura dietro; se fallisce, si rilegge lo stato vero invece di lasciare a schermo una cosa non salvata
    try {
      const r = await post('/api/habits/toggle', { id: h.id });
      setSt((s) => { const next = { ...s, values: { ...s.values, [h.id]: r.value } }; writeCache(next); return next; });
    } catch (e) {
      console.error('[abitudini] salvataggio fallito', e.message);
      epoch.current++;
      pending.current--;
      load();
      return;
    }
    epoch.current++;
    pending.current--;
  }

  if (!st) return <section className="card c5" id="abitudini"><h2>Abitudini</h2><div className="muted">…</div></section>;
  const pct = completionPct(st.habits, { habits: st.values });
  return (
    <section className="card c5" id="abitudini">
      <h2>Abitudini</h2>
      <div className="row">
        <div className="ring" style={{ '--p': pct }}><span className="num">{pct}%</span></div>
        <div className="habits">
          {st.habits.map((h) => {
            const v = st.values[h.id];
            const done = isDone(h, v);
            return (
              <button key={h.id} className={done ? 'done' : ''} onClick={() => click(h)}>
                <span>{h.name}</span>
                {h.type === 'counter'
                  ? <span className="num">{Number(v) || 0} / {h.target}</span>
                  : <span className={done ? '' : 'muted'}>{done ? '✓' : '○'}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
