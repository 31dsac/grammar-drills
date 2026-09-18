# Verbs with Prepositions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `verb-prepositions` sentence drill (choose → type → prep + case) over 41 verb + preposition pairs, plus a *Verbs + preposition* group of two grids on the Table tab.

**Architecture:** Pair data and sentence bank in `src/grammar/verb-prepositions.ts`, with articles from `declineArticle()`. A drill folder `src/drills/verb-prepositions/` (pure `logic.ts`, DOM `view.ts`) registered in `registry.ts`. The Table catalog gains optional `accepts()` and row `sub`/`de` so verb rows fit the existing grid.

**Tech Stack:** Vite + strict TypeScript + Vitest/jsdom, no UI framework. Spec: `docs/superpowers/specs/2026-09-18-verb-prepositions-design.md`.

> Written in the same pass as the build (per the user's one-go preference). The code blocks are the final code.

## Global Constraints

- Forms come from `src/grammar/` only; tests carry hand-written references (pair list, gap answers, da-/wo- words, grid strings).
- Cell id `verb|prep` (`sich freuen|auf`). Drill id `verb-prepositions`. Table ids `vp-notes`, `vp-core`.
- No gap may contract (*an dem, an das, in dem, in das, von dem, zu dem, zu der, bei dem*).
- `also` preposition is accepted only at *prep + case*.
- No change to the `grammar-drills:v1` shape; new drill ids simply appear in it.
- Keyboard shortcuts go through `onKeys`. 400px, light and dark checked by hand.

---

### Task 1: Pair data and drill logic

**Files:**
- Create: `src/grammar/verb-prepositions.ts`, `src/drills/verb-prepositions/logic.ts`
- Test: `tests/verb-prepositions.test.ts`

**Interfaces:**
- Produces: `PREPS`, `Prep`, `VERB_CASES`, `VerbCase`, `VP_SETS`, `VpSet`, `VP_SET_NAMES`, `VpSentence`, `VerbPrep`, `VERB_PREPS`, `vpId(e)`, `findVerbPrep(id)`, `splitGap(de)`, `gapPhrase(s, prep, case)`, `daWord(p)`, `woWord(p)`; drill `DRILL_ID`, `STAGE_NAMES`, `VpItem`, `allCells(sel)`, `cellLabel(id)`, `acceptedPreps(e)`, `siblingPreps(e)`, `generate(id, stage, rng)`, `normalizeAnswer(s)`, `checkAnswer(item, s)`.

- [ ] **Step 1: Write the failing test** — `tests/verb-prepositions.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  acceptedPreps,
  allCells,
  cellLabel,
  checkAnswer,
  generate,
  siblingPreps,
} from '../src/drills/verb-prepositions/logic';
import { declineArticle } from '../src/grammar/articles';
import {
  PREPS,
  VERB_PREPS,
  daWord,
  findVerbPrep,
  gapPhrase,
  splitGap,
  vpId,
  woWord,
} from '../src/grammar/verb-prepositions';
import { seededRng } from '../src/util/rng';

/** Written by hand from the clipper note, Lesson 6 and the B1/B2 lists: verb | prep | case | set. */
const REFERENCE = `
es geht | um | akk | notes
hören | von | dat | notes
sich erinnern | an | akk | notes
jemanden erinnern | an | akk | notes
sich verlieben | in | akk | notes
sich bewerben | bei | dat | notes
sich bewerben | um | akk | notes
suchen | nach | dat | notes
sich freuen | auf | akk | notes
sich freuen | über | akk | notes
Angst haben | vor | dat | notes
sich entscheiden | für | akk | notes
teilnehmen | an | dat | notes
erzählen | von | dat | notes
erzählen | über | akk | notes
bestehen | aus | dat | notes
sich beschäftigen | mit | dat | notes
warten | auf | akk | notes
sich bedanken | für | akk | notes
träumen | von | dat | notes
fragen | nach | dat | notes
denken | an | akk | core
sich interessieren | für | akk | core
sich kümmern | um | akk | core
sich ärgern | über | akk | core
sich gewöhnen | an | akk | core
sich konzentrieren | auf | akk | core
sprechen | über | akk | core
sich beschweren | über | akk | core
bitten | um | akk | core
sich vorbereiten | auf | akk | core
achten | auf | akk | core
sich verlassen | auf | akk | core
reagieren | auf | akk | core
abhängen | von | dat | core
sprechen | mit | dat | core
halten | von | dat | core
gehören | zu | dat | core
einladen | zu | dat | core
zweifeln | an | dat | core
sich erkundigen | nach | dat | core
`
  .trim()
  .split('\n')
  .map((l) => l.trim());

/** Gap forms that German contracts (am, ans, im, ins, vom, zum, zur, beim). */
const CONTRACTED = ['an dem', 'an das', 'in dem', 'in das', 'von dem', 'zu dem', 'zu der', 'bei dem'];

const sentenceWith = (id: string, word: string) => {
  const s = findVerbPrep(id).sentences.find((x) => x.de.includes(word));
  if (!s) throw new Error(`no sentence with ${word} for ${id}`);
  return s;
};

describe('verb + preposition data', () => {
  it('matches the hand-written pair list', () => {
    const actual = VERB_PREPS.map((e) => `${e.verb} | ${e.prep} | ${e.case} | ${e.set}`);
    expect(actual.slice().sort()).toEqual(REFERENCE.slice().sort());
    expect(new Set(VERB_PREPS.map(vpId)).size).toBe(41);
  });

  it('every pair has at least 2 well-formed sentences', () => {
    for (const e of VERB_PREPS) {
      expect(e.sentences.length, vpId(e)).toBeGreaterThanOrEqual(2);
      for (const s of e.sentences) {
        expect(s.de.split('_'), s.de).toHaveLength(2);
        expect(s.de, s.de).not.toMatch(/\s\s|^\s|\s$/);
        expect(s.en.length, s.de).toBeGreaterThan(0);
        const [before, after] = splitGap(s.de);
        expect(before.endsWith(' ') || before === '', s.de).toBe(true);
        expect(after.startsWith(' '), s.de).toBe(true);
      }
    }
  });

  it('no gap contracts, and the article always shows the case', () => {
    for (const e of VERB_PREPS) {
      for (const s of e.sentences) {
        for (const [prep, c] of acceptedPreps(e).map((p) => [p.prep, p.case] as const)) {
          expect(CONTRACTED, s.de).not.toContain(gapPhrase(s, prep, c));
        }
        expect(declineArticle(s.det, 'akk', s.gender), s.de).not.toBe(declineArticle(s.det, 'dat', s.gender));
      }
    }
  });

  it('sentences with a second accepted preposition use singular f/n nouns', () => {
    for (const e of VERB_PREPS.filter((x) => x.also)) {
      for (const s of e.sentences) expect(['f', 'n'], s.de).toContain(s.gender);
    }
  });

  it('builds the gap answer from the article table', () => {
    expect(gapPhrase(sentenceWith('warten|auf', 'Bus'), 'auf', 'akk')).toBe('auf den');
    expect(gapPhrase(sentenceWith('teilnehmen|an', 'Konferenz'), 'an', 'dat')).toBe('an einer');
    expect(gapPhrase(sentenceWith('erzählen|von', 'Japan'), 'von', 'dat')).toBe('von ihrer');
    expect(gapPhrase(sentenceWith('erzählen|von', 'Japan'), 'über', 'akk')).toBe('über ihre');
    expect(gapPhrase(sentenceWith('Angst haben|vor', 'Hund'), 'vor', 'dat')).toBe('vor dem');
  });

  it('da- and wo- words insert r before a vowel', () => {
    const da = PREPS.map(daWord).join(' ');
    const wo = PREPS.map(woWord).join(' ');
    expect(PREPS.join(' ')).toBe('an auf aus bei für in mit nach über um von vor zu');
    expect(da).toBe('daran darauf daraus dabei dafür darin damit danach darüber darum davon davor dazu');
    expect(wo).toBe('woran worauf woraus wobei wofür worin womit wonach worüber worum wovon wovor wozu');
  });
});

describe('verb + preposition drill items', () => {
  it('has one cell per pair, filterable by case and set', () => {
    expect(allCells()).toHaveLength(41);
    expect(allCells({ case: ['dat'] })).toHaveLength(17);
    expect(allCells({ set: ['notes'] })).toHaveLength(21);
    expect(allCells({ set: ['core'], case: ['dat'] })).toHaveLength(7);
    expect(cellLabel('warten|auf')).toBe('warten auf + Akk');
    expect(cellLabel('teilnehmen|an')).toBe('teilnehmen an + Dat');
  });

  it('siblings: same verb, other preposition, not interchangeable', () => {
    expect(siblingPreps(findVerbPrep('sich freuen|auf'))).toEqual(['über']);
    expect(siblingPreps(findVerbPrep('sich bewerben|um'))).toEqual(['bei']);
    expect(siblingPreps(findVerbPrep('sprechen|mit'))).toEqual(['über']);
    expect(siblingPreps(findVerbPrep('erzählen|von'))).toEqual([]);
    expect(siblingPreps(findVerbPrep('warten|auf'))).toEqual([]);
  });

  it('1000 random items per stage are well-formed and accept their own answer', () => {
    const rng = seededRng(7);
    const cells = allCells();
    for (const stage of [0, 1, 2]) {
      for (let i = 0; i < 1000; i++) {
        const id = cells[Math.floor(rng() * cells.length)]!;
        const item = generate(id, stage, rng);
        const e = item.entry;
        const accepted = acceptedPreps(e).map((p) => p.prep);

        expect(`${item.before}${item.answer}${item.after}`, id).not.toMatch(/undefined|_|\s\s/);
        expect(item.answer).toBe(`${e.prep} ${item.article}`);

        expect(item.options).toHaveLength(4);
        expect(new Set(item.options).size).toBe(4);
        expect(item.options.filter((p) => accepted.includes(p))).toEqual([e.prep]);
        for (const p of siblingPreps(e)) expect(item.options, id).toContain(p);

        if (stage === 1) {
          expect(checkAnswer(item, e.prep)).toBe(true);
          expect(checkAnswer(item, `  ${e.prep.toUpperCase()} `)).toBe(true);
        }
        if (stage === 2) {
          expect(checkAnswer(item, item.answer)).toBe(true);
          expect(checkAnswer(item, item.answer.replace(' ', '   '))).toBe(true);
          expect(checkAnswer(item, e.prep)).toBe(false);
        }
      }
    }
  });

  it('typed checking rejects the wrong preposition or the wrong case', () => {
    const item = generate('warten|auf', 2, seededRng(1));
    const s = item.sentence;
    expect(checkAnswer(item, gapPhrase(s, 'auf', 'akk'))).toBe(true);
    expect(checkAnswer(item, gapPhrase(s, 'auf', 'dat'))).toBe(false);
    expect(checkAnswer(item, gapPhrase(s, 'an', 'akk'))).toBe(false);
    expect(checkAnswer(item, '')).toBe(false);

    const typed = generate('warten|auf', 1, seededRng(1));
    expect(checkAnswer(typed, 'auf')).toBe(true);
    expect(checkAnswer(typed, 'für')).toBe(false);
  });

  it('erzählen accepts von + Dat and über + Akk at prep + case, but not mixed', () => {
    const item = generate('erzählen|von', 2, seededRng(2));
    const s = item.sentence;
    expect(checkAnswer(item, gapPhrase(s, 'von', 'dat'))).toBe(true);
    expect(checkAnswer(item, gapPhrase(s, 'über', 'akk'))).toBe(true);
    expect(checkAnswer(item, gapPhrase(s, 'über', 'dat'))).toBe(false);
    // At type, the article on screen is already in the cell's own case.
    expect(checkAnswer(generate('erzählen|über', 1, seededRng(2)), 'über')).toBe(true);
    expect(checkAnswer(generate('erzählen|über', 1, seededRng(2)), 'von')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run tests/verb-prepositions.test.ts` — Expected: FAIL, modules not found.

- [ ] **Step 3: Pair data** — `src/grammar/verb-prepositions.ts`

```ts
import { declineArticle, type ArticleWord } from './articles';
import type { Gender } from './types';

/**
 * Verbs with a fixed preposition (Verben mit Präpositionen). Sources: the clipper note
 * "Verb + präposition", Lesson 6 (da-/wo- compounds), and frequent Goethe B1/B2 pairs.
 */
export const PREPS = ['an', 'auf', 'aus', 'bei', 'für', 'in', 'mit', 'nach', 'über', 'um', 'von', 'vor', 'zu'] as const;
export type Prep = (typeof PREPS)[number];

export const VERB_CASES = ['akk', 'dat'] as const;
export type VerbCase = (typeof VERB_CASES)[number];

export const VP_SETS = ['notes', 'core'] as const;
export type VpSet = (typeof VP_SETS)[number];

export const VP_SET_NAMES: Record<VpSet, string> = { notes: 'My notes', core: 'Core B1/B2' };

export interface VpSentence {
  /** `_` marks the gap: preposition + article. */
  de: string;
  det: ArticleWord;
  gender: Gender;
  en: string;
}

export interface VerbPrep {
  verb: string;
  prep: Prep;
  case: VerbCase;
  gloss: string;
  set: VpSet;
  note?: string;
  /** Another preposition that is also right in these sentences, with its own case. */
  also?: { prep: Prep; case: VerbCase };
  sentences: readonly VpSentence[];
}

const FREUEN = 'auf: it has not happened yet. über: it is already true.';
const BEWERBEN = 'bei + the employer, um + the position.';
const ERINNERN = 'sich erinnern an = remember. jemanden erinnern an = remind someone.';
const ERZAEHLEN = 'von and über both work here; über is the broader one.';
const SPRECHEN = 'mit + the person, über + the topic.';
const AN_DAT = 'an + Dativ here, unlike denken an / sich erinnern an (Akkusativ).';

export const VERB_PREPS: readonly VerbPrep[] = [
  // ---------- My notes: the clipper note and Lesson 6 ----------
  {
    verb: 'es geht',
    prep: 'um',
    case: 'akk',
    gloss: 'it is about, it involves',
    set: 'notes',
    sentences: [
      { de: 'Im Film geht es _ Familie aus Hamburg.', det: 'ein', gender: 'f', en: 'The film is about a family from Hamburg.' },
      { de: 'Beim Treffen morgen geht es _ neuen Vertrag.', det: 'der', gender: 'm', en: "Tomorrow's meeting is about the new contract." },
    ],
  },
  {
    verb: 'hören',
    prep: 'von',
    case: 'dat',
    gloss: 'to hear about / from',
    set: 'notes',
    sentences: [
      { de: 'Hast du schon _ neuen Bäckerei am Markt gehört?', det: 'der', gender: 'f', en: 'Have you heard about the new bakery at the market?' },
      { de: 'Ich habe lange nichts _ Bruder gehört.', det: 'mein', gender: 'm', en: "I haven't heard from my brother in a long time." },
    ],
  },
  {
    verb: 'sich erinnern',
    prep: 'an',
    case: 'akk',
    gloss: 'to remember',
    set: 'notes',
    note: ERINNERN,
    sentences: [
      { de: 'Ich erinnere mich gut _ ersten Schultag.', det: 'der', gender: 'm', en: 'I remember the first day of school well.' },
      { de: 'Erinnerst du dich noch _ Lehrerin aus der Grundschule?', det: 'unser', gender: 'f', en: 'Do you still remember our teacher from primary school?' },
    ],
  },
  {
    verb: 'jemanden erinnern',
    prep: 'an',
    case: 'akk',
    gloss: 'to remind someone of / about',
    set: 'notes',
    note: ERINNERN,
    sentences: [
      { de: 'Kannst du mich morgen _ Termin beim Arzt erinnern?', det: 'mein', gender: 'm', en: "Can you remind me about my doctor's appointment tomorrow?" },
      { de: 'Das Lied erinnert mich _ Sommer in Italien.', det: 'der', gender: 'm', en: 'The song reminds me of the summer in Italy.' },
    ],
  },
  {
    verb: 'sich verlieben',
    prep: 'in',
    case: 'akk',
    gloss: 'to fall in love with',
    set: 'notes',
    note: 'Always in + Akkusativ, never mit.',
    sentences: [
      { de: 'Er hat sich _ Kollegin verliebt.', det: 'sein', gender: 'f', en: 'He fell in love with his colleague.' },
      { de: 'Wir haben uns sofort _ Wohnung verliebt.', det: 'der', gender: 'f', en: 'We fell in love with the flat straight away.' },
    ],
  },
  {
    verb: 'sich bewerben',
    prep: 'bei',
    case: 'dat',
    gloss: 'to apply to (the employer)',
    set: 'notes',
    note: BEWERBEN,
    sentences: [
      { de: 'Sie bewirbt sich _ Firma in Berlin.', det: 'ein', gender: 'f', en: 'She is applying to a company in Berlin.' },
      { de: 'Ich habe mich _ Stadtverwaltung beworben.', det: 'der', gender: 'f', en: 'I applied to the city administration.' },
    ],
  },
  {
    verb: 'sich bewerben',
    prep: 'um',
    case: 'akk',
    gloss: 'to apply for (the position)',
    set: 'notes',
    note: BEWERBEN,
    sentences: [
      { de: 'Sie bewirbt sich _ Stelle als Krankenschwester.', det: 'ein', gender: 'f', en: 'She is applying for a job as a nurse.' },
      { de: 'Er hat sich _ Praktikum bei Siemens beworben.', det: 'ein', gender: 'n', en: 'He applied for an internship at Siemens.' },
    ],
  },
  {
    verb: 'suchen',
    prep: 'nach',
    case: 'dat',
    gloss: 'to search for, look for',
    set: 'notes',
    sentences: [
      { de: 'Ich suche schon seit einer Stunde _ Schlüssel.', det: 'mein', gender: 'm', en: "I've been looking for my key for an hour." },
      { de: 'Die Polizei sucht _ Frau mit einem roten Mantel.', det: 'ein', gender: 'f', en: 'The police are looking for a woman in a red coat.' },
    ],
  },
  {
    verb: 'sich freuen',
    prep: 'auf',
    case: 'akk',
    gloss: 'to look forward to',
    set: 'notes',
    note: FREUEN,
    sentences: [
      { de: 'Die Kinder freuen sich schon _ Sommerferien.', det: 'der', gender: 'pl', en: 'The children are already looking forward to the summer holidays.' },
      { de: 'Ich freue mich _ Wochenende mit euch.', det: 'der', gender: 'n', en: "I'm looking forward to the weekend with you." },
    ],
  },
  {
    verb: 'sich freuen',
    prep: 'über',
    case: 'akk',
    gloss: 'to be glad about, pleased with',
    set: 'notes',
    note: FREUEN,
    sentences: [
      { de: 'Sie hat sich sehr _ Blumen gefreut.', det: 'der', gender: 'pl', en: 'She was very pleased with the flowers.' },
      { de: 'Wir freuen uns sehr _ gute Nachricht.', det: 'der', gender: 'f', en: "We're really glad about the good news." },
    ],
  },
  {
    verb: 'Angst haben',
    prep: 'vor',
    case: 'dat',
    gloss: 'to be afraid of',
    set: 'notes',
    sentences: [
      { de: 'Mein Sohn hat Angst _ Hund der Nachbarn.', det: 'der', gender: 'm', en: "My son is afraid of the neighbours' dog." },
      { de: 'Viele Studenten haben Angst _ Prüfung.', det: 'der', gender: 'f', en: 'Many students are afraid of the exam.' },
    ],
  },
  {
    verb: 'sich entscheiden',
    prep: 'für',
    case: 'akk',
    gloss: 'to decide on, choose',
    set: 'notes',
    sentences: [
      { de: 'Wir haben uns _ Wohnung im Zentrum entschieden.', det: 'der', gender: 'f', en: 'We chose the flat in the centre.' },
      { de: 'Ich habe mich _ Studium in Wien entschieden.', det: 'ein', gender: 'n', en: 'I decided on a degree course in Vienna.' },
    ],
  },
  {
    verb: 'teilnehmen',
    prep: 'an',
    case: 'dat',
    gloss: 'to take part in',
    set: 'notes',
    note: AN_DAT,
    sentences: [
      { de: 'Nächste Woche nehme ich _ Konferenz in München teil.', det: 'ein', gender: 'f', en: "Next week I'm taking part in a conference in Munich." },
      { de: 'Wie viele Leute haben _ Kurs teilgenommen?', det: 'dieser', gender: 'm', en: 'How many people took part in this course?' },
    ],
  },
  {
    verb: 'erzählen',
    prep: 'von',
    case: 'dat',
    gloss: 'to tell about (a particular event)',
    set: 'notes',
    note: ERZAEHLEN,
    also: { prep: 'über', case: 'akk' },
    sentences: [
      { de: 'Sie hat uns _ Reise nach Japan erzählt.', det: 'ihr', gender: 'f', en: 'She told us about her trip to Japan.' },
      { de: 'Opa erzählt gern _ Leben auf dem Bauernhof.', det: 'sein', gender: 'n', en: 'Grandpa likes to talk about his life on the farm.' },
    ],
  },
  {
    verb: 'erzählen',
    prep: 'über',
    case: 'akk',
    gloss: 'to tell about (a broader topic)',
    set: 'notes',
    note: ERZAEHLEN,
    also: { prep: 'von', case: 'dat' },
    sentences: [
      { de: 'Der Stadtführer erzählt viel _ Geschichte der Stadt.', det: 'der', gender: 'f', en: 'The guide tells us a lot about the history of the city.' },
      { de: 'Kannst du mir etwas _ Projekt erzählen?', det: 'dein', gender: 'n', en: 'Can you tell me something about your project?' },
    ],
  },
  {
    verb: 'bestehen',
    prep: 'aus',
    case: 'dat',
    gloss: 'to consist of',
    set: 'notes',
    sentences: [
      { de: 'Die Wohnung besteht _ Küche, einem Bad und zwei Zimmern.', det: 'ein', gender: 'f', en: 'The flat consists of a kitchen, a bathroom and two rooms.' },
      { de: 'Die Gruppe besteht _ Schülern der zehnten Klasse.', det: 'der', gender: 'pl', en: 'The group is made up of the pupils from year ten.' },
    ],
  },
  {
    verb: 'sich beschäftigen',
    prep: 'mit',
    case: 'dat',
    gloss: 'to deal with, spend time on',
    set: 'notes',
    sentences: [
      { de: 'Ich beschäftige mich gerade _ Geschichte Österreichs.', det: 'der', gender: 'f', en: "At the moment I'm studying the history of Austria." },
      { de: 'In der Freizeit beschäftigt er sich gern _ Garten.', det: 'sein', gender: 'm', en: 'In his free time he likes to work on his garden.' },
    ],
  },
  {
    verb: 'warten',
    prep: 'auf',
    case: 'akk',
    gloss: 'to wait for',
    set: 'notes',
    sentences: [
      { de: 'Ich warte schon zehn Minuten _ Bus.', det: 'der', gender: 'm', en: "I've been waiting for the bus for ten minutes." },
      { de: 'Wir warten noch _ Antwort der Firma.', det: 'der', gender: 'f', en: "We're still waiting for the company's reply." },
    ],
  },
  {
    verb: 'sich bedanken',
    prep: 'für',
    case: 'akk',
    gloss: 'to say thank you for',
    set: 'notes',
    sentences: [
      { de: 'Ich möchte mich _ Hilfe bedanken.', det: 'dein', gender: 'f', en: "I'd like to thank you for your help." },
      { de: 'Er hat sich _ Geschenk bedankt.', det: 'der', gender: 'n', en: 'He said thank you for the present.' },
    ],
  },
  {
    verb: 'träumen',
    prep: 'von',
    case: 'dat',
    gloss: 'to dream of / about',
    set: 'notes',
    sentences: [
      { de: 'Sie träumt _ Haus am Meer.', det: 'ein', gender: 'n', en: 'She dreams of a house by the sea.' },
      { de: 'Als Kind habe ich _ Karriere als Fußballer geträumt.', det: 'ein', gender: 'f', en: 'As a child I dreamt of a career as a footballer.' },
    ],
  },
  {
    verb: 'fragen',
    prep: 'nach',
    case: 'dat',
    gloss: 'to ask about / for (information)',
    set: 'notes',
    sentences: [
      { de: 'Ein Tourist hat mich _ Weg zum Bahnhof gefragt.', det: 'der', gender: 'm', en: 'A tourist asked me the way to the station.' },
      { de: 'Die Ärztin hat mich _ Telefonnummer gefragt.', det: 'mein', gender: 'f', en: 'The doctor asked me for my phone number.' },
    ],
  },

  // ---------- Core B1/B2 ----------
  {
    verb: 'denken',
    prep: 'an',
    case: 'akk',
    gloss: 'to think of / about',
    set: 'core',
    sentences: [
      { de: 'Ich denke oft _ Zeit in Spanien.', det: 'der', gender: 'f', en: 'I often think about the time in Spain.' },
      { de: 'Hast du _ Geburtstag deiner Mutter gedacht?', det: 'der', gender: 'm', en: "Did you remember your mother's birthday?" },
    ],
  },
  {
    verb: 'sich interessieren',
    prep: 'für',
    case: 'akk',
    gloss: 'to be interested in',
    set: 'core',
    sentences: [
      { de: 'Sie interessiert sich _ Stelle in der Buchhaltung.', det: 'der', gender: 'f', en: 'She is interested in the position in accounting.' },
      { de: 'Ich interessiere mich _ Kurs am Samstag.', det: 'der', gender: 'm', en: "I'm interested in the Saturday course." },
    ],
  },
  {
    verb: 'sich kümmern',
    prep: 'um',
    case: 'akk',
    gloss: 'to look after, take care of',
    set: 'core',
    sentences: [
      { de: 'Wer kümmert sich _ Hund, wenn ihr im Urlaub seid?', det: 'der', gender: 'm', en: "Who looks after the dog when you're on holiday?" },
      { de: 'Sie kümmert sich _ kranke Mutter.', det: 'ihr', gender: 'f', en: 'She takes care of her sick mother.' },
    ],
  },
  {
    verb: 'sich ärgern',
    prep: 'über',
    case: 'akk',
    gloss: 'to be annoyed about',
    set: 'core',
    sentences: [
      { de: 'Ich ärgere mich _ Fehler im Test.', det: 'mein', gender: 'm', en: "I'm annoyed about my mistake in the test." },
      { de: 'Die Nachbarn ärgern sich _ Lärm von der Baustelle.', det: 'der', gender: 'm', en: 'The neighbours are annoyed about the noise from the building site.' },
    ],
  },
  {
    verb: 'sich gewöhnen',
    prep: 'an',
    case: 'akk',
    gloss: 'to get used to',
    set: 'core',
    sentences: [
      { de: 'Ich habe mich noch nicht _ neuen Arbeitszeiten gewöhnt.', det: 'der', gender: 'pl', en: "I haven't got used to the new working hours yet." },
      { de: 'Sie hat sich schnell _ neue Stadt gewöhnt.', det: 'der', gender: 'f', en: 'She quickly got used to the new city.' },
    ],
  },
  {
    verb: 'sich konzentrieren',
    prep: 'auf',
    case: 'akk',
    gloss: 'to concentrate on',
    set: 'core',
    sentences: [
      { de: 'Ich kann mich heute nicht _ Arbeit konzentrieren.', det: 'mein', gender: 'f', en: "I can't concentrate on my work today." },
      { de: 'Konzentrier dich _ Straße!', det: 'der', gender: 'f', en: 'Concentrate on the road!' },
    ],
  },
  {
    verb: 'sprechen',
    prep: 'über',
    case: 'akk',
    gloss: 'to talk about',
    set: 'core',
    note: SPRECHEN,
    sentences: [
      { de: 'Wir haben lange _ Problem gesprochen.', det: 'der', gender: 'n', en: 'We talked about the problem for a long time.' },
      { de: 'Im Unterricht sprechen wir heute _ Klimawandel.', det: 'der', gender: 'm', en: "In class today we're talking about climate change." },
    ],
  },
  {
    verb: 'sich beschweren',
    prep: 'über',
    case: 'akk',
    gloss: 'to complain about',
    set: 'core',
    note: 'über + the problem; bei + the person you complain to.',
    sentences: [
      { de: 'Die Gäste haben sich _ Essen beschwert.', det: 'der', gender: 'n', en: 'The guests complained about the food.' },
      { de: 'Er beschwert sich immer _ Nachbarn.', det: 'sein', gender: 'pl', en: "He's always complaining about his neighbours." },
    ],
  },
  {
    verb: 'bitten',
    prep: 'um',
    case: 'akk',
    gloss: 'to ask for (something you want)',
    set: 'core',
    note: 'bitten um = ask for something you want; fragen nach = ask for information.',
    sentences: [
      { de: 'Darf ich Sie _ Gefallen bitten?', det: 'ein', gender: 'm', en: 'May I ask you a favour?' },
      { de: 'Sie hat ihren Chef _ Gehaltserhöhung gebeten.', det: 'ein', gender: 'f', en: 'She asked her boss for a pay rise.' },
    ],
  },
  {
    verb: 'sich vorbereiten',
    prep: 'auf',
    case: 'akk',
    gloss: 'to prepare for',
    set: 'core',
    sentences: [
      { de: 'Ich bereite mich gerade _ Prüfung vor.', det: 'der', gender: 'f', en: "I'm preparing for the exam at the moment." },
      { de: 'Wie hast du dich _ Vorstellungsgespräch vorbereitet?', det: 'dein', gender: 'n', en: 'How did you prepare for your job interview?' },
    ],
  },
  {
    verb: 'achten',
    prep: 'auf',
    case: 'akk',
    gloss: 'to pay attention to, watch',
    set: 'core',
    sentences: [
      { de: 'Bitte achten Sie _ Stufe am Eingang.', det: 'der', gender: 'f', en: 'Please mind the step at the entrance.' },
      { de: 'Er achtet sehr _ Gesundheit.', det: 'sein', gender: 'f', en: 'He pays close attention to his health.' },
    ],
  },
  {
    verb: 'sich verlassen',
    prep: 'auf',
    case: 'akk',
    gloss: 'to rely on',
    set: 'core',
    sentences: [
      { de: 'Ich kann mich immer _ Schwester verlassen.', det: 'mein', gender: 'f', en: 'I can always rely on my sister.' },
      { de: 'Wir verlassen uns _ Wettervorhersage.', det: 'der', gender: 'f', en: "We're relying on the weather forecast." },
    ],
  },
  {
    verb: 'reagieren',
    prep: 'auf',
    case: 'akk',
    gloss: 'to react / respond to',
    set: 'core',
    sentences: [
      { de: 'Die Firma hat noch nicht _ E-Mail reagiert.', det: 'mein', gender: 'f', en: "The company hasn't replied to my email yet." },
      { de: 'Wie hat er _ Nachricht reagiert?', det: 'der', gender: 'f', en: 'How did he react to the news?' },
    ],
  },
  {
    verb: 'abhängen',
    prep: 'von',
    case: 'dat',
    gloss: 'to depend on',
    set: 'core',
    sentences: [
      { de: 'Das hängt ganz _ Situation ab.', det: 'der', gender: 'f', en: 'That depends entirely on the situation.' },
      { de: 'Die Note hängt auch _ Präsentation ab.', det: 'dein', gender: 'f', en: 'The grade also depends on your presentation.' },
    ],
  },
  {
    verb: 'sprechen',
    prep: 'mit',
    case: 'dat',
    gloss: 'to talk to / with',
    set: 'core',
    note: SPRECHEN,
    sentences: [
      { de: 'Ich muss mal _ Chefin sprechen.', det: 'mein', gender: 'f', en: 'I need to talk to my boss.' },
      { de: 'Hast du schon _ Vermieter gesprochen?', det: 'der', gender: 'm', en: 'Have you spoken to the landlord yet?' },
    ],
  },
  {
    verb: 'halten',
    prep: 'von',
    case: 'dat',
    gloss: 'to think of (an opinion)',
    set: 'core',
    sentences: [
      { de: 'Was hältst du _ Idee?', det: 'dieser', gender: 'f', en: 'What do you think of this idea?' },
      { de: 'Ich halte nicht viel _ neuen Regeln.', det: 'der', gender: 'pl', en: "I don't think much of the new rules." },
    ],
  },
  {
    verb: 'gehören',
    prep: 'zu',
    case: 'dat',
    gloss: 'to be part of, be one of',
    set: 'core',
    note: 'Without zu, gehören + Dativ means to belong to (own): Das gehört mir.',
    sentences: [
      { de: 'Die Stadt gehört _ schönsten Orten in Bayern.', det: 'der', gender: 'pl', en: 'The town is one of the most beautiful places in Bavaria.' },
      { de: 'Er gehört seit Mai _ Team.', det: 'unser', gender: 'n', en: 'He has been part of our team since May.' },
    ],
  },
  {
    verb: 'einladen',
    prep: 'zu',
    case: 'dat',
    gloss: 'to invite to',
    set: 'core',
    sentences: [
      { de: 'Sie hat uns _ Hochzeit eingeladen.', det: 'ihr', gender: 'f', en: 'She invited us to her wedding.' },
      { de: 'Ich lade dich _ Kaffee ein.', det: 'ein', gender: 'm', en: "Let me buy you a coffee (I'm inviting you)." },
    ],
  },
  {
    verb: 'zweifeln',
    prep: 'an',
    case: 'dat',
    gloss: 'to doubt',
    set: 'core',
    note: AN_DAT,
    sentences: [
      { de: 'Ich zweifle nicht _ Ehrlichkeit.', det: 'sein', gender: 'f', en: "I don't doubt his honesty." },
      { de: 'Viele zweifeln _ Plan.', det: 'dieser', gender: 'm', en: 'Many people have doubts about this plan.' },
    ],
  },
  {
    verb: 'sich erkundigen',
    prep: 'nach',
    case: 'dat',
    gloss: 'to enquire about',
    set: 'core',
    sentences: [
      { de: 'Ich möchte mich _ Preisen für Gruppen erkundigen.', det: 'der', gender: 'pl', en: "I'd like to enquire about the prices for groups." },
      { de: 'Er hat sich _ Gesundheit seiner Oma erkundigt.', det: 'der', gender: 'f', en: "He asked after his grandma's health." },
    ],
  },
];

export function vpId(e: VerbPrep): string {
  return `${e.verb}|${e.prep}`;
}

export function findVerbPrep(id: string): VerbPrep {
  const e = VERB_PREPS.find((x) => vpId(x) === id);
  if (!e) throw new Error(`Unknown verb + preposition: ${id}`);
  return e;
}

/** Text before and after the `_`. */
export function splitGap(de: string): [string, string] {
  const i = de.indexOf('_');
  return [de.slice(0, i), de.slice(i + 1)];
}

/** What fills the gap: "auf den". */
export function gapPhrase(s: VpSentence, prep: Prep, c: VerbCase): string {
  return `${prep} ${declineArticle(s.det, c, s.gender)}`;
}

const startsWithVowel = (p: Prep) => /^[aeiouäöü]/.test(p);

/** darauf, damit: the r keeps two vowels apart. */
export function daWord(p: Prep): string {
  return (startsWithVowel(p) ? 'dar' : 'da') + p;
}

export function woWord(p: Prep): string {
  return (startsWithVowel(p) ? 'wor' : 'wo') + p;
}
```

- [ ] **Step 4: Drill logic** — `src/drills/verb-prepositions/logic.ts`

```ts
import { declineArticle } from '../../grammar/articles';
import {
  PREPS,
  VERB_CASES,
  VERB_PREPS,
  VP_SETS,
  findVerbPrep,
  gapPhrase,
  splitGap,
  vpId,
  type Prep,
  type VerbCase,
  type VerbPrep,
  type VpSentence,
} from '../../grammar/verb-prepositions';
import { pick, shuffle, type Rng } from '../../util/rng';
import type { FilterSelection } from '../drill';

export const DRILL_ID = 'verb-prepositions';

export const STAGE_NAMES = ['choose', 'type', 'prep + case'] as const;

const CASE_SHORT: Record<VerbCase, string> = { akk: 'Akk', dat: 'Dat' };

export interface VpItem {
  cellId: string;
  stage: number;
  entry: VerbPrep;
  sentence: VpSentence;
  /** Sentence text around the gap. */
  before: string;
  after: string;
  /** The article in the right case: shown at choose and type, asked at prep + case. */
  article: string;
  /** The canonical gap: "auf den". */
  answer: string;
  /** Four prepositions for the choose stage, exactly one of them accepted. */
  options: Prep[];
}

export function allCells(selection: FilterSelection = {}): string[] {
  const cases = selection.case ?? VERB_CASES;
  const sets = selection.set ?? VP_SETS;
  return VERB_PREPS.filter((e) => cases.includes(e.case) && sets.includes(e.set)).map(vpId);
}

export function cellLabel(id: string): string {
  const e = findVerbPrep(id);
  return `${e.verb} ${e.prep} + ${CASE_SHORT[e.case]}`;
}

/** The cell's own preposition first, then its interchangeable one. */
export function acceptedPreps(e: VerbPrep): { prep: Prep; case: VerbCase }[] {
  return [{ prep: e.prep, case: e.case }, ...(e.also ? [e.also] : [])];
}

/** Prepositions the same verb takes with another meaning (freuen auf → über). */
export function siblingPreps(e: VerbPrep): Prep[] {
  const accepted = acceptedPreps(e).map((a) => a.prep);
  return VERB_PREPS.filter((x) => x.verb === e.verb && !accepted.includes(x.prep)).map((x) => x.prep);
}

const OPTIONS = 4;

export function generate(id: string, stage: number, rng: Rng): VpItem {
  const entry = findVerbPrep(id);
  const sentence = pick(entry.sentences, rng);
  const [before, after] = splitGap(sentence.de);
  const accepted = acceptedPreps(entry).map((a) => a.prep);
  const siblings = siblingPreps(entry);
  const others = shuffle(
    PREPS.filter((p) => !accepted.includes(p) && !siblings.includes(p)),
    rng,
  );
  const wrong = [...siblings, ...others].slice(0, OPTIONS - 1);

  return {
    cellId: id,
    stage,
    entry,
    sentence,
    before,
    after,
    article: declineArticle(sentence.det, entry.case, sentence.gender),
    answer: gapPhrase(sentence, entry.prep, entry.case),
    options: shuffle([entry.prep, ...wrong], rng),
  };
}

/** Trimmed, lower-case, single spaces. */
export function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * type: the preposition alone. Only the cell's own one, because the article on screen
 * already fixes the case (von ihrer Reise, never über ihrer).
 * prep + case: preposition and article; an interchangeable preposition counts with its own case.
 */
export function checkAnswer(item: VpItem, answer: string): boolean {
  const a = normalizeAnswer(answer);
  if (item.stage < 2) return a === item.entry.prep;
  return acceptedPreps(item.entry).some((p) => a === gapPhrase(item.sentence, p.prep, p.case));
}
```

- [ ] **Step 5: Run it and see it pass**

Run: `npx vitest run tests/verb-prepositions.test.ts` — Expected: 11 passed.

### Task 2: View, registration, stats

**Files:**
- Create: `src/drills/verb-prepositions/view.ts`
- Modify: `src/drills/registry.ts`, `src/ui/stats.ts`, `src/styles.css`, `tests/ui.test.ts`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces: `verbPrepositions: Drill<VpItem>` in `DRILLS`; DOM classes `.vp-sentence`, `.translation`, `.preps`, `.vp-input(.wide)`, `.vp-list`.

- [ ] **Step 1: UI tests** (diff of `tests/ui.test.ts`)

```diff
diff --git a/tests/ui.test.ts b/tests/ui.test.ts
index f939213..bf80e9b 100644
--- a/tests/ui.test.ts
+++ b/tests/ui.test.ts
@@ -1,7 +1,7 @@
 // @vitest-environment jsdom
 import { beforeEach, describe, expect, it } from 'vitest';
 import type { Drill } from '../src/drills/drill';
-import { adjectiveEndings, connectorPosition } from '../src/drills/registry';
+import { adjectiveEndings, connectorPosition, verbPrepositions } from '../src/drills/registry';
 import { ProgressStore, STORAGE_KEY, type KeyValueStorage } from '../src/progress/store';
 import { renderHome } from '../src/ui/home';
 import { SESSION_LENGTH, runSession } from '../src/ui/session';
@@ -75,6 +75,36 @@ describe('UI sessions', () => {
   it('connectors, sort stage', () => playSession(connectorPosition, storeAtStage(connectorPosition, 0)));
   it('connectors, choose stage', () => playSession(connectorPosition, storeAtStage(connectorPosition, 1)));
   it('connectors, build stage', () => playSession(connectorPosition, storeAtStage(connectorPosition, 2)));
+  it('verb + preposition, choose stage', () => playSession(verbPrepositions, storeAtStage(verbPrepositions, 0)));
+  it('verb + preposition, type stage', () => playSession(verbPrepositions, storeAtStage(verbPrepositions, 1)));
+  it('verb + preposition, prep + case stage', () => playSession(verbPrepositions, storeAtStage(verbPrepositions, 2)));
+
+  it('verb + preposition: a typed right answer fills the gap; the hint shows case and gender', () => {
+    const store = storeAtStage(verbPrepositions, 2);
+    runSession(q('#app')!, verbPrepositions, ['warten|auf'], store, { home() {}, stats() {}, again() {} });
+    expect(q('.translation')?.textContent).not.toBe('');
+    qa<HTMLButtonElement>('.item .btn.ghost').find((b) => b.textContent?.startsWith('Hint'))!.click();
+    expect(q('.hint')?.textContent).toContain('auf + Akkusativ');
+    const input = q<HTMLInputElement>('.blank-input')!;
+    const bus = q('.vp-sentence')!.textContent!.includes('Bus');
+    input.value = bus ? ' Auf  DEN ' : 'auf die';
+    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
+    expect(q('.verdict')?.textContent).toBe('Richtig, with hint');
+    expect(q('.vp-sentence .fill.ok')?.textContent).toBe(bus ? 'auf den' : 'auf die');
+    expect(q('.feedback')?.textContent).toContain('darauf');
+    expect(store.get(verbPrepositions.id, 'warten|auf').correct).toBe(0.5);
+  });
+
+  it('verb + preposition: choose marks the right and the wrong button', () => {
+    const store = storeAtStage(verbPrepositions, 0);
+    runSession(q('#app')!, verbPrepositions, ['sich freuen|auf'], store, { home() {}, stats() {}, again() {} });
+    const buttons = qa<HTMLButtonElement>('.preps .btn.choice');
+    expect(buttons.map((b) => b.dataset.prep)).toContain('über');
+    buttons.find((b) => b.dataset.prep === 'über')!.click();
+    expect(q('.verdict')?.textContent).toBe('Nicht ganz');
+    expect(q('.preps .is-correct')?.getAttribute('data-prep')).toBe('auf');
+    expect(q('.preps .is-wrong')?.getAttribute('data-prep')).toBe('über');
+  });
 
   it('hint reveals case and gender and caps the score at half', () => {
     const store = storeAtStage(adjectiveEndings, 0);
@@ -91,11 +121,11 @@ describe('UI sessions', () => {
 });
 
 describe('home and stats', () => {
-  it('home shows both drills and disables Start when a filter is emptied', () => {
+  it('home shows all three drills and disables Start when a filter is emptied', () => {
     const store = new ProgressStore(new MemoryStorage());
     let started: string[] | undefined;
     renderHome(q('#app')!, store, { start: (_d, cells) => (started = cells), stats() {} });
-    expect(qa('.drill-card')).toHaveLength(2);
+    expect(qa('.drill-card')).toHaveLength(3);
 
     const adjCard = qa<HTMLElement>('.drill-card')[0]!;
     const caseBoxes = [...adjCard.querySelectorAll<HTMLInputElement>('fieldset')[0]!.querySelectorAll('input')];
@@ -111,12 +141,13 @@ describe('home and stats', () => {
     expect(adjCard.querySelector<HTMLButtonElement>('.btn.primary')!.disabled).toBe(true);
   });
 
-  it('stats renders a heatmap cell for all 48 adjective cells and every connector', () => {
+  it('stats renders a heatmap cell for all 48 adjective cells, every connector and every verb pair', () => {
     const store = new ProgressStore(new MemoryStorage());
     store.record(adjectiveEndings.id, 'none|dat|m', 1, 1);
     renderStats(q('#app')!, store, () => {});
     expect(qa('.heatmap td')).toHaveLength(48);
     expect(qa('.heatmap td.seen')).toHaveLength(1);
     expect(qa('.conn-list li')).toHaveLength(connectorPosition.cells().length);
+    expect(qa('.vp-list li')).toHaveLength(41);
   });
 });
```

- [ ] **Step 2: Run** `npx vitest run tests/ui.test.ts` — Expected: FAIL (`verbPrepositions` not exported).

- [ ] **Step 3: View** — `src/drills/verb-prepositions/view.ts`

```ts
import { daWord, gapPhrase, woWord, type Prep } from '../../grammar/verb-prepositions';
import { CASE_NAMES, GENDER_NAMES } from '../../grammar/types';
import { de, h, isTyping, onKeys } from '../../ui/dom';
import { feedbackPanel } from '../../ui/feedback';
import type { ViewContext } from '../drill';
import { checkAnswer, normalizeAnswer, type VpItem } from './logic';

const PROMPTS = ['Which preposition?', 'Type the preposition', 'Type the preposition and the article'];

function feedbackBody(item: VpItem, filled: string): (Node | null)[] {
  const e = item.entry;
  const also = e.also;
  return [
    h('p', { class: 'sentence' }, de(item.before, h('strong', null, filled), item.after)),
    h(
      'p',
      { class: 'rule' },
      de(h('strong', null, `${e.verb} ${e.prep}`)),
      ` + ${CASE_NAMES[e.case]}: ${e.gloss}.`,
    ),
    e.note ? h('p', { class: 'note' }, e.note) : null,
    also
      ? h(
          'p',
          { class: 'note' },
          'Also right with a new article: ',
          de(gapPhrase(item.sentence, also.prep, also.case)),
          ` (${also.prep} + ${CASE_NAMES[also.case]}).`,
        )
      : null,
    h('p', { class: 'note' }, 'For a thing: ', de(daWord(e.prep)), ' · asking: ', de(woWord(e.prep))),
  ];
}

export function view(host: HTMLElement, item: VpItem, ctx: ViewContext): void {
  const e = item.entry;
  const typed = item.stage > 0;
  let hinted = false;
  let done = false;

  const blank = h('span', { class: 'blank' });
  // At prep + case the article is part of the answer, so it stays off screen.
  const shownArticle = item.stage < 2 ? ` ${item.article}` : '';
  const sentenceLine = h('p', { class: 'sentence vp-sentence' }, de(item.before, blank, shownArticle, item.after));
  const translation = h('p', { class: 'translation' }, item.sentence.en);

  const hintBox = h('p', { class: 'hint', hidden: true });
  const hintBtn = h(
    'button',
    {
      class: 'btn ghost',
      type: 'button',
      hidden: !typed,
      onclick: () => {
        if (done || !typed) return;
        hinted = true;
        hintBox.replaceChildren(
          ...(item.stage === 1
            ? [h('span', { class: 'chip' }, 'Starts with ', de(`${e.prep.charAt(0)}…`))]
            : [
                h('span', { class: 'chip' }, de(e.prep), ` + ${CASE_NAMES[e.case]}`),
                h('span', { class: 'chip' }, GENDER_NAMES[item.sentence.gender]),
              ]),
        );
        hintBox.hidden = false;
        hintBtn.disabled = true;
      },
    },
    'Hint ',
    h('kbd', null, '?'),
  );

  const controls = h('div', { class: 'controls' });
  const feedbackHost = h('div');
  let choiceButtons: HTMLButtonElement[] = [];

  /** `given` is what the learner chose or typed; `expected` fills the gap when it was wrong. */
  const finish = (given: string, correct: boolean) => {
    if (done) return;
    done = true;
    ctx.answered(correct ? (hinted ? 0.5 : 1) : 0);

    const expected = item.stage < 2 ? e.prep : item.answer;
    const shown = correct ? normalizeAnswer(given) : expected;
    blank.replaceChildren(
      correct
        ? h('span', { class: 'fill ok' }, shown)
        : h('span', null, given ? h('s', { class: 'fill bad' }, given) : null, h('span', { class: 'fill ok' }, expected)),
    );
    for (const b of choiceButtons) {
      b.disabled = true;
      if (b.dataset.prep === e.prep) b.classList.add('is-correct');
      else if (b.dataset.prep === given) b.classList.add('is-wrong');
    }
    if (typed) controls.replaceChildren();
    hintBtn.remove();
    const filled = item.stage < 2 ? `${shown} ${item.article}` : shown;
    feedbackHost.replaceChildren(feedbackPanel(ctx, correct ? (hinted ? 'hinted' : true) : false, ...feedbackBody(item, filled)));
  };

  if (!typed) {
    blank.textContent = '___';
    choiceButtons = item.options.map((prep: Prep, i) =>
      h(
        'button',
        { class: 'btn choice', type: 'button', 'data-prep': prep, onclick: () => finish(prep, prep === e.prep) },
        h('kbd', null, String(i + 1)),
        ` ${prep}`,
      ),
    );
    controls.append(h('div', { class: 'choices preps' }, ...choiceButtons));
  } else {
    const input = h('input', {
      class: `blank-input vp-input${item.stage === 2 ? ' wide' : ''}`,
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'aria-label': item.stage === 2 ? 'Preposition and article' : 'Preposition',
    });
    input.addEventListener(
      'keydown',
      (ev) => {
        if (ev.key === 'Enter' && input.value.trim()) {
          ev.preventDefault();
          finish(input.value.trim(), checkAnswer(item, input.value));
        }
      },
      { signal: ctx.signal },
    );
    blank.append(input);
    controls.append(
      h('p', { class: 'note' }, item.stage === 2 ? 'Preposition and article, then ' : 'Type it, then ', h('kbd', null, 'Enter'), '.'),
    );
    queueMicrotask(() => input.focus());
  }

  onKeys(ctx.signal, (ev) => {
    if (done) return;
    if (typed && (ev.key === '?' || (ev.key.toLowerCase() === 'h' && !isTyping(ev)))) {
      ev.preventDefault();
      hintBtn.click();
      return;
    }
    if (!typed) {
      const prep = item.options[Number(ev.key) - 1];
      if (prep) finish(prep, prep === e.prep);
    }
  });

  host.replaceChildren(
    h('div', { class: 'card item' }, h('p', { class: 'prompt' }, PROMPTS[item.stage] ?? ''), sentenceLine, translation, hintBox, controls, hintBtn),
    feedbackHost,
  );
}
```

- [ ] **Step 4: Register and add stats**

```diff
diff --git a/src/drills/registry.ts b/src/drills/registry.ts
index 1c2be26..f6c820e 100644
--- a/src/drills/registry.ts
+++ b/src/drills/registry.ts
@@ -1,9 +1,12 @@
 import { ARTICLE_TYPES, ARTICLE_TYPE_NAMES, CASES, CASE_NAMES } from '../grammar/types';
 import { CLASS_INFO, CONNECTOR_CLASSES } from '../grammar/connectors';
+import { VERB_CASES, VP_SETS, VP_SET_NAMES } from '../grammar/verb-prepositions';
 import * as adj from './adjective-endings/logic';
 import { view as adjView } from './adjective-endings/view';
 import * as conn from './connector-position/logic';
 import { view as connView } from './connector-position/view';
+import * as vp from './verb-prepositions/logic';
+import { view as vpView } from './verb-prepositions/view';
 import type { Drill } from './drill';
 
 export const adjectiveEndings: Drill<adj.AdjItem> = {
@@ -39,7 +42,22 @@ export const connectorPosition: Drill<conn.ConnItem> = {
   view: connView,
 };
 
-export const DRILLS: readonly Drill<unknown>[] = [adjectiveEndings, connectorPosition];
+export const verbPrepositions: Drill<vp.VpItem> = {
+  id: vp.DRILL_ID,
+  title: 'Verbs + preposition',
+  description: 'warten auf, teilnehmen an: the preposition, then its case.',
+  stageNames: vp.STAGE_NAMES,
+  filters: [
+    { key: 'case', label: 'Case', options: VERB_CASES.map((c) => ({ value: c, label: CASE_NAMES[c] })) },
+    { key: 'set', label: 'Set', options: VP_SETS.map((s) => ({ value: s, label: VP_SET_NAMES[s] })) },
+  ],
+  cells: vp.allCells,
+  cellLabel: vp.cellLabel,
+  generate: vp.generate,
+  view: vpView,
+};
+
+export const DRILLS: readonly Drill<unknown>[] = [adjectiveEndings, connectorPosition, verbPrepositions];
 
 export function findDrill(id: string): Drill<unknown> | undefined {
   return DRILLS.find((d) => d.id === id);
diff --git a/src/ui/stats.ts b/src/ui/stats.ts
index ae14421..453a314 100644
--- a/src/ui/stats.ts
+++ b/src/ui/stats.ts
@@ -1,7 +1,8 @@
 import { maxStage } from '../drills/drill';
-import { adjectiveEndings, connectorPosition } from '../drills/registry';
+import { adjectiveEndings, connectorPosition, verbPrepositions } from '../drills/registry';
 import { cellId } from '../drills/adjective-endings/logic';
 import { CLASS_INFO, CONNECTORS, CONNECTOR_CLASSES } from '../grammar/connectors';
+import { PREPS, VERB_PREPS, vpId } from '../grammar/verb-prepositions';
 import { ARTICLE_TYPES, ARTICLE_TYPE_NAMES, CASES, CASE_NAMES, GENDERS } from '../grammar/types';
 import { recentAccuracy, type CellStats } from '../progress/mastery';
 import type { ProgressStore } from '../progress/store';
@@ -99,6 +100,32 @@ export function renderStats(host: HTMLElement, store: ProgressStore, back: () =>
     ),
   );
 
+  const vpStats = store.cells(verbPrepositions.id);
+  const vpGroups = PREPS.map((prep) => VERB_PREPS.filter((e) => e.prep === prep))
+    .filter((entries) => entries.length > 0)
+    .map((entries) => {
+      const prep = entries[0]!.prep;
+      const cases = [...new Set(entries.map((e) => CASE_NAMES[e.case].slice(0, 3)))].join(' · ');
+      return h(
+        'div',
+        { class: 'conn-group' },
+        h('h3', null, de(prep), h('small', null, cases)),
+        h(
+          'ul',
+          { class: 'vp-list' },
+          ...entries.map((e) => {
+            const st = vpStats[vpId(e)];
+            return h(
+              'li',
+              { style: heat(st), class: st?.attempts ? 'seen' : 'unseen', title: st ? `${st.attempts} attempts` : 'not practised' },
+              de(`${e.verb} ${e.prep}`),
+              ...cellText(st, verbPrepositions.stageNames),
+            );
+          }),
+        ),
+      );
+    });
+
   const stageLegend = (names: readonly string[], max: number) =>
     `Stages: ${names.map((n, i) => (i === max ? `${n} (last)` : n)).join(' → ')}. Percent = accuracy at the current stage.`;
 
@@ -121,6 +148,13 @@ export function renderStats(host: HTMLElement, store: ProgressStore, back: () =>
         h('p', { class: 'note' }, stageLegend(connectorPosition.stageNames, maxStage(connectorPosition))),
         h('div', { class: 'conn-groups' }, ...connGroups),
       ),
+      h(
+        'section',
+        { class: 'card' },
+        h('div', { class: 'section-head' }, h('h2', null, verbPrepositions.title), resetButton(store, verbPrepositions.id, verbPrepositions.title, rerender)),
+        h('p', { class: 'note' }, stageLegend(verbPrepositions.stageNames, maxStage(verbPrepositions))),
+        h('div', { class: 'conn-groups' }, ...vpGroups),
+      ),
     ),
   );
 }
```

- [ ] **Step 5: Run** `npx vitest run tests/ui.test.ts` — Expected: 13 passed.

### Task 3: Table group *Verbs + preposition*

**Files:**
- Modify: `src/tables/catalog.ts`, `src/tables/logic.ts`, `src/ui/table.ts`, `tests/tables.test.ts`, `tests/table-panel.test.ts`

**Interfaces:**
- Consumes: `VERB_PREPS`, `findVerbPrep`, `vpId`.
- Produces: `Axis.sub?`, `Axis.de?`, `ParadigmTable.accepts?(row, col)`; tables `vp-notes` (21 × 2), `vp-core` (20 × 2); grid class `long-rows`.

- [ ] **Step 1: Tests**

```diff
diff --git a/tests/table-panel.test.ts b/tests/table-panel.test.ts
index 822aa84..941fb89 100644
--- a/tests/table-panel.test.ts
+++ b/tests/table-panel.test.ts
@@ -53,7 +53,7 @@ describe('paradigm table panel', () => {
     expect(q<HTMLInputElement>('input[name="table-choice"]:checked').value).toBe('adj-weak');
     expect(q('.table-heading').textContent).toBe('Adjective endings · der-word · weak');
     expect(q('.grid-history').textContent).toBe('No attempts yet');
-    expect(qa('.table-picker legend').map((l) => l.textContent)).toEqual(['Adjective endings', 'Articles', 'Pronouns']);
+    expect(qa('.table-picker legend').map((l) => l.textContent)).toEqual(['Adjective endings', 'Articles', 'Pronouns', 'Verbs + preposition']);
   });
 
   it('a perfect grid scores 16/16 and records one attempt', () => {
diff --git a/tests/tables.test.ts b/tests/tables.test.ts
index a557fb0..7a10f7b 100644
--- a/tests/tables.test.ts
+++ b/tests/tables.test.ts
@@ -27,6 +27,12 @@ const REFERENCE: Record<string, string> = {
   pers:
     'mich mir mich mir  dich dir dich dir  ihn ihm sich sich  sie ihr sich sich  es ihm sich sich  ' +
     'uns uns uns uns  euch euch euch euch  sie ihnen sich sich  Sie Ihnen sich sich',
+  'vp-notes':
+    'um akk  von dat  an akk  an akk  in akk  bei dat  um akk  nach dat  auf akk  über akk  vor dat  ' +
+    'für akk  an dat  von dat  über akk  aus dat  mit dat  auf akk  für akk  von dat  nach dat',
+  'vp-core':
+    'an akk  für akk  um akk  über akk  an akk  auf akk  über akk  über akk  um akk  auf akk  ' +
+    'auf akk  auf akk  auf akk  von dat  mit dat  von dat  zu dat  zu dat  an dat  nach dat',
 };
 
 const table = (id: string) => findTable(id)!;
@@ -50,6 +56,16 @@ describe('catalog', () => {
     });
   }
 
+  it('verb tables: the gloss tells same-verb rows apart, case takes a / d and full names', () => {
+    const t = table('vp-notes');
+    expect(t.rows.find((r) => r.key === 'sich freuen|auf')?.sub).toBe('to look forward to');
+    expect(t.rows.find((r) => r.key === 'sich freuen|über')?.label).toBe('sich freuen');
+    const answers = { ...referenceAnswers(t), 'warten|auf|case': 'A', 'teilnehmen|an|case': 'Dativ', 'hören|von|case': 'akk' };
+    const wrong = gradeGrid(t, answers).cells.filter((c) => !c.correct);
+    expect(wrong.map((c) => [c.key, c.expected])).toEqual([['hören|von|case', 'dat']]);
+    expect(cellCount(table('vp-core'))).toBe(40);
+  });
+
   it('sizes: 4 × 4 paradigms, 9 × 4 pronouns', () => {
     expect(cellCount(table('rel'))).toBe(16);
     expect(cellCount(table('pers'))).toBe(36);
```

- [ ] **Step 2: Run** `npx vitest run tests/tables.test.ts` — Expected: 2 failed (missing tables).

- [ ] **Step 3: Implement**

```diff
diff --git a/src/tables/catalog.ts b/src/tables/catalog.ts
index e41446f..16505f1 100644
--- a/src/tables/catalog.ts
+++ b/src/tables/catalog.ts
@@ -9,6 +9,7 @@ import {
   type Person,
 } from '../grammar/pronouns';
 import { CASES, CASE_NAMES, GENDERS, GENDER_NAMES, type ArticleType, type Case, type Gender } from '../grammar/types';
+import { VERB_PREPS, findVerbPrep, vpId, type VerbCase, type VpSet } from '../grammar/verb-prepositions';
 
 /** ending: type -en, -em …   word: type the whole form. */
 export type AnswerMode = 'ending' | 'word';
@@ -18,6 +19,10 @@ export interface Axis {
   label: string;
   /** Full name, for hover and screen readers. */
   title?: string;
+  /** Second, smaller line under a row label. */
+  sub?: string;
+  /** The label is German (rendered blue). */
+  de?: boolean;
 }
 
 /** A paradigm to fill in from memory: one right form per row × column. */
@@ -30,6 +35,8 @@ export interface ParadigmTable {
   rows: readonly Axis[];
   cols: readonly Axis[];
   expected(row: string, col: string): string;
+  /** Other answers that also count, compared the same way as the expected form. */
+  accepts?(row: string, col: string): readonly string[];
 }
 
 const GENDER_HEADS: Record<Gender, string> = { m: 'masc.', f: 'fem.', n: 'neut.', pl: 'pl.' };
@@ -83,6 +90,33 @@ function pronounForm(row: string, col: string): string {
   }
 }
 
+const CASE_ANSWERS: Record<VerbCase, readonly string[]> = {
+  akk: ['a', 'akkusativ', 'accusative'],
+  dat: ['d', 'dativ', 'dative'],
+};
+
+const VERB_TABLE_LABELS: Record<VpSet, string> = { notes: 'from my notes', core: 'core B1/B2' };
+
+function verbTable(set: VpSet): ParadigmTable {
+  return {
+    id: `vp-${set}`,
+    group: 'Verbs + preposition',
+    label: VERB_TABLE_LABELS[set],
+    prompt: 'Type the preposition and its case: akk or dat (a / d is enough).',
+    mode: 'word',
+    rows: VERB_PREPS.filter((e) => e.set === set).map((e) => ({ key: vpId(e), label: e.verb, sub: e.gloss, de: true })),
+    cols: [
+      { key: 'prep', label: 'Präp.', title: 'preposition' },
+      { key: 'case', label: 'Kasus', title: 'case: akk or dat' },
+    ],
+    expected: (row, col) => {
+      const e = findVerbPrep(row);
+      return col === 'prep' ? e.prep : e.case;
+    },
+    accepts: (row, col) => (col === 'case' ? CASE_ANSWERS[findVerbPrep(row).case] : []),
+  };
+}
+
 export const TABLES: readonly ParadigmTable[] = [
   adjectiveTable('adj-weak', 'definite', 'der-word · weak', 'after a der-word (der, dieser)'),
   adjectiveTable('adj-mixed', 'indefinite', 'ein-word · mixed', 'after an ein-word (ein, kein, mein)'),
@@ -110,6 +144,8 @@ export const TABLES: readonly ParadigmTable[] = [
     cols: PRONOUN_COLS,
     expected: pronounForm,
   },
+  verbTable('notes'),
+  verbTable('core'),
 ];
 
 export const TABLE_GROUPS: readonly string[] = [...new Set(TABLES.map((t) => t.group))];
diff --git a/src/tables/logic.ts b/src/tables/logic.ts
index e4c054c..aefddef 100644
--- a/src/tables/logic.ts
+++ b/src/tables/logic.ts
@@ -43,7 +43,8 @@ export function gradeGrid(table: ParadigmTable, answers: Readonly<Record<string,
       const key = cellKey(r.key, c.key);
       const expected = table.expected(r.key, c.key);
       const answer = answers[key] ?? '';
-      return { key, answer, expected, correct: isCorrect(table.mode, answer, expected) };
+      const forms = [expected, ...(table.accepts?.(r.key, c.key) ?? [])];
+      return { key, answer, expected, correct: forms.some((f) => isCorrect(table.mode, answer, f)) };
     }),
   );
   return { cells, score: cells.filter((c) => c.correct).length };
diff --git a/src/ui/table.ts b/src/ui/table.ts
index 7b0b09c..96dd76e 100644
--- a/src/ui/table.ts
+++ b/src/ui/table.ts
@@ -11,7 +11,7 @@ import {
   saveChoice,
   saveHistory,
 } from '../tables/logic';
-import { h } from './dom';
+import { de, h } from './dom';
 
 interface Cell {
   td: HTMLTableCellElement;
@@ -61,7 +61,7 @@ export function renderTablePanel(host: HTMLElement, storage: KeyValueStorage): v
     cells = new Map();
     const grid = h(
       'table',
-      { class: table.mode === 'word' ? 'paradigm-grid words' : 'paradigm-grid' },
+      { class: ['paradigm-grid', table.mode === 'word' && 'words', table.rows.some((r) => r.sub) && 'long-rows'].filter(Boolean).join(' ') },
       h('thead', null, h('tr', null, h('th', null, ''), ...table.cols.map((c) => h('th', { scope: 'col', title: c.title }, c.label)))),
       h(
         'tbody',
@@ -70,7 +70,7 @@ export function renderTablePanel(host: HTMLElement, storage: KeyValueStorage): v
           h(
             'tr',
             null,
-            h('th', { scope: 'row' }, r.label),
+            h('th', { scope: 'row' }, r.de ? de(r.label) : r.label, r.sub ? h('small', { class: 'row-sub' }, r.sub) : null),
             ...table.cols.map((c) => {
               const input = h('input', {
                 class: 'cell-input',
```

- [ ] **Step 4: Run** `npm test && npm run typecheck` — Expected: 139 passed, no type errors.

### Task 4: Styles, visual check, docs, commit

- [ ] **Step 1: Styles**

```diff
diff --git a/src/styles.css b/src/styles.css
index 08bd0b4..c6e4507 100644
--- a/src/styles.css
+++ b/src/styles.css
@@ -455,6 +455,29 @@ kbd {
   border-radius: 0;
 }
 
+.vp-input {
+  width: 4.5ch;
+}
+
+.vp-input.wide {
+  width: 9ch;
+}
+
+.translation {
+  margin: 0;
+  font-style: italic;
+  color: var(--ink-soft);
+}
+
+.vp-sentence .blank {
+  margin: 0 0.2em;
+}
+
+.sentence.vp-sentence {
+  font-size: 1.6rem;
+  margin-bottom: 8px;
+}
+
 .hint {
   margin: 16px 0 0;
   display: flex;
@@ -481,7 +504,8 @@ kbd {
   font-size: 1.05rem;
 }
 
-.endings .btn.choice {
+.endings .btn.choice,
+.preps .btn.choice {
   min-width: 76px;
   justify-content: center;
 }
@@ -701,7 +725,8 @@ kbd {
 }
 
 .heatmap td,
-.conn-list li {
+.conn-list li,
+.vp-list li {
   background: var(--heat, var(--surface-2));
   border-radius: 5px;
   text-align: center;
@@ -738,7 +763,8 @@ kbd {
   margin-left: 8px;
 }
 
-.conn-list {
+.conn-list,
+.vp-list {
   list-style: none;
   padding: 0;
   margin: 8px 0 0;
@@ -747,16 +773,22 @@ kbd {
   gap: 4px;
 }
 
-.conn-list li {
+.conn-list li,
+.vp-list li {
   height: auto;
   padding: 6px 4px;
 }
 
-.conn-list .de {
+.conn-list .de,
+.vp-list .de {
   display: block;
   font: 1rem var(--serif);
 }
 
+.vp-list {
+  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
+}
+
 /* ---------- Ending table ---------- */
 
 .table-picker {
@@ -889,6 +921,21 @@ kbd {
   margin-top: 0;
 }
 
+.paradigm-grid.long-rows thead th:first-child {
+  width: 52%;
+}
+
+.paradigm-grid th[scope='row'] .de {
+  display: block;
+  font: 1rem/1.25 var(--serif);
+}
+
+.row-sub {
+  display: block;
+  font-size: 0.72rem;
+  line-height: 1.25;
+}
+
 @media (max-width: 480px) {
   .paradigm-grid.words .cell-input {
     font-size: 1rem;
@@ -911,6 +958,9 @@ kbd {
   .phrase {
     font-size: 1.5rem;
   }
+  .sentence.vp-sentence {
+    font-size: 1.3rem;
+  }
   .connector-word {
     font-size: 2rem;
   }
```

- [ ] **Step 2: Visual check.** `npm run build`, `npx vite preview --port 4179`, headless Edge screenshots
  (`--blink-settings=preferredColorScheme=1` for light, `--force-dark-mode` for dark) of: home,
  each stage after answering, hint, Table *from my notes* after Check, stats; at 800px and at 400px
  (through a `width:400px` iframe).
- [ ] **Step 3: Docs.** README drill list and Table list; CLAUDE.md spec list.
- [ ] **Step 4: Commit** with explicit paths (the folder syncs through Drive).

