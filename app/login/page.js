'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const password = new FormData(e.currentTarget).get('password');
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }), cache: 'no-store',
    });
    if (res.ok) { window.location.href = '/'; return; }
    setError(res.status === 401 ? 'Password errata' : 'Accesso non disponibile');
    setBusy(false);
  }

  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <h2>PersonalOS</h2>
        <input name="password" type="password" placeholder="Password" autoFocus autoComplete="current-password" />
        <button disabled={busy}>{busy ? '…' : 'Entra'}</button>
        {error && <div className="bad">{error}</div>}
      </form>
    </main>
  );
}
