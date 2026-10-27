import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { dueDateFor, effectiveBand } from '@/lib/tasks';
import { BANDS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// Body: { band, ids: [id, id, ...] } — ordine finale (dall'alto) della fascia di destinazione.
// Riscrive le posizioni 0..n-1 della sola fascia toccata (e la fascia di chi arriva da un'altra).
export async function POST(request) {
  const { band, ids } = await request.json().catch(() => ({}));
  if (!BANDS.includes(band) || !Array.isArray(ids)) return NextResponse.json({ error: 'richiesta non valida' }, { status: 400 });
  const tasks = await store.getTasks();
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const updates = ids.filter((id) => byId.has(id)).map((id, i) => {
    // si confronta la fascia EFFETTIVA: un task "in ritardo" trascinato su "Oggi" deve rinnovare la scadenza
    const moved = effectiveBand(byId.get(id)) !== band;
    const u = { id, position: i };
    if (moved) { u.band = band; u.dueDate = dueDateFor(band); }
    return u;
  });
  await store.reorderTasks(updates);
  return NextResponse.json({ ok: true });
}
