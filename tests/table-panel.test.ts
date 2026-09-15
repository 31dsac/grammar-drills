// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { adjectiveEnding } from '../src/grammar/endings';
import type { ArticleType, Case, Gender } from '../src/grammar/types';
import type { KeyValueStorage } from '../src/progress/store';
import { CELL_KEYS, TABLE_HISTORY_KEY, parseHistory } from '../src/tables/logic';
import { renderTablePanel } from '../src/ui/table';

class MemoryStorage implements KeyValueStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

const q = <T extends Element>(sel: string) => document.querySelector<T>(sel)!;
const qa = <T extends Element>(sel: string) => [...document.querySelectorAll<T>(sel)];
const button = (label: string) => qa<HTMLButtonElement>('button').find((b) => b.textContent?.startsWith(label))!;
const inputs = () => qa<HTMLInputElement>('.cell-input');
const history = (s: MemoryStorage) => parseHistory(s.getItem(TABLE_HISTORY_KEY));

function fill(type: ArticleType, overrides: Record<string, string> = {}): void {
  inputs().forEach((input, i) => {
    const key = CELL_KEYS[i]!;
    const [c, g] = key.split('|') as [Case, Gender];
    input.value = overrides[key] ?? adjectiveEnding(type, c, g);
  });
}

let storage: MemoryStorage;
beforeEach(() => {
  document.body.innerHTML = '<section id="table-panel"></section>';
  storage = new MemoryStorage();
  renderTablePanel(q('#table-panel'), storage);
});

describe('ending table panel', () => {
  it('renders a 4 × 4 grid defaulting to the weak table', () => {
    expect(inputs()).toHaveLength(16);
    expect(q<HTMLInputElement>('input[name="table-type"]:checked').value).toBe('definite');
    expect(q('.grid-history').textContent).toBe('No attempts yet');
  });

  it('a perfect grid scores 16/16 and records one attempt', () => {
    fill('definite');
    button('Check').click();
    expect(q('.grid-score').textContent).toBe('16 / 16');
    expect(qa('td.is-correct')).toHaveLength(16);
    expect(button('Retry wrong').hidden).toBe(true);
    expect(button('Check').disabled).toBe(true);
    expect(history(storage).definite).toEqual({ attempts: 1, best: 16, recent: [16] });
    expect(q('.grid-history').textContent).toBe('Last 16/16 · Best 16/16 · 1 attempt');
  });

  it('Enter checks; Retry clears only wrong cells; re-checking does not record', () => {
    fill('definite', { 'nom|m': 'er', 'gen|pl': '' });
    inputs()[3]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(q('.grid-score').textContent).toBe('14 / 16');
    const wrong = qa<HTMLTableCellElement>('td.is-wrong');
    expect(wrong).toHaveLength(2);
    expect(wrong[0]!.querySelector('.correction')!.textContent).toBe('e');
    expect(inputs().every((i) => i.readOnly)).toBe(true);

    button('Retry wrong').click();
    const [first, , , , , , , , , , , , , , , last] = inputs();
    expect(first!.value).toBe('');
    expect(first!.readOnly).toBe(false);
    expect(last!.value).toBe('');
    expect(inputs()[1]!.value).toBe('e');
    expect(inputs()[1]!.readOnly).toBe(true);
    expect(qa('td.is-correct')).toHaveLength(14);
    expect(qa('td.is-wrong')).toHaveLength(0);
    expect(document.activeElement).toBe(first);

    first!.value = 'e';
    last!.value = '-en';
    button('Check').click();
    expect(q('.grid-score').textContent).toBe('16 / 16');
    expect(history(storage).definite).toEqual({ attempts: 1, best: 14, recent: [14] });
  });

  it('Reset starts a fresh attempt that is recorded again', () => {
    fill('definite');
    button('Check').click();
    button('Reset').click();
    expect(inputs().every((i) => i.value === '' && !i.readOnly)).toBe(true);
    expect(qa('td.is-correct')).toHaveLength(0);
    expect(q('.grid-score').textContent).toBe('');
    fill('definite', { 'dat|m': 'em' });
    button('Check').click();
    expect(history(storage).definite).toEqual({ attempts: 2, best: 16, recent: [16, 15] });
  });

  it('switching article type clears the grid and grades the new table', () => {
    fill('definite');
    const none = q<HTMLInputElement>('input[name="table-type"][value="none"]');
    none.checked = true;
    none.dispatchEvent(new Event('change'));
    expect(inputs().every((i) => i.value === '')).toBe(true);
    fill('none');
    button('Check').click();
    expect(q('.grid-score').textContent).toBe('16 / 16');
    expect(history(storage)).toEqual({ none: { attempts: 1, best: 16, recent: [16] } });
  });
});
