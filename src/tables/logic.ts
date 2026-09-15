import { adjectiveEnding, normalizeEnding } from '../grammar/endings';
import { ARTICLE_TYPES, CASES, GENDERS, type ArticleType, type Case, type Ending, type Gender } from '../grammar/types';
import type { KeyValueStorage } from '../progress/store';

/** One cell of an ending table, e.g. "dat|f". */
export type CellKey = `${Case}|${Gender}`;

/** Row by row: Nominativ m f n pl, then Akkusativ … */
export const CELL_KEYS: readonly CellKey[] = CASES.flatMap((c) => GENDERS.map((g): CellKey => `${c}|${g}`));
export const CELL_COUNT = CELL_KEYS.length;

export interface CellResult {
  key: CellKey;
  answer: string;
  expected: Ending;
  correct: boolean;
}

export interface GridResult {
  cells: CellResult[];
  score: number;
}

export function gradeGrid(type: ArticleType, answers: Partial<Record<CellKey, string>>): GridResult {
  const cells = CELL_KEYS.map((key) => {
    const [c, g] = key.split('|') as [Case, Gender];
    const expected = adjectiveEnding(type, c, g);
    const answer = answers[key] ?? '';
    return { key, answer, expected, correct: normalizeEnding(answer) === expected };
  });
  return { cells, score: cells.filter((c) => c.correct).length };
}

// ---------- History: a per-browser convenience, separate from sentence-drill progress ----------

export const TABLE_HISTORY_KEY = 'grammar-drills:tables';
export const RECENT_LIMIT = 10;

export interface TableRecord {
  attempts: number;
  best: number;
  /** Scores of recorded attempts, newest last. */
  recent: number[];
}

export type TableHistory = Partial<Record<ArticleType, TableRecord>>;

export function recordAttempt(record: TableRecord | undefined, score: number): TableRecord {
  const prev = record ?? { attempts: 0, best: 0, recent: [] };
  return {
    attempts: prev.attempts + 1,
    best: Math.max(prev.best, score),
    recent: [...prev.recent, score].slice(-RECENT_LIMIT),
  };
}

const isScore = (x: unknown): boolean => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= CELL_COUNT;

function parseRecord(x: unknown): TableRecord | undefined {
  if (typeof x !== 'object' || x === null) return undefined;
  const { attempts, best, recent } = x as Record<string, unknown>;
  if (!Number.isInteger(attempts) || (attempts as number) < 1) return undefined;
  if (!isScore(best) || !Array.isArray(recent) || !recent.every(isScore)) return undefined;
  return { attempts: attempts as number, best: best as number, recent: (recent as number[]).slice(-RECENT_LIMIT) };
}

export function parseHistory(raw: string | null): TableHistory {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
    const history: TableHistory = {};
    for (const type of ARTICLE_TYPES) {
      const record = parseRecord((data as Record<string, unknown>)[type]);
      if (record) history[type] = record;
    }
    return history;
  } catch {
    return {};
  }
}

export function loadHistory(storage: KeyValueStorage): TableHistory {
  try {
    return parseHistory(storage.getItem(TABLE_HISTORY_KEY));
  } catch {
    return {};
  }
}

export function saveHistory(storage: KeyValueStorage, history: TableHistory): void {
  try {
    storage.setItem(TABLE_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore: history is safe to lose
  }
}

export function historyLine(record: TableRecord | undefined): string {
  if (!record) return 'No attempts yet';
  const last = record.recent.at(-1) ?? 0;
  const parts = [
    `Last ${last}/${CELL_COUNT}`,
    `Best ${record.best}/${CELL_COUNT}`,
    `${record.attempts} attempt${record.attempts === 1 ? '' : 's'}`,
  ];
  if (record.recent.length > 1) parts.push(`Recent ${record.recent.join(' ')}`);
  return parts.join(' · ');
}
