'use client';

import { useEffect, useState } from 'react';
import { useApi } from '../useApi';

const WD = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

// "HH:MM" corrente nel fuso dell'utente (calcolato solo lato client)
function useNowHHMM(tz) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(new Intl.DateTimeFormat('it-IT', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [tz]);
  return now;
}

export default function Calendario() {
  const { data, error } = useApi('/api/calendar');
  const [picked, setPicked] = useState(null);
  const now = useNowHHMM(data?.tz || 'Europe/Rome');

  if (error) return <section className="card c4" id="calendario"><h2>Calendario</h2><div className="muted">Calendario non raggiungibile.</div></section>;
  if (!data) return <section className="card c4" id="calendario"><h2>Calendario</h2><div className="muted">…</div></section>;
  if (!data.configured) {
    return <section className="card c4" id="calendario"><h2>Calendario</h2>
      <div className="muted">Imposta <code>GOOGLE_CALENDAR_ICAL_URL</code> in <code>.env.local</code> (indirizzo segreto in formato iCal).</div></section>;
  }

  const selected = picked || data.today;
  const events = data.days[selected] || [];
  const isToday = selected === data.today;
  // il marcatore dell'ora corrente va prima del primo evento che inizia dopo "adesso"
  const markerAt = isToday && now ? events.findIndex((e) => !e.allDay && e.time > now) : -2;
  const marker = <div className="nowline" key="now"><span className="num">{now}</span></div>;

  return (
    <section className="card c4" id="calendario">
      <h2>Calendario</h2>
      <div className="week">
        {data.weekDays.map((k, i) => (
          <div key={k} onClick={() => setPicked(k)}
               className={`day${k === data.today ? ' today' : ''}${k === selected && k !== data.today ? ' sel' : ''}`}>
            {WD[i]}<br /><b>{Number(k.slice(8))}</b>
          </div>
        ))}
      </div>
      {events.length === 0 && <div className="muted">Niente in agenda.</div>}
      {events.map((e, i) => (
        <div key={i}>
          {markerAt === i && marker}
          <div className="ev">
            <span className="num muted">{e.allDay ? 'tutto il giorno' : e.time}</span>
            <span>{e.title}</span>
          </div>
        </div>
      ))}
      {isToday && now && (markerAt === -1) && marker}
      <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>{data.calendar}</div>
    </section>
  );
}
