import { NextResponse } from 'next/server';
import { safeEqual } from '@/lib/auth';
import { processCapture } from '@/lib/capture';
import { answer } from '@/lib/ask';
import { isQuestion } from '@/lib/question';
import { sendMessage, answerCallbackQuery, editMessageText } from '@/lib/telegram';
import * as store from '@/lib/store';
import { dueDateFor } from '@/lib/tasks';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const URG = { o: ['oggi', 'Oggi'], s: ['settimana', 'Settimana'], a: ['avanti', 'Più avanti'] };
const LABEL = { task: 'Task', persone: 'Persone', finanze: 'Finanze', nutrizione: 'Nutrizione', salute: 'Salute', obiettivi: 'Obiettivi', memoria: 'Memoria' };

function buttons(taskId, current) {
  return { inline_keyboard: [Object.entries(URG).map(([k, [val, label]]) => ({ text: val === current ? `✓ ${label}` : label, callback_data: `u:${taskId}:${k}` }))] };
}

// Telegram riprova se non riceve 200: qui si risponde SEMPRE 200 (errori gestiti dentro) e si scartano i doppioni.
export async function POST(request) {
  // Serratura 1: intestazione col segreto. Se non coincide, nessuna elaborazione.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !safeEqual(request.headers.get('x-telegram-bot-api-secret-token') || '', secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const u = await request.json();
    // Serratura 2: solo il tuo id. Per i pulsanti il mittente sta in callback_query.from.id, non nel messaggio.
    const from = u.callback_query?.from?.id ?? u.message?.from?.id;
    if (!from || String(from) !== String(process.env.TELEGRAM_USER_ID)) return NextResponse.json({ ok: true });

    // doppioni (ritrasmissioni)
    const seen = (await store.getRegistry(300)).some((r) => r.type === 'tg_update' && r.ref === u.update_id);
    if (seen) return NextResponse.json({ ok: true, dup: true });
    await store.addRegistry({ type: 'tg_update', ref: u.update_id });

    if (u.callback_query) {
      const cq = u.callback_query;
      const [kind, taskId, k] = (cq.data || '').split(':');
      if (kind === 'u' && URG[k]) {
        const [band, label] = URG[k];
        const t = await store.updateTask(taskId, { band, dueDate: dueDateFor(band) });
        await answerCallbackQuery(cq.id, t ? `Urgenza: ${label}` : 'Elemento non trovato');
        if (t && cq.message) await editMessageText(cq.message.chat.id, cq.message.message_id, cq.message.text, buttons(taskId, band));
      } else {
        await answerCallbackQuery(cq.id);
      }
      return NextResponse.json({ ok: true });
    }

    const m = u.message;
    if (!m) return NextResponse.json({ ok: true });
    if (m.voice || m.audio) {
      await sendMessage(m.chat.id, 'Le note vocali non sono ancora attive (serve la trascrizione). Scrivimi il testo.');
      return NextResponse.json({ ok: true });
    }
    const text = (m.text || '').trim();
    if (!text) return NextResponse.json({ ok: true });

    if (isQuestion(text)) {
      try { await sendMessage(m.chat.id, (await answer(text)).trim().slice(0, 3800) || 'Nessuna risposta.'); }
      catch { await sendMessage(m.chat.id, 'Non riesco a rispondere ora (serve la chiave API).'); }
      return NextResponse.json({ ok: true });
    }

    const r = await processCapture(text, 'telegram');
    const msg = `✓ ${LABEL[r.destinazione] || r.destinazione}: ${r.titolo}${r.via === 'regole' ? ' (regole)' : ''}`;
    await sendMessage(m.chat.id, msg, r.taskId ? buttons(r.taskId, r.urgenza) : undefined);
  } catch (e) {
    console.error('[telegram/webhook]', e);
  }
  return NextResponse.json({ ok: true });
}
