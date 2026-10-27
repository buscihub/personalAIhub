import { NextResponse } from 'next/server';
import { getProfile, updateDailyLog } from '@/lib/store';
import { today } from '@/lib/date';

export const dynamic = 'force-dynamic';

// Il client manda l'azione ("spunta", "incrementa") — il server calcola il nuovo valore sul log di OGGI (fuso utente).
export async function POST(request) {
  const { id } = await request.json().catch(() => ({}));
  const habit = (await getProfile()).habits.find((h) => h.id === id);
  if (!habit) return NextResponse.json({ error: 'abitudine sconosciuta' }, { status: 404 });
  const key = today();
  const value = await updateDailyLog(key, (log) => {
    log.habits ||= {};
    if (habit.type === 'counter') {
      const n = (Number(log.habits[id]) || 0) + 1;
      log.habits[id] = n > habit.target ? 0 : n; // pieno + clic → riparte da zero (correzione di un clic di troppo)
    } else {
      log.habits[id] = !log.habits[id];
    }
    return log.habits[id];
  });
  return NextResponse.json({ date: key, id, value });
}
