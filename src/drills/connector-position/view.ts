import { CLASS_INFO, CONNECTOR_CLASSES, type ConnectorClass } from '../../grammar/connectors';
import { de, h, onKeys } from '../../ui/dom';
import { feedbackPanel } from '../../ui/feedback';
import type { ViewContext } from '../drill';
import { checkBuilt, displayTokens, joiner, type ConnItem, type Token } from './logic';

/** Clause B with the finite verb and connector highlighted (after answering only). */
function clauseB(item: ConnItem, tokens: readonly Token[], highlight: boolean): HTMLElement {
  const parts: (Node | string)[] = [];
  displayTokens(item.sentence, tokens).forEach((t, i) => {
    if (i > 0) parts.push(' ');
    const cls = highlight && t.role ? (t.role === 'verb' ? 'v' : 'conn') : null;
    parts.push(cls ? h('span', { class: cls }, t.text) : t.text);
  });
  return de(...parts, '.');
}

function fullSentence(item: ConnItem, tokens: readonly Token[]): HTMLElement {
  return h('p', { class: 'sentence' }, de(item.sentence.a, joiner(item.connector)), clauseB(item, tokens, true));
}

function rule(item: ConnItem): HTMLElement {
  const info = CLASS_INFO[item.connector.cls];
  return h(
    'p',
    { class: 'rule' },
    de(h('strong', null, item.connector.word)),
    ` is ${/^[AEIOU]/.test(info.name) ? 'an' : 'a'} ${info.name}: ${info.label.toLowerCase()}. ${info.rule}`,
  );
}

function altNote(item: ConnItem): HTMLElement | null {
  if (item.connector.cls !== 'adverbkonnektor') return null;
  return h(
    'p',
    { class: 'note' },
    'Also correct with the connector after the verb: ',
    de(item.accepted[1]?.join(' ') ?? ''),
    '.',
  );
}

export function view(host: HTMLElement, item: ConnItem, ctx: ViewContext): void {
  const card = h('div', { class: 'card item' });
  const feedbackHost = h('div');
  host.replaceChildren(card, feedbackHost);

  if (item.stage === 0) sortStage(card, feedbackHost, item, ctx);
  else if (item.stage === 1) chooseStage(card, feedbackHost, item, ctx);
  else buildStage(card, feedbackHost, item, ctx);
}

function sortStage(card: HTMLElement, feedbackHost: HTMLElement, item: ConnItem, ctx: ViewContext): void {
  let done = false;
  const buttons = CONNECTOR_CLASSES.map((cls: ConnectorClass, i) =>
    h(
      'button',
      { class: 'btn choice wide', type: 'button', 'data-cls': cls, onclick: () => answer(cls) },
      h('kbd', null, String(i + 1)),
      h('span', { class: 'choice-text' }, h('strong', null, CLASS_INFO[cls].label), h('small', null, CLASS_INFO[cls].name)),
    ),
  );

  const answer = (cls: ConnectorClass) => {
    if (done) return;
    done = true;
    const correct = cls === item.connector.cls;
    ctx.answered(correct ? 1 : 0);
    buttons.forEach((b) => {
      b.disabled = true;
      if (b.dataset.cls === item.connector.cls) b.classList.add('is-correct');
      else if (b.dataset.cls === cls) b.classList.add('is-wrong');
    });
    feedbackHost.replaceChildren(feedbackPanel(ctx, correct, rule(item), fullSentence(item, item.correct)));
  };

  onKeys(ctx.signal, (e) => {
    const cls = CONNECTOR_CLASSES[Number(e.key) - 1];
    if (cls && !done) answer(cls);
  });

  card.append(
    h('p', { class: 'prompt' }, 'What does this connector do to word order?'),
    h('p', { class: 'connector-word' }, de(item.connector.word), h('span', { class: 'gloss' }, item.connector.gloss)),
    h('div', { class: 'choices stack' }, ...buttons),
  );
}

function chooseStage(card: HTMLElement, feedbackHost: HTMLElement, item: ConnItem, ctx: ViewContext): void {
  let done = false;
  const buttons = item.options.map((opt, i) =>
    h(
      'button',
      { class: 'btn choice wide sentence-choice', type: 'button', onclick: () => answer(i) },
      h('kbd', null, String(i + 1)),
      h('span', { class: 'choice-text' }, clauseB(item, opt.tokens, false)),
    ),
  );

  const answer = (i: number) => {
    if (done) return;
    const opt = item.options[i];
    if (!opt) return;
    done = true;
    ctx.answered(opt.correct ? 1 : 0);
    buttons.forEach((b, j) => {
      b.disabled = true;
      if (item.options[j]?.correct) b.classList.add('is-correct');
      else if (j === i) b.classList.add('is-wrong');
    });
    feedbackHost.replaceChildren(
      feedbackPanel(ctx, opt.correct, fullSentence(item, item.correct), rule(item), altNote(item)),
    );
  };

  onKeys(ctx.signal, (e) => {
    const i = Number(e.key) - 1;
    if (!done && Number.isInteger(i) && i >= 0) answer(i);
  });

  card.append(
    h('p', { class: 'prompt' }, 'Which continuation is correct?'),
    h('p', { class: 'sentence' }, de(item.sentence.a, joiner(item.connector), '…')),
    h('div', { class: 'choices stack' }, ...buttons),
  );
}

function buildStage(card: HTMLElement, feedbackHost: HTMLElement, item: ConnItem, ctx: ViewContext): void {
  let done = false;
  /** Indexes into item.tiles, in placement order. */
  const placed: number[] = [];

  const line = h('div', { class: 'build-line', 'aria-label': 'Your sentence' });
  const bankTiles = item.tiles.map((t, ti) =>
    h('button', { class: 'tile', type: 'button', onclick: () => place(ti) }, de(t)),
  );
  const bank = h('div', { class: 'tile-bank' }, ...bankTiles);
  const check = h('button', { class: 'btn primary', type: 'button', disabled: true, onclick: () => submit() }, 'Check ', h('kbd', null, 'Enter'));
  const undo = h('button', { class: 'btn ghost', type: 'button', onclick: () => removeLast() }, 'Undo ', h('kbd', null, '⌫'));

  const newSentence = joiner(item.connector) === '. ';
  const show = (text: string, first: boolean) =>
    first && newSentence ? text.charAt(0).toUpperCase() + text.slice(1) : text;

  const render = () => {
    line.replaceChildren(
      ...placed.map((ti, pos) =>
        h(
          'button',
          { class: 'tile placed', type: 'button', disabled: done, onclick: () => removeAt(pos) },
          de(show(item.tiles[ti] ?? '', pos === 0)),
        ),
      ),
    );
    if (placed.length === 0) line.append(h('span', { class: 'placeholder' }, 'Click the words in order'));
    // Bank tiles are created once and only toggled, so keyboard focus survives a click.
    bankTiles.forEach((b, ti) => (b.disabled = done || placed.includes(ti)));
    check.disabled = done || placed.length !== item.tiles.length;
    undo.disabled = done || placed.length === 0;
  };

  const place = (ti: number) => {
    if (done || placed.includes(ti)) return;
    placed.push(ti);
    render();
  };
  const removeAt = (pos: number) => {
    if (done) return;
    placed.splice(pos, 1);
    render();
  };
  const removeLast = () => {
    if (done) return;
    placed.pop();
    render();
  };

  const submit = () => {
    if (done || placed.length !== item.tiles.length) return;
    done = true;
    const built = placed.map((ti) => item.tiles[ti] ?? '');
    const correct = checkBuilt(item, built);
    ctx.answered(correct ? 1 : 0);
    render();
    line.classList.add(correct ? 'is-correct' : 'is-wrong');
    check.remove();
    undo.remove();
    feedbackHost.replaceChildren(
      feedbackPanel(ctx, correct, fullSentence(item, item.correct), rule(item), altNote(item)),
    );
  };

  onKeys(ctx.signal, (e) => {
    if (done) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      removeLast();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });

  card.append(
    h('p', { class: 'prompt' }, 'Build the second clause'),
    h('p', { class: 'sentence' }, de(item.sentence.a, joiner(item.connector), '…')),
    line,
    bank,
    h('div', { class: 'controls row' }, undo, check),
  );
  render();
}
