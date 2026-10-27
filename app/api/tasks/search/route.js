import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { askJson, hasKey } from '@/lib/llm';
import { today } from '@/lib/date';
import { effectiveBand } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

const SYSTEM = `Hai la lista compatta dei task aperti di un CRM personale (JSON: id, titolo, fascia, persona, tag) e una domanda in linguaggio naturale.
Restituisci SOLO un JSON {"ids":["..."]} con gli id pertinenti alla domanda, dal più al meno pertinente. Se nessuno è pertinente: {"ids":[]}. Nessun altro testo.`;

// Rete di sicurezza: ricerca testuale semplice sugli stessi campi.
function textSearch(list, q) {
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (!words.length) return [];
  return list.filter((t) => {
    const hay = `${t.title} ${t.person || ''} ${(t.tags || []).join(' ')} ${t.note || ''}`.toLowerCase();
    return words.some((w) => hay.includes(w));
  }).map((t) => t.id);
}

// La ricerca parte SOLO su richiesta esplicita (Invio), mai a ogni tasto.
export async function POST(request) {
  const { q } = await request.json().catch(() => ({}));
  const query = String(q || '').trim();
  if (!query) return NextResponse.json({ ids: [], via: 'testo' });
  const t = today();
  const open = (await store.getTasks()).filter((x) => !x.completedAt);
  const known = new Set(open.map((x) => x.id));
  if (hasKey() && open.length) {
    try {
      const compact = open.map((x) => ({ id: x.id, titolo: x.title, fascia: effectiveBand(x, t), persona: x.person, tag: x.tags }));
      const r = await askJson({ system: SYSTEM, user: `Task: ${JSON.stringify(compact)}\n\nDomanda: ${query}`, maxTokens: 800, timeoutMs: 15000 });
      // scarta gli id inventati dal modello
      const ids = (Array.isArray(r.ids) ? r.ids : []).filter((id) => known.has(id));
      return NextResponse.json({ ids, via: 'modello' });
    } catch (e) {
      console.warn('[tasks/search] modello ko, ripiego su testo:', e.message);
    }
  }
  return NextResponse.json({ ids: textSearch(open, query), via: 'testo' });
}
