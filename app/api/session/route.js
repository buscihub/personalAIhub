import { NextResponse } from 'next/server';
import { getTasks } from '@/lib/store';
import { today } from '@/lib/date';
import { effectiveBand, sortTasks } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

// I tre task che contano oggi: fascia "in ritardo" o "oggi" → ordinati per fascia, temperatura, posizione.
export async function GET() {
  const t = today();
  const open = (await getTasks()).filter((x) => !x.completedAt);
  const focus = sortTasks(open.filter((x) => ['ritardo', 'oggi'].includes(effectiveBand(x, t))), t)
    .slice(0, 3)
    .map((x) => ({ id: x.id, title: x.title, person: x.person, band: effectiveBand(x, t) }));
  return NextResponse.json({ tasks: focus });
}
