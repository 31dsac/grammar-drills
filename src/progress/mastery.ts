export interface CellStats {
  /** Current stage: 0 = recognition, highest = production. */
  stage: number;
  /** Scores at the current stage (1, 0.5 hinted, 0), newest last, capped at RECENT_CAP. */
  recent: number[];
  attempts: number;
  /** Sum of scores over all attempts. */
  correct: number;
}

export const RECENT_CAP = 10;
const PROMOTE_MIN = 8;
const PROMOTE_ACCURACY = 0.8;
const DEMOTE_MIN = 6;
const DEMOTE_ACCURACY = 0.5;

export function emptyStats(): CellStats {
  return { stage: 0, recent: [], attempts: 0, correct: 0 };
}

function mean(xs: readonly number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Accuracy at the current stage, or null if the cell has no scores at this stage yet. */
export function recentAccuracy(stats: CellStats): number | null {
  return stats.recent.length === 0 ? null : mean(stats.recent);
}

export type StageChange = 'promoted' | 'demoted' | null;

/** Records one score and applies promotion/demotion. Pure: returns new stats. */
export function recordScore(
  stats: CellStats,
  score: number,
  maxStage: number,
): { stats: CellStats; change: StageChange } {
  const recent = [...stats.recent, score].slice(-RECENT_CAP);
  const next: CellStats = {
    stage: stats.stage,
    recent,
    attempts: stats.attempts + 1,
    correct: stats.correct + score,
  };

  if (next.stage < maxStage && recent.length >= PROMOTE_MIN && mean(recent) >= PROMOTE_ACCURACY) {
    return { stats: { ...next, stage: next.stage + 1, recent: [] }, change: 'promoted' };
  }
  if (next.stage > 0 && recent.length >= DEMOTE_MIN && mean(recent.slice(-DEMOTE_MIN)) < DEMOTE_ACCURACY) {
    return { stats: { ...next, stage: next.stage - 1, recent: [] }, change: 'demoted' };
  }
  return { stats: next, change: null };
}
