import { describe, expect, it } from 'vitest';
import { declineArticle } from '../src/grammar/articles';
import { adjectiveEnding, explainEnding } from '../src/grammar/endings';
import { ADJECTIVES, NOUNS } from '../src/grammar/lexicon';
import { ARTICLE_TYPES, CASES, GENDERS } from '../src/grammar/types';

/**
 * Reference tables written independently of src/, row = case (Nom Akk Dat Gen),
 * columns = m f n pl. Source: standard German declension tables (Duden Grammatik).
 */
const REFERENCE = {
  definite: ['e e e en', 'en e e en', 'en en en en', 'en en en en'],
  indefinite: ['er e es en', 'en e es en', 'en en en en', 'en en en en'],
  none: ['er e es e', 'en e es e', 'em er em en', 'en er en er'],
} as const;

describe('adjective ending table', () => {
  for (const type of ARTICLE_TYPES) {
    CASES.forEach((c, row) => {
      const expected = REFERENCE[type][row]!.split(' ');
      GENDERS.forEach((g, col) => {
        it(`${type} ${c} ${g} → -${expected[col]}`, () => {
          expect(adjectiveEnding(type, c, g)).toBe(expected[col]);
        });
      });
    });
  }

  it('has an explanation for every cell that names the right ending', () => {
    for (const type of ARTICLE_TYPES)
      for (const c of CASES)
        for (const g of GENDERS) {
          const text = explainEnding(type, c, g);
          expect(text).toContain(`-${adjectiveEnding(type, c, g)}`);
        }
  });
});

describe('article declension', () => {
  const table = (word: Parameters<typeof declineArticle>[0], rows: string[]) =>
    CASES.forEach((c, r) =>
      rows[r]!.split(' ').forEach((form, col) => {
        const g = GENDERS[col]!;
        if (form === '-') return;
        expect(declineArticle(word, c, g), `${word} ${c} ${g}`).toBe(form);
      }),
    );

  it('der', () => table('der', ['der die das die', 'den die das die', 'dem der dem den', 'des der des der']));
  it('dieser', () =>
    table('dieser', [
      'dieser diese dieses diese',
      'diesen diese dieses diese',
      'diesem dieser diesem diesen',
      'dieses dieser dieses dieser',
    ]));
  it('ein', () => table('ein', ['ein eine ein -', 'einen eine ein -', 'einem einer einem -', 'eines einer eines -']));
  it('kein', () =>
    table('kein', [
      'kein keine kein keine',
      'keinen keine kein keine',
      'keinem keiner keinem keinen',
      'keines keiner keines keiner',
    ]));
  it('unser', () =>
    table('unser', [
      'unser unsere unser unsere',
      'unseren unsere unser unsere',
      'unserem unserer unserem unseren',
      'unseres unserer unseres unserer',
    ]));
  it('ein has no plural', () => {
    expect(() => declineArticle('ein', 'nom', 'pl')).toThrow();
  });
});

describe('lexicon', () => {
  it('count nouns have both plural forms, and dative plural ends in -n or -s', () => {
    for (const n of NOUNS) {
      if (n.pl === undefined) continue;
      expect(n.datPl, n.base).toBeDefined();
      expect(n.datPl!.endsWith('n') || n.datPl!.endsWith('s'), n.base).toBe(true);
    }
  });

  it('adjective stems do not end in -e (which would double up with the ending)', () => {
    for (const a of ADJECTIVES) expect(a.stem.endsWith('e'), a.stem).toBe(false);
  });
});
