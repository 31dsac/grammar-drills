import { describe, expect, it } from 'vitest';
import { emptyStats, recordScore, type CellStats } from '../src/progress/mastery';
import { ProgressStore, STORAGE_KEY, type KeyValueStorage } from '../src/progress/store';
import { cellWeight, pickCell } from '../src/progress/weighting';
import { seededRng } from '../src/util/rng';

const run = (scores: number[], maxStage = 1, start: CellStats = emptyStats()) => {
  let stats = start;
  const changes: (string | null)[] = [];
  for (const s of scores) {
    const r = recordScore(stats, s, maxStage);
    stats = r.stats;
    changes.push(r.change);
  }
  return { stats, changes };
};

describe('mastery', () => {
  it('does not promote before 8 scores, even if all correct', () => {
    expect(run([1, 1, 1, 1, 1, 1, 1]).stats.stage).toBe(0);
  });

  it('promotes at 8 scores with ≥ 80% and clears recent', () => {
    const { stats, changes } = run([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(stats.stage).toBe(1);
    expect(stats.recent).toEqual([]);
    expect(changes.at(-1)).toBe('promoted');
  });

  it('does not promote below 80%', () => {
    expect(run([1, 0, 1, 0, 1, 1, 1, 1]).stats.stage).toBe(0); // 6/8 = 75%
  });

  it('counts hinted answers as half', () => {
    expect(run([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]).stats.stage).toBe(0);
  });

  it('never promotes past the last stage', () => {
    const { stats } = run(Array(30).fill(1), 1);
    expect(stats.stage).toBe(1);
  });

  it('demotes after 6 scores below 50% at a higher stage', () => {
    const start: CellStats = { stage: 1, recent: [], attempts: 8, correct: 8 };
    const { stats, changes } = run([0, 0, 1, 0, 1, 0], 1, start);
    expect(stats.stage).toBe(0);
    expect(changes.at(-1)).toBe('demoted');
  });

  it('never demotes below stage 0', () => {
    expect(run(Array(20).fill(0)).stats.stage).toBe(0);
  });

  it('keeps lifetime totals', () => {
    const { stats } = run([1, 0, 0.5]);
    expect(stats.attempts).toBe(3);
    expect(stats.correct).toBe(1.5);
  });
});

describe('weighting', () => {
  it('weights misses higher, unseen in the middle, never zero', () => {
    const perfect = { stage: 0, recent: [1, 1], attempts: 2, correct: 2 };
    const failing = { stage: 0, recent: [0, 0], attempts: 2, correct: 0 };
    expect(cellWeight(perfect)).toBe(1);
    expect(cellWeight(undefined)).toBe(3);
    expect(cellWeight(failing)).toBe(5);
  });

  it('picks failing cells more often', () => {
    const rng = seededRng(5);
    const stats = {
      good: { stage: 0, recent: [1, 1, 1], attempts: 3, correct: 3 },
      bad: { stage: 0, recent: [0, 0, 0], attempts: 3, correct: 0 },
    };
    let bad = 0;
    for (let i = 0; i < 6000; i++) if (pickCell(['good', 'bad'], stats, rng) === 'bad') bad++;
    expect(bad / 6000).toBeGreaterThan(0.78); // expected 5/6
    expect(bad / 6000).toBeLessThan(0.88);
  });

  it('does not repeat the previous cell when there is a choice', () => {
    const rng = seededRng(8);
    for (let i = 0; i < 200; i++) expect(pickCell(['a', 'b', 'c'], {}, rng, 'a')).not.toBe('a');
    expect(pickCell(['a'], {}, rng, 'a')).toBe('a');
  });
});

class MemoryStorage implements KeyValueStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

describe('progress store', () => {
  it('persists records across instances', () => {
    const mem = new MemoryStorage();
    new ProgressStore(mem).record('d', 'c', 1, 1);
    const again = new ProgressStore(mem);
    expect(again.get('d', 'c').attempts).toBe(1);
    expect(again.notice).toBeUndefined();
  });

  it('resets corrupt data with a notice', () => {
    const mem = new MemoryStorage();
    mem.setItem(STORAGE_KEY, '{not json');
    const store = new ProgressStore(mem);
    expect(store.notice).toMatch(/reset/);
    expect(store.cells('d')).toEqual({});
  });

  it('resets data from another version with a notice', () => {
    const mem = new MemoryStorage();
    mem.setItem(STORAGE_KEY, JSON.stringify({ version: 99, drills: {} }));
    expect(new ProgressStore(mem).notice).toMatch(/reset/);
  });

  it('resets structurally invalid cells', () => {
    const mem = new MemoryStorage();
    mem.setItem(STORAGE_KEY, JSON.stringify({ version: 1, drills: { d: { c: { stage: 'x' } } } }));
    expect(new ProgressStore(mem).notice).toMatch(/reset/);
  });

  it('keeps working in memory when storage throws', () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const store = new ProgressStore(broken);
    expect(store.notice).toMatch(/unavailable/);
    store.record('d', 'c', 1, 1);
    expect(store.get('d', 'c').attempts).toBe(1);
  });
});
