import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { shape, dueDateFor } from '@/lib/tasks';
import { BANDS, TEMPS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const b = await request.json().catch(() => ({}));
  const patch = {};
  if ('title' in b) { const t = String(b.title).trim(); if (!t) return NextResponse.json({ error: 'titolo vuoto' }, { status: 400 }); patch.title = t; }
  if ('note' in b) patch.note = String(b.note);
  if ('temp' in b && TEMPS.includes(b.temp)) patch.temp = b.temp;
  if ('tags' in b && Array.isArray(b.tags)) patch.tags = b.tags.map(String);
  if ('band' in b && BANDS.includes(b.band)) { patch.band = b.band; patch.dueDate = dueDateFor(b.band); }
  if ('person' in b) {
    const name = String(b.person || '').trim();
    if (!name) { patch.person = null; patch.personId = null; }
    else {
      const p = (await store.getPersons()).find((x) => x.name.toLowerCase() === name.toLowerCase()) || (await store.addPerson({ name }));
      patch.person = p.name; patch.personId = p.id;
    }
  }
  if ('completed' in b) {
    patch.completedAt = b.completed ? new Date().toISOString() : null;
    await store.addRegistry({ type: b.completed ? 'task_completato' : 'task_riaperto', ref: id });
  }
  const task = await store.updateTask(id, patch);
  if (!task) return NextResponse.json({ error: 'non trovato' }, { status: 404 });
  return NextResponse.json(shape(task));
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  await store.deleteTask(id);
  await store.addRegistry({ type: 'task_eliminato', ref: id });
  return NextResponse.json({ ok: true });
}
