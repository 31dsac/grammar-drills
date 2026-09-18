import { maxStage } from '../drills/drill';
import { adjectiveEndings, connectorPosition, verbPrepositions } from '../drills/registry';
import { cellId } from '../drills/adjective-endings/logic';
import { CLASS_INFO, CONNECTORS, CONNECTOR_CLASSES } from '../grammar/connectors';
import { PREPS, VERB_PREPS, vpId } from '../grammar/verb-prepositions';
import { ARTICLE_TYPES, ARTICLE_TYPE_NAMES, CASES, CASE_NAMES, GENDERS } from '../grammar/types';
import { recentAccuracy, type CellStats } from '../progress/mastery';
import type { ProgressStore } from '../progress/store';
import { de, h, percent } from './dom';

/** Background for a cell: neutral when unseen, red → amber → green by recent accuracy. */
function heat(stats: CellStats | undefined): string | undefined {
  if (!stats || stats.attempts === 0) return undefined;
  const acc = recentAccuracy(stats) ?? (stats.correct / stats.attempts);
  const hue = Math.round(25 + acc * 120); // 25 red … 145 green
  return `--heat: oklch(var(--heat-l) var(--heat-c) ${hue})`;
}

function cellText(stats: CellStats | undefined, stageNames: readonly string[]): (Node | string)[] {
  if (!stats || stats.attempts === 0) return [h('span', { class: 'muted' }, '·')];
  const acc = recentAccuracy(stats);
  return [
    h('span', { class: 'acc' }, acc === null ? 'new' : percent(acc)),
    h('span', { class: 'stage-tag' }, stageNames[stats.stage] ?? ''),
  ];
}

function resetButton(store: ProgressStore, drillId: string, title: string, rerender: () => void): HTMLElement {
  return h(
    'button',
    {
      class: 'btn ghost danger',
      type: 'button',
      onclick: () => {
        if (confirm(`Reset all progress for “${title}”? This cannot be undone.`)) {
          store.reset(drillId);
          rerender();
        }
      },
    },
    'Reset',
  );
}

export function renderStats(host: HTMLElement, store: ProgressStore, back: () => void): void {
  const rerender = () => renderStats(host, store, back);
  const adjStats = store.cells(adjectiveEndings.id);
  const connStats = store.cells(connectorPosition.id);

  const heatmaps = ARTICLE_TYPES.map((type) =>
    h(
      'div',
      { class: 'heatmap' },
      h('h3', null, ARTICLE_TYPE_NAMES[type]),
      h(
        'table',
        null,
        h('thead', null, h('tr', null, h('th', null, ''), ...GENDERS.map((g) => h('th', { scope: 'col' }, g)))),
        h(
          'tbody',
          null,
          ...CASES.map((c) =>
            h(
              'tr',
              null,
              h('th', { scope: 'row' }, CASE_NAMES[c].slice(0, 3)),
              ...GENDERS.map((g) => {
                const s = adjStats[cellId({ type, case: c, gender: g })];
                return h(
                  'td',
                  { style: heat(s), class: s?.attempts ? 'seen' : 'unseen', title: s ? `${s.attempts} attempts` : 'not practised' },
                  ...cellText(s, adjectiveEndings.stageNames),
                );
              }),
            ),
          ),
        ),
      ),
    ),
  );

  const connGroups = CONNECTOR_CLASSES.map((cls) =>
    h(
      'div',
      { class: 'conn-group' },
      h('h3', null, CLASS_INFO[cls].name, h('small', null, CLASS_INFO[cls].label)),
      h(
        'ul',
        { class: 'conn-list' },
        ...CONNECTORS.filter((c) => c.cls === cls).map((c) => {
          const s = connStats[c.word];
          return h(
            'li',
            { style: heat(s), class: s?.attempts ? 'seen' : 'unseen', title: s ? `${s.attempts} attempts` : 'not practised' },
            de(c.word),
            ...cellText(s, connectorPosition.stageNames),
          );
        }),
      ),
    ),
  );

  const vpStats = store.cells(verbPrepositions.id);
  const vpGroups = PREPS.map((prep) => VERB_PREPS.filter((e) => e.prep === prep))
    .filter((entries) => entries.length > 0)
    .map((entries) => {
      const prep = entries[0]!.prep;
      const cases = [...new Set(entries.map((e) => CASE_NAMES[e.case].slice(0, 3)))].join(' · ');
      return h(
        'div',
        { class: 'conn-group' },
        h('h3', null, de(prep), h('small', null, cases)),
        h(
          'ul',
          { class: 'vp-list' },
          ...entries.map((e) => {
            const st = vpStats[vpId(e)];
            return h(
              'li',
              { style: heat(st), class: st?.attempts ? 'seen' : 'unseen', title: st ? `${st.attempts} attempts` : 'not practised' },
              de(`${e.verb} ${e.prep}`),
              ...cellText(st, verbPrepositions.stageNames),
            );
          }),
        ),
      );
    });

  const stageLegend = (names: readonly string[], max: number) =>
    `Stages: ${names.map((n, i) => (i === max ? `${n} (last)` : n)).join(' → ')}. Percent = accuracy at the current stage.`;

  host.replaceChildren(
    h(
      'div',
      { class: 'stats' },
      h('header', { class: 'session-head' }, h('button', { class: 'btn ghost', type: 'button', onclick: back }, '← Home'), h('h2', null, 'Stats')),
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'section-head' }, h('h2', null, adjectiveEndings.title), resetButton(store, adjectiveEndings.id, adjectiveEndings.title, rerender)),
        h('p', { class: 'note' }, stageLegend(adjectiveEndings.stageNames, maxStage(adjectiveEndings))),
        h('div', { class: 'heatmaps' }, ...heatmaps),
      ),
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'section-head' }, h('h2', null, connectorPosition.title), resetButton(store, connectorPosition.id, connectorPosition.title, rerender)),
        h('p', { class: 'note' }, stageLegend(connectorPosition.stageNames, maxStage(connectorPosition))),
        h('div', { class: 'conn-groups' }, ...connGroups),
      ),
      h(
        'section',
        { class: 'card' },
        h('div', { class: 'section-head' }, h('h2', null, verbPrepositions.title), resetButton(store, verbPrepositions.id, verbPrepositions.title, rerender)),
        h('p', { class: 'note' }, stageLegend(verbPrepositions.stageNames, maxStage(verbPrepositions))),
        h('div', { class: 'conn-groups' }, ...vpGroups),
      ),
    ),
  );
}
