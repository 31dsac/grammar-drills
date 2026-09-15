import { emptyStats, recordScore, type CellStats, type StageChange } from './mastery';

export const STORAGE_KEY = 'grammar-drills:v1';
const VERSION = 1;

export interface ProgressData {
  version: 1;
  drills: Record<string, Record<string, CellStats>>;
}

/** The subset of the Storage API we use, so tests can pass an in-memory fake. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type LoadResult = { data: ProgressData; notice?: string };

function empty(): ProgressData {
  return { version: VERSION, drills: {} };
}

function isCellStats(x: unknown): x is CellStats {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    Number.isInteger(o.stage) &&
    (o.stage as number) >= 0 &&
    Array.isArray(o.recent) &&
    o.recent.every((v) => typeof v === 'number') &&
    typeof o.attempts === 'number' &&
    typeof o.correct === 'number'
  );
}

function isProgressData(x: unknown): x is ProgressData {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  if (o.version !== VERSION || typeof o.drills !== 'object' || o.drills === null) return false;
  return Object.values(o.drills as Record<string, unknown>).every(
    (cells) => typeof cells === 'object' && cells !== null && Object.values(cells).every(isCellStats),
  );
}

export function loadProgress(storage: KeyValueStorage): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { data: empty(), notice: 'Browser storage is unavailable, so progress will not be saved this session.' };
  }
  if (raw === null) return { data: empty() };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isProgressData(parsed)) return { data: parsed };
  } catch {
    // fall through to reset
  }
  return {
    data: empty(),
    notice: 'Saved progress could not be read (corrupt or from an incompatible version) and has been reset.',
  };
}

export class ProgressStore {
  private data: ProgressData;
  readonly notice: string | undefined;

  constructor(private readonly storage: KeyValueStorage) {
    const { data, notice } = loadProgress(storage);
    this.data = data;
    this.notice = notice;
  }

  cells(drillId: string): Readonly<Record<string, CellStats>> {
    return this.data.drills[drillId] ?? {};
  }

  get(drillId: string, cellId: string): CellStats {
    return this.data.drills[drillId]?.[cellId] ?? emptyStats();
  }

  record(drillId: string, cellId: string, score: number, maxStage: number): { stats: CellStats; change: StageChange } {
    const result = recordScore(this.get(drillId, cellId), score, maxStage);
    const drill = (this.data.drills[drillId] ??= {});
    drill[cellId] = result.stats;
    this.save();
    return result;
  }

  reset(drillId: string): void {
    delete this.data.drills[drillId];
    this.save();
  }

  private save(): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage full or blocked: keep working in memory.
    }
  }
}
