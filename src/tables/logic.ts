import { normalizeEnding } from '../grammar/endings';
import type { KeyValueStorage } from '../progress/store';
import { TABLES, findTable, type AnswerMode, type ParadigmTable } from './catalog';

export function cellKey(row: string, col: string): string {
  return `${row}|${col}`;
}

/** Row by row, left to right. */
export function cellKeys(table: ParadigmTable): string[] {
  return table.rows.flatMap((r) => table.cols.map((c) => cellKey(r.key, c.key)));
}

export function cellCount(table: ParadigmTable): number {
  return table.rows.length * table.cols.length;
}

/**
 * Endings: trimmed, lower-case, one leading hyphen dropped.
 * Words: trimmed; case does not matter unless the form is capitalised (Sie, Ihnen).
 */
export function isCorrect(mode: AnswerMode, answer: string, expected: string): boolean {
  if (mode === 'ending') return normalizeEnding(answer) === expected;
  const a = answer.trim();
  return expected === expected.toLowerCase() ? a.toLowerCase() === expected : a === expected;
}

export interface CellResult {
  key: string;
  answer: string;
  expected: string;
  correct: boolean;
}

export interface GridResult {
  cells: CellResult[];
  score: number;
}

export function gradeGrid(table: ParadigmTable, answers: Readonly<Record<string, string>>): GridResult {
  const cells = table.rows.flatMap((r) =>
    table.cols.map((c) => {
      const key = cellKey(r.key, c.key);
      const expected = table.expected(r.key, c.key);
      const answer = answers[key] ?? '';
      const forms = [expected, ...(table.accepts?.(r.key, c.key) ?? [])];
      return { key, answer, expected, correct: forms.some((f) => isCorrect(table.mode, answer, f)) };
    }),
  );
  return { cells, score: cells.filter((c) => c.correct).length };
}

// ---------- History and choice: per-browser conveniences, separate from sentence-drill progress ----------

export const TABLE_HISTORY_KEY = 'grammar-drills:tables';
export const TABLE_CHOICE_KEY = 'grammar-drills:table-choice';
export const RECENT_LIMIT = 10;

export interface TableRecord {
  attempts: number;
  best: number;
  /** Scores of recorded attempts, newest last. */
  recent: number[];
}

export type TableHistory = Record<string, TableRecord>;

/** The first version keyed history by article type. */
const LEGACY_IDS: Readonly<Record<string, string>> = {
  definite: 'adj-weak',
  indefinite: 'adj-mixed',
  none: 'adj-strong',
};

export function recordAttempt(record: TableRecord | undefined, score: number): TableRecord {
  const prev = record ?? { attempts: 0, best: 0, recent: [] };
  return {
    attempts: prev.attempts + 1,
    best: Math.max(prev.best, score),
    recent: [...prev.recent, score].slice(-RECENT_LIMIT),
  };
}

function parseRecord(x: unknown, max: number): TableRecord | undefined {
  if (typeof x !== 'object' || x === null) return undefined;
  const isScore = (s: unknown) => Number.isInteger(s) && (s as number) >= 0 && (s as number) <= max;
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
    for (const [id, value] of Object.entries(data)) {
      const table = findTable(LEGACY_IDS[id] ?? id);
      const record = table && parseRecord(value, cellCount(table));
      if (!table || !record) continue;
      // A current id always wins over a legacy one.
      if (id === table.id || !(table.id in history)) history[table.id] = record;
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

export function historyLine(record: TableRecord | undefined, total: number): string {
  if (!record) return 'No attempts yet';
  const last = record.recent.at(-1) ?? 0;
  const parts = [
    `Last ${last}/${total}`,
    `Best ${record.best}/${total}`,
    `${record.attempts} attempt${record.attempts === 1 ? '' : 's'}`,
  ];
  if (record.recent.length > 1) parts.push(`Recent ${record.recent.join(' ')}`);
  return parts.join(' · ');
}

/** The remembered table, or the first one. */
export function loadChoice(storage: KeyValueStorage): string {
  let id: string | null = null;
  try {
    id = storage.getItem(TABLE_CHOICE_KEY);
  } catch {
    // ignore
  }
  return findTable(id ?? '')?.id ?? TABLES[0]!.id;
}

export function saveChoice(storage: KeyValueStorage, id: string): void {
  try {
    storage.setItem(TABLE_CHOICE_KEY, id);
  } catch {
    // ignore
  }
}
