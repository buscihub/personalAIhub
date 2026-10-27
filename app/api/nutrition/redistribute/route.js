import { NextResponse } from 'next/server';
import { redistribute } from '@/lib/nutritionAi';
import { num } from '@/lib/nutrition';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { name, kcal } = await request.json().catch(() => ({}));
  const k = num(kcal);
  if (!k) return NextResponse.json({ error: 'calorie mancanti' }, { status: 400 });
  return NextResponse.json(await redistribute(String(name || 'Pasto').slice(0, 80), k));
}
