'use client';

import { useApi } from '../useApi';

// Specchio, non pannello di controllo: nessun clic.
export default function Operator() {
  const { data } = useApi('/api/operator');
  const p = data?.profile;
  return (
    <section className="card c4" id="operator">
      <h2>Operator</h2>
      {!p ? <div className="muted">…</div> : (
        <>
          <div className="big">{p.name}</div>
          <div className="muted">{p.role} · {p.city}</div>
          <div style={{ marginTop: 12 }}><span className="pill">Focus di oggi</span></div>
          <div style={{ marginTop: 6, fontWeight: 600 }}>{p.focus || '—'}</div>
          <div className="muted" style={{ marginTop: 8 }}>🔥 striscia: <span className="num">{data.streak}</span> {data.streak === 1 ? 'giorno' : 'giorni'}</div>
        </>
      )}
    </section>
  );
}
