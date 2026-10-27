'use client';

import { Fragment, useState } from 'react';
import { useApi } from '../useApi';
import { fmtInt } from '@/lib/format';

const fmtDay = (k) => new Date(`${k}T12:00:00Z`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export default function Salute() {
  const { data } = useApi('/api/health');
  const [openDay, setOpenDay] = useState(null);

  if (!data) return <section className="card c8" id="salute"><h2>Salute · 30 giorni</h2><div className="muted">…</div></section>;
  return (
    <section className="card c8" id="salute">
      <h2>Salute · 30 giorni</h2>
      {data.tracked === 0 ? <div className="muted">Nessun giorno registrato: aggiungi un pasto dalla scheda Nutrizione.</div> : (
        <>
          <div className="muted">media su <span className="num">{data.tracked}</span> {data.tracked === 1 ? 'giorno registrato' : 'giorni registrati'}:
            {' '}<span className="num">{fmtInt(data.avg.kcal)}</span> kcal · P <span className="num">{fmtInt(data.avg.p)}</span> · C <span className="num">{fmtInt(data.avg.c)}</span> · G <span className="num">{fmtInt(data.avg.f)}</span></div>
          <table className="health">
            <thead><tr className="muted"><td>Giorno</td><td className="num">kcal</td><td className="num">P</td><td className="num">C</td><td className="num">G</td><td className="num">pasti</td></tr></thead>
            <tbody>
              {data.days.map((d) => (
                <Fragment key={d.date}>
                  <tr className="clickable" onClick={() => setOpenDay(openDay === d.date ? null : d.date)}>
                    <td>{fmtDay(d.date)}</td><td className="num">{fmtInt(d.kcal)}</td><td className="num">{fmtInt(d.p)}</td>
                    <td className="num">{fmtInt(d.c)}</td><td className="num">{fmtInt(d.f)}</td><td className="num">{d.count}</td>
                  </tr>
                  {openDay === d.date && d.meals.map((m) => (
                    <tr key={m.id} className="sub muted">
                      <td>&nbsp;&nbsp;<span className="num">{m.time}</span> {m.name}</td><td className="num">{fmtInt(m.kcal)}</td>
                      <td className="num">{fmtInt(m.p)}</td><td className="num">{fmtInt(m.c)}</td><td className="num">{fmtInt(m.f)}</td><td />
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
