# Changelog — Hub personale

Diario di cosa è stato fatto, in ordine cronologico (più recente in cima). **Non spiega il perché** delle scelte
tecniche — quello sta negli ADR (`docs/adr/`) — registra **cosa è cambiato e quando**.

Una voce per task chiuso: data, task, cosa è cambiato.

---

## 2026-11-27 — Revisione della specifica

- Autenticazione: secondo fattore obbligatorio e registrazione pubblica chiusa (ADR-0002 aggiornata, §3.4,
  D16 risolta, nuova domanda D23). Fase 0: nuovo task 0.5 (secondo fattore); il vecchio 0.5 diventa 0.6.
- Nuovo sviluppo futuro F.2: comunicazione vocale con l'assistente (§3.5, domanda D24).
- Risolte le domande della fase 0 (D15–D21, D23). Nuovi ADR-0005 (ripartenza da zero) e ADR-0006
  (TypeScript); ADR-0002 aggiornata con TOTP unico, `aal2` nell'app e in una policy RLS restrittiva, procedura
  di recupero e limite noto. §3.1 (Supabase Free eu-central-1, Node 26 LTS, Vercel), §3.4 (ruoli `aal1`/`aal2`,
  test RLS sulla sessione `aal1`), §4, task 0.2–0.6 e criterio di uscita della fase 0 aggiornati.
- Svuotato il vecchio `.env.local` di PersonalOS (D21).

## 2026-11-26 — 0.1 Adozione del metodo officina

- Rimossi dal working tree i sorgenti del vecchio PersonalOS (restano nella storia git fino a `42f73dc`, solo
  come riferimento): si riparte da zero in TypeScript.
- `.gitignore`: la documentazione resta in locale, tranne README, `docs/DESIGN_DOC.md`, `docs/CHANGELOG.md` e
  `docs/adr/` (D14).
- `docs/DESIGN_DOC.md` scritto dalle bozze del 26/11/2026: contesto, 10 regole non negoziabili, architettura
  (stack, moduli, modello dati, sicurezza, assistente), qualità, tabella di marcia con le fasi 0–8, ADR,
  domande aperte. Fase 0 rinumerata: il vecchio task "scrivere gli ADR" è confluito in 0.1.
- ADR 0001–0004 (Supabase fonte unica, login email + password, calendari opzione C, import via API di Notion)
  e modello `docs/adr/TEMPLATE.md`.
- `.claude/officina.json` e `scripts/check-task-docs.mjs`.
