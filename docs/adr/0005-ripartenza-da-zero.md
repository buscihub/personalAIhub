# ADR-0005: Si riparte da zero

- **Data:** 2026-11-26 (motivazione scritta il 2026-11-27)
- **Stato:** Accettata
- **Task collegato:** 0.1

## Contesto

Nella storia git c'è un progetto precedente, PersonalOS (JavaScript, commit fino a `42f73dc`): una dashboard a
schede con archivio su file, cattura con ripiego a regole, parser iCal. L'hub ha un'altra base (Supabase come
fonte unica, ADR-0001; TypeScript, ADR-0006) e un altro perimetro.

## Decisione

Si riparte da zero: i sorgenti di PersonalOS sono stati tolti dal working tree e restano nella storia git solo
come riferimento da consultare.

## Alternative considerate

- **Evolvere PersonalOS** — scartata: il progetto non è mai stato realmente avviato, quindi non c'è nulla in uso
  da preservare, e far convivere due progetti nello stesso codice crea confusione.

## Conseguenze

- Nessun codice si copia così com'è; le idee utili (ripiego a regole della cattura, parser iCal) si riprendono
  con `git show 42f73dc:<file>` e si riscrivono in TypeScript.
- La storia git resta: chi guarda il repo vede anche il progetto precedente.
