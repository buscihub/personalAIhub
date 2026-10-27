'use client';

import { useEffect, useRef, useState } from 'react';
import { post, refreshAll } from './useApi';

const LABEL = { riposo: 'a riposo', ascolto: 'in ascolto', elaboro: 'in elaborazione', fatto: 'fatto' };
const DEST = {
  task: 'Task', persone: 'Persone', finanze: 'Finanze', nutrizione: 'Nutrizione',
  salute: 'Salute', obiettivi: 'Obiettivi', memoria: 'Memoria',
};

export default function CaptureBar() {
  const [state, setState] = useState('riposo');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [canListen, setCanListen] = useState(false);
  const rec = useRef(null);

  useEffect(() => {
    setCanListen(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  async function send(value = text) {
    const t = value.trim();
    if (!t) return;
    setState('elaboro'); setMsg('');
    try {
      const r = await post('/api/capture', { text: t });
      setMsg(`→ ${DEST[r.destinazione] || r.destinazione}${r.via === 'regole' ? ' · regole' : ''}`);
      setText('');
      setState('fatto');
      refreshAll();
    } catch {
      setMsg('Non sono riuscito a salvare. Riprova.');
      setState('riposo');
      return;
    }
    setTimeout(() => { setState('riposo'); setMsg(''); }, 2500);
  }

  function toggleMic() {
    if (state === 'ascolto') { rec.current?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'it-IT'; r.interimResults = true; r.continuous = false;
    r.onresult = (e) => setText(Array.from(e.results).map((x) => x[0].transcript).join(' '));
    r.onend = () => setState((s) => (s === 'ascolto' ? 'riposo' : s));
    r.onerror = () => setState('riposo');
    rec.current = r;
    setState('ascolto');
    r.start();
  }

  return (
    <div id="capturebar" data-state={state}>
      <div className="box">
        {canListen && (
          <button className={`mic${state === 'ascolto' ? ' live' : ''}`} onClick={toggleMic} aria-label="Microfono">🎤</button>
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder={msg || `Dì o scrivi qualcosa… (${LABEL[state]})`}
          disabled={state === 'elaboro'}
        />
        <button onClick={() => send()} disabled={state === 'elaboro'}>{state === 'elaboro' ? '…' : 'Invia'}</button>
      </div>
    </div>
  );
}
