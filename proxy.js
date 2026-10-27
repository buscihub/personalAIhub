import { NextResponse } from 'next/server';
import { COOKIE, authConfigured, verifySessionValue, hasApiSecret } from '@/lib/auth';

// ESCLUSIONI DAL CANCELLO — ognuna ha una sua serratura:
//   /login, /api/auth/*       → non espongono nulla (login confronta la password; logout cancella il cookie)
//   /api/telegram/webhook     → la route verifica X-Telegram-Bot-Api-Secret-Token E l'id utente
//   /api/cron/*               → ogni route verifica Authorization: Bearer CRON_SECRET
// /api/admin/export NON accetta x-api-secret: vuole il cookie di sessione (la route lo ribadisce).
const PUBLIC = [/^\/login$/, /^\/api\/auth\//, /^\/api\/telegram\/webhook$/, /^\/api\/cron\//];
const COOKIE_ONLY = [/^\/api\/admin\//];

function done(res) {
  res.headers.set('X-Robots-Tag', 'noindex');
  return res;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return done(NextResponse.next());

  const isApi = pathname.startsWith('/api/');

  // Fail-closed: senza password e segreto configurati non entra nessuno.
  if (!authConfigured()) {
    return done(isApi
      ? NextResponse.json({ error: 'auth non configurata' }, { status: 503 })
      : new NextResponse('Auth non configurata: imposta DASHBOARD_PASSWORD e AUTH_SECRET.', { status: 503 }));
  }

  if (await verifySessionValue(request.cookies.get(COOKIE)?.value)) return done(NextResponse.next());
  if (isApi && !COOKIE_ONLY.some((re) => re.test(pathname)) && hasApiSecret(request)) return done(NextResponse.next());

  if (isApi) return done(NextResponse.json({ error: 'non autorizzato' }, { status: 401 }));
  return done(NextResponse.redirect(new URL('/login', request.url)));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
