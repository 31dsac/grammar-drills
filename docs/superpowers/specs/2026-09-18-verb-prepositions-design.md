# Verbs with prepositions — design

A third sentence drill and a new Table group for *Verben mit Präpositionen*: which preposition a
verb takes, and which case follows it. Source: `Grammar/vault/Random clipper/Verb + präposition.md`
and the pair table in Lesson 6 (*da-/wo- compounds*). The question log entry
*da-wo-compounds-vs-phrasal-verbs* already settled that the pairing is vocabulary: it has to be
memorised per verb, so it needs repetition, not a rule.

## Scope

- **Sentence drill** `verb-prepositions`, one cell per verb + preposition pair, three stages.
- **Table group** *Verbs + preposition*: two grids, verb rows, columns *Präp.* and *Kasus*.
- **41 pairs** in two sets:
  - *My notes* (21): every usable pair from the clipper note, plus the Lesson 6 pairs.
  - *Core B1/B2* (20): frequent exam pairs not yet met.

Left out of the note: *eine Frage stellen* and *sich sicher sein* (no fixed preposition),
*von bewarhen* (unfinished line; the next lines cover *sich bewerben*). *nach suchen* is entered
as *suchen nach*, *sich entschieden für* as *sich entscheiden für*.

Out of scope: two-way prepositions by meaning (*in der / in die*), da-/wo- compound production
(shown in feedback only), pronoun objects (*an ihn*), multiple sentences per cell beyond the bank.

## Pairs

| Set | Akkusativ | Dativ |
|---|---|---|
| My notes | es geht um, sich erinnern an, jemanden erinnern an, sich verlieben in, sich bewerben um, sich freuen auf, sich freuen über, sich entscheiden für, erzählen über, warten auf, sich bedanken für | hören von, sich bewerben bei, suchen nach, Angst haben vor, teilnehmen an, erzählen von, bestehen aus, sich beschäftigen mit, träumen von, fragen nach |
| Core | denken an, sich interessieren für, sich kümmern um, sich ärgern über, sich gewöhnen an, sich konzentrieren auf, sprechen über, sich beschweren über, bitten um, sich vorbereiten auf, achten auf, sich verlassen auf, reagieren auf | abhängen von, sprechen mit, halten von, gehören zu, einladen zu, zweifeln an, sich erkundigen nach |

Same verb, two prepositions (*sich freuen auf / über*, *sich bewerben bei / um*,
*sprechen mit / über*, *erzählen von / über*) are separate cells, each with its own gloss.
*erzählen von* and *erzählen über* are interchangeable in their sentences (the note: *über* is
broader), so at *prep + case* each accepts the other with the other's case.

## Data (`src/grammar/verb-prepositions.ts`)

```ts
type Prep = 'an' | 'auf' | 'aus' | 'bei' | 'für' | 'in' | 'mit' | 'nach' | 'über' | 'um' | 'von' | 'vor' | 'zu';
type VerbCase = 'akk' | 'dat';
interface VpSentence {
  de: string;          // "Ich warte schon zehn Minuten _ Bus."  _ = preposition + article
  det: ArticleWord;    // 'der'
  gender: Gender;      // 'm'
  en: string;          // "I've been waiting for the bus for ten minutes."
}
interface VerbPrep {
  verb: string; prep: Prep; case: VerbCase; gloss: string;
  set: 'notes' | 'core';
  note?: string;                          // e.g. auf = not yet, über = already true
  also?: { prep: Prep; case: VerbCase };  // another accepted preposition in these sentences
  sentences: readonly VpSentence[];       // at least 2
}
```

- The article is computed with `declineArticle(det, case, gender)`, so forms keep one source
  of truth. Cell id: `verb|prep` (`sich freuen|auf`).
- **No contraction gaps.** A gap never produces *an dem, an das, in dem, in das, von dem,
  zu dem, zu der, bei dem* (which would be *am, ans, im, ins, vom, zum, zur, beim*). A test
  enforces it, for `also` prepositions too.
- Every gap has an article, and akk ≠ dat for every det/gender used, so the article always
  shows the case.
- Sentences with an `also` use singular feminine or neuter nouns, so the noun form is the same
  in both cases.
- `daWord(prep)` / `woWord(prep)`: *da-/wo-* + *r* before a vowel (*darauf, worüber, damit*).

## Sentence drill

Stages `choose → type → prep + case`. Each item shows the sentence with a gap and the English
translation under it; the translation is what separates *freuen auf* from *freuen über*.

| Stage | Gap shows | Answer |
|---|---|---|
| choose | `___ den Bus` | one of 4 prepositions, keys `1`–`4` |
| type | `___ den Bus` | type *auf* |
| prep + case | `___ ___ Bus` | type *auf den* |

- **Distractors** (choose): three prepositions from the pool of 13, never the right one or its
  `also`. When the verb has a sibling cell (*freuen über* for *freuen auf*), the sibling's
  preposition is always one of them.
- **Checking**: trimmed, lower-cased, inner whitespace collapsed. An `also` preposition is
  accepted only at *prep + case*, with its own case (*über ihre Reise*). At *choose* and *type*
  the article on screen is already in the cell's case, so only the cell's preposition fits.
- **Hint** (`?`, typed stages only, score 0.5): *type* shows the first letter (*a…*);
  *prep + case* shows the preposition, its case and the noun's gender
  (*auf + Akkusativ · masculine*).
- **Feedback**: the full sentence with the answer filled in, then
  *warten auf + Akkusativ: to wait for*, the note if any, the `also` line if any, and
  *Thing: darauf · Question: worauf* (the Lesson 6 link).
- **Filters**: Case (Akkusativ, Dativ) and Set (My notes, Core B1/B2).
- **Stats**: one list per preposition, each pair as a heat chip like the connector list.

## Table group *Verbs + preposition*

Two grids, `vp-notes` (*from my notes*, 21 rows) and `vp-core` (*core B1/B2*, 20 rows). Row: the verb, with the gloss under it
in small type. Columns *Präp.* and *Kasus*.

- *Präp.* expects the cell's own preposition (the gloss separates siblings).
- *Kasus* expects `akk` or `dat`, and also takes `a` / `d`, `akkusativ` / `dativ`.
- `ParadigmTable` gains optional `accepts?(row, col): readonly string[]` for extra answers, and
  `Axis` gains optional `sub` (second line) and `de` (German label). Grading is unchanged
  otherwise; history, retry and reset work as for every other table.

## Testing

- Data: 41 pairs, unique ids, ≥ 2 sentences each, exactly one `_`, no contraction gap,
  `also` sentences singular f/n, every det/gender declines.
- Independent reference: a hand-written list of all 41 `verb prep case` lines, and hand-written
  expected gap answers for a few sentences (*warten auf den*, *teilnehmen an einer*).
- `daWord` / `woWord` against a hand-written list.
- 1000 random items per stage: one `_` replaced, answer accepted, 4 distinct options with
  exactly one correct, sibling present, `also` never offered as wrong.
- UI sessions for all three stages; home shows three drills; stats lists every pair.
- Tables: reference strings for both grids; `a`, `Akkusativ` accepted, `dat` for an akk row
  rejected.
