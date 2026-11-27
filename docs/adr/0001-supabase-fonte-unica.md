# ADR-0001: Supabase come unica fonte di verità

- **Data:** 2026-11-26
- **Stato:** Accettata
- **Task collegato:** 0.1 (attuazione dalla fase 1)

## Contesto

Oggi il sistema SPACE vive in Notion, in database separati (Inbox, To-Do List, Note & Risorse) compilati a
mano. L'hub deve far lavorare insieme task, appuntamenti e, più avanti, allenamento e nutrizione, con un
assistente che li incrocia; deve anche essere un progetto da portfolio con uno schema progettato da zero e RLS.

## Decisione

Database proprio su Supabase (Postgres + RLS) come unica fonte di verità: Notion si importa una volta sola
(fase 4) e poi va in archivio; anche le 3 priorità della settimana diventano una tabella con storico
(`week_priorities`, D6).

## Alternative considerate

- **Tenere Notion come database e usare l'app come interfaccia** — i dati restano in database separati,
  difficili da incrociare per l'assistente, e ogni funzione dipende dall'API di un servizio esterno.
- **Sincronizzazione continua app ↔ Notion** — due fonti di verità da tenere allineate, con conflitti; esclusa
  tra i non-obiettivi.

## Conseguenze

- Tutto quello che oggi si fa in Notion va rifatto nell'app prima di abbandonarlo (fasi 1–4).
- Serve una migrazione una tantum (ADR-0004) e una verifica dei conteggi.
- Ogni tabella ha RLS e test RLS (regole 3 e 4, §3.4).
- Allenamento e alimentazione restano su Notion, raggiungibili con un link, fino alle parti 2 e 3.
