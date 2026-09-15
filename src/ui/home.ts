import { maxStage, type Drill, type FilterSelection } from '../drills/drill';
import { DRILLS } from '../drills/registry';
import type { ProgressStore } from '../progress/store';
import { h } from './dom';

const FILTER_KEY = 'grammar-drills:filters';

/** Remembered filter choices: a per-browser convenience, safe to lose. */
export function loadFilters(drillId: string): FilterSelection {
  try {
    const all = JSON.parse(localStorage.getItem(FILTER_KEY) ?? '{}') as Record<string, FilterSelection>;
    return all[drillId] ?? {};
  } catch {
    return {};
  }
}

function saveFilters(drillId: string, selection: FilterSelection): void {
  try {
    const all = JSON.parse(localStorage.getItem(FILTER_KEY) ?? '{}') as Record<string, FilterSelection>;
    all[drillId] = selection;
    localStorage.setItem(FILTER_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export interface HomeNav {
  start(drill: Drill<unknown>, cells: string[]): void;
  stats(): void;
}

function summaryLine(drill: Drill<unknown>, store: ProgressStore): string {
  const all = drill.cells();
  const stats = store.cells(drill.id);
  const seen = all.filter((c) => (stats[c]?.attempts ?? 0) > 0).length;
  const top = all.filter((c) => (stats[c]?.stage ?? 0) === maxStage(drill)).length;
  if (seen === 0) return `${all.length} cells · not started`;
  return `${seen} of ${all.length} practised · ${top} at “${drill.stageNames[maxStage(drill)]}”`;
}

function drillCard(drill: Drill<unknown>, store: ProgressStore, nav: HomeNav): HTMLElement {
  const selection: Record<string, string[]> = {};
  const saved = loadFilters(drill.id);
  for (const f of drill.filters) {
    const valid = (saved[f.key] ?? []).filter((v) => f.options.some((o) => o.value === v));
    selection[f.key] = valid.length > 0 ? valid : f.options.map((o) => o.value);
  }

  const startBtn = h('button', { class: 'btn primary', type: 'button' }, 'Start');
  const countNote = h('span', { class: 'note' });

  const refresh = () => {
    const n = drill.cells(selection).length;
    countNote.textContent = `${n} cell${n === 1 ? '' : 's'} selected`;
    startBtn.disabled = n === 0;
  };

  const filterRows = drill.filters.map((f) =>
    h(
      'fieldset',
      { class: 'filter' },
      h('legend', null, f.label),
      ...f.options.map((o) => {
        const input = h('input', { type: 'checkbox', value: o.value });
        input.checked = selection[f.key]?.includes(o.value) ?? true;
        input.addEventListener('change', () => {
          const current = new Set(selection[f.key]);
          if (input.checked) current.add(o.value);
          else current.delete(o.value);
          selection[f.key] = f.options.map((x) => x.value).filter((v) => current.has(v));
          saveFilters(drill.id, selection);
          refresh();
        });
        return h('label', { class: 'pill' }, input, h('span', null, o.label));
      }),
    ),
  );

  startBtn.addEventListener('click', () => {
    const cells = drill.cells(selection);
    if (cells.length > 0) nav.start(drill, cells);
  });
  refresh();

  return h(
    'article',
    { class: 'card drill-card' },
    h('h2', null, drill.title),
    h('p', { class: 'description' }, drill.description),
    h('p', { class: 'meta' }, summaryLine(drill, store)),
    ...filterRows,
    h('div', { class: 'controls row' }, countNote, startBtn),
  );
}

export function renderHome(host: HTMLElement, store: ProgressStore, nav: HomeNav): void {
  host.replaceChildren(
    h(
      'div',
      { class: 'home' },
      store.notice ? h('p', { class: 'banner', role: 'alert' }, store.notice) : null,
      h('div', { class: 'drill-grid' }, ...DRILLS.map((d) => drillCard(d, store, nav))),
      h(
        'p',
        { class: 'home-foot' },
        h('button', { class: 'btn ghost', type: 'button', onclick: () => nav.stats() }, 'View stats →'),
      ),
    ),
  );
}
