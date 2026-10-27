import { NextResponse } from 'next/server';
import { answer } from '@/lib/ask';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { question } = await request.json().catch(() => ({}));
  if (!question || !String(question).trim()) return NextResponse.json({ error: 'domanda mancante' }, { status: 400 });
  try {
    const text = await answer(String(question).slice(0, 1000));
    return NextResponse.json({ answer: text.trim() || 'Non ho ricevuto una risposta dal modello. Riprova.' });
  } catch (e) {
    if (e.code === 'nokey') return NextResponse.json({ error: 'Per rispondere alle domande serve ANTHROPIC_API_KEY in .env.local.' }, { status: 503 });
    console.error('[api/ask]', e.message);
    return NextResponse.json({ error: 'Risposta non disponibile al momento.' }, { status: 502 });
  }
}
