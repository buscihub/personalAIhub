import { NextResponse } from 'next/server';
import { COOKIE, verifySessionValue } from '@/lib/auth';
import { getState } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Restituisce TUTTO: solo con cookie di sessione valido. x-api-secret qui NON vale (il proxy lo rifiuta già;
// la route lo ribadisce, perché è la porta più sensibile dell'app).
export async function GET(request) {
  if (!(await verifySessionValue(request.cookies.get(COOKIE)?.value))) {
    return NextResponse.json({ error: 'non autorizzato' }, { status: 401 });
  }
  const state = await getState();
  const body = JSON.stringify({ generatedAt: new Date().toISOString(), schemaVersion: 1, data: state }, null, 2);
  return new NextResponse(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="personalos-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      'cache-control': 'no-store',
    },
  });
}
