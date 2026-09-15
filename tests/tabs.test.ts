// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { KeyValueStorage } from '../src/progress/store';
import { onKeys, suspendKeys } from '../src/ui/dom';
import { TAB_KEY, mountTabs } from '../src/ui/tabs';

class MemoryStorage implements KeyValueStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

const el = (id: string) => document.getElementById(id)!;
const tick = () => new Promise((r) => setTimeout(r, 0));

function mount(storage: MemoryStorage): void {
  mountTabs(
    el('tabs'),
    [
      { id: 'sentences', label: 'Sentences', el: el('app'), usesGlobalKeys: true },
      { id: 'table', label: 'Table', el: el('table-panel') },
    ],
    storage,
  );
}

beforeEach(() => {
  document.body.innerHTML = '<nav id="tabs"></nav><main id="app"></main><section id="table-panel"></section>';
});
afterEach(() => suspendKeys(false));

describe('tabs', () => {
  it('shows the first panel by default and switches on click', () => {
    const storage = new MemoryStorage();
    mount(storage);
    expect(el('app').hidden).toBe(false);
    expect(el('table-panel').hidden).toBe(true);
    expect(el('tab-sentences').getAttribute('aria-selected')).toBe('true');

    el('tab-table').click();
    expect(el('app').hidden).toBe(true);
    expect(el('table-panel').hidden).toBe(false);
    expect(el('tab-table').getAttribute('aria-selected')).toBe('true');
    expect(storage.getItem(TAB_KEY)).toBe('table');
  });

  it('restores the remembered tab and ignores unknown ids', () => {
    const storage = new MemoryStorage();
    storage.setItem(TAB_KEY, 'table');
    mount(storage);
    expect(el('table-panel').hidden).toBe(false);

    document.body.innerHTML = '<nav id="tabs"></nav><main id="app"></main><section id="table-panel"></section>';
    storage.setItem(TAB_KEY, 'nope');
    mount(storage);
    expect(el('app').hidden).toBe(false);
  });

  it('suspends document shortcuts while a panel without global keys is showing', async () => {
    mount(new MemoryStorage());
    const controller = new AbortController();
    let presses = 0;
    onKeys(controller.signal, () => presses++);
    await tick();
    const press = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    press();
    expect(presses).toBe(1);
    el('tab-table').click();
    press();
    expect(presses).toBe(1);
    el('tab-sentences').click();
    press();
    expect(presses).toBe(2);
    controller.abort();
  });
});
