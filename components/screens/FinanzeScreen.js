'use client';

import { Fragment } from 'react';
import { useApi } from '../useApi';
import { RefreshButton } from '../cards/Polso';
import { fmtMoney, fmtDelta } from '@/lib/format';

const TYPE_LABEL = { 'liquidità': 'Liquidità', investito: 'Investito', debito: 'Debiti' };
const monthLabel = (m) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function FinanzeScreen() {
  const { data, reload } = useApi('/api/finance');
  if (!data) return <section className="card c12"><div className="muted">…</div></section>;
  const l = data.latest;
  if (!l) return <section className="card c12" id="finanze-patrimonio"><h2>Finanze</h2><div className="muted">Nessuna istantanea: premi Aggiorna.</div><RefreshButton data={data} reload={reload} /></section>;
  const cur = l.currency;
  const groups = ['liquidità', 'investito', 'debito'].map((t) => {
    const items = l.categories.filter((c) => c.type === t);
    return { t, items, total: items.reduce((a, c) => a + c.value, 0) };
  }).filter((g) => g.items.length);
  return (
    <>
      <section className="card c4" id="finanze-patrimonio">
        <h2>Patrimonio netto</h2>
        <div className="big num" style={{ textAlign: 'left' }}>{fmtMoney(l.netWorth, cur)}</div>
        {data.delta && <div className={`num ${data.delta.value >= 0 ? 'good' : 'bad'}`}>{fmtDelta(data.delta.value, cur)} <span className="muted">vs {data.delta.since}</span></div>}
        <div className="muted" style={{ fontSize: 12 }}>dati del {l.referenceDate || l.date}</div>
        {l.notes && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{l.notes}</div>}
        <RefreshButton data={data} reload={reload} />
      </section>
      <section className="card c8" id="finanze-categorie">
        <h2>Categorie</h2>
        <table className="health"><tbody>
          {groups.map((g) => (
            <Fragment key={g.t}>
              <tr><td><b>{TYPE_LABEL[g.t]}</b></td><td className={`num ${g.total < 0 ? 'bad' : ''}`}><b>{fmtMoney(g.total, cur)}</b></td></tr>
              {g.items.map((c) => <tr key={g.t + c.name} className="muted"><td>&nbsp;&nbsp;{c.name}</td><td className="num">{fmtMoney(c.value, cur)}</td></tr>)}
            </Fragment>
          ))}
        </tbody></table>
      </section>
      <section className="card c12" id="finanze-storico">
        <h2>Storico mensile</h2>
        <table className="health">
          <thead><tr className="muted"><td>Mese</td><td className="num">Patrimonio</td><td className="num">Δ</td></tr></thead>
          <tbody>{data.months.map((m) => (
            <tr key={m.month}><td>{monthLabel(m.month)}</td><td className="num">{fmtMoney(m.netWorth, cur)}</td>
              <td className={`num ${m.delta == null ? 'muted' : m.delta >= 0 ? 'good' : 'bad'}`}>{m.delta == null ? '—' : fmtDelta(m.delta, cur)}</td></tr>
          ))}</tbody>
        </table>
      </section>
    </>
  );
}
