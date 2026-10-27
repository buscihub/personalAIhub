import { NextResponse } from 'next/server';
import { getDailyLogs } from '@/lib/store';
import { today, addDays } from '@/lib/date';

export const dynamic = 'force-dynamic';

// Solo lettura e aggregazione: nessun modello, nessuna scrittura.
// Righe esistenti dei log con almeno un pasto → i giorni non registrati NON entrano nelle medie.
export async function GET() {
  const t = today();
  const logs = await getDailyLogs(addDays(t, -29), t);
  const days = Object.entries(logs)
    .filter(([, l]) => (l.meals || []).length > 0)
    .map(([date, l]) => {
      const meals = l.meals;
      const sum = (k) => meals.reduce((a, m) => a + (m[k] || 0), 0);
      return { date, kcal: sum('kcal'), p: sum('p'), c: sum('c'), f: sum('f'), count: meals.length, meals };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const n = days.length;
  const avg = (k) => (n ? days.reduce((a, d) => a + d[k], 0) / n : 0);
  return NextResponse.json({ today: t, days, tracked: n, avg: { kcal: avg('kcal'), p: avg('p'), c: avg('c'), f: avg('f') } });
}
