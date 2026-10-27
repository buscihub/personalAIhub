import { NextResponse } from 'next/server';
import { refreshFinance } from '@/lib/finance';
import { safeEqual } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Fuori dal cancello a cookie: la serratura è l'intestazione Authorization: Bearer <CRON_SECRET>.
export async function GET(request) {
  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!process.env.CRON_SECRET || !safeEqual(given, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'non autorizzato' }, { status: 401 });
  }
  try {
    const s = await refreshFinance();
    return NextResponse.json({ ok: true, date: s.date, netWorth: s.netWorth });
  } catch (e) {
    console.error('[cron/finance]', e.message);
    return NextResponse.json({ ok: false, error: e.message }); // 200: il cron non deve riprovare a raffica
  }
}
