'use client';

import { useEffect, useRef, useState } from 'react';
import { post, refreshAll } from './useApi';
import { isQuestion } from '@/lib/question';

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
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setAnswer(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setCanListen(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  async function send(value = text) {
    const t = value.trim();
    if (!t) return;
    setState('elaboro'); setMsg('');
    if (isQuestion(t)) {
      // domanda: invece di archiviare, va alla rotta delle domande
      try {
        const res = await fetch('/api/ask', { method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: t }) });
        const d = await res.json();
        setAnswer({ q: t, text: d.answer || d.error || 'Nessuna risposta.' });
        setText('');
      } catch { setAnswer({ q: t, text: 'Risposta non disponibile al momento.' }); }
      setState('riposo');
      return;
    }
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
      {answer && (
        <div className="answer" role="status">
          <button className="x" onClick={() => setAnswer(null)} aria-label="Chiudi">✕</button>
          <div className="muted" style={{ fontSize: 12 }}>{answer.q}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{answer.text}</div>
        </div>
      )}
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
