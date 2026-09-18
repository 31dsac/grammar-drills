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
