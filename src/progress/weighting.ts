import type { Rng } from '../util/rng';
import { recentAccuracy, type CellStats } from './mastery';

const UNSEEN_ACCURACY = 0.5;

export function cellWeight(stats: CellStats | undefined): number {
  const acc = stats ? (recentAccuracy(stats) ?? UNSEEN_ACCURACY) : UNSEEN_ACCURACY;
  return 1 + 4 * (1 - acc);
}

/**
 * Weighted random pick. More misses → more likely, never zero.
 * Avoids repeating `previous` whenever another cell is available.
 */
export function pickCell(
  cells: readonly string[],
  stats: Readonly<Record<string, CellStats>>,
  rng: Rng,
  previous?: string,
): string {
  if (cells.length === 0) throw new Error('No cells to practise');
  const pool = cells.length > 1 && previous !== undefined ? cells.filter((c) => c !== previous) : cells;
  const weights = pool.map((c) => cellWeight(stats[c]));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i] as number;
    if (r < 0) return pool[i] as string;
  }
  return pool[pool.length - 1] as string;
}
