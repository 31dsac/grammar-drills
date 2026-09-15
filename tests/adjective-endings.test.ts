import { describe, expect, it } from 'vitest';
import {
  allCells,
  candidates,
  checkTyped,
  generate,
  parseCellId,
  phrase,
} from '../src/drills/adjective-endings/logic';
import { ENDINGS } from '../src/grammar/types';
import { seededRng } from '../src/util/rng';

describe('adjective endings drill', () => {
  it('has 48 cells, and filters narrow them', () => {
    expect(allCells()).toHaveLength(48);
    expect(allCells({ case: ['dat'] })).toHaveLength(12);
    expect(allCells({ case: ['dat', 'gen'], type: ['none'] })).toHaveLength(8);
  });

  it('every cell has at least one lexicon combination', () => {
    for (const id of allCells()) expect(candidates(parseCellId(id)).length, id).toBeGreaterThan(0);
  });

  it('1000 random items per stage are well-formed and accept their own answer', () => {
    const rng = seededRng(42);
    const cells = allCells();
    for (const stage of [0, 1]) {
      for (let i = 0; i < 1000; i++) {
        const id = cells[Math.floor(rng() * cells.length)]!;
        const item = generate(id, stage, rng);
        const text = phrase(item, `${item.stem}___`);

        expect(text, id).not.toMatch(/undefined|null|\s\s/);
        expect(text.split('___')).toHaveLength(2);
        expect(ENDINGS).toContain(item.ending);
        expect(checkTyped(item, item.ending)).toBe(true);
        expect(checkTyped(item, ` -${item.ending.toUpperCase()} `)).toBe(true);
        expect(checkTyped(item, item.stem + item.ending)).toBe(true);

        const k = item.key;
        if (k.type === 'none') expect(item.article, id).toBe('');
        else expect(item.article, id).not.toBe('');
        if (k.gender === 'pl') expect(item.article, id).not.toMatch(/^ein/);
      }
    }
  });

  it('rejects wrong endings', () => {
    const item = generate('none|dat|f', 1, seededRng(1));
    expect(item.ending).toBe('er');
    for (const wrong of ['e', 'en', 'es', 'em', '', 'err']) expect(checkTyped(item, wrong)).toBe(false);
  });

  it('produces a known phrase shape', () => {
    const item = generate('definite|gen|m', 0, seededRng(7));
    expect(item.noun.endsWith('s')).toBe(true); // genitive masculine noun takes -(e)s
    expect(['des', 'dieses']).toContain(item.article);
  });
});
