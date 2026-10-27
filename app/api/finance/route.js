import { NextResponse } from 'next/server';
import { readFinance } from '@/lib/finance';

export const dynamic = 'force-dynamic';

// Legge SEMPRE l'ultima istantanea salvata. Mai il modello, mai il foglio.
export async function GET() {
  return NextResponse.json(await readFinance());
}
