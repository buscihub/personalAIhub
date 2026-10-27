// Elenco canonico delle destinazioni: UN posto solo. Il codice valida contro questo, non contro il modello.
export const DESTINATIONS = ['task', 'persone', 'finanze', 'nutrizione', 'salute', 'obiettivi', 'memoria'];

// Urgenza in ingresso. "in ritardo" NON è mai un valore in ingresso: ci si finisce.
export const URGENCIES = ['oggi', 'settimana', 'avanti'];

// Fasce del CRM (ordine di urgenza).
export const BANDS = ['ritardo', 'oggi', 'settimana', 'avanti'];
export const BAND_LABEL = { ritardo: 'In ritardo', oggi: 'Oggi', settimana: 'Questa settimana', avanti: 'Più avanti' };
export const TEMPS = ['caldo', 'tiepido', 'freddo'];
