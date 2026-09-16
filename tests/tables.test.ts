import { describe, expect, it } from 'vitest';
import { normalizeEnding } from '../src/grammar/endings';
import { TABLES, findTable, type ParadigmTable } from '../src/tables/catalog';
import {
  RECENT_LIMIT,
  TABLE_CHOICE_KEY,
  cellCount,
  cellKeys,
  gradeGrid,
  historyLine,
  isCorrect,
  loadChoice,
  parseHistory,
  recordAttempt,
} from '../src/tables/logic';

/** Independently written references, row by row, left to right. */
const REFERENCE: Record<string, string> = {
  'adj-weak': 'e e e en  en e e en  en en en en  en en en en',
  'adj-mixed': 'er e es en  en e es en  en en en en  en en en en',
  'adj-strong': 'er e es e  en e es e  em er em en  en er en er',
  'art-der': 'der die das die  den die das die  dem der dem den  des der des der',
  'art-dieser':
    'dieser diese dieses diese  diesen diese dieses diese  diesem dieser diesem diesen  dieses dieser dieses dieser',
  'art-kein': 'kein keine kein keine  keinen keine kein keine  keinem keiner keinem keinen  keines keiner keines keiner',
  rel: 'der die das die  den die das die  dem der dem denen  dessen deren dessen deren',
  pers:
    'mich mir mich mir  dich dir dich dir  ihn ihm sich sich  sie ihr sich sich  es ihm sich sich  ' +
    'uns uns uns uns  euch euch euch euch  sie ihnen sich sich  Sie Ihnen sich sich',
};

const table = (id: string) => findTable(id)!;

function referenceAnswers(t: ParadigmTable): Record<string, string> {
  const words = REFERENCE[t.id]!.split(/\s+/);
  return Object.fromEntries(cellKeys(t).map((k, i) => [k, words[i]!]));
}

describe('catalog', () => {
  it('has unique ids and a reference for every table', () => {
    expect(new Set(TABLES.map((t) => t.id)).size).toBe(TABLES.length);
    expect(TABLES.map((t) => t.id).sort()).toEqual(Object.keys(REFERENCE).sort());
  });

  for (const t of TABLES) {
    it(`${t.id} matches its reference cell by cell`, () => {
      const expected = gradeGrid(t, {}).cells.map((c) => c.expected);
      expect(expected).toEqual(REFERENCE[t.id]!.split(/\s+/));
      expect(gradeGrid(t, referenceAnswers(t)).score).toBe(cellCount(t));
    });
  }

  it('sizes: 4 × 4 paradigms, 9 × 4 pronouns', () => {
    expect(cellCount(table('rel'))).toBe(16);
    expect(cellCount(table('pers'))).toBe(36);
    expect(cellKeys(table('pers')).slice(0, 5)).toEqual(['ich|akk', 'ich|dat', 'ich|refl-akk', 'ich|refl-dat', 'du|akk']);
  });
});

describe('answer checking', () => {
  it('endings: trim, case, one leading hyphen', () => {
    expect(normalizeEnding(' -EN ')).toBe('en');
    expect(normalizeEnding('--en')).toBe('-en');
    expect(isCorrect('ending', ' -EN', 'en')).toBe(true);
    expect(isCorrect('ending', 'em', 'en')).toBe(false);
  });

  it('words: case-insensitive, except capitalised forms', () => {
    expect(isCorrect('word', ' Dem ', 'dem')).toBe(true);
    expect(isCorrect('word', 'Ihnen', 'Ihnen')).toBe(true);
    expect(isCorrect('word', 'ihnen', 'Ihnen')).toBe(false);
    expect(isCorrect('word', 'dem', 'den')).toBe(false);
    expect(isCorrect('word', '', 'dem')).toBe(false);
  });

  it('grades blanks and wrong cells and reports the expected form', () => {
    const t = table('rel');
    const answers: Record<string, string> = { ...referenceAnswers(t), 'dat|pl': 'den', 'gen|f': '' };
    delete answers['nom|m'];
    const result = gradeGrid(t, answers);
    expect(result.score).toBe(13);
    expect(result.cells.filter((c) => !c.correct).map((c) => [c.key, c.answer, c.expected])).toEqual([
      ['nom|m', '', 'der'],
      ['dat|pl', 'den', 'denen'],
      ['gen|f', '', 'deren'],
    ]);
  });
});

describe('history', () => {
  it('counts attempts, keeps the best, caps recent', () => {
    let rec = recordAttempt(undefined, 9);
    expect(rec).toEqual({ attempts: 1, best: 9, recent: [9] });
    rec = recordAttempt(rec, 16);
    rec = recordAttempt(rec, 12);
    expect(rec.best).toBe(16);
    for (let i = 0; i < 20; i++) rec = recordAttempt(rec, i % 17);
    expect(rec.attempts).toBe(23);
    expect(rec.recent).toHaveLength(RECENT_LIMIT);
    expect(rec.recent.at(-1)).toBe(19 % 17);
  });

  it('validates against table size, drops unknown tables, migrates old adjective ids', () => {
    expect(parseHistory(null)).toEqual({});
    expect(parseHistory('not json')).toEqual({});
    expect(parseHistory('[1,2]')).toEqual({});
    const raw = JSON.stringify({
      definite: { attempts: 2, best: 14, recent: [12, 14] },
      rel: { attempts: 1, best: 17, recent: [17] },
      pers: { attempts: 1, best: 30, recent: [30] },
      'art-der': 'nope',
      bogus: { attempts: 1, best: 1, recent: [1] },
    });
    expect(parseHistory(raw)).toEqual({
      'adj-weak': { attempts: 2, best: 14, recent: [12, 14] },
      pers: { attempts: 1, best: 30, recent: [30] },
    });
  });

  it('a new id wins over its legacy id, in either order', () => {
    const fresh = { attempts: 3, best: 16, recent: [16] };
    const old = { attempts: 1, best: 2, recent: [2] };
    expect(parseHistory(JSON.stringify({ 'adj-weak': fresh, definite: old }))).toEqual({ 'adj-weak': fresh });
    expect(parseHistory(JSON.stringify({ definite: old, 'adj-weak': fresh }))).toEqual({ 'adj-weak': fresh });
  });

  it('formats a history line against the table size', () => {
    expect(historyLine(undefined, 16)).toBe('No attempts yet');
    expect(historyLine({ attempts: 1, best: 13, recent: [13] }, 16)).toBe('Last 13/16 · Best 13/16 · 1 attempt');
    expect(historyLine({ attempts: 3, best: 36, recent: [20, 36, 33] }, 36)).toBe(
      'Last 33/36 · Best 36/36 · 3 attempts · Recent 20 36 33',
    );
  });

  it('remembers a valid table choice only', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    expect(loadChoice(storage)).toBe('adj-weak');
    mem.set(TABLE_CHOICE_KEY, 'rel');
    expect(loadChoice(storage)).toBe('rel');
    mem.set(TABLE_CHOICE_KEY, 'gone');
    expect(loadChoice(storage)).toBe('adj-weak');
  });
});
