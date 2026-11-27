# ADR-0007: Stile con Tailwind CSS v4

- **Data:** 2026-11-27
- **Stato:** Accettata
- **Task collegato:** 0.2

## Contesto

L'app è mobile-first (la cattura dal telefono sostituisce l'app di Notion) e serve un modo coerente di gestire
colori, spaziature e font fin dal primo componente. La specifica non sceglieva come scrivere lo stile, e lo
scaffold di Next.js chiede di deciderlo subito.

## Decisione

Lo stile si scrive con **Tailwind CSS v4**: classi di utilità nel markup, token del progetto (colori, font)
definiti in CSS con `@theme` in `app/globals.css`, riuso tramite componenti React invece che tramite classi.

## Alternative considerate

- **CSS Modules + variabili CSS** — scartata: nessuna dipendenza, ma più lento da scrivere e la coerenza dei
  valori dipende solo dalla disciplina; i componenti accessibili vanno comunque scritti a mano.
- **Tailwind + shadcn/ui** — rimandata: componenti accessibili già pronti (Radix) copiati nel repo, ma
  porterebbero subito molto codice non scritto da me. Si rivaluta componente per componente quando ne servirà
  uno complesso (probabilmente il pannello di cattura, fase 2).

## Conseguenze

- Tailwind genera solo le classi usate: il CSS finale resta piccolo.
- Integrazione con Next tramite `@tailwindcss/turbopack` (una regola `turbopack.rules` in `next.config.ts`), come
  la genera `create-next-app` 16; niente `postcss.config`.
- Mobile-first naturale: classi senza prefisso per il telefono, `md:`/`lg:` per schermi più grandi.
- `prettier-plugin-tailwindcss` ordina le classi in modo stabile, così il markup è più leggibile e i diff puliti.
- I token di partenza sono pochi e provvisori; la palette vera si decide nel task 0.6 con il layout.
- Modali, menu e simili accessibili restano da scrivere a mano finché non si adotta shadcn/ui o Radix.
