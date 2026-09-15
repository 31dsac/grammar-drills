import './styles.css';
import type { Drill } from './drills/drill';
import { ProgressStore } from './progress/store';
import { renderHome } from './ui/home';
import { runSession } from './ui/session';
import { renderStats } from './ui/stats';
import { renderTablePanel } from './ui/table';
import { mountTabs } from './ui/tabs';

const app = document.querySelector<HTMLElement>('#app');
const tablePanel = document.querySelector<HTMLElement>('#table-panel');
const tabs = document.querySelector<HTMLElement>('#tabs');
if (!app || !tablePanel || !tabs) throw new Error('app shell missing');

const store = new ProgressStore(window.localStorage);

function home(): void {
  renderHome(app!, store, { start, stats });
}

function stats(): void {
  renderStats(app!, store, home);
}

function start(drill: Drill<unknown>, cells: string[]): void {
  runSession(app!, drill, cells, store, { home, stats, again: () => start(drill, cells) });
}

home();
renderTablePanel(tablePanel, window.localStorage);
mountTabs(
  tabs,
  [
    { id: 'sentences', label: 'Sentences', el: app, usesGlobalKeys: true },
    { id: 'table', label: 'Table', el: tablePanel },
  ],
  window.localStorage,
);
