import { NextResponse } from 'next/server';
import { refreshFinance } from '@/lib/finance';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Estrazione: parte SOLO dal pulsante (qui) o dal cron notturno (/api/cron/finance). Mai al caricamento di una pagina.
export async function POST() {
  try {
    return NextResponse.json({ ok: true, snapshot: await refreshFinance() });
  } catch (e) {
    console.error('[finance/refresh]', e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 502 });
  }
}
