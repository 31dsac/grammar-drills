import type { ViewContext } from '../drills/drill';
import { h, onKeys } from './dom';

/**
 * The panel shown after an answer: verdict, the rule, and a Next button.
 * Enter or Space moves on.
 */
export function feedbackPanel(
  ctx: ViewContext,
  correct: boolean | 'hinted',
  ...body: (Node | string | null)[]
): HTMLElement {
  const verdict = correct === true ? 'Richtig' : correct === 'hinted' ? 'Richtig, with hint' : 'Nicht ganz';
  const next = h('button', { class: 'btn primary', type: 'button', onclick: () => ctx.next() }, 'Next ', h('kbd', null, 'Enter'));
  onKeys(ctx.signal, (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ctx.next();
    }
  });
  queueMicrotask(() => next.focus({ preventScroll: true }));

  return h(
    'section',
    { class: `feedback ${correct === false ? 'is-wrong' : 'is-right'}`, 'aria-live': 'polite' },
    h('p', { class: 'verdict' }, verdict),
    h('div', { class: 'feedback-body' }, ...body),
    h('div', { class: 'feedback-actions' }, next),
  );
}
