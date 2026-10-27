import { NextResponse } from 'next/server';
import { COOKIE, authConfigured, safeEqual, makeSessionValue, cookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!authConfigured()) return NextResponse.json({ error: 'auth non configurata' }, { status: 503 });
  let password = '';
  try { ({ password } = await request.json()); } catch {}
  if (!safeEqual(password, process.env.DASHBOARD_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 600)); // rallenta i tentativi a raffica
    return NextResponse.json({ error: 'password errata' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await makeSessionValue(), cookieOptions);
  return res;
}
