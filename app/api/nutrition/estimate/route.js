import { NextResponse } from 'next/server';
import { estimateMeal } from '@/lib/nutritionAi';

export const dynamic = 'force-dynamic';

// Solo stima: non scrive. Senza modello → 503 e il client lascia inserire i valori a mano.
export async function POST(request) {
  const { text } = await request.json().catch(() => ({}));
  if (!text || !String(text).trim()) return NextResponse.json({ error: 'descrizione mancante' }, { status: 400 });
  const r = await estimateMeal(String(text).slice(0, 500));
  return r ? NextResponse.json(r) : NextResponse.json({ error: 'stima non disponibile' }, { status: 503 });
}
