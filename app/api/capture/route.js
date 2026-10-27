import { NextResponse } from 'next/server';
import { processCapture } from '@/lib/capture';
import { getCaptures } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { text } = await request.json().catch(() => ({}));
  if (!text || !String(text).trim()) return NextResponse.json({ error: 'testo mancante' }, { status: 400 });
  try {
    return NextResponse.json(await processCapture(text, 'dashboard'));
  } catch (e) {
    console.error('[api/capture]', e);
    return NextResponse.json({ error: 'cattura fallita' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ captures: await getCaptures(10) });
}
