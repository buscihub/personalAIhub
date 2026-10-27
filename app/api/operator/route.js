import { NextResponse } from 'next/server';
import { getProfile, getDailyLogs } from '@/lib/store';
import { today, addDays } from '@/lib/date';
import { streak } from '@/lib/habits';

export const dynamic = 'force-dynamic';

export async function GET() {
  const t = today();
  const [profile, logs] = await Promise.all([getProfile(), getDailyLogs(addDays(t, -400), t)]);
  return NextResponse.json({ profile, streak: streak(profile.habits, logs, t, addDays) });
}
