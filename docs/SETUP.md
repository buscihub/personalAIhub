# PersonalOS — cosa resta da fare a mano (✋)

Stato: tutte le 8 schede, cattura, cancello, Telegram (solo testo), briefing, export e cron sono costruiti e girano in locale su dati a file.

## Subito (locale)
1. `npm run dev` → http://localhost:3000. La password è in `.env.local` (`DASHBOARD_PASSWORD`): cambiala con una frase lunga.
2. ✋ Chiave Anthropic: console.anthropic.com → API Keys, **imposta prima il limite di spesa mensile**. Mettila in `.env.local` come `ANTHROPIC_API_KEY`. Senza chiave tutto funziona ma la cattura smista "a regole", le domande/stime/Polso non rispondono.
3. ✋ Calendario: Google Calendar → impostazioni → "Indirizzo segreto in formato iCal" → `GOOGLE_CALENDAR_ICAL_URL` (trattalo come una password).
4. ✋ Finanze: o `FINANCE_FILE_PATH=/percorso/foglio.csv` (solo csv) oppure Google Sheets con account di servizio (`GOOGLE_SHEETS_FINANCE_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY`; foglio condiviso in sola lettura con l'email del service account).

## Per andare online (Percorso Completo)
5. ✋ Supabase: crea il progetto, attiva `vector`. **Poi riscrivere `lib/store.js` su Supabase** (stesse firme) + migrazione SQL (prompt A6/A7 della guida) + travaso (A20). Finché non è fatto NON fare deploy su Vercel: il filesystem è effimero e perderesti i dati.
6. ✋ Telegram: @BotFather `/newbot`, token; `openssl rand -hex 32` per `TELEGRAM_WEBHOOK_SECRET`; @userinfobot per `TELEGRAM_USER_ID`. Registra il webhook **dopo il deploy** (comando in Parte 7.4 della guida).
7. ✋ Vercel: `vercel login`, `vercel link`, variabili d'ambiente per **tutti** gli ambienti (anche preview), poi `vercel --prod`. Cron in `vercel.json` (orari in UTC).
8. Checklist finale: Parte 7.7 della guida.

## Non fatto di proposito
- Note vocali Telegram / Whisper e memoria per somiglianza (embedding): richiedono OpenAI. Si aggiungono dopo (A15/A16).
- Blocchi e Review in Home sono ancora con dati del mockup (come da guida: si collegano dopo, Parte 9).
