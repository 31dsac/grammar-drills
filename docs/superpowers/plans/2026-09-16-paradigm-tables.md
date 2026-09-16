# Paradigm Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Table tab into a catalog of memorisable paradigms: adjective endings (3), articles der/dieser/kein, relative pronouns, personal · reflexive pronouns.

**Architecture:** A `ParadigmTable` data type (rows, columns, `expected(row, col)`, answer mode) in `src/tables/catalog.ts`; grading and history in `src/tables/logic.ts` become table-generic; the panel adds a grouped picker and rebuilds its grid per table.

**Tech Stack:** Vite + TypeScript (strict, `noUncheckedIndexedAccess`, `noUnusedLocals`) + Vitest/jsdom. Spec: `docs/superpowers/specs/2026-09-16-paradigm-tables-design.md`.

## Global Constraints

- Forms come from `src/grammar/` only (`adjectiveEnding`, `declineArticle`, new `pronouns.ts`); tests carry independent reference strings.
- Table ids: `adj-weak, adj-mixed, adj-strong, art-der, art-dieser, art-kein, rel, pers`. Cell key `row|col`.
- Word answers: trimmed, case-insensitive unless the expected form is capitalised.
- Storage keys: `grammar-drills:tables` (history, legacy ids migrated), `grammar-drills:table-choice`. Failures silent.
- All existing tests (tabs, UI sessions, grammar) stay green; typecheck clean; 400px works.

---

### Task 1: Pronoun data, catalog, table-generic logic

**Files:**
- Create: `src/grammar/pronouns.ts`, `src/tables/catalog.ts`
- Replace: `src/tables/logic.ts`, `tests/tables.test.ts`

**Interfaces:**
- Produces: `RELATIVE_PRONOUNS`, `PERSONS`, `Person`, `PERSON_LABELS`, `PERSONAL_PRONOUNS`, `REFLEXIVE_PRONOUNS`; `AnswerMode`, `Axis`, `ParadigmTable`, `TABLES`, `TABLE_GROUPS`, `findTable(id)`; `cellKey(row, col)`, `cellKeys(table)`, `cellCount(table)`, `isCorrect(mode, answer, expected)`, `gradeGrid(table, answers)`, `TABLE_HISTORY_KEY`, `TABLE_CHOICE_KEY`, `RECENT_LIMIT`, `TableRecord`, `TableHistory`, `recordAttempt`, `parseHistory`, `loadHistory`, `saveHistory`, `historyLine(record, total)`, `loadChoice(storage)`, `saveChoice(storage, id)`.

- [ ] **Step 1: Write the failing test.**

File: `tests/tables.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { normalizeEnding } from '../src/grammar/endings';
import { TABLES, findTable, type ParadigmTable } from '../src/tables/catalog';
import {
  RECENT_LIMIT,
  TABLE_CHOICE_KEY,
  cellCount,
  cellKeys,
  gradeGrid,
  historyLine,
  isCorrect,
  loadChoice,
  parseHistory,
  recordAttempt,
} from '../src/tables/logic';

/** Independently written references, row by row, left to right. */
const REFERENCE: Record<string, string> = {
  'adj-weak': 'e e e en  en e e en  en en en en  en en en en',
  'adj-mixed': 'er e es en  en e es en  en en en en  en en en en',
  'adj-strong': 'er e es e  en e es e  em er em en  en er en er',
  'art-der': 'der die das die  den die das die  dem der dem den  des der des der',
  'art-dieser':
    'dieser diese dieses diese  diesen diese dieses diese  diesem dieser diesem diesen  dieses dieser dieses dieser',
  'art-kein': 'kein keine kein keine  keinen keine kein keine  keinem keiner keinem keinen  keines keiner keines keiner',
  rel: 'der die das die  den die das die  dem der dem denen  dessen deren dessen deren',
  pers:
    'mich mir mich mir  dich dir dich dir  ihn ihm sich sich  sie ihr sich sich  es ihm sich sich  ' +
    'uns uns uns uns  euch euch euch euch  sie ihnen sich sich  Sie Ihnen sich sich',
};

const table = (id: string) => findTable(id)!;

function referenceAnswers(t: ParadigmTable): Record<string, string> {
  const words = REFERENCE[t.id]!.split(/\s+/);
  return Object.fromEntries(cellKeys(t).map((k, i) => [k, words[i]!]));
}

describe('catalog', () => {
  it('has unique ids and a reference for every table', () => {
    expect(new Set(TABLES.map((t) => t.id)).size).toBe(TABLES.length);
    expect(TABLES.map((t) => t.id).sort()).toEqual(Object.keys(REFERENCE).sort());
  });

  for (const t of TABLES) {
    it(`${t.id} matches its reference cell by cell`, () => {
      const expected = gradeGrid(t, {}).cells.map((c) => c.expected);
      expect(expected).toEqual(REFERENCE[t.id]!.split(/\s+/));
      expect(gradeGrid(t, referenceAnswers(t)).score).toBe(cellCount(t));
    });
  }

  it('sizes: 4 × 4 paradigms, 9 × 4 pronouns', () => {
    expect(cellCount(table('rel'))).toBe(16);
    expect(cellCount(table('pers'))).toBe(36);
    expect(cellKeys(table('pers')).slice(0, 5)).toEqual(['ich|akk', 'ich|dat', 'ich|refl-akk', 'ich|refl-dat', 'du|akk']);
  });
});

describe('answer checking', () => {
  it('endings: trim, case, one leading hyphen', () => {
    expect(normalizeEnding(' -EN ')).toBe('en');
    expect(normalizeEnding('--en')).toBe('-en');
    expect(isCorrect('ending', ' -EN', 'en')).toBe(true);
    expect(isCorrect('ending', 'em', 'en')).toBe(false);
  });

  it('words: case-insensitive, except capitalised forms', () => {
    expect(isCorrect('word', ' Dem ', 'dem')).toBe(true);
    expect(isCorrect('word', 'Ihnen', 'Ihnen')).toBe(true);
    expect(isCorrect('word', 'ihnen', 'Ihnen')).toBe(false);
    expect(isCorrect('word', 'dem', 'den')).toBe(false);
    expect(isCorrect('word', '', 'dem')).toBe(false);
  });

  it('grades blanks and wrong cells and reports the expected form', () => {
    const t = table('rel');
    const answers: Record<string, string> = { ...referenceAnswers(t), 'dat|pl': 'den', 'gen|f': '' };
    delete answers['nom|m'];
    const result = gradeGrid(t, answers);
    expect(result.score).toBe(13);
    expect(result.cells.filter((c) => !c.correct).map((c) => [c.key, c.answer, c.expected])).toEqual([
      ['nom|m', '', 'der'],
      ['dat|pl', 'den', 'denen'],
      ['gen|f', '', 'deren'],
    ]);
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

  it('validates against table size, drops unknown tables, migrates old adjective ids', () => {
    expect(parseHistory(null)).toEqual({});
    expect(parseHistory('not json')).toEqual({});
    expect(parseHistory('[1,2]')).toEqual({});
    const raw = JSON.stringify({
      definite: { attempts: 2, best: 14, recent: [12, 14] },
      rel: { attempts: 1, best: 17, recent: [17] },
      pers: { attempts: 1, best: 30, recent: [30] },
      'art-der': 'nope',
      bogus: { attempts: 1, best: 1, recent: [1] },
    });
    expect(parseHistory(raw)).toEqual({
      'adj-weak': { attempts: 2, best: 14, recent: [12, 14] },
      pers: { attempts: 1, best: 30, recent: [30] },
    });
  });

  it('a new id wins over its legacy id, in either order', () => {
    const fresh = { attempts: 3, best: 16, recent: [16] };
    const old = { attempts: 1, best: 2, recent: [2] };
    expect(parseHistory(JSON.stringify({ 'adj-weak': fresh, definite: old }))).toEqual({ 'adj-weak': fresh });
    expect(parseHistory(JSON.stringify({ definite: old, 'adj-weak': fresh }))).toEqual({ 'adj-weak': fresh });
  });

  it('formats a history line against the table size', () => {
    expect(historyLine(undefined, 16)).toBe('No attempts yet');
    expect(historyLine({ attempts: 1, best: 13, recent: [13] }, 16)).toBe('Last 13/16 · Best 13/16 · 1 attempt');
    expect(historyLine({ attempts: 3, best: 36, recent: [20, 36, 33] }, 36)).toBe(
      'Last 33/36 · Best 36/36 · 3 attempts · Recent 20 36 33',
    );
  });

  it('remembers a valid table choice only', () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    expect(loadChoice(storage)).toBe('adj-weak');
    mem.set(TABLE_CHOICE_KEY, 'rel');
    expect(loadChoice(storage)).toBe('rel');
    mem.set(TABLE_CHOICE_KEY, 'gone');
    expect(loadChoice(storage)).toBe('adj-weak');
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/tables.test.ts` — Expected: FAIL, `../src/tables/catalog` does not exist.

- [ ] **Step 3: Implement.**

File: `src/grammar/pronouns.ts`

```ts
import type { CaseGenderTable } from './types';

/** The relative pronoun is the definite article, except dessen, deren and denen. */
export const RELATIVE_PRONOUNS: CaseGenderTable<string> = {
  nom: { m: 'der', f: 'die', n: 'das', pl: 'die' },
  akk: { m: 'den', f: 'die', n: 'das', pl: 'die' },
  dat: { m: 'dem', f: 'der', n: 'dem', pl: 'denen' },
  gen: { m: 'dessen', f: 'deren', n: 'dessen', pl: 'deren' },
};

export const PERSONS = ['ich', 'du', 'er', 'sie-sg', 'es', 'wir', 'ihr', 'sie-pl', 'Sie'] as const;
export type Person = (typeof PERSONS)[number];

export const PERSON_LABELS: Record<Person, string> = {
  ich: 'ich',
  du: 'du',
  er: 'er',
  'sie-sg': 'sie · she',
  es: 'es',
  wir: 'wir',
  ihr: 'ihr',
  'sie-pl': 'sie · they',
  Sie: 'Sie · formal',
};

export interface ObjectForms {
  akk: string;
  dat: string;
}

export const PERSONAL_PRONOUNS: Record<Person, ObjectForms> = {
  ich: { akk: 'mich', dat: 'mir' },
  du: { akk: 'dich', dat: 'dir' },
  er: { akk: 'ihn', dat: 'ihm' },
  'sie-sg': { akk: 'sie', dat: 'ihr' },
  es: { akk: 'es', dat: 'ihm' },
  wir: { akk: 'uns', dat: 'uns' },
  ihr: { akk: 'euch', dat: 'euch' },
  'sie-pl': { akk: 'sie', dat: 'ihnen' },
  Sie: { akk: 'Sie', dat: 'Ihnen' },
};

/** Reflexive = personal pronoun, except sich for every third person and for Sie. */
export const REFLEXIVE_PRONOUNS: Record<Person, ObjectForms> = {
  ich: { akk: 'mich', dat: 'mir' },
  du: { akk: 'dich', dat: 'dir' },
  er: { akk: 'sich', dat: 'sich' },
  'sie-sg': { akk: 'sich', dat: 'sich' },
  es: { akk: 'sich', dat: 'sich' },
  wir: { akk: 'uns', dat: 'uns' },
  ihr: { akk: 'euch', dat: 'euch' },
  'sie-pl': { akk: 'sich', dat: 'sich' },
  Sie: { akk: 'sich', dat: 'sich' },
};
```

File: `src/tables/catalog.ts`

```ts
import { declineArticle, type ArticleWord } from '../grammar/articles';
import { adjectiveEnding } from '../grammar/endings';
import {
  PERSONAL_PRONOUNS,
  PERSONS,
  PERSON_LABELS,
  REFLEXIVE_PRONOUNS,
  RELATIVE_PRONOUNS,
  type Person,
} from '../grammar/pronouns';
import { CASES, CASE_NAMES, GENDERS, GENDER_NAMES, type ArticleType, type Case, type Gender } from '../grammar/types';

/** ending: type -en, -em …   word: type the whole form. */
export type AnswerMode = 'ending' | 'word';

export interface Axis {
  key: string;
  label: string;
  /** Full name, for hover and screen readers. */
  title?: string;
}

/** A paradigm to fill in from memory: one right form per row × column. */
export interface ParadigmTable {
  id: string;
  group: string;
  label: string;
  prompt: string;
  mode: AnswerMode;
  rows: readonly Axis[];
  cols: readonly Axis[];
  expected(row: string, col: string): string;
}

const GENDER_HEADS: Record<Gender, string> = { m: 'masc.', f: 'fem.', n: 'neut.', pl: 'pl.' };
const CASE_ROWS: readonly Axis[] = CASES.map((c) => ({ key: c, label: CASE_NAMES[c] }));
const GENDER_COLS: readonly Axis[] = GENDERS.map((g) => ({ key: g, label: GENDER_HEADS[g], title: GENDER_NAMES[g] }));

function adjectiveTable(id: string, type: ArticleType, label: string, when: string): ParadigmTable {
  return {
    id,
    group: 'Adjective endings',
    label,
    prompt: `Type the adjective ending ${when}.`,
    mode: 'ending',
    rows: CASE_ROWS,
    cols: GENDER_COLS,
    expected: (row, col) => adjectiveEnding(type, row as Case, col as Gender),
  };
}

function articleTable(word: ArticleWord, prompt: string): ParadigmTable {
  return {
    id: `art-${word}`,
    group: 'Articles',
    label: word,
    prompt,
    mode: 'word',
    rows: CASE_ROWS,
    cols: GENDER_COLS,
    expected: (row, col) => declineArticle(word, row as Case, col as Gender),
  };
}

const PRONOUN_COLS: readonly Axis[] = [
  { key: 'akk', label: 'Akk', title: 'personal pronoun, Akkusativ' },
  { key: 'dat', label: 'Dat', title: 'personal pronoun, Dativ' },
  { key: 'refl-akk', label: 'refl. Akk', title: 'reflexive pronoun, Akkusativ' },
  { key: 'refl-dat', label: 'refl. Dat', title: 'reflexive pronoun, Dativ' },
];

function pronounForm(row: string, col: string): string {
  const person = row as Person;
  switch (col) {
    case 'akk':
      return PERSONAL_PRONOUNS[person].akk;
    case 'dat':
      return PERSONAL_PRONOUNS[person].dat;
    case 'refl-akk':
      return REFLEXIVE_PRONOUNS[person].akk;
    default:
      return REFLEXIVE_PRONOUNS[person].dat;
  }
}

export const TABLES: readonly ParadigmTable[] = [
  adjectiveTable('adj-weak', 'definite', 'der-word · weak', 'after a der-word (der, dieser)'),
  adjectiveTable('adj-mixed', 'indefinite', 'ein-word · mixed', 'after an ein-word (ein, kein, mein)'),
  adjectiveTable('adj-strong', 'none', 'no article · strong', 'when there is no article word'),
  articleTable('der', 'Type the definite article.'),
  articleTable('dieser', 'Type the form of dieser. jeder, welcher and mancher follow it.'),
  articleTable('kein', 'Type the form of kein. ein is the same without a plural; mein, dein, sein … follow it too.'),
  {
    id: 'rel',
    group: 'Pronouns',
    label: 'relative',
    prompt: 'Type the relative pronoun. Row: its job inside the clause. Column: the noun it refers to.',
    mode: 'word',
    rows: CASE_ROWS,
    cols: GENDER_COLS,
    expected: (row, col) => RELATIVE_PRONOUNS[row as Case][col as Gender],
  },
  {
    id: 'pers',
    group: 'Pronouns',
    label: 'personal · reflexive',
    prompt: 'Type the pronoun: personal on the left, reflexive on the right.',
    mode: 'word',
    rows: PERSONS.map((p) => ({ key: p, label: PERSON_LABELS[p] })),
    cols: PRONOUN_COLS,
    expected: pronounForm,
  },
];

export const TABLE_GROUPS: readonly string[] = [...new Set(TABLES.map((t) => t.group))];

export function findTable(id: string): ParadigmTable | undefined {
  return TABLES.find((t) => t.id === id);
}
```

File: `src/tables/logic.ts`

```ts
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
      return { key, answer, expected, correct: isCorrect(table.mode, answer, expected) };
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
```

- [ ] **Step 4: Run** `npx vitest run tests/tables.test.ts` — Expected: PASS. (`tests/table-panel.test.ts` and `src/ui/table.ts` break until Task 2; do not commit between.)

---

### Task 2: Panel with grouped picker

**Files:**
- Replace: `src/ui/table.ts`, `tests/table-panel.test.ts`
- Modify: `src/styles.css` (rename `.ending-grid` → `.paradigm-grid`, picker and word-cell styles)

**Interfaces:**
- Consumes: Task 1 exports.
- Produces: `renderTablePanel(host: HTMLElement, storage: KeyValueStorage): void` (signature unchanged, `main.ts` untouched). DOM hooks: `input[name="table-choice"]`, `.table-heading`, `.cell-input`, `td.is-correct|is-wrong`, `.correction`, `.grid-score`, `.grid-history`.

- [ ] **Step 1: Write the failing test.**

File: `tests/table-panel.test.ts`

```ts
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
```

- [ ] **Step 2: Run** `npx vitest run tests/table-panel.test.ts` — Expected: FAIL (type/import errors from the old view, no `.table-heading`).

- [ ] **Step 3: Implement.**

File: `src/ui/table.ts`

```ts
import type { KeyValueStorage } from '../progress/store';
import { TABLES, TABLE_GROUPS, findTable, type ParadigmTable } from '../tables/catalog';
import {
  cellCount,
  cellKey,
  gradeGrid,
  historyLine,
  loadChoice,
  loadHistory,
  recordAttempt,
  saveChoice,
  saveHistory,
} from '../tables/logic';
import { h } from './dom';

interface Cell {
  td: HTMLTableCellElement;
  input: HTMLInputElement;
  correction: HTMLElement;
}

/** Fill in a whole paradigm from memory, check it, retry the misses. */
export function renderTablePanel(host: HTMLElement, storage: KeyValueStorage): void {
  let table: ParadigmTable = findTable(loadChoice(storage))!;
  let history = loadHistory(storage);
  /** Only the first Check of a fresh grid is recorded. */
  let recordNext = true;
  let checked = false;
  let cells = new Map<string, Cell>();

  const heading = h('h2', { class: 'table-heading' });
  const promptLine = h('p', { class: 'note' });
  const score = h('p', { class: 'grid-score', 'aria-live': 'polite' });
  const historyNote = h('p', { class: 'note grid-history' });
  const gridWrap = h('div', { class: 'grid-wrap' });
  const checkBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => check() }, 'Check ', h('kbd', null, 'Enter'));
  const retryBtn = h('button', { class: 'btn ghost', type: 'button', hidden: true, onclick: () => retryWrong() }, 'Retry wrong');
  const resetBtn = h('button', { class: 'btn ghost', type: 'button', onclick: () => reset(true) }, 'Reset');

  const picker = h(
    'div',
    { class: 'table-picker' },
    ...TABLE_GROUPS.map((group) =>
      h(
        'fieldset',
        { class: 'filter' },
        h('legend', null, group),
        ...TABLES.filter((t) => t.group === group).map((t) => {
          const input = h('input', { type: 'radio', name: 'table-choice', value: t.id });
          input.checked = t.id === table.id;
          input.addEventListener('change', () => {
            if (input.checked) select(t);
          });
          return h('label', { class: 'pill' }, input, h('span', null, t.label));
        }),
      ),
    ),
  );

  const buildGrid = () => {
    cells = new Map();
    const grid = h(
      'table',
      { class: table.mode === 'word' ? 'paradigm-grid words' : 'paradigm-grid' },
      h('thead', null, h('tr', null, h('th', null, ''), ...table.cols.map((c) => h('th', { scope: 'col', title: c.title }, c.label)))),
      h(
        'tbody',
        null,
        ...table.rows.map((r) =>
          h(
            'tr',
            null,
            h('th', { scope: 'row' }, r.label),
            ...table.cols.map((c) => {
              const input = h('input', {
                class: 'cell-input',
                type: 'text',
                autocomplete: 'off',
                autocapitalize: 'off',
                spellcheck: 'false',
                maxlength: 12,
                placeholder: '—', // only visible on a blank cell marked wrong
                'aria-label': `${r.label}, ${c.title ?? c.label}`,
              });
              const correction = h('span', { class: 'correction de' });
              const td = h('td', null, input, correction);
              cells.set(cellKey(r.key, c.key), { td, input, correction });
              return td;
            }),
          ),
        ),
      ),
    );
    grid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !checked) {
        e.preventDefault();
        check();
      }
    });
    gridWrap.replaceChildren(grid);
    heading.textContent = `${table.group} · ${table.label}`;
    promptLine.replaceChildren(table.prompt, ' ', h('kbd', null, 'Tab'), ' moves along the row.');
  };

  const refreshHistory = () => {
    historyNote.textContent = historyLine(history[table.id], cellCount(table));
  };

  const unlock = () => {
    checked = false;
    checkBtn.disabled = false;
    retryBtn.hidden = true;
    score.textContent = '';
  };

  const check = () => {
    if (checked) return;
    const answers: Record<string, string> = {};
    for (const [key, cell] of cells) answers[key] = cell.input.value;
    const result = gradeGrid(table, answers);
    const total = cellCount(table);

    for (const r of result.cells) {
      const cell = cells.get(r.key)!;
      cell.td.classList.toggle('is-correct', r.correct);
      cell.td.classList.toggle('is-wrong', !r.correct);
      cell.input.readOnly = true;
      cell.correction.textContent = r.correct ? '' : r.expected;
    }

    checked = true;
    checkBtn.disabled = true;
    score.textContent = `${result.score} / ${total}`;
    if (recordNext) {
      recordNext = false;
      history = { ...history, [table.id]: recordAttempt(history[table.id], result.score) };
      saveHistory(storage, history);
      refreshHistory();
    }
    const anyWrong = result.score < total;
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
    if (focus) [...cells.values()][0]?.input.focus({ preventScroll: true });
  };

  const select = (t: ParadigmTable) => {
    table = t;
    saveChoice(storage, t.id);
    buildGrid();
    reset(false);
  };

  buildGrid();
  reset(false);

  host.replaceChildren(
    h(
      'section',
      { class: 'card table-card' },
      picker,
      h('div', { class: 'section-head' }, heading, score),
      promptLine,
      gridWrap,
      h('div', { class: 'controls row' }, historyNote, resetBtn, retryBtn, checkBtn),
    ),
  );
}
```

CSS (`src/styles.css`):

1. Replace every `.ending-grid` with `.paradigm-grid`.
2. Replace the rule `.table-card .filter { margin-top: 16px; }` with:

```css
.table-picker {
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--line);
}

.table-picker .filter:first-child {
  margin-top: 0;
}
```

3. After the `.is-wrong .correction` rule add:

```css
.paradigm-grid.words .cell-input {
  font-size: 1.15rem;
}

.paradigm-grid.words .is-wrong .cell-input {
  font-size: 0.9rem;
}

.paradigm-grid.words .is-wrong .correction {
  font-size: 1.05rem;
}
```

4. Inside `@media (max-width: 480px)` add:

```css
  .paradigm-grid.words .cell-input {
    font-size: 1rem;
  }
```

- [ ] **Step 4: Run** `npx vitest run && npm run typecheck` — Expected: all pass, no type errors.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "Table tab: articles, relative and personal/reflexive pronoun tables"`

---

### Task 3: Docs and browser check

- [ ] README "Table" section lists the groups and the word-answer case rule.
- [ ] `npm run build`; screenshot the pronoun table (checked, with errors) in light and dark and inside a 400px iframe. Confirm no horizontal scroll and that *dessen* / *Ihnen* fit. (Found: the score wrapped at 400px with the long pronoun heading; fixed with `white-space: nowrap` on `.grid-score`.)
