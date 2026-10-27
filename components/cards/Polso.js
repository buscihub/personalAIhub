'use client';

import { useState } from 'react';
import { useApi, post } from '../useApi';
import { fmtMoney, fmtDelta } from '@/lib/format';

const hhmm = (iso) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

// Pulsante di aggiornamento: l'estrazione parte SOLO da qui (o dal cron), mai al caricamento della pagina.
export function RefreshButton({ data, reload }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/finance/refresh', { method: 'POST', cache: 'no-store' });
      const d = await res.json();
      if (!d.ok) setErr(d.error || 'Aggiornamento non riuscito');
    } catch { setErr('Aggiornamento non riuscito'); }
    setBusy(false);
    reload();
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div className="row" style={{ gap: 8 }}>
        <button className="x" style={{ background: 'var(--surface-2)', padding: '6px 12px' }} onClick={go} disabled={busy || !data.configured}>
          {busy ? 'Aggiorno…' : 'Aggiorna'}
        </button>
        <span className="muted" style={{ fontSize: 12 }}>{data.updatedAt ? `aggiornato alle ${hhmm(data.updatedAt)}` : 'mai aggiornato'}</span>
      </div>
      {!data.configured && <div className="muted" style={{ fontSize: 12 }}>Imposta il foglio (Google Sheets o FINANCE_FILE_PATH) in .env.local.</div>}
      {err && <div className="bad" style={{ fontSize: 12 }}>{err}</div>}
    </div>
  );
}

function Spark({ values }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values), r = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / r) * 24}`).join(' ');
  const up = values.at(-1) >= values[0];
  return <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline fill="none" stroke={up ? 'var(--good)' : 'var(--bad)'} strokeWidth="1.6" points={pts} /></svg>;
}

export default function Polso() {
  const { data, reload } = useApi('/api/finance');
  if (!data) return <section className="card c4" id="polso-finanziario"><h2>Polso finanziario</h2><div className="muted">…</div></section>;
  const l = data.latest;
  return (
    <section className="card c4" id="polso-finanziario">
      <h2>Polso finanziario</h2>
      {!l ? <div className="muted">Nessuna istantanea ancora.</div> : (
        <>
          <div className="big num" style={{ textAlign: 'left' }}>{fmtMoney(l.netWorth, l.currency)}</div>
          {data.delta && (
            <div className={`num ${data.delta.value >= 0 ? 'good' : 'bad'}`} style={{ textAlign: 'left' }}>
              {fmtDelta(data.delta.value, l.currency)} <span className="muted">vs {data.delta.since}</span>
            </div>
          )}
          <Spark values={data.spark} />
          {l.notes && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{l.notes}</div>}
        </>
      )}
      <RefreshButton data={data} reload={reload} />
    </section>
  );
}
