# Grammar Drills

Local browser app for repeatable German grammar practice. It generates items, remembers every
miss by exact grammatical cell, and serves more of what goes wrong.

Companion to the study workspace at `F:\Claude\Grammar`, but fully separate.

## Run

Hosted at <https://31dsac.github.io/grammar-drills/> — open it on any device, nothing to
install. To run it locally instead, double-click `start.cmd`, or:

```
npm install      # first time only
npm run dev      # opens http://localhost:5173
```

Progress is saved in the browser's localStorage, so each browser and each device keeps its own
progress — nothing syncs between them. Clearing site data resets it.

## Drills

- **Adjective endings.** 48 cells (article type × case × gender). Stage *choose* → *type*.
- **Connector position.** 29 connectors across the four classes from
  `Grammar/reference/konnektoren.html`. Stage *sort* → *choose* → *build*.

A cell moves up a stage at ≥ 80% over its last 8–10 answers and drops back below 50% over
its last 6. Hinted answers count half.

## Table

The **Table** tab drills whole paradigms from memory:

- **Adjective endings**: der-word (weak), ein-word (mixed), no article (strong)
- **Articles**: der, dieser, kein
- **Pronouns**: relative (der … dessen, denen, deren), personal · reflexive (Akk, Dat)

Fill every cell, press **Check** (or `Enter`), then **Retry wrong** or **Reset**. Endings accept
`-en` or `en`; whole words ignore capitals except where the form is capitalised (*Sie, Ihnen*).
Only the first Check of a fresh grid is recorded, as last / best / recent scores per table.
It does not affect the sentence drills' stages. Add a table in `src/tables/catalog.ts`.

Keyboard: `1`–`5` answer, `?` hint, `Enter` submit/next, `Backspace` undo a tile.

## Develop

```
npm test          # vitest: tables, generators (1000-item property tests), progress, UI flow
npm run typecheck
npm run build
```

- `src/grammar/`: pure data and rules (ending table, articles, lexicon, connectors, sentences)
- `src/drills/`: one folder per drill, `logic.ts` (pure) + `view.ts` (DOM), registered in `registry.ts`
- `src/progress/`: store, mastery (promotion/demotion), weighting
- `src/tables/`: table catalog, grading and score history (pure)
- `src/ui/`: tabs, home, session, stats, table panel

To add a drill: implement `Drill<Item>` from `src/drills/drill.ts` and add it to `DRILLS`.
Design specs: `docs/superpowers/specs/2026-09-15-grammar-drills-design.md`,
`docs/superpowers/specs/2026-09-15-ending-table-panel-design.md`,
`docs/superpowers/specs/2026-09-16-paradigm-tables-design.md`.

## Deploy

Every push to `main` runs the tests and typecheck, then publishes `dist/` to GitHub Pages via
`.github/workflows/deploy.yml`. A red build does not deploy. `vite.config.ts` sets `base: './'`
so the build works under any URL prefix.
