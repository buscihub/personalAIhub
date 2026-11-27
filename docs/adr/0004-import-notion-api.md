# ADR-0004: Import una tantum da Notion via API

- **Data:** 2026-11-26
- **Stato:** Accettata
- **Task collegato:** 4.1

## Contesto

Con il passaggio a Supabase (ADR-0001) i dati della parte organizzazione vanno portati nell'app una volta sola.
Serve un modo ripetibile (prima su un database di test, poi reale) e verificabile con i conteggi.

## Decisione

Import tramite l'API di Notion (gratuita su tutti i piani) con un'integrazione interna e il suo token, usata
solo per la migrazione: per la parte 1 si importano To-Do, Note e Inbox; le routine giornaliere del calendario
non si importano (non erano seguite, D11).

## Alternative considerate

*(Da completare: le alternative valutate non sono riportate nelle bozze.)*

## Conseguenze

- Lo script vive in `scripts/import-notion/` e usa la chiave service role, solo lato server (§3.4).
- I test usano risposte reali dell'API salvate come fixture; conteggi prima/dopo (§4).
- Resta da decidere se importare anche completati e storico (D13).
- Allenamento e alimentazione restano su Notion fino alle parti 2 e 3.
