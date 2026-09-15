import { describe, expect, it } from 'vitest';
import { normalizeEnding } from '../src/grammar/endings';
import { ARTICLE_TYPES, type ArticleType } from '../src/grammar/types';
import { CELL_COUNT, CELL_KEYS, RECENT_LIMIT, gradeGrid, historyLine, parseHistory, recordAttempt, type CellKey } from '../src/tables/logic';

/** Independently written reference, rows Nom/Akk/Dat/Gen, columns m f n pl. */
const REFERENCE: Record<ArticleType, string> = {
  definite: 'e e e en  en e e en  en en en en  en en en en',
  indefinite: 'er e es en  en e es en  en en en en  en en en en',
  none: 'er e es e  en e es e  em er em en  en er en er',
};

function referenceAnswers(type: ArticleType): Record<CellKey, string> {
  const endings = REFERENCE[type].split(/\s+/);
  return Object.fromEntries(CELL_KEYS.map((k, i) => [k, endings[i]!])) as Record<CellKey, string>;
}

describe('normalizeEnding', () => {
  it('trims, lower-cases and drops one leading hyphen', () => {
    expect(normalizeEnding(' -EN ')).toBe('en');
    expect(normalizeEnding('Es')).toBe('es');
    expect(normalizeEnding('--en')).toBe('-en');
  });
});

describe('gradeGrid', () => {
  it('has 16 cells in row order', () => {
    expect(CELL_COUNT).toBe(16);
    expect(CELL_KEYS.slice(0, 5)).toEqual(['nom|m', 'nom|f', 'nom|n', 'nom|pl', 'akk|m']);
  });

  for (const type of ARTICLE_TYPES) {
    it(`accepts the reference ${type} table`, () => {
      const result = gradeGrid(type, referenceAnswers(type));
      expect(result.score).toBe(16);
      expect(result.cells.every((c) => c.correct)).toBe(true);
    });
  }

  it('marks blanks and wrong endings, and reports the expected ending', () => {
    const answers = { ...referenceAnswers('none'), 'dat|f': 'em', 'gen|pl': '' };
    delete (answers as Partial<Record<CellKey, string>>)['nom|m'];
    const result = gradeGrid('none', answers);
    expect(result.score).toBe(13);
    const wrong = result.cells.filter((c) => !c.correct);
    expect(wrong.map((c) => [c.key, c.answer, c.expected])).toEqual([
      ['nom|m', '', 'er'],
      ['dat|f', 'em', 'er'],
      ['gen|pl', '', 'er'],
    ]);
  });

  it('accepts lenient typing', () => {
    const answers = { ...referenceAnswers('definite'), 'akk|m': ' -EN' };
    expect(gradeGrid('definite', answers).score).toBe(16);
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

  it('parses valid history and drops invalid entries', () => {
    expect(parseHistory(null)).toEqual({});
    expect(parseHistory('not json')).toEqual({});
    expect(parseHistory('[1,2]')).toEqual({});
    const raw = JSON.stringify({
      definite: { attempts: 2, best: 14, recent: [12, 14] },
      indefinite: { attempts: 1, best: 99, recent: [99] },
      none: 'nope',
      bogus: { attempts: 1, best: 1, recent: [1] },
    });
    expect(parseHistory(raw)).toEqual({ definite: { attempts: 2, best: 14, recent: [12, 14] } });
  });

  it('formats a history line', () => {
    expect(historyLine(undefined)).toBe('No attempts yet');
    expect(historyLine({ attempts: 1, best: 13, recent: [13] })).toBe('Last 13/16 · Best 13/16 · 1 attempt');
    expect(historyLine({ attempts: 3, best: 16, recent: [9, 16, 13] })).toBe(
      'Last 13/16 · Best 16/16 · 3 attempts · Recent 9 16 13',
    );
  });
});
