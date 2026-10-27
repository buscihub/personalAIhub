import { NextResponse } from 'next/server';
import { getProfile, getDailyLogs, getDailyLog } from '@/lib/store';
import { today, addDays } from '@/lib/date';

export const dynamic = 'force-dynamic';

// GET ?days=30 → profilo (elenco abitudini) + log degli ultimi N giorni (solo righe esistenti) + giorno di oggi.
export async function GET(request) {
  const days = Math.min(Number(new URL(request.url).searchParams.get('days')) || 1, 60);
  const t = today();
  const [profile, logs, todayLog] = await Promise.all([
    getProfile(),
    getDailyLogs(addDays(t, -(days - 1)), t),
    getDailyLog(t),
  ]);
  const slim = Object.fromEntries(Object.entries(logs).map(([k, v]) => [k, { habits: v.habits || {} }]));
  return NextResponse.json({ today: t, habits: profile.habits, logs: { ...slim, [t]: { habits: todayLog.habits || {} } } });
}
