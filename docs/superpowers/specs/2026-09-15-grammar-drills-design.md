# Grammar Drills — v1 design

A local browser app for repeatable German grammar practice. Companion to the study workspace
at `F:\Claude\Grammar`, but a separate project: its own folder, its own git repo, no shared
files.

## Goal

The study workspace's mission is the **elimination of systematic error** (Goethe B2). Lessons
teach a rule once; this app drills it repeatedly, remembers every miss by exact grammatical
cell, and serves more of what goes wrong.

## Decisions

| Question | Decision |
|---|---|
| Platform | Desktop browser, run locally with `npm run dev` |
| Stack | Vite + TypeScript (strict) + Vitest, no UI framework |
| Content | Generated from verified rule tables + curated word lists (adjective endings); hand-checked sentence bank (connectors) |
| Tracking | Weakness-weighted item selection, per-cell stats, localStorage |
| Answer mode | Escalates per cell: recognition first, production last |
| Location | `F:\Claude\grammar-drills` |

Out of scope for v1: accounts, phones/PWA, AI-generated items, audio, links into the Grammar
vault, two-part connectors, subordinate clause first (*Weil …, komme ich*).

## Drill 1 — Adjective endings

**Item.** A noun phrase inside a short frame that fixes the case:
`mit dem klein___ Kind`. Frames: *Das ist / Das sind* (Nom), *Ich sehe / für / ohne* (Akk),
*mit / von / bei* (Dat), *wegen / trotz* (Gen).

**Cell** = article type × case × gender/number → `definite|dat|f`. 3 × 4 × 4 = **48 cells**.

- `definite`: der-words (*der, dieser*).
- `indefinite`: ein-words (*ein, kein, mein, dein, sein, ihr, unser*). Plural uses only
  *kein* and possessives (*ein* has no plural).
- `none`: no article word. Singular uses mass nouns only (*mit warmer Milch*); plural uses
  count nouns (*wegen alter Häuser*).

**Stages.** 0 = choose from `-e -en -er -es -em` (keys 1–5). 1 = type the ending. A typed
answer is trimmed and lower-cased, and a leading hyphen or the whole adjective
(*kleinen*) is also accepted.

**Hint.** A button reveals case and gender before answering. For `none` items the noun's
gender is always shown, because nothing in the phrase reveals it. A hinted correct answer
counts as half.

**Feedback** names the rule for the cell, e.g. *"No article word, so the adjective carries
the ending the article would have had: dem → -em."*

**Lexicon rules.** Nouns store gender, kind (person/animal/object/food/abstract), genitive
singular, nominative plural and dative plural explicitly (no n-declension nouns in v1).
Adjectives have regular stems only (no *teuer → teur-*) and list the noun kinds they fit,
so the generator never produces *das rote Kind*.

## Drill 2 — Connector position

Four classes, taken from `Grammar/reference/konnektoren.html` (grammis):

| Class | Label in app | Members (v1) |
|---|---|---|
| Konjunktor | Position 0: no change | und, oder, aber, denn, sondern |
| Adverbkonnektor | Position 1: verb comes next | deshalb, deswegen, darum, also, trotzdem, dennoch, dann, danach, außerdem, sonst |
| Subjunktor | Verb to the end | weil, da, dass, wenn, ob, obwohl, als, damit, während, bevor, nachdem, falls, sobald |
| Konnektivpartikel | After the verb, never first | nämlich |

**Cell** = connector id.

**Stages.**
0. **Sort**: pick the connector's class (4 buttons).
1. **Choose**: pick the correct sentence out of up to 4 options that use the same words.
2. **Build**: click word tiles into order. Clause A is shown fixed.

**Sentence model.** Clause A is a fixed string. Clause B is `{subject, verb, rest[], nonfinite?}`
and uses no separable verbs, so every word order uses the same set of tiles. The joiner is a
comma, except for *nämlich*, where clause B starts a new sentence. The order patterns are:

- `inert`: conn S V rest nonfinite
- `invert`: conn V S rest nonfinite
- `kick`: conn S rest nonfinite V
- `hide`: S V conn rest nonfinite

Accepted orders: Konjunktor → inert; Adverbkonnektor → invert **and** hide
(*ich komme deshalb nicht mit* is correct); Subjunktor → kick; Konnektivpartikel → hide.
Distractors are the patterns that are not accepted, minus these grammatical-but-different-meaning
exceptions: `hide` for *aber* and *denn* (particle use), and `invert` for *da* (adverb *da*).

## Progress and weighting

Stored in localStorage under `grammar-drills:v1`:

```
{ version: 1, drills: { [drillId]: { [cellId]: { stage, recent: number[], attempts, correct } } } }
```

`recent` holds the scores (1, 0.5 or 0) at the **current stage**, capped at 10.

- **Promote** when the stage has ≥ 8 scores and the mean of the last 10 is ≥ 0.8. `recent`
  is then cleared.
- **Demote** (if stage > 0) when the stage has ≥ 6 scores and the mean of the last 6 is
  < 0.5. `recent` is then cleared.
- **Weight** = 1 + 4 × (1 − accuracy). Cells with no scores at the current stage count as
  0.5 accuracy, so their weight is 3. The same cell is never drawn twice in a row when
  another is available.
- Unreadable or wrong-version data is reset with a visible notice, never a silent crash.

## Architecture

```
src/
  grammar/   types, endings, articles, lexicon, connectors, sentences  (pure data + rules)
  drills/    drill.ts (interface) + adjective-endings/ + connector-position/
             each: logic.ts (generate/check, pure) + view.ts (DOM)
  progress/  store.ts, weighting.ts, mastery.ts
  ui/        app shell, home, session, stats
  util/      seeded rng
tests/
```

Drill interface:

```ts
interface Drill<Item> {
  id: string; title: string;
  cells(filter?): string[];
  stages: number;
  generate(cellId: string, stage: number, rng: Rng): Item;
  view: (host: HTMLElement, item: Item, done: (r: AnswerResult) => void) => void;
}
```

A session is 20 items. The adjective drill has case and article-type filters. The stats
page shows a 4 × 4 heatmap per article type (accuracy colour and stage) plus a connector
table.

Visual conventions carried over from the lessons: German text in blue, finite verb
highlighted, connector highlighted.

## Testing

- Ending table and article declensions are checked cell by cell against an independently
  written reference in the test file.
- Property tests generate 1,000 items per drill and stage. Every item must be well-formed
  (no `undefined`, exactly one blank) and accept its own correct answer. Choose options must
  be distinct, contain the correct one, and use the same tile set.
- Sentence bank: every connector has ≥ 2 sentences, and no distractor renders identically
  to an accepted order.
- Unit tests for weighting, promotion/demotion and store migration/reset.
- The UI is checked manually in the browser.
