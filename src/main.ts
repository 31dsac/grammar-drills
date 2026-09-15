import './styles.css';
import type { Drill } from './drills/drill';
import { ProgressStore } from './progress/store';
import { renderHome } from './ui/home';
import { runSession } from './ui/session';
import { renderStats } from './ui/stats';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('#app missing');

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
