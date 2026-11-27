# ADR-0003: Calendari esterni — opzione C

- **Data:** 2026-11-26
- **Stato:** Accettata
- **Task collegato:** 3.4, 3.5

## Contesto

Gli appuntamenti devono stare nell'hub (fonte unica, ADR-0001), ma due cose restano fuori: gli inviti che
altre persone mi mandano su Google Calendar, e le notifiche native del telefono, che una PWA non garantisce
allo stesso modo del calendario di sistema.

## Decisione

Gli appuntamenti vivono nell'app; l'app legge Google Calendar in sola lettura (per vedere gli inviti
nell'agenda) e pubblica un feed iCal privato della mia agenda, da aggiungere al calendario del telefono per
averne le notifiche.

## Alternative considerate

*(Da completare: le opzioni A e B discusse il 26/11/2026 non sono riportate nelle bozze.)*

## Conseguenze

- Gli eventi Google non sono copie modificabili; resta da decidere se si leggono al volo o si salvano in sola
  lettura (D22).
- Il feed iCal è un URL privato con token segreto e revocabile (§3.4).
- Modificare un appuntamento si fa solo nell'app; il telefono lo vede al prossimo aggiornamento del feed.
