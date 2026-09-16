# Paradigm tables — design

Extends the Table tab ([ending table panel](2026-09-15-ending-table-panel-design.md)) from
three adjective-ending grids to a catalog of paradigms that have to be memorised. Same drill:
fill every cell, Check, Retry wrong, Reset, per-table score history.

## Scope

Chosen from the roadmap and the question log in `F:\Claude\Grammar`:

| Group | Table | Shape | Why |
|---|---|---|---|
| Adjective endings | der-word · weak, ein-word · mixed, no article · strong | 4 × 4, endings | existing |
| Articles | der, dieser, kein | 4 × 4, words | Foundation for the one-strong-ending logic; question log *dieser* declension |
| Pronouns | relative | 4 × 4, words | Lesson 3 done; two question-log entries on *denen* / *dessen, deren* |
| Pronouns | personal · reflexive | 9 × 4, words | Case under time pressure: *ihn/ihm*, *sich* vs *ihn* |

Out of scope: verbs with fixed prepositions (needs a list mode), prepositions by case (a sort
drill), possessive tables beyond *kein*, genitive personal pronouns (*meiner*), alternative
accepted answers per cell.

## Content decisions

- **Articles.** `kein` stands for the ein-word pattern because *ein* has no plural;
  the prompt says *ein* is the same without the plural and *mein, dein, sein …* follow it.
  `dieser` represents the der-words (*jeder, welcher, mancher*). Forms come from the existing
  `declineArticle()`, so there is one source of truth.
- **Relative pronouns.** Rows are the case inside the relative clause, columns the gender/number of
  the noun referred to. Forms: the article paradigm except *denen, dessen, deren*
  (matches `Grammar/reference/relativpronomen.html`).
- **Personal · reflexive.** Rows: *ich, du, er, sie · she, es, wir, ihr, sie · they, Sie · formal*.
  Columns: *Akk, Dat, refl. Akk, refl. Dat*. The row label is the nominative, so it is not asked.
  Transposed (persons as rows) so four columns fit at 400px.

## Answer checking

- **ending** tables: as before — trimmed, lower-cased, one leading hyphen dropped.
- **word** tables: trimmed. Case-insensitive, **except** where the correct form is capitalised
  (*Sie, Ihnen*): then the capital is required, because a lower-case *ihnen* is a real error
  in writing.
- Empty is wrong. One correct form per cell.

## Data model

```ts
type AnswerMode = 'ending' | 'word';
interface Axis { key: string; label: string; title?: string }
interface ParadigmTable {
  id: string; group: string; label: string; prompt: string; mode: AnswerMode;
  rows: readonly Axis[]; cols: readonly Axis[];
  expected(row: string, col: string): string;
}
```

Ids: `adj-weak, adj-mixed, adj-strong, art-der, art-dieser, art-kein, rel, pers`. Cell keys are
`row|col`. Pronoun data lives in `src/grammar/pronouns.ts`; the catalog in `src/tables/catalog.ts`.

## Panel

- A picker at the top of the card: one fieldset per group (legend = group), radio pills for its
  tables, one radio name across all groups.
- Heading `Group · label`, then the table's prompt. Choosing a table rebuilds the grid for its
  rows and columns and starts a fresh attempt.
- Word tables use a slightly smaller cell font (*dessen*, *Ihnen* must fit at 400px).
- The chosen table is remembered (`grammar-drills:table-choice`); an unknown id falls back to
  the first table.

## History

Same rules (first Check of a fresh attempt only, last 10 scores, best, attempts), keyed by
table id, validated against that table's cell count. History saved by the first version was
keyed `definite / indefinite / none`; those keys are migrated to `adj-weak / adj-mixed /
adj-strong` on load, and a new-style key wins if both exist.

## Testing

- Every table checked cell by cell against an independently written reference string.
- Answer checking: ending leniency, word case rule (*ihnen* ≠ *Ihnen*, *Dem* = *dem*), blanks.
- History: size-aware validation, legacy migration and precedence, table-size history line,
  remembered choice.
- Panel (jsdom): previous flows on the weak table; switching to relative pronouns rebuilds and
  records under `rel` and is remembered; the 36-cell pronoun table enforces *Ihnen*.
- Manual: light/dark, 400px, pronoun table.
