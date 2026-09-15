# Grammar Drills

Local browser app for repeatable German grammar practice. It generates items, remembers every
miss by exact grammatical cell, and serves more of what goes wrong.

Companion to the study workspace at `F:\Claude\Grammar`, but fully separate.

## Run

Double-click `start.cmd`, or:

```
npm install      # first time only
npm run dev      # opens http://localhost:5173
```

Progress is saved in this browser's localStorage. Clearing site data resets it.

## Drills

- **Adjective endings.** 48 cells (article type × case × gender). Stage *choose* → *type*.
- **Connector position.** 29 connectors across the four classes from
  `Grammar/reference/konnektoren.html`. Stage *sort* → *choose* → *build*.

A cell moves up a stage at ≥ 80% over its last 8–10 answers and drops back below 50% over
its last 6. Hinted answers count half.

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
- `src/ui/`: home, session, stats

To add a drill: implement `Drill<Item>` from `src/drills/drill.ts` and add it to `DRILLS`.
Design spec: `docs/superpowers/specs/2026-09-15-grammar-drills-design.md`.
