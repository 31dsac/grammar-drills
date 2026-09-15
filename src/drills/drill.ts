import type { Rng } from '../util/rng';

/** Score for one answer: 1 correct, 0.5 correct with hint, 0 wrong. */
export type Score = number;

export interface FilterDef {
  key: string;
  label: string;
  options: readonly { value: string; label: string }[];
}

/** Selected values per filter key. A missing key means "everything". */
export type FilterSelection = Record<string, readonly string[]>;

export interface ViewContext {
  /** Call once, as soon as the learner commits an answer. */
  answered(score: Score): void;
  /** Call when the learner moves on from the feedback. */
  next(): void;
  /** Aborted when the item is replaced; attach listeners with { signal }. */
  signal: AbortSignal;
}

export interface Drill<Item> {
  id: string;
  title: string;
  description: string;
  /** One name per stage, recognition first. */
  stageNames: readonly string[];
  filters: readonly FilterDef[];
  cells(selection?: FilterSelection): string[];
  cellLabel(cellId: string): string;
  generate(cellId: string, stage: number, rng: Rng): Item;
  view(host: HTMLElement, item: Item, ctx: ViewContext): void;
}

export function maxStage(drill: Drill<unknown>): number {
  return drill.stageNames.length - 1;
}
