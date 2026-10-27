# PersonalOS

Dashboard personale (task, calendario, finanze, abitudini, memoria). Guida di riferimento: `docs/PersonalOS.pdf` (Percorso Completo, senza OpenAI/voce Telegram per ora).

## Regole di casa
- Next.js (serie 16), App Router, **JavaScript** (no TypeScript), no Tailwind, no `src/`.
- **Tutti i dati passano da `lib/store.js`.** Nessuna rotta né componente tocca file/DB direttamente. Backend attuale: file JSON (`data/personalos.json`, copiato da `data/seed.json` se manca; `seed.json` non si modifica mai). Backend futuro: Supabase, stesse firme.
- Il caricamento di una pagina **non chiama mai il modello**. Il modello parte solo da: cattura, domanda, pulsante, cron.
- "Che giorno è oggi?" ha **una sola funzione** (`lib/date.js`, fuso `USER_TIMEZONE`). Mai la data del server.
- La cattura non fallisce mai: se il modello non risponde, rete di sicurezza a regole (`lib/classify.js`); la via di classificazione (modello/riserva/regole) si salva su ogni cattura.
- Destinazioni canoniche (un solo posto nel codice): task, persone, finanze, nutrizione, salute, obiettivi, memoria. Urgenza: oggi | settimana | più avanti (+ "in ritardo" solo come stato calcolato).
- Il nome del modello sta in `ANTHROPIC_MODEL`, mai hardcoded oltre al default.
- Ragionamento esteso OFF sulle chiamate di classificazione. Per le risposte: max_tokens alto e si concatenano tutti i blocchi di testo.
- Obiettivi: non si azzerano mai da soli. Nel Completo vivono nel log giornaliero alla data fissa convenzionale `2000-01-01` (trucco voluto, non "correggerlo").
- Numeri: allineati a destra, cifre tabellari, `minimumGroupingDigits: 1` (formattazione in un modulo solo).
- Colore = significato (verde bene, rosso male, arancione cala), non il segno.
- Rotte dati: `export const dynamic = 'force-dynamic'`; fetch client con `cache: 'no-store'`.
- Un commit a ogni scheda finita. Una scheda alla volta.
- Mai committare `.env*` o `data/personalos.json`.
