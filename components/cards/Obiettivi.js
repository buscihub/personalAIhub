'use client';

import { useEffect, useState } from 'react';
import { REFRESH, post } from '../useApi';

const SECTIONS = [['week', 'Questa settimana'], ['month', 'Questo mese']];

export default function Obiettivi() {
  const [g, setG] = useState(null);
  const [drafts, setDrafts] = useState({ week: '', month: '' });
  const [err, setErr] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/goals', { cache: 'no-store' });
      if (res.ok) setG(await res.json());
    } catch {}
  }
  useEffect(() => {
    load();
    window.addEventListener(REFRESH, load);
    return () => window.removeEventListener(REFRESH, load);
  }, []);

  // aggiornamento ottimistico + scrittura dietro; se fallisce si rilegge lo stato vero
  async function act(body, optimistic) {
    setG(optimistic);
    try { setG(await post('/api/goals', body)); setErr(''); }
    catch { setErr('Salvataggio non riuscito'); load(); }
  }
  const toggle = (section, id) =>
    act({ op: 'toggle', section, id }, { ...g, [section]: g[section].map((i) => (i.id === id ? { ...i, done: !i.done } : i)) });
  const remove = (section, id) =>
    act({ op: 'remove', section, id }, { ...g, [section]: g[section].filter((i) => i.id !== id) });
  function add(section, e) {
    e.preventDefault();
    const name = drafts[section].trim();
    if (!name) return;
    setDrafts({ ...drafts, [section]: '' });
    act({ op: 'add', section, name }, { ...g, [section]: [...g[section], { id: `tmp-${Date.now()}`, name, done: false }] });
  }

  return (
    <>
      {SECTIONS.map(([key, label]) => (
        <section className="card c6" id={`obiettivi-${key === 'week' ? 'settimana' : 'mese'}`} key={key}>
          <h2>Obiettivi · {label.toLowerCase()}</h2>
          {!g ? <div className="muted">…</div> : (
            <>
              <ul className="goals">
                {g[key].length === 0 && <li className="muted">Nessun obiettivo.</li>}
                {g[key].map((i) => (
                  <li key={i.id} className={i.done ? 'done' : ''}>
                    <label><input type="checkbox" checked={i.done} onChange={() => toggle(key, i.id)} /> <span>{i.name}</span></label>
                    {i.progress && <span className="num muted">{i.progress}</span>}
                    <button className="x rm" onClick={() => remove(key, i.id)} aria-label="Rimuovi">✕</button>
                  </li>
                ))}
              </ul>
              <form onSubmit={(e) => add(key, e)}>
                <input value={drafts[key]} onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })} placeholder="Aggiungi obiettivo (Invio)" />
              </form>
            </>
          )}
          {err && <div className="bad" style={{ fontSize: 12 }}>{err}</div>}
        </section>
      ))}
    </>
  );
}
