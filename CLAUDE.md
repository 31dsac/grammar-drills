# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser app for repeatable German grammar practice (target: Goethe B2, "eliminate systematic
error"). Vite + strict TypeScript + Vitest, **no UI framework**. Hosted on GitHub Pages at
<https://31dsac.github.io/grammar-drills/>. It is the drill companion to the study workspace at
`F:\Claude\Grammar` (lessons, `reference/roadmap.html`, `vault/Questions/`). Topic choice and
scope come from there; this repo shares no files with it.

## Commands

```
npm run dev                               # dev server, opens http://localhost:5173 (start.cmd does install + dev)
npm test                                  # vitest run, all tests
npx vitest run tests/tables.test.ts       # one file
npx vitest run -t "Retry clears"          # tests whose name matches
npm run typecheck                         # tsc --noEmit (tests are type-checked too)
npm run build                             # typecheck, then vite build → dist/
npx vite preview                          # serve dist/ (run from the repo root)
```

There is no linter. `tsconfig.json` has `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`
and `noUnusedParameters`, so unused imports in tests fail `typecheck`. UI tests opt into jsdom
per file with a first-line `// @vitest-environment jsdom`. There's no vitest config.

## Deploy and sync

- Every push to `main` runs `.github/workflows/deploy.yml`: `npm ci`, then tests, then build, then
  publish `dist/` to Pages. A failing test blocks the deploy. `vite.config.ts` sets `base: './'`
  so the build works under `/grammar-drills/`.
- This folder lives in Google Drive and is also edited from a second computer. Files from that
  machine can appear here through Drive sync. **Check `git status` and stage paths explicitly**
  rather than `git add -A`, so you don't commit someone else's half-done work under your message.
  Changes should move between machines with `git pull`/`git push`, not through a Drive-synced `.git`.

## Architecture

The app shell is `index.html` + `src/main.ts`. The `Sentences | Table` tabs (`ui/tabs.ts`)
switch between two **always-mounted** panels (`#app` and `#table-panel`) by toggling `hidden`, so
a sentence session survives a trip to the table. Sentence views register document-level
shortcuts through `onKeys()` in `ui/dom.ts`. When a panel without `usesGlobalKeys` is active,
`suspendKeys()` silences those shortcuts, which stops typing in the grid from answering a hidden
session item. Any new document-level key handler must go through `onKeys`.

**Layering.** `src/grammar/` holds pure rule data: ending tables, `declineArticle`, pronouns,
lexicon, connectors, sentence bank. It is the **single source of truth for forms**. Everything
else derives from it. Tests carry *independently written* reference tables and strings. Keep them
independent, and never compute expected values in a test from `src/grammar`.

**Sentences panel: weighted drills.**
- A drill implements `Drill<Item>` (`drills/drill.ts`): `cells()`, `cellLabel()`,
  `generate(cellId, stage, rng)`, and `view(host, item, ctx)`.
- Each drill has a `logic.ts` (pure generate/check) and a `view.ts` (DOM), and is registered in
  `drills/registry.ts`, which is where the home page gets its list.
- A **cell** is the unit of weakness tracking, e.g. `definite|dat|f` or a connector word.
- `ui/session.ts` runs 20 items. For each item, `progress/weighting.ts` picks a cell (weight is
  1 + 4 × (1 − accuracy), never the same cell twice in a row), and `ProgressStore.record()`
  promotes or demotes the cell's **stage**. Stages run from recognition to production, and
  `stageNames` names them.
- The view must call `ctx.answered(score)` once (1, 0.5 if hinted, 0) and `ctx.next()` to move on.

**Table panel: paradigm grids.**
- `tables/catalog.ts` lists `ParadigmTable`s: rows, cols, `expected(row, col)`, and a mode of
  `ending` or `word`. `tables/logic.ts` grades generically and keeps per-table history.
  `ui/table.ts` builds the grid from the table data.
- Adding a grid means one catalog entry plus one reference line in `tests/tables.test.ts`.
- Answer rules: endings are lower-cased and a leading `-` is stripped (the same
  `normalizeEnding` the typed sentence stage uses). Words ignore case unless the correct form is
  capitalised (*Sie, Ihnen*).
- Only the first Check of a fresh grid is recorded.

**Persistence** is localStorage only, per browser and per device, with nothing synced:

| Key | Contents | Bad data |
|---|---|---|
| `grammar-drills:v1` | sentence-drill progress, `{ version: 1, drills: { [id]: { [cell]: stats } } }` | reset **with a visible notice** |
| `grammar-drills:tables` | table history by table id (old `definite/indefinite/none` keys migrated) | silently emptied |
| `grammar-drills:filters`, `:tab`, `:table-choice` | UI conveniences | silently ignored |

Changing the shape of `v1` needs a version bump and migration in `progress/store.ts`.

## UI conventions

- Build DOM with `h(tag, attrs, ...children)` from `ui/dom.ts`. Wrap German text in `de(...)`
  (rendered blue). Finite verbs use the `.v` class and connectors use `.conn`; these conventions
  carry over from the lessons.
- `styles.css` is token-driven (`--ok`, `--bad`, `--de` …). Dark mode is a
  `prefers-color-scheme` block that only redefines tokens. A global
  `[hidden] { display: none !important }` exists because `.btn` sets `display`, so toggle
  `el.hidden`.
- Visual changes are checked by hand in light mode, dark mode and at **400px** width. One way on
  this machine: `npm run build`, `npx vite preview --port 4179`, then headless Edge
  (`msedge --headless=new --screenshot=… --window-size=…`). Headless Edge won't go narrower
  than about 500px, so check 400px through a page with a `width:400px` iframe.

## Docs

Design specs are in `docs/superpowers/specs/` and implementation plans in `docs/superpowers/plans/`.
There's one spec per feature: v1 drills, the ending-table panel, and paradigm tables. Read the
relevant spec before changing a feature's behaviour, and update it when behaviour changes.
