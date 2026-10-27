import { NextResponse } from 'next/server';
import { getCalendar } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getCalendar();
    // La cache è sul server (5 min): al browser si vieta esplicitamente di conservare la risposta.
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[api/calendar]', e.message);
    return NextResponse.json({ error: 'calendario non raggiungibile' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
