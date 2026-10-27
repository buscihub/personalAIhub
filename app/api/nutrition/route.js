import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getProfile, getDailyLog, updateDailyLog } from '@/lib/store';
import { today, timeKey } from '@/lib/date';
import { kcalFrom, num } from '@/lib/nutrition';

export const dynamic = 'force-dynamic';

const clean = (b) => {
  const p = num(b.p), c = num(b.c), f = num(b.f);
  return { name: String(b.name || 'Pasto').trim().slice(0, 80), p, c, f, kcal: b.kcal != null ? Math.round(num(b.kcal)) : kcalFrom(p, c, f) };
};

// Il giorno è sempre quello calcolato dalla funzione unica (fuso utente): il client non sceglie la data.
export async function GET() {
  const t = today();
  const [profile, log] = await Promise.all([getProfile(), getDailyLog(t)]);
  return NextResponse.json({ date: t, goal: profile.calorieGoal, meals: log.meals || [] });
}

export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const meal = { id: randomUUID(), time: timeKey(), estimated: Boolean(b.estimated), ...clean(b) };
  await updateDailyLog(today(), (log) => { (log.meals ||= []).push(meal); });
  return NextResponse.json(meal);
}

export async function PATCH(request) {
  const b = await request.json().catch(() => ({}));
  let out = null;
  await updateDailyLog(today(), (log) => {
    const m = (log.meals || []).find((x) => x.id === b.id);
    if (m) { Object.assign(m, clean({ ...m, ...b }), { estimated: Boolean(b.estimated) }); out = m; }
  });
  return out ? NextResponse.json(out) : NextResponse.json({ error: 'non trovato' }, { status: 404 });
}

export async function DELETE(request) {
  const { id } = await request.json().catch(() => ({}));
  await updateDailyLog(today(), (log) => { log.meals = (log.meals || []).filter((x) => x.id !== id); });
  return NextResponse.json({ ok: true });
}
