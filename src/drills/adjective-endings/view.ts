import { CASE_NAMES, ENDINGS, GENDER_NAMES, type Ending } from '../../grammar/types';
import { de, h, isTyping, onKeys } from '../../ui/dom';
import { feedbackPanel } from '../../ui/feedback';
import type { ViewContext } from '../drill';
import { cellLabel, checkTyped, type AdjItem } from './logic';

export function view(host: HTMLElement, item: AdjItem, ctx: ViewContext): void {
  const { key } = item;
  let hinted = false;
  let done = false;

  const blank = h('span', { class: 'blank' });
  const phraseLine = h(
    'p',
    { class: 'phrase' },
    de(
      item.before,
      ' ',
      item.article ? item.article + ' ' : '',
      h('span', { class: 'adj' }, item.stem, blank),
      ' ',
      item.noun,
      item.after,
    ),
  );

  // Without an article word nothing in the phrase shows gender, so show it up front.
  const genderAlwaysShown = key.type === 'none' && key.gender !== 'pl';
  const hintBox = h('p', { class: 'hint', hidden: true });
  const fillHint = () => {
    hintBox.replaceChildren(
      h('span', { class: 'chip' }, item.trigger, ' → ', CASE_NAMES[key.case]),
      ' ',
      h('span', { class: 'chip' }, de(item.nounHint), ' · ', GENDER_NAMES[key.gender]),
    );
    hintBox.hidden = false;
  };
  const hintBtn = h(
    'button',
    {
      class: 'btn ghost',
      type: 'button',
      onclick: () => {
        if (done) return;
        hinted = true;
        fillHint();
        hintBtn.disabled = true;
      },
    },
    'Hint ',
    h('kbd', null, '?'),
  );

  const nounNote = genderAlwaysShown
    ? h('p', { class: 'note' }, 'No article: ', de(item.nounHint), ` (${GENDER_NAMES[key.gender]})`)
    : null;

  const controls = h('div', { class: 'controls' });
  const feedbackHost = h('div');

  const finish = (answer: string, correct: boolean) => {
    if (done) return;
    done = true;
    const score = correct ? (hinted ? 0.5 : 1) : 0;
    ctx.answered(score);

    blank.replaceChildren(
      correct
        ? h('span', { class: 'fill ok' }, item.ending)
        : h(
            'span',
            null,
            answer ? h('s', { class: 'fill bad' }, answer) : null,
            h('span', { class: 'fill ok' }, item.ending),
          ),
    );
    controls.replaceChildren();
    hintBtn.remove();
    feedbackHost.replaceChildren(
      feedbackPanel(
        ctx,
        correct ? (hinted ? 'hinted' : true) : false,
        h('p', { class: 'rule' }, item.explanation),
        h('p', { class: 'cell-label' }, cellLabel(item.cellId)),
      ),
    );
  };

  if (item.stage === 0) {
    blank.textContent = '___';
    const buttons = ENDINGS.map((ending: Ending, i) =>
      h(
        'button',
        { class: 'btn choice', type: 'button', onclick: () => finish(ending, ending === item.ending) },
        h('kbd', null, String(i + 1)),
        ` -${ending}`,
      ),
    );
    controls.append(h('div', { class: 'choices endings' }, ...buttons));
  } else {
    const input = h('input', {
      class: 'blank-input',
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'aria-label': 'Adjective ending',
      size: 3,
    });
    input.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          e.preventDefault();
          finish(input.value.trim(), checkTyped(item, input.value));
        }
      },
      { signal: ctx.signal },
    );
    blank.append(input);
    controls.append(h('p', { class: 'note' }, 'Type the ending, then ', h('kbd', null, 'Enter'), '.'));
    queueMicrotask(() => input.focus());
  }

  onKeys(ctx.signal, (e) => {
    if (done) return;
    if (e.key === '?' || (e.key.toLowerCase() === 'h' && !isTyping(e))) {
      e.preventDefault();
      hintBtn.click();
      return;
    }
    if (item.stage === 0) {
      const i = Number(e.key) - 1;
      const ending = ENDINGS[i];
      if (ending) finish(ending, ending === item.ending);
    }
  });

  host.replaceChildren(
    h('div', { class: 'card item' }, h('p', { class: 'prompt' }, 'Fill in the adjective ending'), phraseLine, nounNote, hintBox, controls, hintBtn),
    feedbackHost,
  );
}
