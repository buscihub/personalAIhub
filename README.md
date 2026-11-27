# Hub personale

Web app personale (un solo utente) che sostituisce Notion per organizzare la giornata con il metodo SPACE:
Inbox, task, note, calendario e revisioni, con un assistente IA che **propone e non decide**.

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase · Vercel.
La specifica completa è in [`docs/DESIGN_DOC.md`](docs/DESIGN_DOC.md), le decisioni motivate in
[`docs/adr/`](docs/adr/), la cronologia in [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

## Requisiti

- Node 26 (versione in `.nvmrc`)

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm install` | installa le dipendenze |
| `npm run dev` | avvia l'app in locale su http://localhost:3000 |
| `npm run build` | build di produzione |
| `npm run check` | lint, typecheck, formattazione e test: deve essere verde a ogni modifica |
| `npm run format` | formatta il codice con Prettier |

## Stato

Fase 0 · Fondamenta: progetto e strumenti pronti; database, login e deploy in arrivo.
