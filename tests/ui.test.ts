// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { Drill } from '../src/drills/drill';
import { adjectiveEndings, connectorPosition } from '../src/drills/registry';
import { ProgressStore, STORAGE_KEY, type KeyValueStorage } from '../src/progress/store';
import { renderHome } from '../src/ui/home';
import { SESSION_LENGTH, runSession } from '../src/ui/session';
import { renderStats } from '../src/ui/stats';

class MemoryStorage implements KeyValueStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

/** A store where every cell of the drill starts at `stage`. */
function storeAtStage(drill: Drill<unknown>, stage: number): ProgressStore {
  const mem = new MemoryStorage();
  const cells = Object.fromEntries(drill.cells().map((c) => [c, { stage, recent: [], attempts: 0, correct: 0 }]));
  mem.setItem(STORAGE_KEY, JSON.stringify({ version: 1, drills: { [drill.id]: cells } }));
  return new ProgressStore(mem);
}

const q = <T extends Element>(sel: string) => document.querySelector<T>(sel);
const qa = <T extends Element>(sel: string) => [...document.querySelectorAll<T>(sel)];

function answerCurrent(): void {
  const input = q<HTMLInputElement>('.blank-input');
  if (input) {
    input.value = 'en';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return;
  }
  const tiles = qa<HTMLButtonElement>('.tile-bank .tile');
  if (tiles.length > 0) {
    tiles.forEach((t) => t.click());
    const check = qa<HTMLButtonElement>('.controls .btn.primary').find((b) => b.textContent?.startsWith('Check'));
    expect(check?.disabled).toBe(false);
    check!.click();
    return;
  }
  const choice = q<HTMLButtonElement>('.choices .btn.choice');
  expect(choice, 'an answer control').not.toBeNull();
  choice!.click();
}

function playSession(drill: Drill<unknown>, store: ProgressStore): void {
  const host = q<HTMLElement>('#app')!;
  runSession(host, drill, drill.cells(), store, { home() {}, stats() {}, again() {} });
  for (let i = 0; i < SESSION_LENGTH; i++) {
    expect(q('.counter')?.textContent).toBe(`${i + 1} / ${SESSION_LENGTH}`);
    answerCurrent();
    const feedback = q('.feedback');
    expect(feedback, `feedback after item ${i + 1}`).not.toBeNull();
    const next = q<HTMLButtonElement>('.feedback .btn.primary')!;
    next.click();
    next.click(); // double activation must not skip an item
  }
  expect(q('.score')?.textContent).toMatch(new RegExp(`/ ${SESSION_LENGTH}$`));
  const attempts = Object.values(store.cells(drill.id)).reduce((a, s) => a + s.attempts, 0);
  expect(attempts).toBe(SESSION_LENGTH);
}

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
});

describe('UI sessions', () => {
  it('adjective endings, choose stage', () => playSession(adjectiveEndings, storeAtStage(adjectiveEndings, 0)));
  it('adjective endings, type stage', () => playSession(adjectiveEndings, storeAtStage(adjectiveEndings, 1)));
  it('connectors, sort stage', () => playSession(connectorPosition, storeAtStage(connectorPosition, 0)));
  it('connectors, choose stage', () => playSession(connectorPosition, storeAtStage(connectorPosition, 1)));
  it('connectors, build stage', () => playSession(connectorPosition, storeAtStage(connectorPosition, 2)));

  it('hint reveals case and gender and caps the score at half', () => {
    const store = storeAtStage(adjectiveEndings, 0);
    runSession(q('#app')!, adjectiveEndings, ['definite|dat|f'], store, { home() {}, stats() {}, again() {} });
    const hintBtn = qa<HTMLButtonElement>('.item .btn.ghost').find((b) => b.textContent?.startsWith('Hint'))!;
    hintBtn.click();
    expect(q('.hint')?.textContent).toContain('Dativ');
    expect(q('.hint')?.textContent).toContain('feminine');
    const right = qa<HTMLButtonElement>('.endings .btn').find((b) => b.textContent?.trim().endsWith('-en'))!;
    right.click();
    expect(q('.verdict')?.textContent).toBe('Richtig, with hint');
    expect(store.get(adjectiveEndings.id, 'definite|dat|f').correct).toBe(0.5);
  });
});

describe('home and stats', () => {
  it('home shows both drills and disables Start when a filter is emptied', () => {
    const store = new ProgressStore(new MemoryStorage());
    let started: string[] | undefined;
    renderHome(q('#app')!, store, { start: (_d, cells) => (started = cells), stats() {} });
    expect(qa('.drill-card')).toHaveLength(2);

    const adjCard = qa<HTMLElement>('.drill-card')[0]!;
    const caseBoxes = [...adjCard.querySelectorAll<HTMLInputElement>('fieldset')[0]!.querySelectorAll('input')];
    for (const box of caseBoxes.slice(1)) {
      box.checked = false;
      box.dispatchEvent(new Event('change'));
    }
    adjCard.querySelector<HTMLButtonElement>('.btn.primary')!.click();
    expect(started).toHaveLength(12); // Nominativ only × 3 article types × 4 genders

    caseBoxes[0]!.checked = false;
    caseBoxes[0]!.dispatchEvent(new Event('change'));
    expect(adjCard.querySelector<HTMLButtonElement>('.btn.primary')!.disabled).toBe(true);
  });

  it('stats renders a heatmap cell for all 48 adjective cells and every connector', () => {
    const store = new ProgressStore(new MemoryStorage());
    store.record(adjectiveEndings.id, 'none|dat|m', 1, 1);
    renderStats(q('#app')!, store, () => {});
    expect(qa('.heatmap td')).toHaveLength(48);
    expect(qa('.heatmap td.seen')).toHaveLength(1);
    expect(qa('.conn-list li')).toHaveLength(connectorPosition.cells().length);
  });
});
