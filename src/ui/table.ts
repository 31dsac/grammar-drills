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
