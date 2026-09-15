import { maxStage, type Drill } from '../drills/drill';
import type { ProgressStore } from '../progress/store';
import { pickCell } from '../progress/weighting';
import { defaultRng } from '../util/rng';
import { h, onKeys } from './dom';

export const SESSION_LENGTH = 20;

export interface SessionNav {
  home(): void;
  stats(): void;
  again(): void;
}

export function runSession(
  host: HTMLElement,
  drill: Drill<unknown>,
  cells: readonly string[],
  store: ProgressStore,
  nav: SessionNav,
): void {
  const results: { cellId: string; score: number }[] = [];
  let index = 0;
  let previous: string | undefined;
  let controller: AbortController | undefined;

  const progressBar = h('div', { class: 'progress-fill' });
  const counter = h('span', { class: 'counter' });
  const stageChip = h('span', { class: 'chip stage' });
  const toast = h('p', { class: 'toast', role: 'status', hidden: true });
  const body = h('div', { class: 'session-body' });

  host.replaceChildren(
    h(
      'div',
      { class: 'session' },
      h(
        'header',
        { class: 'session-head' },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => exit() }, '← End'),
        h('h2', null, drill.title),
        stageChip,
        counter,
      ),
      h('div', { class: 'progress', 'aria-hidden': 'true' }, progressBar),
      toast,
      body,
    ),
  );

  const exit = () => {
    controller?.abort();
    if (results.length > 0) summary();
    else nav.home();
  };

  const showToast = (text: string) => {
    toast.textContent = text;
    toast.hidden = false;
  };

  const nextItem = () => {
    controller?.abort();
    if (index >= SESSION_LENGTH) return summary();

    controller = new AbortController();
    const signal = controller.signal;
    const cellId = pickCell(cells, store.cells(drill.id), defaultRng, previous);
    previous = cellId;
    const stage = store.get(drill.id, cellId).stage;
    const item = drill.generate(cellId, stage, defaultRng);

    counter.textContent = `${index + 1} / ${SESSION_LENGTH}`;
    stageChip.textContent = drill.stageNames[stage] ?? '';
    progressBar.style.transform = `scaleX(${index / SESSION_LENGTH})`;
    toast.hidden = true;

    let answered = false;
    let moved = false;
    drill.view(body, item, {
      signal,
      answered(score) {
        if (answered) return;
        answered = true;
        results.push({ cellId, score });
        progressBar.style.transform = `scaleX(${(index + 1) / SESSION_LENGTH})`;
        const { change } = store.record(drill.id, cellId, score, maxStage(drill));
        const label = drill.cellLabel(cellId);
        const stats = store.get(drill.id, cellId);
        if (change === 'promoted') {
          showToast(`Level up: ${label} moves to “${drill.stageNames[stats.stage]}”.`);
        } else if (change === 'demoted') {
          showToast(`Back a step: ${label} returns to “${drill.stageNames[stats.stage]}” for now.`);
        }
      },
      next() {
        // Enter on a focused button fires both click and the key handler; move once.
        if (!answered || moved) return;
        moved = true;
        index++;
        nextItem();
      },
    });
  };

  const summary = () => {
    controller?.abort();
    controller = new AbortController();
    const total = results.reduce((a, r) => a + r.score, 0);
    const missed = new Map<string, number>();
    for (const r of results) if (r.score < 1) missed.set(r.cellId, (missed.get(r.cellId) ?? 0) + 1);
    const missedList = [...missed.entries()].sort((a, b) => b[1] - a[1]);

    onKeys(controller.signal, (e) => {
      if (e.key === 'Enter') nav.again();
    });

    host.replaceChildren(
      h(
        'div',
        { class: 'card summary' },
        h('p', { class: 'prompt' }, drill.title),
        h('p', { class: 'score' }, `${total % 1 === 0 ? total : total.toFixed(1)} / ${results.length}`),
        missedList.length === 0
          ? h('p', { class: 'note' }, 'No misses this round.')
          : h(
              'div',
              null,
              h('h3', null, 'To watch'),
              h(
                'ul',
                { class: 'missed' },
                ...missedList.map(([id, n]) => h('li', null, drill.cellLabel(id), n > 1 ? h('span', { class: 'count' }, ` ×${n}`) : null)),
              ),
            ),
        h(
          'div',
          { class: 'controls row' },
          h('button', { class: 'btn ghost', type: 'button', onclick: () => nav.home() }, 'Home'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => nav.stats() }, 'Stats'),
          h('button', { class: 'btn primary', type: 'button', onclick: () => nav.again() }, 'Another round ', h('kbd', null, 'Enter')),
        ),
      ),
    );
  };

  nextItem();
}
