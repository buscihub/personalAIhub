# ADR-0002: Login con email, password e secondo fattore (Supabase Auth)

- **Data:** 2026-11-26 (aggiornata il 2026-11-27: secondo fattore TOTP, registrazioni chiuse, recupero)
- **Stato:** Accettata
- **Task collegato:** 0.4, 0.5

## Contesto

L'app è per un solo utente ma va usata da tutti i dispositivi (Mac, iPhone, ecc.), con una sessione che resta
attiva. Sta su un URL pubblico e contiene dati personali (impegni, note, più avanti allenamento e
alimentazione): una password da sola non basta, e nessun altro deve poter creare un account. Il database è
Supabase (ADR-0001) e le policy RLS si basano sull'utente autenticato (`auth.uid()`).

## Decisione

Supabase Auth con email personale + password (in NordPass) e **un solo secondo fattore TOTP obbligatorio**
(Google Authenticator con sincronizzazione attiva), con la **registrazione pubblica disattivata** (unico
account creato dalla dashboard, reset password via email); il livello `aal2` è richiesto sia dall'app (pagine,
route handler, server action) sia dal database, con una policy RLS `as restrictive` su ogni tabella.

## Alternative considerate

- **Solo email + password** — la prima versione di questa decisione (26/11/2026): un URL pubblico con dati
  personali protetto da un solo fattore.
- **SMS / WhatsApp come secondo fattore** — scartati: a pagamento su Supabase e più deboli del TOTP.
- **Codici di recupero di Supabase** — scartati: funzione sperimentale.
- **Due fattori TOTP, uno di riserva** — scartato: la sincronizzazione di Google Authenticator copre già la
  perdita del telefono, e c'è la rimozione del fattore dalla dashboard come ultima via.
- **Controllo `aal2` solo nell'app** — scartato: una sessione `aal1` potrebbe leggere i dati chiamando
  direttamente l'API di Supabase; la policy restrittiva lo impedisce nel database.
- **Accesso con Google / Apple (OAuth) da subito** — rimandato a F.1.
- **Password unica dell'app senza utenti** (come nel vecchio PersonalOS) — non dà un `auth.uid()` su cui
  scrivere le policy RLS.

## Conseguenze

- Ogni tabella ha le policy di proprietà più la policy restrittiva `aal2`; i test RLS provano anche che una
  sessione `aal1` non legge né scrive nulla (§3.4, §4).
- Procedura di recupero documentata in §3.4: codici da Google Authenticator su un altro telefono; altrimenti
  rimozione del fattore (SQL editor su `auth.mfa_factors` o API admin) e nuova registrazione; dispositivo
  rubato → chiusura di tutte le sessioni, cambio password, nuovo fattore.
- La sicurezza dipende anche dagli account Supabase e Google, protetti con MFA e codici di recupero fuori dal
  telefono.
- **Limite:** `aal2` non protegge da una sessione `aal2` già rubata.
- Aggiungere OAuth più avanti non cambia lo schema: è un altro modo di ottenere lo stesso utente, sempre con il
  secondo fattore.
