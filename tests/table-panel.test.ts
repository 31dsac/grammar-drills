// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { KeyValueStorage } from '../src/progress/store';
import { findTable } from '../src/tables/catalog';
import { TABLE_CHOICE_KEY, TABLE_HISTORY_KEY, gradeGrid, parseHistory } from '../src/tables/logic';
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

/** Fill every cell with its right form, except the overrides (keyed row|col). */
function fill(tableId: string, overrides: Record<string, string> = {}): void {
  const cells = gradeGrid(findTable(tableId)!, {}).cells;
  inputs().forEach((input, i) => {
    const cell = cells[i]!;
    input.value = overrides[cell.key] ?? cell.expected;
  });
}

function choose(id: string): void {
  const radio = q<HTMLInputElement>(`input[name="table-choice"][value="${id}"]`);
  radio.checked = true;
  radio.dispatchEvent(new Event('change'));
}

let storage: MemoryStorage;
function render(): void {
  document.body.innerHTML = '<section id="table-panel"></section>';
  renderTablePanel(q('#table-panel'), storage);
}

beforeEach(() => {
  storage = new MemoryStorage();
  render();
});

describe('paradigm table panel', () => {
  it('defaults to the weak adjective-ending table', () => {
    expect(inputs()).toHaveLength(16);
    expect(q<HTMLInputElement>('input[name="table-choice"]:checked').value).toBe('adj-weak');
    expect(q('.table-heading').textContent).toBe('Adjective endings · der-word · weak');
    expect(q('.grid-history').textContent).toBe('No attempts yet');
    expect(qa('.table-picker legend').map((l) => l.textContent)).toEqual(['Adjective endings', 'Articles', 'Pronouns']);
  });

  it('a perfect grid scores 16/16 and records one attempt', () => {
    fill('adj-weak');
    button('Check').click();
    expect(q('.grid-score').textContent).toBe('16 / 16');
    expect(qa('td.is-correct')).toHaveLength(16);
    expect(button('Retry wrong').hidden).toBe(true);
    expect(button('Check').disabled).toBe(true);
    expect(history(storage)['adj-weak']).toEqual({ attempts: 1, best: 16, recent: [16] });
    expect(q('.grid-history').textContent).toBe('Last 16/16 · Best 16/16 · 1 attempt');
  });

  it('Enter checks; Retry clears only wrong cells; re-checking does not record', () => {
    fill('adj-weak', { 'nom|m': 'er', 'gen|pl': '' });
    inputs()[3]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(q('.grid-score').textContent).toBe('14 / 16');
    const wrong = qa<HTMLTableCellElement>('td.is-wrong');
    expect(wrong).toHaveLength(2);
    expect(wrong[0]!.querySelector('.correction')!.textContent).toBe('e');
    expect(inputs().every((i) => i.readOnly)).toBe(true);

    button('Retry wrong').click();
    const first = inputs()[0]!;
    const last = inputs()[15]!;
    expect(first.value).toBe('');
    expect(first.readOnly).toBe(false);
    expect(last.value).toBe('');
    expect(inputs()[1]!.value).toBe('e');
    expect(inputs()[1]!.readOnly).toBe(true);
    expect(qa('td.is-correct')).toHaveLength(14);
    expect(qa('td.is-wrong')).toHaveLength(0);
    expect(document.activeElement).toBe(first);

    first.value = 'e';
    last.value = '-en';
    button('Check').click();
    expect(q('.grid-score').textContent).toBe('16 / 16');
    expect(history(storage)['adj-weak']).toEqual({ attempts: 1, best: 14, recent: [14] });
  });

  it('Reset starts a fresh attempt that is recorded again', () => {
    fill('adj-weak');
    button('Check').click();
    button('Reset').click();
    expect(inputs().every((i) => i.value === '' && !i.readOnly)).toBe(true);
    expect(qa('td.is-correct')).toHaveLength(0);
    expect(q('.grid-score').textContent).toBe('');
    fill('adj-weak', { 'dat|m': 'em' });
    button('Check').click();
    expect(history(storage)['adj-weak']).toEqual({ attempts: 2, best: 16, recent: [16, 15] });
  });

  it('switching table rebuilds the grid, records under the new id, and is remembered', () => {
    fill('adj-weak');
    choose('rel');
    expect(q('.table-heading').textContent).toBe('Pronouns · relative');
    expect(inputs()).toHaveLength(16);
    expect(inputs().every((i) => i.value === '')).toBe(true);

    fill('rel', { 'dat|pl': 'den' });
    button('Check').click();
    expect(q('.grid-score').textContent).toBe('15 / 16');
    expect(q('td.is-wrong .correction').textContent).toBe('denen');
    expect(history(storage)).toEqual({ rel: { attempts: 1, best: 15, recent: [15] } });
    expect(storage.getItem(TABLE_CHOICE_KEY)).toBe('rel');

    render();
    expect(q<HTMLInputElement>('input[name="table-choice"]:checked').value).toBe('rel');
    expect(q('.grid-history').textContent).toBe('Last 15/16 · Best 15/16 · 1 attempt');
  });

  it('pronoun table has 36 cells and requires the capital in Ihnen', () => {
    choose('pers');
    expect(inputs()).toHaveLength(36);
    expect(q('.paradigm-grid').classList.contains('words')).toBe(true);
    fill('pers', { 'Sie|dat': 'ihnen', 'ich|akk': 'MICH' });
    button('Check').click();
    expect(q('.grid-score').textContent).toBe('35 / 36');
    expect(qa('td.is-wrong')).toHaveLength(1);
    expect(q('td.is-wrong .correction').textContent).toBe('Ihnen');
  });
});
