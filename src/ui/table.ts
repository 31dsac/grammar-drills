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
