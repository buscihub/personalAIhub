'use client';

import { useEffect, useState } from 'react';

// L'orologio parte solo lato client: il server disegna il segnaposto, il client aggiorna.
function Clock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <div className="clock">--:--</div>;
  const d = now.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  const h = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return <div className="clock">{d} · {h}</div>;
}

export default function TopBar({ screens, active, onSelect }) {
  return (
    <header id="topbar">
      <div className="brand">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        </svg>
        PersonalOS
      </div>
      <nav id="nav">
        {screens.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'on' : ''}
             onClick={(e) => { e.preventDefault(); onSelect(s.id); }}>
            {s.label}
          </a>
        ))}
      </nav>
      <div className="spacer" />
      <Clock />
      <a className="tb-link" href="/api/admin/export" title="Scarica backup">Backup</a>
      <button className="tb-link" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }}>Esci</button>
    </header>
  );
}
