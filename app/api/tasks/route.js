import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { today } from '@/lib/date';
import { shape, dueDateFor } from '@/lib/tasks';
import { BANDS, TEMPS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// GET            → task aperti (fascia effettiva) + persone
// GET ?completed=1 → task completati (per Review)
export async function GET(request) {
  const t = today();
  const completed = new URL(request.url).searchParams.get('completed');
  const [tasks, persons] = await Promise.all([store.getTasks(), store.getPersons()]);
  const list = tasks.filter((x) => (completed ? x.completedAt : !x.completedAt)).map((x) => shape(x, t));
  return NextResponse.json({ tasks: list, persons: persons.map((p) => p.name), today: t });
}

export async function POST(request) {
  const b = await request.json().catch(() => ({}));
  const title = String(b.title || '').trim();
  if (!title) return NextResponse.json({ error: 'titolo mancante' }, { status: 400 });
  const band = BANDS.includes(b.band) && b.band !== 'ritardo' ? b.band : 'oggi';
  let person = null;
  if (b.person) {
    const name = String(b.person).trim();
    person = (await store.getPersons()).find((p) => p.name.toLowerCase() === name.toLowerCase()) || (await store.addPerson({ name }));
  }
  const task = await store.addTask({
    title, note: String(b.note || ''), band, dueDate: dueDateFor(band),
    temp: TEMPS.includes(b.temp) ? b.temp : 'tiepido',
    tags: Array.isArray(b.tags) ? b.tags : [],
    person: person?.name || null, personId: person?.id || null,
  });
  await store.addRegistry({ type: 'task_creato', ref: task.id });
  return NextResponse.json(shape(task));
}
