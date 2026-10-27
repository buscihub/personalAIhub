import { NextResponse } from 'next/server';
import { safeEqual } from '@/lib/auth';
import { buildBriefing } from '@/lib/briefing';
import { sendMessage, telegramConfigured } from '@/lib/telegram';
import * as store from '@/lib/store';
import { today } from '@/lib/date';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ORARIO IN UTC: in vercel.json "0 5 * * *" = le 6 in inverno, le 7 in estate (ora italiana).
export async function GET(request) {
  // 1. serratura: Authorization: Bearer CRON_SECRET (a gestirla è la piattaforma, non un browser)
  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!process.env.CRON_SECRET || !safeEqual(given, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'non autorizzato' }, { status: 401 });
  }
  try {
    // 2. idempotente: se oggi è già partito, esce subito
    const t = today();
    if ((await store.getRegistry(300)).some((r) => r.type === 'briefing' && r.date === t)) {
      return NextResponse.json({ ok: true, skipped: 'già inviato oggi' });
    }
    // 3. raccolta + una sola chiamata al modello (o testo a regole)
    const text = await buildBriefing();
    if (!telegramConfigured()) return NextResponse.json({ ok: true, sent: false, reason: 'Telegram non configurato', text });
    // 4. invio, 5. registro (solo se l'invio è andato)
    const sent = await sendMessage(process.env.TELEGRAM_USER_ID, text);
    if (sent) await store.addRegistry({ type: 'briefing', date: t });
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    console.error('[cron/briefing]', e);
    return NextResponse.json({ ok: false, error: e.message }); // 200 sempre: nessun giro di ritentativi
  }
}
