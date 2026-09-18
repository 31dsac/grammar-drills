import { daWord, gapPhrase, woWord, type Prep } from '../../grammar/verb-prepositions';
import { CASE_NAMES, GENDER_NAMES } from '../../grammar/types';
import { de, h, isTyping, onKeys } from '../../ui/dom';
import { feedbackPanel } from '../../ui/feedback';
import type { ViewContext } from '../drill';
import { checkAnswer, normalizeAnswer, type VpItem } from './logic';

const PROMPTS = ['Which preposition?', 'Type the preposition', 'Type the preposition and the article'];

function feedbackBody(item: VpItem, filled: string): (Node | null)[] {
  const e = item.entry;
  const also = e.also;
  return [
    h('p', { class: 'sentence' }, de(item.before, h('strong', null, filled), item.after)),
    h(
      'p',
      { class: 'rule' },
      de(h('strong', null, `${e.verb} ${e.prep}`)),
      ` + ${CASE_NAMES[e.case]}: ${e.gloss}.`,
    ),
    e.note ? h('p', { class: 'note' }, e.note) : null,
    also
      ? h(
          'p',
          { class: 'note' },
          'Also right with a new article: ',
          de(gapPhrase(item.sentence, also.prep, also.case)),
          ` (${also.prep} + ${CASE_NAMES[also.case]}).`,
        )
      : null,
    h('p', { class: 'note' }, 'For a thing: ', de(daWord(e.prep)), ' · asking: ', de(woWord(e.prep))),
  ];
}

export function view(host: HTMLElement, item: VpItem, ctx: ViewContext): void {
  const e = item.entry;
  const typed = item.stage > 0;
  let hinted = false;
  let done = false;

  const blank = h('span', { class: 'blank' });
  // At prep + case the article is part of the answer, so it stays off screen.
  const shownArticle = item.stage < 2 ? ` ${item.article}` : '';
  const sentenceLine = h('p', { class: 'sentence vp-sentence' }, de(item.before, blank, shownArticle, item.after));
  const translation = h('p', { class: 'translation' }, item.sentence.en);

  const hintBox = h('p', { class: 'hint', hidden: true });
  const hintBtn = h(
    'button',
    {
      class: 'btn ghost',
      type: 'button',
      hidden: !typed,
      onclick: () => {
        if (done || !typed) return;
        hinted = true;
        hintBox.replaceChildren(
          ...(item.stage === 1
            ? [h('span', { class: 'chip' }, 'Starts with ', de(`${e.prep.charAt(0)}…`))]
            : [
                h('span', { class: 'chip' }, de(e.prep), ` + ${CASE_NAMES[e.case]}`),
                h('span', { class: 'chip' }, GENDER_NAMES[item.sentence.gender]),
              ]),
        );
        hintBox.hidden = false;
        hintBtn.disabled = true;
      },
    },
    'Hint ',
    h('kbd', null, '?'),
  );

  const controls = h('div', { class: 'controls' });
  const feedbackHost = h('div');
  let choiceButtons: HTMLButtonElement[] = [];

  /** `given` is what the learner chose or typed; `expected` fills the gap when it was wrong. */
  const finish = (given: string, correct: boolean) => {
    if (done) return;
    done = true;
    ctx.answered(correct ? (hinted ? 0.5 : 1) : 0);

    const expected = item.stage < 2 ? e.prep : item.answer;
    const shown = correct ? normalizeAnswer(given) : expected;
    blank.replaceChildren(
      correct
        ? h('span', { class: 'fill ok' }, shown)
        : h('span', null, given ? h('s', { class: 'fill bad' }, given) : null, h('span', { class: 'fill ok' }, expected)),
    );
    for (const b of choiceButtons) {
      b.disabled = true;
      if (b.dataset.prep === e.prep) b.classList.add('is-correct');
      else if (b.dataset.prep === given) b.classList.add('is-wrong');
    }
    if (typed) controls.replaceChildren();
    hintBtn.remove();
    const filled = item.stage < 2 ? `${shown} ${item.article}` : shown;
    feedbackHost.replaceChildren(feedbackPanel(ctx, correct ? (hinted ? 'hinted' : true) : false, ...feedbackBody(item, filled)));
  };

  if (!typed) {
    blank.textContent = '___';
    choiceButtons = item.options.map((prep: Prep, i) =>
      h(
        'button',
        { class: 'btn choice', type: 'button', 'data-prep': prep, onclick: () => finish(prep, prep === e.prep) },
        h('kbd', null, String(i + 1)),
        ` ${prep}`,
      ),
    );
    controls.append(h('div', { class: 'choices preps' }, ...choiceButtons));
  } else {
    const input = h('input', {
      class: `blank-input vp-input${item.stage === 2 ? ' wide' : ''}`,
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'aria-label': item.stage === 2 ? 'Preposition and article' : 'Preposition',
    });
    input.addEventListener(
      'keydown',
      (ev) => {
        if (ev.key === 'Enter' && input.value.trim()) {
          ev.preventDefault();
          finish(input.value.trim(), checkAnswer(item, input.value));
        }
      },
      { signal: ctx.signal },
    );
    blank.append(input);
    controls.append(
      h('p', { class: 'note' }, item.stage === 2 ? 'Preposition and article, then ' : 'Type it, then ', h('kbd', null, 'Enter'), '.'),
    );
    queueMicrotask(() => input.focus());
  }

  onKeys(ctx.signal, (ev) => {
    if (done) return;
    if (typed && (ev.key === '?' || (ev.key.toLowerCase() === 'h' && !isTyping(ev)))) {
      ev.preventDefault();
      hintBtn.click();
      return;
    }
    if (!typed) {
      const prep = item.options[Number(ev.key) - 1];
      if (prep) finish(prep, prep === e.prep);
    }
  });

  host.replaceChildren(
    h('div', { class: 'card item' }, h('p', { class: 'prompt' }, PROMPTS[item.stage] ?? ''), sentenceLine, translation, hintBox, controls, hintBtn),
    feedbackHost,
  );
}
