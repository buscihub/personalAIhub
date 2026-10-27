'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { REFRESH, post } from '../useApi';
import { useNav } from '../NavContext';
import { BANDS, BAND_LABEL, TEMPS } from '@/lib/constants';

const VIEW_KEY = 'pos:crm:view';
const VIEWS = [['kanban', 'Kanban'], ['persona', 'Per persona']];
const tempClass = { caldo: 'hot', tiepido: 'warm', freddo: '' };

const byPos = (a, b) => (a.position ?? 0) - (b.position ?? 0);

async function api(url, body, method = 'POST') {
  const res = await fetch(url, { method, cache: 'no-store', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export default function CrmScreen() {
  const { openTaskId, clearOpenTask } = useNav();
  const [tasks, setTasks] = useState(null);
  const [persons, setPersons] = useState([]);
  const [view, setView] = useState('kanban');
  const [openId, setOpenId] = useState(null); // il pannello si aggancia all'ID, mai alla posizione
  const [drag, setDrag] = useState(null); // { id, band, beforeId }
  const [newTitle, setNewTitle] = useState('');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(null); // null = nessuna ricerca attiva; altrimenti { ids, via }
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const d = await res.json();
      setTasks(d.tasks); setPersons(d.persons);
    } catch (e) { console.warn('[crm] lettura fallita', e.message); }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(REFRESH, load);
    return () => window.removeEventListener(REFRESH, load);
  }, [load]);

  // vista scelta: sopravvive al ricaricamento
  useEffect(() => {
    try { const v = localStorage.getItem(VIEW_KEY); if (VIEWS.some(([k]) => k === v)) setView(v); } catch {}
  }, []);
  function chooseView(v) { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch {} }

  // arrivo da Session: apre il pannello dell'elemento cliccato
  useEffect(() => {
    if (openTaskId) { setOpenId(openTaskId); clearOpenTask(); }
  }, [openTaskId, clearOpenTask]);

  // Esc chiude il pannello
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpenId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---------- scritture: risposta subito, salvataggio dietro, se fallisce si rilegge ----------
  async function patch(id, change, serverBody = change) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...change } : t)));
    try { await api(`/api/tasks/${id}`, serverBody, 'PATCH'); await load(); }
    catch (e) { console.error('[crm] salvataggio fallito', e.message); setErr('Salvataggio non riuscito'); await load(); }
  }
  async function complete(id) {
    setTasks((ts) => ts.filter((t) => t.id !== id)); setOpenId(null);
    try { await api(`/api/tasks/${id}`, { completed: true }, 'PATCH'); } catch { setErr('Salvataggio non riuscito'); }
    load();
  }
  async function remove(id) {
    if (!confirm('Eliminare definitivamente?')) return;
    setTasks((ts) => ts.filter((t) => t.id !== id)); setOpenId(null);
    try { await api(`/api/tasks/${id}`, null, 'DELETE'); } catch { setErr('Eliminazione non riuscita'); }
    load();
  }
  async function create(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle('');
    try { await api('/api/tasks', { title, band: 'oggi' }); } catch { setErr('Creazione non riuscita'); }
    load();
  }

  // ---------- trascinamento ----------
  const colIds = (band, excluding) =>
    (tasks || []).filter((t) => t.band === band && t.id !== excluding).sort(byPos).map((t) => t.id);

  async function drop(band) {
    if (!drag) return;
    const ids = colIds(band, drag.id);
    const at = drag.beforeId ? ids.indexOf(drag.beforeId) : -1;
    ids.splice(at === -1 ? ids.length : at, 0, drag.id);
    setDrag(null);
    // aggiornamento ottimistico
    setTasks((ts) => ts.map((t) => {
      const i = ids.indexOf(t.id);
      return i === -1 ? t : { ...t, band, storedBand: band, position: i };
    }));
    try { await api('/api/tasks/reorder', { band, ids }); } catch { setErr('Riordino non riuscito'); }
    load();
  }

  // ---------- ricerca in linguaggio naturale: solo a Invio ----------
  async function search(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) { setFound(null); return; }
    setSearching(true);
    try { setFound(await api('/api/tasks/search', { q })); } catch { setErr('Ricerca non riuscita'); }
    setSearching(false);
  }

  if (!tasks) return <section className="card c12"><div className="muted">…</div></section>;

  const open = tasks.find((t) => t.id === openId) || null;
  const foundTasks = found ? found.ids.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) : null;

  const card = (t) => (
    <div key={t.id}
      className={`item ${tempClass[t.temp] || ''}${drag?.id === t.id ? ' dragging' : ''}${drag?.beforeId === t.id ? ' drop-before' : ''}`}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; setDrag({ id: t.id, band: t.band, beforeId: null }); }}
      onDragEnd={() => setDrag(null)}
      onDragOver={(e) => {
        if (!drag) return;
        e.preventDefault(); e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        const before = e.clientY < r.top + r.height / 2;
        const sibs = colIds(t.band, drag.id);
        const next = before ? t.id : sibs[sibs.indexOf(t.id) + 1] || null;
        setDrag((d) => (d.band === t.band && d.beforeId === next ? d : { ...d, band: t.band, beforeId: next }));
      }}
      onClick={() => setOpenId(t.id)}>
      <b>{t.title}</b>
      {t.person && <div className="muted">{t.person}</div>}
      {t.tags?.length > 0 && <div className="tags">{t.tags.map((x) => <span key={x} className="pill">{x}</span>)}</div>}
    </div>
  );

  return (
    <>
      <div className="crm-head c12">
        <form onSubmit={create} className="crm-new">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nuovo elemento (Invio)…" />
        </form>
        <form onSubmit={search} className="crm-search">
          <input value={query} onChange={(e) => { setQuery(e.target.value); if (!e.target.value) setFound(null); }}
                 placeholder="Cerca come parli — es. «cosa posso chiudere in dieci minuti?» (Invio)" />
          <button disabled={searching}>{searching ? '…' : 'Cerca'}</button>
        </form>
        <div className="seg">
          {VIEWS.map(([k, label]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => chooseView(k)}>{label}</button>)}
        </div>
      </div>
      {err && <div className="c12 bad" onClick={() => setErr('')}>{err}</div>}

      {foundTasks && (
        <section className="card c12" id="crm-risultati">
          <h2>Risultati {found.via === 'testo' && <span className="pill">ricerca testuale</span>}
            <button className="x" onClick={() => { setFound(null); setQuery(''); }} aria-label="Chiudi ricerca">✕</button></h2>
          {foundTasks.length === 0 && <div className="muted">Nessun elemento pertinente.</div>}
          <div className="results">{foundTasks.map(card)}</div>
        </section>
      )}

      {view === 'kanban' && (
        <section className="kanban" id="crm">
          {BANDS.map((b) => {
            const items = tasks.filter((t) => t.band === b).sort(byPos);
            return (
              <div key={b} className={`col${drag?.band === b ? ' drop-target' : ''}`} id={`crm-${b}`}
                   onDragOver={(e) => { if (!drag) return; e.preventDefault(); if (drag.band !== b || drag.beforeId) setDrag((d) => ({ ...d, band: b, beforeId: null })); }}
                   onDrop={(e) => { e.preventDefault(); drop(b); }}>
                <h2>{BAND_LABEL[b]} <span className="num">{items.length}</span></h2>
                {items.length === 0 && <div className="muted empty">—</div>}
                {items.map(card)}
              </div>
            );
          })}
        </section>
      )}

      {view === 'persona' && (
        <section className="persone c12" id="crm-persone">
          {groupByPerson(tasks).map(([name, items]) => (
            <div className="card" key={name || '__none'}>
              <h2>{name || 'Senza persona'} <span className="num">{items.length}</span></h2>
              {items.map((t) => (
                <div key={t.id} className={`item ${tempClass[t.temp] || ''}`} onClick={() => setOpenId(t.id)}>
                  <div className="row between"><b>{t.title}</b><span className={`pill ${t.band === 'ritardo' ? 'hot' : ''}`}>{BAND_LABEL[t.band]}</span></div>
                </div>
              ))}
            </div>
          ))}
          {tasks.length === 0 && <div className="muted">Niente da fare. 🎉</div>}
        </section>
      )}

      {open && (
        <Panel key={open.id} task={open} persons={persons}
               onClose={() => setOpenId(null)}
               onSave={(change, body) => patch(open.id, change, body)}
               onComplete={() => complete(open.id)} onDelete={() => remove(open.id)} />
      )}
    </>
  );
}

// Per persona: gruppi in ordine alfabetico, senza-persona in fondo; dentro il gruppo per fascia → posizione.
function groupByPerson(tasks) {
  const map = new Map();
  for (const t of tasks) { const k = t.person || ''; (map.get(k) || map.set(k, []).get(k)).push(t); }
  const order = (t) => BANDS.indexOf(t.band);
  return [...map.entries()]
    .sort(([a], [b]) => (a === '' ) - (b === '') || a.localeCompare(b, 'it'))
    .map(([k, items]) => [k, items.sort((a, b) => order(a) - order(b) || byPos(a, b))]);
}

function Panel({ task, persons, onClose, onSave, onComplete, onDelete }) {
  // bozza locale per i campi di testo: si salva all'uscita dal campo
  const [title, setTitle] = useState(task.title);
  const [note, setNote] = useState(task.note || '');
  const [person, setPerson] = useState(task.person || '');
  const [tags, setTags] = useState((task.tags || []).join(', '));
  const first = useRef(true);
  useEffect(() => { first.current = false; }, []);

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Modifica elemento">
        <div className="row between"><h2>Modifica</h2><button className="x" onClick={onClose} aria-label="Chiudi">✕</button></div>
        <label>Titolo
          <input value={title} onChange={(e) => setTitle(e.target.value)}
                 onBlur={() => title.trim() && title !== task.title && onSave({ title: title.trim() })} />
        </label>
        <label>Nota
          <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)}
                    onBlur={() => note !== (task.note || '') && onSave({ note })} />
        </label>
        <div className="two">
          <label>Fascia
            <select value={task.band}
                    onChange={(e) => onSave({ band: e.target.value })}>
              {BANDS.map((b) => <option key={b} value={b}>{BAND_LABEL[b]}</option>)}
            </select>
          </label>
          <label>Temperatura
            <select value={task.temp} onChange={(e) => onSave({ temp: e.target.value })}>
              {TEMPS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <label>Persona
          <input list="crm-persons" value={person} onChange={(e) => setPerson(e.target.value)}
                 onBlur={() => person !== (task.person || '') && onSave({ person: person.trim() || null }, { person: person.trim() })} />
          <datalist id="crm-persons">{persons.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
        <label>Tag (separati da virgola)
          <input value={tags} onChange={(e) => setTags(e.target.value)}
                 onBlur={() => {
                   const arr = tags.split(',').map((x) => x.trim()).filter(Boolean);
                   if (arr.join(',') !== (task.tags || []).join(',')) onSave({ tags: arr });
                 }} />
        </label>
        <div className="row actions">
          <button className="primary" onClick={onComplete}>Completa</button>
          <button className="danger" onClick={onDelete}>Elimina</button>
        </div>
      </aside>
    </>
  );
}
