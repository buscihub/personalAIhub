'use client';

import { useCallback, useEffect, useState } from 'react';

// Evento globale: dopo una cattura (o qualunque scrittura esterna alla scheda) tutte le schede rileggono.
export const REFRESH = 'pos:refresh';
export const refreshAll = () => window.dispatchEvent(new Event(REFRESH));

// Legge una rotta API (mai dal modello al caricamento: le rotte leggono l'ultimo dato salvato).
export function useApi(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [url]);
  useEffect(() => {
    load();
    window.addEventListener(REFRESH, load);
    return () => window.removeEventListener(REFRESH, load);
  }, [load]);
  return { data, error, reload: load, setData };
}

export async function post(url, body, method = 'POST') {
  const res = await fetch(url, {
    method, cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
