# Hub personale — Design doc

Specifica di riferimento del progetto, per le persone (revisori, colloqui) e per Claude Code.
Le sezioni 2 e 5 sono vincolanti: se serve deviare, prima si aggiorna questo documento (e l'ADR), poi il codice.

Nato dalle bozze del 26/11/2026 (`docs/bozze/`, solo in locale), che restano come storico: da qui in poi la
fonte di verità è questo documento. Il vecchio progetto PersonalOS (storia git fino a `42f73dc`) è solo
materiale di riferimento.

## 1. Contesto e obiettivo

### 1.1 In una frase

Una web app che diventa il mio **hub personale**: il posto unico dove catturo, organizzo e rivedo quello che
devo fare — e, modulo dopo modulo, anche allenamento e nutrizione — con un assistente IA che **propone**
come smistare, pianificare e rivedere, mentre decido sempre io. Sostituisce Notion.

### 1.2 Moduli

| Parte | Modulo | Cosa gestisce | Stato |
|---|---|---|---|
| 1 | **Organizzazione** | metodo SPACE: Inbox, task, note, appuntamenti, revisioni, priorità | progettato in questo documento |
| 2 | **Allenamento** | programma ibrido (palestra Lun/Mer/Ven, corsa Mar/Gio/Dom), log sedute, progressi | da progettare; intanto link a Notion dall'app |
| 3 | **Nutrizione** | programmi alimentari, pasti, orari | da progettare; intanto link a Notion dall'app |
| — | **Assistente** | trasversale: vede tutti i moduli e li collega | cresce con i moduli |

La parte 1 deve sostituire Notion per l'organizzazione prima di passare alle altre. L'architettura nasce già a
moduli (§3.2), così aggiungere Allenamento e Nutrizione non vuol dire riscrivere.

### 1.3 Il sistema da portare nell'app

Metodo **SPACE** (Seleziona · Pianifica · Assegna · Colora · Esegui) + cattura in 2 step, dalla pagina
Notion "Org › Space" e dai suoi database Inbox, To-Do List, Note & Risorse.

1. **Cattura** — tutto finisce nell'**Inbox**, senza pensare a dove va (zero frizione).
2. **Organizza** — a fine giornata o nelle revisioni, ogni voce va al posto giusto:
   - ha data/ora fissa → **appuntamento** in calendario
   - è un task azionabile → **task**
   - è un'idea, una risorsa, un contenuto → **nota / risorsa**

**Macroaree di vita (7):** 📚 Studio · 🏋️ Palestra/Sport · 💡 Progetti · 👨🏻‍💻 Lavoro · 🧾 Faccende ·
❤️ Vita personale · 🎮 Tempo libero. *Lavoro* è stata aggiunta alle sei di Notion.

**Revisioni fisse:**
- Mercoledì mattina → revisione impegni di metà settimana
- Domenica sera → revisione impegni + pianificazione della settimana successiva + **3 priorità della settimana**

Le routine giornaliere oggi nel calendario **non si importano** (non erano seguite): si potranno ricreare come
eventi ricorrenti; una "Ideal Week" resta un'evoluzione futura.

### 1.4 Cosa guadagno rispetto a Notion

| Momento | Oggi in Notion | Con l'hub |
|---|---|---|
| Cattura | aprire Notion, trovare l'Inbox, scrivere | barra sempre visibile, icona sulla home del telefono, invio e via |
| Smistamento | compilare a mano area, priorità, scadenza | l'assistente propone destinazione e campi, confermo con un tocco |
| Giornata | filtrare la To-Do a mano | vista "Oggi": appuntamenti, scadenze, in ritardo, priorità della settimana |
| Revisioni | checklist mentale | revisione guidata passo per passo, con storico |
| Domande | cercare | "cosa ho da fare per l'università questa settimana?" |
| Collegamenti | database separati | un solo database: l'assistente incrocia task, allenamento e pasti |

### 1.5 Non-obiettivi (per ora)

- Non è multi-utente: un solo utente, io.
- Niente app nativa: web app responsive installabile come PWA.
- Nessuna azione automatica senza conferma (l'unica eccezione è la cattura in Inbox).
- Nessuna sincronizzazione continua con Notion: la parte organizzazione si importa una volta, poi va in
  archivio. Allenamento e alimentazione restano su Notion (con un link dall'app) fino alle parti 2 e 3.
- Allenamento e Nutrizione non entrano nella parte 1.

### 1.6 Perché è anche un progetto da portfolio

Schema dati progettato da zero con RLS, migrazione da un sistema esistente, assistente con tool use e conferma
umana, PWA, test con servizi finti, deploy reale, ADR e diario di studio: ogni fase produce qualcosa da
raccontare a un colloquio.

## 2. Regole non negoziabili

1. **L'assistente propone, io confermo.** Nessuna scrittura nata dall'IA senza conferma esplicita, tranne la
   cattura in Inbox.
2. **I dati passano dai repository dei moduli.** Nessun componente o route chiama Supabase direttamente.
3. **RLS su ogni tabella**, nessuna eccezione; la chiave service role solo negli script e nei cron, mai nel
   browser (§3.4).
4. **Lo schema cambia solo con una migrazione** versionata in `supabase/migrations/`, rivista da `rls-reviewer`.
   Una migrazione già applicata non si modifica: se ne scrive una nuova.
5. **Caricare una pagina non chiama mai il modello.** Il modello parte solo da: cattura con smistamento,
   domanda in chat, pulsante, cron.
6. **"Oggi" ha una sola funzione** (`lib/core/time.ts`, fuso Europe/Rome). Mai la data del server.
7. **La cattura non fallisce mai:** se rete o modello non rispondono, la voce resta in coda sul dispositivo e
   viene ritentata.
8. **Un modulo non legge le tabelle di un altro modulo**: passa dal suo repository (o dall'assistente).
9. Segreti solo in variabili d'ambiente; nome del modello in `ANTHROPIC_MODEL`, mai scritto nel codice.
10. Codice e commit in inglese, documentazione e chat in italiano.

## 3. Architettura

### 3.1 Stack

| Livello | Scelta | Note |
|---|---|---|
| Framework | **Next.js** (App Router), React | |
| Linguaggio | **TypeScript** | [ADR-0006](adr/0006-typescript.md); progetto ripartito da zero, [ADR-0005](adr/0005-ripartenza-da-zero.md) |
| Runtime | **Node 26 LTS**, fissato in `engines` e `.nvmrc` | D19; si ripiega su Node 24 solo se una dipendenza è incompatibile |
| Database | **Supabase** (Postgres + RLS), unica fonte di verità; progetto nuovo, piano Free, regione Francoforte (eu-central-1) | [ADR-0001](adr/0001-supabase-fonte-unica.md); D17 |
| Autenticazione | Supabase Auth, email personale + password + **secondo fattore TOTP obbligatorio**, un solo utente, registrazioni chiuse | [ADR-0002](adr/0002-login-email-password.md); Google/Apple in futuro (F.1) |
| IA | Claude API (SDK Anthropic), tool use | modello in `ANTHROPIC_MODEL`; scelta e budget: D7 |
| Test | Vitest (+ Playwright per i flussi principali) | Claude sostituito da un finto; database di test locale |
| Deploy | Vercel collegato al repo GitHub `personalAIhub`, dominio `*.vercel.app` (+ cron di Vercel per briefing/promemoria) | D20 |
| Mobile | PWA installabile, cattura veloce | serve presto: sostituisce l'app Notion sul telefono |
| Calendario esterno | Google Calendar in sola lettura + feed iCal in uscita | [ADR-0003](adr/0003-calendari-opzione-c.md) |
| Migrazione | API di Notion (integrazione interna, token) | solo per l'import una tantum, [ADR-0004](adr/0004-import-notion-api.md) |

### 3.2 Struttura a moduli e flusso

```
app/                        pagine e route handler (UI sottile)
  (organizzazione)/         oggi, inbox, task, note, calendario, revisioni
  (allenamento)/            parte 2
  (nutrizione)/             parte 3
components/                 componenti React condivisi
lib/
  core/                     aree, utente, tempo ("oggi" in Europe/Rome), errori
  modules/
    organizzazione/         dominio + repository (inbox, task, note, eventi, priorità, revisioni)
    allenamento/            parte 2
    nutrizione/             parte 3
  assistant/                client Claude, prompt, strumenti per modulo, proposte e conferme
  db/                       client Supabase, tipi generati dallo schema (database.types.ts)
supabase/migrations/        schema versionato
tests/rls/                  test delle policy RLS (database locale)
scripts/import-notion/      migrazione una tantum da Notion
```

Ogni modulo espone il suo repository e i suoi **strumenti per l'assistente**: aggiungere un modulo vuol dire
aggiungere tabelle, pagine e strumenti, senza toccare gli altri (regola 8).

- **Flusso dati:** UI → route handler / server action → repository del modulo → Supabase.
- **Flusso assistente:** richiesta → strumenti di lettura → proposta salvata in `assistant_proposals` →
  l'utente conferma → il repository del modulo scrive.

### 3.3 Modello dati

Parte 1 (bozza; ogni tabella nasce con la sua migrazione nella fase indicata). Tutte le tabelle hanno `id`
(uuid), `user_id` (fk `auth.users`, default `auth.uid()`), `created_at`, `updated_at`.

**areas** — le macroaree (fase 1)
| Colonna | Tipo | Note |
|---|---|---|
| name | text | Studio, Palestra/Sport, Progetti, Lavoro, Faccende, Vita personale, Tempo libero |
| emoji, color | text | |
| sort_order | int | |
| archived | bool | un'area non si cancella, si archivia |

**inbox_items** — cattura grezza (fase 1)
| Colonna | Tipo | Note |
|---|---|---|
| text | text | quello che ho scritto |
| source | text | web, pwa, scorciatoia, (telegram) |
| processed_at | timestamptz | null = da smistare |
| result_type / result_id | text / uuid | dove è finita (task, nota, evento) |

**tasks** — ex To-Do List (fase 1)
| Colonna | Tipo | Note |
|---|---|---|
| title, notes | text | |
| status | enum | todo, in_progress, done (da Notion: Not started, …) |
| priority | enum | alta, media, bassa |
| due_date | date | scadenza senza ora |
| area_id | fk areas | |
| completed_at | timestamptz | |

**notes** — ex Note & Risorse (fase 1)
| Colonna | Tipo | Note |
|---|---|---|
| title, body | text | body in Markdown |
| url | text | ex campo Link |
| status | enum | idea, in_progress, archived |
| area_id | fk areas | |

**events** — appuntamenti, ex task con "Da calendarizzare = Yes" (fase 3)
| Colonna | Tipo | Note |
|---|---|---|
| title, notes, location | text | |
| starts_at, ends_at | timestamptz | |
| all_day | bool | |
| area_id | fk areas | |
| recurrence | text | regola di ripetizione (RRULE) |
| source | enum | app, google — gli eventi Google sono solo letti, non copie modificabili (D22) |

**assistant_proposals** — log di ogni proposta dell'IA (fase 5)
| Colonna | Tipo | Note |
|---|---|---|
| kind, payload | text, jsonb | cosa propone (es. crea task con questi campi) |
| status | enum | pending, accepted, edited, rejected |
| model, context_ref | text | modello usato, da dove nasce (inbox, chat, revisione) |

**week_priorities** — le 3 priorità della settimana, con storico (fase 6)
| Colonna | Tipo | Note |
|---|---|---|
| week_start | date | lunedì della settimana |
| position | int | 1–3 |
| text, done | text, bool | |
| task_id | fk tasks, nullable | collegamento facoltativo a un task |

**reviews** — revisioni (fase 6)
| Colonna | Tipo | Note |
|---|---|---|
| kind | enum | midweek, weekly |
| done_at | timestamptz | |
| summary | jsonb | cosa è stato smistato, spostato, deciso |

**conversations / messages** — chat con l'assistente (fase 7, da dettagliare; memoria: D8).

**Parti 2 e 3 (solo segnaposto):** `workout_plans`, `workout_sessions`, `exercise_sets`, `runs`, `goals` ·
`meal_plans`, `meals`, `food_items`. Si progettano quando si arriva lì.

### 3.4 Sicurezza

Un solo utente, ma lo schema è scritto come se gli utenti fossero tanti: è RLS a garantire l'isolamento, non
l'interfaccia.

| Ruolo | Accesso |
|---|---|
| `anon` | nessuna riga di nessuna tabella; solo la pagina di login |
| `authenticated` con sessione `aal1` (solo password) | nessuna riga di nessuna tabella: può solo completare la verifica del secondo fattore |
| `authenticated` con sessione `aal2` (password + TOTP) | solo le proprie righe: `user_id = (select auth.uid())` in `using` e `with check`, per select, insert, update |
| `service_role` | bypassa la RLS: solo negli script (import Notion) e nei cron, lato server; mai nel browser né in `NEXT_PUBLIC_*` |

**Come si applica `aal2`.** Su ogni tabella, oltre alle policy di proprietà (permissive), c'è una policy
`as restrictive` per il ruolo `authenticated` con `(select auth.jwt() ->> 'aal') = 'aal2'` in `using` e
`with check`: le policy restrittive si combinano in AND con le altre, quindi senza `aal2` nessuna operazione
passa, qualunque cosa dicano le policy di proprietà. Lo stesso controllo c'è nell'app, su pagine, route
handler e server action (una sessione `aal1` viene mandata alla verifica del codice): l'app dà l'esperienza
giusta, il database garantisce il divieto.

- **RLS attiva su ogni tabella** (regola 3), anche sulle tabelle segnaposto quando nascono.
- **Nessuna tabella di membri** e nessuna funzione di appartenenza: il proprietario è `user_id`.
- **Cancellazioni:** `areas` non ha policy di delete (si archivia). Per le altre tabelle la delete è permessa
  solo al proprietario; l'assistente non ha strumenti di cancellazione (§3.5).
- **`user_id` non cambia:** l'update non può spostare una riga a un altro utente (`with check`).
- **Funzioni `security definer`:** da evitare; se servono, `search_path` fissato e `grant execute` ristretto.
- **Test:** ogni tabella ha un test in `tests/rls/` che prova che (1) un secondo utente non vede né modifica le
  righe del primo e (2) una sessione `aal1` del proprietario non legge né scrive nulla.
- **Registrazione chiusa:** la registrazione pubblica è disattivata in Supabase Auth; l'unico account si crea
  dalla dashboard di Supabase; la password si reimposta via email (D16). Nessuna pagina di registrazione
  nell'app.
- **Secondo fattore (D23):** TOTP obbligatorio, **un solo fattore**, registrato in Google Authenticator con la
  sincronizzazione attiva; la password sta in NordPass. Niente SMS/WhatsApp, nessun fattore di riserva, niente
  codici di recupero di Supabase (funzione sperimentale).
- **Recupero dell'accesso:**
  1. telefono perso → si recuperano i codici entrando in Google Authenticator su un altro telefono (sono
     sincronizzati con l'account Google);
  2. se non è possibile → si rimuove il fattore da Supabase (SQL editor su `auth.mfa_factors` o API admin) e se
     ne registra uno nuovo;
  3. dispositivo rubato → chiusura di tutte le sessioni, cambio password, nuovo fattore.
- **Account a monte:** l'account Supabase e l'account Google sono protetti con MFA, con i rispettivi codici di
  recupero salvati fuori dal telefono: chi li controlla può togliere il fattore o leggere i codici TOTP.
- **Limite noto:** `aal2` non protegge da una sessione `aal2` già rubata (es. cookie sottratto da un dispositivo
  sbloccato); la difesa in quel caso è la chiusura di tutte le sessioni (punto 3).
- **Feed iCal in uscita:** URL privato con token segreto non indovinabile, revocabile (fase 3).

### 3.5 Assistente IA

Un collaboratore che conosce il metodo SPACE e i miei dati. **Propone, non decide.** Ogni proposta arriva come
una scheda con i campi già compilati e tre azioni: *Conferma*, *Modifica*, *Scarta*. È trasversale: ogni
modulo gli dà i suoi strumenti.

**Capacità nella parte 1**

| Capacità | Esempio | Fase |
|---|---|---|
| Smistare l'Inbox | "tagliando moto" → task, area Faccende, priorità Media, nessuna scadenza | 5 |
| Riconoscere un appuntamento | "esame OS 12 novembre 9:30" → evento il 12/11 alle 9:30, area Studio | 5 |
| Guidare le revisioni | domenica sera: Inbox → in ritardo → settimana prossima → 3 priorità | 6 |
| Rispondere sui dati | "cosa ho in ritardo per Studio?" | 7 |
| Agire su richiesta | "sposta il fisio a lunedì" → proposta di modifica, poi conferma | 7 |
| Briefing e promemoria | mattina: priorità, appuntamenti e scadenze di oggi, voci in Inbox | 8 |

**Strumenti (tool use)**
- Lettura (nessuna conferma): `list_inbox`, `list_tasks(filtri)`, `list_events(intervallo)`,
  `list_notes(filtri)`, `get_week_priorities`, `today`.
- Scrittura (sempre come **proposta**): `propose_task`, `propose_event`, `propose_note`, `propose_update`,
  `propose_mark_processed`, `propose_week_priorities`. Scrivono solo in `assistant_proposals`; la conferma
  nella UI esegue la modifica tramite il repository del modulo.

**Contesto che riceve:** regole del metodo SPACE (le tre destinazioni, le aree, appuntamento vs task); data e
ora correnti da `lib/core/time.ts`; le 3 priorità della settimana; solo i dati necessari alla richiesta, presi
con gli strumenti di lettura.

**Cosa non fa:** non scrive senza conferma e non cancella mai nulla; non inventa date (se la data non è chiara
lascia il campo vuoto e lo dice); non viene chiamato al caricamento delle pagine.

**Ripiego senza modello:** la cattura salva comunque in Inbox; lo smistamento mostra un modulo manuale
precompilato da regole semplici (parole chiave → area, date riconosciute → evento o scadenza).

**Dopo (parti 2 e 3):** "com'è andata la settimana?", spostare una seduta se l'agenda è piena, suggerire i
pasti in base al programma, incroci ("domani lungo di corsa alle 8: sposto lo studio al pomeriggio?").

**Voce (futuro, F.2):** parlare con l'assistente a voce invece di scrivere. Valgono le stesse regole: quello che
nasce dalla voce è una proposta da confermare (tranne la cattura in Inbox). Il modo di implementarla si decide
più avanti (D24).

## 4. Qualità e test

- **Comando unico:** `npm run check` (lint + typecheck + Vitest), dal task 0.2; deve essere verde a ogni task.
- **Repository:** test contro un database Supabase locale (`supabase start`, richiede Docker), dati di prova da
  seed; `npm run test:db`.
- **RLS:** in `tests/rls/`, un secondo utente non vede né modifica le righe del primo, e una sessione `aal1`
  non legge né scrive nulla (§3.4).
- **Autenticazione:** test che una sessione `aal1` viene mandata alla verifica del codice su pagine, route
  handler e server action; Playwright sul flusso login → codice TOTP.
- **Assistente:** test con un **finto Claude** che restituisce tool call prestabilite; si verifica che nulla si
  scriva senza conferma.
- **`lib/core/time.ts`:** test su mezzanotte e cambio ora legale.
- **Import da Notion:** test su risposte reali dell'API salvate come fixture; conteggi prima/dopo.
- **Flussi principali:** Playwright (login, cattura, smistamento) quando esistono.
- **`/officina:rompilo`** su cattura offline (2.3), assistente con timeout e risposta malformata (5.4), import
  (4.2).

## 5. Tabella di marcia

Ogni task = una sessione Claude Code: `/officina:task-start N.N` → lavoro → `/officina:task-close N.N` →
`/clear`. Fine fase: `/officina:phase-close N`.

### Parte 1 — Organizzazione

| Fase | Contenuto | Criterio di uscita |
|---|---|---|
| **0 · Fondamenta** | progetto, metodo, Supabase, login con secondo fattore, deploy | app online su Vercel dietro login con secondo fattore, check verdi |
| **1 · Nucleo SPACE** | schema, aree, Inbox, task, note, vista Oggi | gestisco task e note di una giornata solo dall'app |
| **2 · Cattura e PWA** | cattura veloce, app installabile, offline | catturo dal telefono in meno di 5 secondi, anche senza rete |
| **3 · Calendario** | eventi, agenda, Google Calendar in lettura, feed iCal | vedo tutti gli impegni della settimana nell'app e i miei appuntamenti sul calendario del telefono |
| **4 · Migrazione da Notion** | import una tantum, verifica, Notion in archivio | uso solo l'app per 7 giorni senza aprire Notion |
| **5 · Smistamento con l'assistente** | proposte IA per l'Inbox, conferma, log | svuoto l'Inbox confermando le proposte |
| **6 · Revisioni guidate** | mercoledì e domenica passo per passo, priorità | faccio una revisione della domenica completa nell'app |
| **7 · Chat con l'assistente** | domande e azioni in linguaggio naturale | 5 domande reali con risposte corrette, 2 azioni confermate |
| **8 · Proattività** | briefing, promemoria | ricevo il briefing ogni mattina per 7 giorni |

**Fase corrente: 0 · Fondamenta** *(aggiornare questa riga a ogni cambio di fase)*

### 5.1 Task per fase

Ogni task è pensato come una modifica piccola e verificabile. Una fase è chiusa quando il criterio di uscita è
verificato.

**Fase 0 · Fondamenta**
- [x] 0.1 Adozione del metodo officina: design doc dalle bozze, `.claude/officina.json`, CHANGELOG, ADR delle decisioni motivate, `scripts/check-task-docs.mjs`
- [ ] 0.2 Scaffold Next.js + TypeScript ("Hub personale"), ESLint, Prettier, Vitest, script `check`; Node 26 LTS in `engines` e `.nvmrc` (aggiornare Node in locale)
- [ ] 0.3 Supabase: nuovo progetto cloud (piano Free, eu-central-1), CLI, ambiente locale, tipi generati, script `db:types` e `test:db`
- [ ] 0.4 Login con email + password (Supabase Auth), registrazione pubblica disattivata, reset password via email, sessione che resta attiva su ogni dispositivo, protezione delle pagine
- [ ] 0.5 Secondo fattore TOTP obbligatorio (Supabase Auth MFA): registrazione del fattore, richiesta del codice al login, controllo `aal2` su pagine, route handler e server action; test della sessione `aal1` (D23)
- [ ] 0.6 `lib/core/time.ts` con test; layout (navigazione mobile-first); deploy su Vercel collegato al repo GitHub, dominio `*.vercel.app`
- **Uscita:** URL pubblico che chiede login e codice TOTP, senza possibilità di registrarsi; il fattore è registrato; una sessione con la sola password non arriva a nessuna pagina; dopo l'accesso, layout vuoto con la navigazione; test di login e secondo fattore verdi; `npm run check` verde.

**Fase 1 · Nucleo SPACE**
- [ ] 1.1 Migrazione: `areas` (con le 7 aree) e `tasks`, RLS (proprietà + `aal2` restrittiva) e test RLS
- [ ] 1.2 Repository e pagine task: crea, modifica, completa, filtri per area/priorità/stato
- [ ] 1.3 Migrazione + repository + pagina `notes` (Markdown, link)
- [ ] 1.4 Migrazione `inbox_items`; pagina Inbox con smistamento manuale (→ task / nota)
- [ ] 1.5 Vista **Oggi**: in ritardo, scadenze di oggi, conteggio Inbox
- [ ] 1.6 Sezione "Collegamenti" nella navigazione: link alle pagine Notion di Allenamento e Programmi alimentari
- **Uscita:** una giornata intera gestita solo dall'app (cattura, smistamento manuale, completamento).

**Fase 2 · Cattura e PWA**
- [ ] 2.1 Barra di cattura sempre visibile, invio con un tasto
- [ ] 2.2 PWA installabile (manifest, icona, schermata di cattura come avvio rapido)
- [ ] 2.3 Coda offline sul dispositivo con ritentativo; `/officina:rompilo` sulla cattura
- **Uscita:** cattura dal telefono in meno di 5 secondi; nessuna voce persa staccando la rete.

**Fase 3 · Calendario**
- [ ] 3.1 Migrazione `events` con ricorrenze; repository con espansione delle ricorrenze
- [ ] 3.2 Agenda giorno e settimana; creazione/modifica eventi
- [ ] 3.3 Smistamento Inbox → evento; eventi di oggi nella vista Oggi
- [ ] 3.4 Lettura di Google Calendar (sola lettura) per vedere gli inviti nell'agenda (D22)
- [ ] 3.5 Feed iCal privato della mia agenda, da aggiungere al calendario dell'iPhone (notifiche native)
- **Uscita:** nell'agenda vedo appuntamenti dell'app + inviti Google; gli appuntamenti dell'app compaiono anche nel calendario del telefono.

**Fase 4 · Migrazione da Notion**
- [ ] 4.1 Integrazione interna Notion (token) e script di import via API per To-Do, Note, Inbox, con mappatura dei campi (task con "Da calendarizzare = Yes" → `events`) (D13)
- [ ] 4.2 Prova su un database di test, conteggi e confronto a campione; `/officina:rompilo` sull'import
- [ ] 4.3 Import reale; pagine Notion segnate come archiviate
- **Uscita:** tutti i dati sono nell'app; uso solo l'app per 7 giorni.

**Fase 5 · Smistamento con l'assistente**
- [ ] 5.1 `lib/assistant`: client Claude, prompt SPACE, finto Claude per i test (D7)
- [ ] 5.2 Migrazione `assistant_proposals`; strumenti di lettura e `propose_*`
- [ ] 5.3 Scheda proposta: conferma / modifica / scarta → scrittura tramite repository
- [ ] 5.4 Ripiego a regole senza modello; `/officina:rompilo` sull'assistente
- **Uscita:** Inbox svuotata confermando proposte; test che provano che nulla si scrive senza conferma.

**Fase 6 · Revisioni guidate**
- [ ] 6.1 Migrazioni `week_priorities` e `reviews`
- [ ] 6.2 Revisione della domenica: Inbox → in ritardo → settimana prossima → 3 priorità
- [ ] 6.3 Revisione del mercoledì (corta); storico revisioni
- **Uscita:** una revisione della domenica fatta tutta nell'app, priorità visibili in Oggi.

**Fase 7 · Chat con l'assistente**
- [ ] 7.1 Chat con streaming e strumenti di lettura
- [ ] 7.2 Azioni dalla chat come proposte confermabili
- [ ] 7.3 Migrazioni `conversations` / `messages`, conversazioni salvate (D8)
- **Uscita:** 5 domande reali con risposte corrette, 2 azioni eseguite dopo conferma.

**Fase 8 · Proattività**
- [ ] 8.1 Cron briefing mattutino (D9)
- [ ] 8.2 Promemoria revisioni mercoledì/domenica
- **Uscita:** briefing ricevuto ogni mattina per 7 giorni.

**Sviluppi futuri della Parte 1**
- [ ] F.1 Accesso con Google e con Apple (Supabase Auth OAuth), in aggiunta a email + password
- [ ] F.2 Comunicazione vocale con l'assistente: parlare invece di scrivere (e, se serve, risposte a voce), con le stesse regole di conferma; approccio da decidere (D24), dopo la fase 7

### 5.2 Parte 2 — Allenamento (da progettare)

Idee di partenza: programma ibrido di 12 settimane (palestra Upper A / Lower A / Full Body B, corsa qualità /
easy / lungo), log delle sedute (oggi in Notion "Log Sedute", con dati Strava/Runna), obiettivi (5 km sotto i
25', massimali panca e stacco), sedute come eventi in calendario, strumenti per l'assistente.
Prima fase: importare il log da Notion e registrare le sedute dall'app.

### 5.3 Parte 3 — Nutrizione (da progettare)

Idee di partenza: programmi alimentari (oggi in Notion "Programmi alimentari"), pasti agli orari della
routine, collegamento con i giorni di allenamento, strumenti per l'assistente.

## 6. Architecture Decision Records

| # | Titolo | Decisione in breve |
|---|---|---|
| [0001](adr/0001-supabase-fonte-unica.md) | Supabase come unica fonte di verità | Database proprio su Supabase; Notion si importa una volta e va in archivio; priorità della settimana con storico in tabella |
| [0002](adr/0002-login-email-password.md) | Login con email, password e secondo fattore | Supabase Auth, email + password + un solo fattore TOTP obbligatorio, `aal2` nell'app e nella RLS, registrazioni chiuse; Google/Apple in futuro |
| [0003](adr/0003-calendari-opzione-c.md) | Calendari esterni: opzione C | Appuntamenti nell'app; Google Calendar in sola lettura; feed iCal in uscita per il telefono |
| [0004](adr/0004-import-notion-api.md) | Import una tantum via API di Notion | Integrazione interna con token, solo To-Do, Note, Inbox; routine non importate |
| [0005](adr/0005-ripartenza-da-zero.md) | Si riparte da zero | Nuovo progetto; il vecchio PersonalOS, mai avviato davvero, resta nella storia git solo come riferimento |
| [0006](adr/0006-typescript.md) | TypeScript | Tipi dal database all'interfaccia, errori prima dell'esecuzione |

## 7. Domande aperte

Quando una domanda riceve risposta: aggiornare lo stato e scrivere la risposta qui, poi le sezioni che ne
dipendono. Numerazione ereditata dalle bozze (D1–D6, D10–D12 sono decise: §6).

| # | Domanda | Perché serve | Blocca | Stato |
|---|---|---|---|---|
| D7 | Modello Claude e budget mensile per l'IA | Costo e qualità dello smistamento. Proposta: modello piccolo per lo smistamento, più capace per chat e revisioni; tetto di spesa nelle impostazioni | 5.1 | aperta |
| D8 | L'assistente ricorda qualcosa tra una conversazione e l'altra? | Schema di `conversations`/`messages`. Proposta: per ora no, oltre ai dati dell'app e al log delle proposte | 7.3 | aperta |
| D9 | Canale del briefing: pagina dell'app, notifica PWA, email, Telegram? | Dove arriva il briefing. Proposta: notifica PWA + pagina; Telegram da valutare | 8.1 | aperta |
| D13 | Cosa importare da Notion: anche task completati e storico, o solo l'aperto? | Mappatura e conteggi dell'import. Proposta: tutto, con lo stato originale | 4.1 | aperta |
| D14 | La documentazione di progetto va su git? | officina confronta design doc e CHANGELOG con il diff | 0.1 | **risolta (26/11/2026):** opzione A — su git README, `docs/DESIGN_DOC.md`, `docs/CHANGELOG.md`, `docs/adr/`; in locale bozze, `CLAUDE.md`, `study/` |
| D15 | Perché si riparte da zero (D2) e perché TypeScript (D3)? | Senza motivazione scritta le due decisioni non diventano ADR | ADR di D2 e D3 | **risolta (27/11/2026):** D2 — il vecchio progetto non è mai stato realmente avviato e ripartire da zero evita confusione ([ADR-0005](adr/0005-ripartenza-da-zero.md)); D3 — tipi generati dal database fino all'interfaccia, errori scoperti prima dell'esecuzione, competenza utile per il curriculum ([ADR-0006](adr/0006-typescript.md)) |
| D16 | Come nasce l'unico account? | Nessuno deve potersi registrare | 0.4 | **risolta (27/11/2026):** registrazione pubblica disattivata in Supabase Auth, unico utente creato dalla dashboard, reset password via email; nessuna pagina di registrazione nell'app (§3.4, ADR-0002) |
| D17 | Progetto Supabase cloud: esiste già? In che regione? | Ambiente cloud del database | 0.3 | **risolta (27/11/2026):** non esiste; se ne crea uno nuovo nel task 0.3, piano Free, regione Francoforte (eu-central-1) |
| D18 | Nome del progetto | `package.json`, titolo e manifest della PWA | 0.2 | **risolta (27/11/2026):** titolo "Hub personale", nome breve della PWA "Hub", repo `personalAIhub` |
| D19 | Versione di Node | Allineare locale e Vercel | 0.2 | **risolta (27/11/2026):** Node 26 LTS, fissato in `engines` e `.nvmrc` nel task 0.2; Node in locale (25) va aggiornato; si ripiega su Node 24 solo se una dipendenza è incompatibile |
| D20 | Deploy su Vercel: progetto collegato al repo GitHub, dominio `*.vercel.app`? | Come arriva online l'app | 0.6 | **risolta (27/11/2026):** Vercel collegato al repo GitHub `personalAIhub`, dominio `*.vercel.app` |
| D21 | Il vecchio `.env.local` di PersonalOS si svuota o si tiene? | Conteneva i segreti del vecchio progetto (ignorato da git) | 0.2 | **risolta (27/11/2026):** svuotato, senza copie |
| D22 | Eventi Google: letti al volo o salvati come copie in sola lettura (`events.source = google`)? | Le bozze dicono "non salvati come copia modificabile" ma lo schema prevede `source = google` | 3.4 | aperta |
| D23 | Secondo fattore: quale metodo, e come si rientra se perdo il telefono? | Supabase non ha codici di recupero stabili; il metodo decide il recupero | 0.5 | **risolta (27/11/2026):** TOTP obbligatorio, un solo fattore in Google Authenticator con sincronizzazione attiva, password in NordPass; niente SMS/WhatsApp, nessun fattore di riserva, niente codici di recupero di Supabase (sperimentali). Controllo `aal2` su pagine, route handler e server action e con una policy RLS `as restrictive` su ogni tabella. Recupero: codici da Google Authenticator su un altro telefono; altrimenti rimozione del fattore da Supabase (SQL editor su `auth.mfa_factors` o API admin) e nuova registrazione; dispositivo rubato: chiusura di tutte le sessioni, cambio password, nuovo fattore. Account Supabase e Google protetti con MFA, codici di recupero salvati fuori dal telefono. Limite: `aal2` non protegge da una sessione `aal2` già rubata (§3.4, ADR-0002) |
| D24 | Voce: come si implementa? | Scelte possibili: dettatura del browser/sistema (gratis, nessun codice), trascrizione lato server con un servizio di speech-to-text, conversazione vocale in tempo reale; servono anche risposte a voce? Costi (D7) e privacy dell'audio | F.2 | aperta, da decidere a tempo debito |
