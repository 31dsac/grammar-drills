# Ending Table Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Table` tab where the learner fills in a 4 × 4 adjective-ending table (weak, mixed or strong), checks it, retries wrong cells, and sees a simple score history.

**Architecture:** Pure grading/history logic in `src/tables/logic.ts`, a DOM panel in `src/ui/table.ts`, and a tab switcher in `src/ui/tabs.ts` that toggles `hidden` on two always-mounted panels. Document-level sentence shortcuts are suspended while the table is showing.

**Tech Stack:** Vite + TypeScript (strict, `noUncheckedIndexedAccess`) + Vitest (jsdom for UI), no framework. Spec: `docs/superpowers/specs/2026-09-15-ending-table-panel-design.md`.

## Global Constraints

- Endings come only from `adjectiveEnding()` in `src/grammar/endings.ts`; no second copy of the tables in `src/`.
- Answer normalisation: trim, lower-case, drop one leading hyphen. Empty = wrong.
- Only the first Check of a fresh attempt is recorded. History key `grammar-drills:tables`, recent capped at 10.
- Tab key `grammar-drills:tab`. Storage failures are silent.
- Existing 93 tests stay green. `npm run typecheck` clean.
- UI works in light/dark and at 400px width; use existing CSS tokens.

---

### Task 1: Grading and history logic

**Files:**
- Modify: `src/grammar/endings.ts` (add `normalizeEnding`)
- Modify: `src/drills/adjective-endings/logic.ts:147-150` (use it)
- Create: `src/tables/logic.ts`
- Test: `tests/tables.test.ts`

**Interfaces:**
- Consumes: `adjectiveEnding(type, case, gender): Ending`, `KeyValueStorage` from `src/progress/store.ts`.
- Produces:
  - `normalizeEnding(answer: string): string`
  - `type CellKey = \`${Case}|${Gender}\``; `CELL_KEYS: readonly CellKey[]` (row by row); `CELL_COUNT = 16`
  - `gradeGrid(type: ArticleType, answers: Partial<Record<CellKey, string>>): { cells: CellResult[]; score: number }`, `CellResult = { key, answer, expected: Ending, correct }`
  - `TABLE_HISTORY_KEY`, `RECENT_LIMIT = 10`, `TableRecord = { attempts; best; recent: number[] }`, `TableHistory = Partial<Record<ArticleType, TableRecord>>`
  - `recordAttempt(record | undefined, score): TableRecord`, `parseHistory(raw: string | null): TableHistory`, `loadHistory(storage)`, `saveHistory(storage, history)`, `historyLine(record | undefined): string`

- [ ] **Step 1: Write the failing test** — `tests/tables.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { normalizeEnding } from '../src/grammar/endings';
import { ARTICLE_TYPES, type ArticleType } from '../src/grammar/types';
import { CELL_COUNT, CELL_KEYS, RECENT_LIMIT, gradeGrid, historyLine, parseHistory, recordAttempt, type CellKey } from '../src/tables/logic';

/** Independently written reference, rows Nom/Akk/Dat/Gen, columns m f n pl. */
const REFERENCE: Record<ArticleType, string> = {
  definite: 'e e e en  en e e en  en en en en  en en en en',
  indefinite: 'er e es en  en e es en  en en en en  en en en en',
  none: 'er e es e  en e es e  em er em en  en er en er',
};

function referenceAnswers(type: ArticleType): Record<CellKey, string> {
  const endings = REFERENCE[type].split(/\s+/);
  return Object.fromEntries(CELL_KEYS.map((k, i) => [k, endings[i]!])) as Record<CellKey, string>;
}

describe('normalizeEnding', () => {
  it('trims, lower-cases and drops one leading hyphen', () => {
    expect(normalizeEnding(' -EN ')).toBe('en');
    expect(normalizeEnding('Es')).toBe('es');
    expect(normalizeEnding('--en')).toBe('-en');
  });
});

describe('gradeGrid', () => {
  it('has 16 cells in row order', () => {
    expect(CELL_COUNT).toBe(16);
    expect(CELL_KEYS.slice(0, 5)).toEqual(['nom|m', 'nom|f', 'nom|n', 'nom|pl', 'akk|m']);
  });

  for (const type of ARTICLE_TYPES) {
    it(`accepts the reference ${type} table`, () => {
      const result = gradeGrid(type, referenceAnswers(type));
      expect(result.score).toBe(16);
      expect(result.cells.every((c) => c.correct)).toBe(true);
    });
  }

  it('marks blanks and wrong endings, and reports the expected ending', () => {
    const answers = { ...referenceAnswers('none'), 'dat|f': 'em', 'gen|pl': '' };
    delete (answers as Partial<Record<CellKey, string>>)['nom|m'];
    const result = gradeGrid('none', answers);
    expect(result.score).toBe(13);
    const wrong = result.cells.filter((c) => !c.correct);
    expect(wrong.map((c) => [c.key, c.answer, c.expected])).toEqual([
      ['nom|m', '', 'er'],
      ['dat|f', 'em', 'er'],
      ['gen|pl', '', 'er'],
    ]);
  });

  it('accepts lenient typing', () => {
    const answers = { ...referenceAnswers('definite'), 'akk|m': ' -EN' };
    expect(gradeGrid('definite', answers).score).toBe(16);
  });
});

describe('history', () => {
  it('counts attempts, keeps the best, caps recent', () => {
    let rec = recordAttempt(undefined, 9);
    expect(rec).toEqual({ attempts: 1, best: 9, recent: [9] });
    rec = recordAttempt(rec, 16);
    rec = recordAttempt(rec, 12);
    expect(rec.best).toBe(16);
    for (let i = 0; i < 20; i++) rec = recordAttempt(rec, i % 17);
    expect(rec.attempts).toBe(23);
    expect(rec.recent).toHaveLength(RECENT_LIMIT);
    expect(rec.recent.at(-1)).toBe(19 % 17);
  });

  it('parses valid history and drops invalid entries', () => {
    expect(parseHistory(null)).toEqual({});
    expect(parseHistory('not json')).toEqual({});
    expect(parseHistory('[1,2]')).toEqual({});
    const raw = JSON.stringify({
      definite: { attempts: 2, best: 14, recent: [12, 14] },
      indefinite: { attempts: 1, best: 99, recent: [99] },
      none: 'nope',
      bogus: { attempts: 1, best: 1, recent: [1] },
    });
    expect(parseHistory(raw)).toEqual({ definite: { attempts: 2, best: 14, recent: [12, 14] } });
  });

  it('formats a history line', () => {
    expect(historyLine(undefined)).toBe('No attempts yet');
    expect(historyLine({ attempts: 1, best: 13, recent: [13] })).toBe('Last 13/16 · Best 13/16 · 1 attempt');
    expect(historyLine({ attempts: 3, best: 16, recent: [9, 16, 13] })).toBe(
      'Last 13/16 · Best 16/16 · 3 attempts · Recent 9 16 13',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tables.test.ts`
Expected: FAIL — cannot resolve `../src/tables/logic` / `normalizeEnding` is not exported.

- [ ] **Step 3: Implement**

Append to `src/grammar/endings.ts`:

```ts
/** How a typed ending is compared: trimmed, lower-case, one leading hyphen dropped. */
export function normalizeEnding(answer: string): string {
  return answer.trim().toLowerCase().replace(/^-/, '');
}
```

In `src/drills/adjective-endings/logic.ts`, import `normalizeEnding` from `../../grammar/endings` and change `checkTyped` to:

```ts
export function checkTyped(item: AdjItem, answer: string): boolean {
  const a = normalizeEnding(answer);
  return a === item.ending || a === (item.stem + item.ending).toLowerCase();
}
```

Create `src/tables/logic.ts`:

```ts
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
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run` — Expected: all pass (93 existing + new).

- [ ] **Step 5: Commit** — `git add src/grammar/endings.ts src/drills/adjective-endings/logic.ts src/tables tests/tables.test.ts && git commit -m "Add ending-table grading and history logic"`

---

### Task 2: Table panel view

**Files:**
- Create: `src/ui/table.ts`
- Modify: `src/styles.css` (global `[hidden]` rule, table panel styles)
- Test: `tests/table-panel.test.ts`

**Interfaces:**
- Consumes: everything produced by Task 1; `h` from `src/ui/dom.ts`; `CASES`, `CASE_NAMES`, `GENDERS`, `GENDER_NAMES`, `ARTICLE_TYPES` from `src/grammar/types.ts`.
- Produces: `renderTablePanel(host: HTMLElement, storage: KeyValueStorage): void`. DOM hooks used by tests: `.cell-input` (16, row order), `td.is-correct` / `td.is-wrong`, `.correction`, `.grid-score`, `.grid-history`, `input[name="table-type"]`, buttons labelled `Check`, `Retry wrong`, `Reset`.

- [ ] **Step 1: Write the failing test** — `tests/table-panel.test.ts`

```ts
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
```

- [ ] **Step 2: Run** `npx vitest run tests/table-panel.test.ts` — Expected: FAIL, cannot resolve `../src/ui/table`.

- [ ] **Step 3: Implement** `src/ui/table.ts`

```ts
import { ARTICLE_TYPES, CASES, CASE_NAMES, GENDERS, GENDER_NAMES, type ArticleType, type Gender } from '../grammar/types';
import type { KeyValueStorage } from '../progress/store';
import { CELL_COUNT, CELL_KEYS, gradeGrid, historyLine, loadHistory, recordAttempt, saveHistory, type CellKey } from '../tables/logic';
import { h } from './dom';

const TYPE_LABELS: Record<ArticleType, string> = {
  definite: 'der-word · weak',
  indefinite: 'ein-word · mixed',
  none: 'no article · strong',
};

const GENDER_HEADS: Record<Gender, string> = { m: 'masc.', f: 'fem.', n: 'neut.', pl: 'pl.' };

interface Cell {
  td: HTMLTableCellElement;
  input: HTMLInputElement;
  correction: HTMLElement;
}

/** Fill in a whole ending table from memory, check it, retry the misses. */
export function renderTablePanel(host: HTMLElement, storage: KeyValueStorage): void {
  let type: ArticleType = 'definite';
  let history = loadHistory(storage);
  /** Only the first Check of a fresh grid is recorded. */
  let recordNext = true;
  let checked = false;

  const cells = new Map<CellKey, Cell>();

  const score = h('p', { class: 'grid-score', 'aria-live': 'polite' });
  const historyNote = h('p', { class: 'note grid-history' });
  const checkBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => check() }, 'Check ', h('kbd', null, 'Enter'));
  const retryBtn = h('button', { class: 'btn ghost', type: 'button', hidden: true, onclick: () => retryWrong() }, 'Retry wrong');
  const resetBtn = h('button', { class: 'btn ghost', type: 'button', onclick: () => reset(true) }, 'Reset');

  const typeSwitch = h(
    'div',
    { class: 'filter', role: 'radiogroup', 'aria-label': 'Article type' },
    ...ARTICLE_TYPES.map((t) => {
      const input = h('input', { type: 'radio', name: 'table-type', value: t });
      input.checked = t === type;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        type = t;
        reset(false);
      });
      return h('label', { class: 'pill' }, input, h('span', null, TYPE_LABELS[t]));
    }),
  );

  const table = h(
    'table',
    { class: 'ending-grid' },
    h('thead', null, h('tr', null, h('th', null, ''), ...GENDERS.map((g) => h('th', { scope: 'col', title: GENDER_NAMES[g] }, GENDER_HEADS[g])))),
    h(
      'tbody',
      null,
      ...CASES.map((c) =>
        h(
          'tr',
          null,
          h('th', { scope: 'row' }, CASE_NAMES[c]),
          ...GENDERS.map((g) => {
            const input = h('input', {
              class: 'cell-input',
              type: 'text',
              autocomplete: 'off',
              autocapitalize: 'off',
              spellcheck: 'false',
              maxlength: 12,
              placeholder: '—', // only visible on a blank cell marked wrong
              'aria-label': `${CASE_NAMES[c]}, ${GENDER_NAMES[g]}`,
            });
            const correction = h('span', { class: 'correction de' });
            const td = h('td', null, input, correction);
            cells.set(`${c}|${g}`, { td, input, correction });
            return td;
          }),
        ),
      ),
    ),
  );

  table.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !checked) {
      e.preventDefault();
      check();
    }
  });

  const refreshHistory = () => {
    historyNote.textContent = historyLine(history[type]);
  };

  const unlock = () => {
    checked = false;
    checkBtn.disabled = false;
    retryBtn.hidden = true;
    score.textContent = '';
  };

  const check = () => {
    if (checked) return;
    const answers: Partial<Record<CellKey, string>> = {};
    for (const [key, cell] of cells) answers[key] = cell.input.value;
    const result = gradeGrid(type, answers);

    for (const r of result.cells) {
      const cell = cells.get(r.key)!;
      cell.td.classList.toggle('is-correct', r.correct);
      cell.td.classList.toggle('is-wrong', !r.correct);
      cell.input.readOnly = true;
      cell.correction.textContent = r.correct ? '' : r.expected;
    }

    checked = true;
    checkBtn.disabled = true;
    score.textContent = `${result.score} / ${CELL_COUNT}`;
    if (recordNext) {
      recordNext = false;
      history = { ...history, [type]: recordAttempt(history[type], result.score) };
      saveHistory(storage, history);
      refreshHistory();
    }
    const anyWrong = result.score < CELL_COUNT;
    retryBtn.hidden = !anyWrong;
    (anyWrong ? retryBtn : resetBtn).focus({ preventScroll: true });
  };

  const retryWrong = () => {
    if (!checked) return;
    let first: HTMLInputElement | undefined;
    for (const { td, input, correction } of cells.values()) {
      if (td.classList.contains('is-wrong')) {
        td.classList.remove('is-wrong');
        input.value = '';
        input.readOnly = false;
        correction.textContent = '';
        first ??= input;
      } else {
        input.tabIndex = -1; // locked green cells leave the tab order
      }
    }
    unlock();
    first?.focus({ preventScroll: true });
  };

  const reset = (focus: boolean) => {
    for (const { td, input, correction } of cells.values()) {
      td.classList.remove('is-correct', 'is-wrong');
      input.value = '';
      input.readOnly = false;
      input.removeAttribute('tabindex');
      correction.textContent = '';
    }
    recordNext = true;
    unlock();
    refreshHistory();
    if (focus) cells.get(CELL_KEYS[0]!)!.input.focus({ preventScroll: true });
  };

  reset(false);

  host.replaceChildren(
    h(
      'section',
      { class: 'card table-card' },
      h('div', { class: 'section-head' }, h('h2', null, 'Ending table'), score),
      h('p', { class: 'note' }, 'Type the adjective ending in every cell. ', h('kbd', null, 'Tab'), ' moves along the row.'),
      typeSwitch,
      h('div', { class: 'grid-wrap' }, table),
      h('div', { class: 'controls row' }, historyNote, resetBtn, retryBtn, checkBtn),
    ),
  );
}
```

Add to `src/styles.css`, right after the `* { box-sizing }` rule:

```css
[hidden] {
  display: none !important;
}
```

and a new section before `@media (max-width: 480px)`:

```css
/* ---------- Ending table ---------- */

.table-card .filter {
  margin-top: 16px;
}

.grid-score {
  margin: 0;
  font: 600 1.5rem/1 var(--serif);
  font-variant-numeric: tabular-nums;
}

.grid-wrap {
  margin-top: 20px;
  overflow-x: auto;
}

.ending-grid {
  border-collapse: separate;
  border-spacing: 4px;
  width: 100%;
  table-layout: fixed;
}

.ending-grid th {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--ink-soft);
}

.ending-grid thead th:first-child {
  width: 6rem;
}

.ending-grid th[scope='row'] {
  text-align: left;
  padding-right: 4px;
}

.ending-grid td {
  height: 60px;
  padding: 0;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 6px;
  text-align: center;
  vertical-align: middle;
}

.ending-grid td.is-correct {
  background: var(--ok-bg);
  border-color: var(--ok);
}

.ending-grid td.is-wrong {
  background: var(--bad-bg);
  border-color: var(--bad);
}

.cell-input {
  display: block;
  width: 100%;
  height: 58px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--de);
  font: 1.35rem var(--serif);
  text-align: center;
  padding: 0 4px;
}

.cell-input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.cell-input::placeholder {
  color: transparent;
}

.is-wrong .cell-input::placeholder {
  color: var(--bad);
}

.is-correct .cell-input {
  color: var(--ok);
  font-weight: 700;
}

.is-wrong .cell-input {
  height: 28px;
  padding-top: 6px;
  color: var(--bad);
  font-size: 1rem;
  text-decoration: line-through;
}

.correction {
  display: none;
}

.is-wrong .correction {
  display: block;
  height: 30px;
  font: 700 1.2rem/26px var(--serif);
  color: var(--ok);
}

.grid-history {
  margin-top: 0;
}
```

Inside the existing `@media (max-width: 480px)` block add:

```css
  .ending-grid thead th:first-child {
    width: 4.6rem;
  }
  .ending-grid th {
    font-size: 0.72rem;
  }
```

- [ ] **Step 4: Run** `npx vitest run` — Expected: all pass.

- [ ] **Step 5: Commit** — `git add src/ui/table.ts src/styles.css tests/table-panel.test.ts && git commit -m "Add ending table panel"`

---

### Task 3: Tabs shell

**Files:**
- Modify: `src/ui/dom.ts` (add `suspendKeys`, guard `onKeys`)
- Create: `src/ui/tabs.ts`
- Modify: `index.html`, `src/main.ts`, `src/styles.css`
- Test: `tests/tabs.test.ts`

**Interfaces:**
- Consumes: `renderTablePanel` (Task 2), `KeyValueStorage`.
- Produces: `suspendKeys(suspended: boolean): void`; `TAB_KEY = 'grammar-drills:tab'`; `interface Panel { id: string; label: string; el: HTMLElement; usesGlobalKeys?: boolean }`; `mountTabs(nav: HTMLElement, panels: readonly Panel[], storage: KeyValueStorage): void`. Tab buttons: `.tab`, `id="tab-<id>"`, `aria-selected`.

- [ ] **Step 1: Write the failing test** — `tests/tabs.test.ts`

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { KeyValueStorage } from '../src/progress/store';
import { onKeys, suspendKeys } from '../src/ui/dom';
import { TAB_KEY, mountTabs } from '../src/ui/tabs';

class MemoryStorage implements KeyValueStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

const el = (id: string) => document.getElementById(id)!;
const tick = () => new Promise((r) => setTimeout(r, 0));

function mount(storage: MemoryStorage): void {
  mountTabs(
    el('tabs'),
    [
      { id: 'sentences', label: 'Sentences', el: el('app'), usesGlobalKeys: true },
      { id: 'table', label: 'Table', el: el('table-panel') },
    ],
    storage,
  );
}

beforeEach(() => {
  document.body.innerHTML = '<nav id="tabs"></nav><main id="app"></main><section id="table-panel"></section>';
});
afterEach(() => suspendKeys(false));

describe('tabs', () => {
  it('shows the first panel by default and switches on click', () => {
    const storage = new MemoryStorage();
    mount(storage);
    expect(el('app').hidden).toBe(false);
    expect(el('table-panel').hidden).toBe(true);
    expect(el('tab-sentences').getAttribute('aria-selected')).toBe('true');

    el('tab-table').click();
    expect(el('app').hidden).toBe(true);
    expect(el('table-panel').hidden).toBe(false);
    expect(el('tab-table').getAttribute('aria-selected')).toBe('true');
    expect(storage.getItem(TAB_KEY)).toBe('table');
  });

  it('restores the remembered tab and ignores unknown ids', () => {
    const storage = new MemoryStorage();
    storage.setItem(TAB_KEY, 'table');
    mount(storage);
    expect(el('table-panel').hidden).toBe(false);

    document.body.innerHTML = '<nav id="tabs"></nav><main id="app"></main><section id="table-panel"></section>';
    storage.setItem(TAB_KEY, 'nope');
    mount(storage);
    expect(el('app').hidden).toBe(false);
  });

  it('suspends document shortcuts while a panel without global keys is showing', async () => {
    mount(new MemoryStorage());
    const controller = new AbortController();
    let presses = 0;
    onKeys(controller.signal, () => presses++);
    await tick();
    const press = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    press();
    expect(presses).toBe(1);
    el('tab-table').click();
    press();
    expect(presses).toBe(1);
    el('tab-sentences').click();
    press();
    expect(presses).toBe(2);
    controller.abort();
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/tabs.test.ts` — Expected: FAIL, `suspendKeys` / `../src/ui/tabs` missing.

- [ ] **Step 3: Implement**

In `src/ui/dom.ts`, above `onKeys`:

```ts
let keysSuspended = false;

/** While another panel is showing, the sentence drill's document-level shortcuts stay quiet. */
export function suspendKeys(suspended: boolean): void {
  keysSuspended = suspended;
}
```

and in the `onKeys` listener change the guard to:

```ts
        if (keysSuspended || e.ctrlKey || e.metaKey || e.altKey) return;
```

Create `src/ui/tabs.ts`:

```ts
import type { KeyValueStorage } from '../progress/store';
import { h, suspendKeys } from './dom';

export const TAB_KEY = 'grammar-drills:tab';

export interface Panel {
  id: string;
  label: string;
  el: HTMLElement;
  /** The panel listens for shortcuts on document (via onKeys). */
  usesGlobalKeys?: boolean;
}

/** Top-level panel switch. Panels stay mounted; switching only toggles `hidden`. */
export function mountTabs(nav: HTMLElement, panels: readonly Panel[], storage: KeyValueStorage): void {
  const buttons = panels.map((p) =>
    h('button', { class: 'tab', type: 'button', role: 'tab', id: `tab-${p.id}`, onclick: () => show(p.id) }, p.label),
  );

  const show = (id: string) => {
    panels.forEach((p, i) => {
      const active = p.id === id;
      p.el.hidden = !active;
      p.el.setAttribute('role', 'tabpanel');
      p.el.setAttribute('aria-labelledby', `tab-${p.id}`);
      buttons[i]!.setAttribute('aria-selected', String(active));
      if (active) suspendKeys(!p.usesGlobalKeys);
    });
    try {
      storage.setItem(TAB_KEY, id);
    } catch {
      // ignore: the remembered tab is safe to lose
    }
  };

  nav.replaceChildren(h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Panels' }, ...buttons));

  let saved: string | null = null;
  try {
    saved = storage.getItem(TAB_KEY);
  } catch {
    // ignore
  }
  show(panels.find((p) => p.id === saved)?.id ?? panels[0]!.id);
}
```

`index.html` body becomes:

```html
    <header class="masthead">
      <p class="brand">Grammar Drills</p>
      <p class="tagline">Slips are allowed. Patterns are not.</p>
    </header>
    <nav id="tabs"></nav>
    <main id="app"></main>
    <section id="table-panel" hidden></section>
    <script type="module" src="/src/main.ts"></script>
```

`src/main.ts`:

```ts
import './styles.css';
import type { Drill } from './drills/drill';
import { ProgressStore } from './progress/store';
import { renderHome } from './ui/home';
import { runSession } from './ui/session';
import { renderStats } from './ui/stats';
import { renderTablePanel } from './ui/table';
import { mountTabs } from './ui/tabs';

const app = document.querySelector<HTMLElement>('#app');
const tablePanel = document.querySelector<HTMLElement>('#table-panel');
const tabs = document.querySelector<HTMLElement>('#tabs');
if (!app || !tablePanel || !tabs) throw new Error('app shell missing');

const store = new ProgressStore(window.localStorage);

function home(): void {
  renderHome(app!, store, { start, stats });
}

function stats(): void {
  renderStats(app!, store, home);
}

function start(drill: Drill<unknown>, cells: string[]): void {
  runSession(app!, drill, cells, store, { home, stats, again: () => start(drill, cells) });
}

home();
renderTablePanel(tablePanel, window.localStorage);
mountTabs(
  tabs,
  [
    { id: 'sentences', label: 'Sentences', el: app, usesGlobalKeys: true },
    { id: 'table', label: 'Table', el: tablePanel },
  ],
  window.localStorage,
);
```

`src/styles.css`: extend the width rule to `.masthead, #tabs, #app, #table-panel { max-width: 760px; margin: 0 auto; }` and add after the `.tagline` rule:

```css
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 20px;
}

.tab {
  font: inherit;
  font-size: 0.95rem;
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  padding: 8px 14px;
  color: var(--ink-soft);
  cursor: pointer;
}

.tab:hover {
  color: var(--ink);
}

.tab[aria-selected='true'] {
  color: var(--ink);
  border-bottom-color: var(--accent);
  font-weight: 600;
}

.tab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  border-radius: 4px 4px 0 0;
}
```

- [ ] **Step 4: Run** `npx vitest run && npm run typecheck` — Expected: all pass, no type errors.

- [ ] **Step 5: Commit** — `git add index.html src/main.ts src/ui/dom.ts src/ui/tabs.ts src/styles.css tests/tabs.test.ts && git commit -m "Add Sentences | Table tabs"`

---

### Task 4: Verify in the browser

- [ ] `npm run build` — Expected: succeeds.
- [ ] Run the dev server and check: tab switch keeps a running sentence session; the weak/mixed/strong grids check correctly; wrong cells show struck answer + correction; Retry/Reset/history behave per spec; light and dark; 400px width has no horizontal page scroll.
- [ ] Update `README.md` if it lists features.
