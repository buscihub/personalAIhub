'use client';

import { useEffect, useRef, useState } from 'react';
import { REFRESH, post } from '../useApi';
import { fmtInt } from '@/lib/format';
import { kcalFrom } from '@/lib/nutrition';

async function api(url, body, method = 'POST') {
  const res = await fetch(url, { method, cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { const e = new Error(String(res.status)); e.status = res.status; throw e; }
  return res.json();
}

export default function Nutrizione() {
  const [st, setSt] = useState(null); // { goal, meals }
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [openId, setOpenId] = useState(null);

  async function load() {
    try {
      const res = await fetch('/api/nutrition', { cache: 'no-store' });
      if (res.ok) setSt(await res.json());
    } catch {}
  }
  useEffect(() => {
    load();
    window.addEventListener(REFRESH, load);
    return () => window.removeEventListener(REFRESH, load);
  }, []);

  async function add(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setBusy(true); setNote('');
    try {
      let est;
      try { est = await api('/api/nutrition/estimate', { text: t }); }
      catch (err) {
        if (err.status !== 503) throw err;
        est = { name: t, p: 0, c: 0, f: 0, kcal: 0, estimated: true };
        setNote('Stima non disponibile (manca la chiave API): pasto aggiunto a zero, completalo a mano.');
      }
      await api('/api/nutrition', est);
      setText('');
    } catch { setNote('Non sono riuscito ad aggiungere il pasto.'); }
    setBusy(false);
    load();
  }

  async function save(meal, change) {
    const next = { ...meal, ...change, estimated: false };
    setSt((s) => ({ ...s, meals: s.meals.map((m) => (m.id === meal.id ? next : m)) }));
    try { await api('/api/nutrition', next, 'PATCH'); } catch { setNote('Salvataggio non riuscito.'); load(); }
  }
  async function remove(id) {
    setSt((s) => ({ ...s, meals: s.meals.filter((m) => m.id !== id) }));
    try { await api('/api/nutrition', { id }, 'DELETE'); } catch { load(); }
  }

  if (!st) return <section className="card c4" id="nutrizione"><h2>Nutrizione</h2><div className="muted">…</div></section>;

  const tot = st.meals.reduce((a, m) => ({ k: a.k + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { k: 0, p: 0, c: 0, f: 0 });
  const pct = (v, goal) => Math.min(100, Math.round((v / goal) * 100));
  // macro: barre rispetto a una ripartizione di riferimento dell'obiettivo (25/45/30 dell'energia)
  const ref = { p: (st.goal * 0.25) / 4, c: (st.goal * 0.45) / 4, f: (st.goal * 0.3) / 9 };
  const over = tot.k > st.goal;

  return (
    <section className="card c4" id="nutrizione">
      <h2>Nutrizione</h2>
      <div className="row between">
        <span className="big num">{fmtInt(tot.k)}</span>
        <span className="muted num">/ {fmtInt(st.goal)} kcal</span>
      </div>
      <div className="bar"><i style={{ width: `${pct(tot.k, st.goal)}%`, background: over ? 'var(--warn)' : undefined }} /></div>
      {[['Proteine', 'p'], ['Carbo', 'c'], ['Grassi', 'f']].map(([label, k]) => (
        <div className="macro" key={k}><span>{label}</span><div className="bar"><i style={{ width: `${pct(tot[k], ref[k])}%` }} /></div><span className="num">{fmtInt(tot[k])} g</span></div>
      ))}

      <form onSubmit={add} className="meal-add">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Cosa hai mangiato? (Invio)" disabled={busy} />
      </form>
      {note && <div className="muted" style={{ fontSize: 12 }}>{note}</div>}

      <div className="meals">
        {st.meals.length === 0 && <div className="muted">Nessun pasto registrato oggi.</div>}
        {st.meals.map((m) => (
          <Meal key={m.id} meal={m} open={openId === m.id} onToggle={() => setOpenId(openId === m.id ? null : m.id)} onSave={(c) => save(m, c)} onRemove={() => remove(m.id)} />
        ))}
      </div>
    </section>
  );
}

function Meal({ meal, open, onToggle, onSave, onRemove }) {
  const [kcal, setKcal] = useState(String(meal.kcal));
  const timer = useRef(null);
  useEffect(() => { setKcal(String(meal.kcal)); }, [meal.kcal]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // macro → le calorie si ricalcolano con la formula, all'istante, senza chiamate
  const setMacro = (k, v) => {
    const n = { p: meal.p, c: meal.c, f: meal.f, [k]: Number(v) || 0 };
    onSave({ [k]: n[k], kcal: kcalFrom(n.p, n.c, n.f) });
  };
  // calorie → il modello ridistribuisce i macro, ma SOLO a digitazione conclusa
  const onKcal = (v) => {
    setKcal(v);
    clearTimeout(timer.current);
    const k = Number(v);
    if (!k || k === meal.kcal) return;
    timer.current = setTimeout(async () => {
      try {
        const r = await api('/api/nutrition/redistribute', { name: meal.name, kcal: k });
        onSave({ kcal: k, p: r.p, c: r.c, f: r.f });
      } catch { onSave({ kcal: k }); }
    }, 900);
  };

  return (
    <div className="meal">
      <div className="row between meal-head" onClick={onToggle}>
        <span><span className="num muted">{meal.time}</span> {meal.name} {meal.estimated && <span className="pill">{meal.pending ? 'da completare' : 'stima'}</span>}</span>
        <span className="num">{fmtInt(meal.kcal)}</span>
      </div>
      {open && (
        <div className="meal-edit">
          <label>kcal<input inputMode="numeric" value={kcal} onChange={(e) => onKcal(e.target.value)} /></label>
          <label>P<input inputMode="decimal" defaultValue={meal.p} key={`p${meal.p}`} onBlur={(e) => setMacro('p', e.target.value)} /></label>
          <label>C<input inputMode="decimal" defaultValue={meal.c} key={`c${meal.c}`} onBlur={(e) => setMacro('c', e.target.value)} /></label>
          <label>G<input inputMode="decimal" defaultValue={meal.f} key={`f${meal.f}`} onBlur={(e) => setMacro('f', e.target.value)} /></label>
          <button className="x" onClick={onRemove} aria-label="Elimina pasto">🗑</button>
        </div>
      )}
    </div>
  );
}
