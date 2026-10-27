import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getGoals, updateGoals } from '@/lib/store';

export const dynamic = 'force-dynamic';

const SECTIONS = ['week', 'month'];

export async function GET() {
  const g = await getGoals();
  return NextResponse.json({ week: g.week || [], month: g.month || [] });
}

// op: add {section,name} | toggle {section,id} | remove {section,id}
// Niente logica legata al cambio di settimana o di mese: gli obiettivi non si azzerano MAI da soli.
export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  if (!SECTIONS.includes(b.section)) return NextResponse.json({ error: 'sezione non valida' }, { status: 400 });
  const name = String(b.name || '').trim().slice(0, 140);
  if (b.op === 'add' && !name) return NextResponse.json({ error: 'nome mancante' }, { status: 400 });
  const g = await updateGoals((goals) => {
    const list = goals[b.section];
    if (b.op === 'add') list.push({ id: randomUUID(), name, done: false });
    else if (b.op === 'toggle') { const x = list.find((i) => i.id === b.id); if (x) x.done = !x.done; }
    else if (b.op === 'remove') goals[b.section] = list.filter((i) => i.id !== b.id);
  });
  return NextResponse.json({ week: g.week, month: g.month });
}
