# Ending table panel — design

A second panel in the Grammar Drills app for filling in a whole adjective-ending table from
memory, over and over. The table is the baseline; the sentence drill is where it gets applied.

## Decisions

| Question | Decision |
|---|---|
| Tables | All three, switchable: der-word (weak), ein-word (mixed), no article (strong). Weak is the default. |
| Layout | Top-level tabs `Sentences | Table` under the masthead. One panel visible at a time. |
| After Check | Cells marked right/wrong, score shown, **Retry wrong** and **Reset**. |
| Tracking | Simple per-table history, separate from the weighted sentence-drill progress. |

Out of scope: timing, per-cell history, feeding table results into sentence-drill weighting,
article tables (der/den/dem), cheat-sheet mode.

## Shell

- `index.html` gains `<nav id="tabs">` and a `<section id="table-panel">` next to `<main id="app">`.
- `Sentences` is the existing app (home, session, stats), unchanged. `Table` is the new panel.
- Both panels stay mounted; switching only toggles `hidden`. A sentence session in progress
  survives a trip to the table.
- While `Table` is active, the sentence panel's document-level shortcuts (`onKeys`) are
  suspended, so typing or pressing Enter in the grid cannot answer a hidden session item.
- The last active tab is remembered in localStorage (`grammar-drills:tab`), safe to lose.

## Table panel

- A radio pill group picks the article type. Changing it clears the grid (a fresh attempt).
- A 4 × 4 grid: rows Nominativ, Akkusativ, Dativ, Genitiv; columns masc., fem., neut., pl.
  Headers show only case and gender, never articles, so nothing gives the answer away.
- Each cell is a text input. Answers are normalised as in the typed sentence stage: trimmed,
  lower-cased, one leading hyphen dropped (`-EN ` = `en`). An empty cell is wrong.
- Tab walks the cells row by row. **Enter** in any cell runs Check.

**Check** grades all 16 cells against `grammar/endings.ts`:

- Correct cell: green, locked (read-only).
- Wrong cell: red, the typed answer struck through, the correct ending shown under it, locked.
- Score `13 / 16` next to the heading. Check is disabled until Retry or Reset.
- Focus moves to Retry wrong (if anything is wrong) or Reset.

**Retry wrong** clears and unlocks only the red cells; green cells stay locked and leave the
tab order. Focus goes to the first cleared cell. Check grades all 16 again.

**Reset** clears all cells and starts a fresh attempt.

## History

Only the **first Check of a fresh attempt** (page load, Reset, or article-type switch) is
recorded, so Retry-to-perfect never inflates the baseline.

Stored under `grammar-drills:tables`:

```
{ [articleType]: { attempts: number, best: number, recent: number[] } }   // recent: newest last, max 10
```

Scores are integers 0–16. Invalid entries are dropped on load; unreadable JSON or unavailable
storage yields empty history, silently (this is a convenience, like remembered filters).

Shown under the grid: `Last 13/16 · Best 16/16 · 7 attempts · Recent 9 11 13`, or
`No attempts yet`.

## Architecture

```
src/grammar/endings.ts   + normalizeEnding()        (shared with the typed sentence stage)
src/tables/logic.ts      CELL_KEYS, gradeGrid, recordAttempt, parseHistory, load/saveHistory, historyLine  (pure)
src/ui/table.ts          renderTablePanel(host, storage)   (DOM)
src/ui/tabs.ts           mountTabs(nav, panels, storage)
src/ui/dom.ts            + suspendKeys(); onKeys handlers skip while suspended
```

## Testing

- Logic: every table graded against an independently written reference (16/16), normalisation,
  blanks wrong, history cap/best/attempts, corrupt and partially valid history.
- Panel (jsdom): perfect grid → 16/16 and one recorded attempt; errors → marks, correction
  text, Retry clears only wrong cells, re-check does not record; Reset records again; type switch
  clears and grades against the new table; Enter runs Check.
- Tabs (jsdom): default/remembered tab, `hidden` toggling, shortcuts suspended while on Table.
- Manual: browser, light/dark, 400px width.
