'use client';

import { useEffect, useState } from 'react';
import { useApi } from '../useApi';
import { useNav } from '../NavContext';

const BAND_LABEL = { ritardo: 'in ritardo', oggi: 'oggi' };

// Il saluto dipende dall'ora: calcolato solo lato client (evita errori di hydration).
function useGreeting() {
  const [g, setG] = useState({ hello: '', time: '--:--', date: '' });
  useEffect(() => {
    const tick = () => {
      const d = new Date(); const h = d.getHours();
      setG({
        hello: h < 12 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera',
        time: d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        date: d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
      });
    };
    tick();
    const t = setInterval(tick, 20_000);
    return () => clearInterval(t);
  }, []);
  return g;
}

export default function Session() {
  const g = useGreeting();
  const { data } = useApi('/api/session');
  const { goto } = useNav();
  return (
    <section className="card c4" id="session">
      <h2>Session</h2>
      <div className="big">{g.hello || ' '}</div>
      <div className="muted"><span className="num">{g.time}</span> · {g.date}</div>
      <ol style={{ marginTop: 12 }}>
        {data && data.tasks.length === 0 && <li className="muted">Niente in scadenza oggi.</li>}
        {data?.tasks.map((t) => (
          <li key={t.id} onClick={() => goto('crm', { taskId: t.id })}>
            <span>{t.title}{t.person ? <span className="muted"> · {t.person}</span> : null}</span>
            <span className={`pill ${t.band === 'ritardo' ? 'hot' : 'warm'}`}>{BAND_LABEL[t.band]}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
