import { today, endOfWeek } from './date';
import { BANDS } from './constants';

// Fascia effettiva: "in ritardo" non si sceglie, ci si finisce (una scadenza passata e il task è ancora aperto).
export function effectiveBand(task, todayKey = today()) {
  if (task.completedAt) return task.band;
  if ((task.band === 'oggi' || task.band === 'settimana') && task.dueDate && task.dueDate < todayKey) return 'ritardo';
  return task.band;
}

// Data di scadenza coerente con la fascia scelta.
export function dueDateFor(band, todayKey = today()) {
  if (band === 'oggi') return todayKey;
  if (band === 'settimana') return endOfWeek(todayKey);
  return null;
}

const TEMP_RANK = { caldo: 0, tiepido: 1, freddo: 2 };

// Ordine: fascia → temperatura → posizione manuale.
export function sortTasks(tasks, todayKey = today()) {
  return [...tasks].sort((a, b) =>
    BANDS.indexOf(effectiveBand(a, todayKey)) - BANDS.indexOf(effectiveBand(b, todayKey)) ||
    (TEMP_RANK[a.temp] ?? 1) - (TEMP_RANK[b.temp] ?? 1) ||
    (a.position ?? 0) - (b.position ?? 0)
  );
}
