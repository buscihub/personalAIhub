# ADR-0006: TypeScript

- **Data:** 2026-11-26 (motivazione scritta il 2026-11-27)
- **Stato:** Accettata
- **Task collegato:** 0.2

## Contesto

L'app attraversa più livelli (database Supabase, repository dei moduli, route handler, componenti React,
strumenti dell'assistente) e lo schema cambierà spesso con le migrazioni. Il vecchio PersonalOS era in
JavaScript.

## Decisione

Tutto il progetto è in TypeScript, con i tipi generati dallo schema del database (`lib/db/database.types.ts`).

## Alternative considerate

- **JavaScript** (come PersonalOS) — scartata: un cambio di schema o di forma dei dati si scoprirebbe solo
  durante l'esecuzione.

## Conseguenze

- I tipi vanno dal database all'interfaccia: dopo ogni migrazione si rigenerano (`npm run db:types`) e il
  typecheck segnala dove il codice non torna più.
- Gli errori di forma dei dati emergono prima dell'esecuzione, nel `npm run check`.
- È una competenza utile per il curriculum.
