import type { KeyValueStorage } from '../progress/store';
import { h, suspendKeys } from './dom';

export const TAB_KEY = 'grammar-drills:tab';

export interface Panel {
  id: string;
  label: string;
  el: HTMLElement;
  /** The panel listens for shortcuts on document (via onKeys). */
  usesGlobalKeys?: boolean;
}

/** Top-level panel switch. Panels stay mounted; switching only toggles `hidden`. */
export function mountTabs(nav: HTMLElement, panels: readonly Panel[], storage: KeyValueStorage): void {
  const buttons = panels.map((p) =>
    h('button', { class: 'tab', type: 'button', role: 'tab', id: `tab-${p.id}`, onclick: () => show(p.id) }, p.label),
  );

  const show = (id: string) => {
    panels.forEach((p, i) => {
      const active = p.id === id;
      p.el.hidden = !active;
      p.el.setAttribute('role', 'tabpanel');
      p.el.setAttribute('aria-labelledby', `tab-${p.id}`);
      buttons[i]!.setAttribute('aria-selected', String(active));
      if (active) suspendKeys(!p.usesGlobalKeys);
    });
    try {
      storage.setItem(TAB_KEY, id);
    } catch {
      // ignore: the remembered tab is safe to lose
    }
  };

  nav.replaceChildren(h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Panels' }, ...buttons));

  let saved: string | null = null;
  try {
    saved = storage.getItem(TAB_KEY);
  } catch {
    // ignore
  }
  show(panels.find((p) => p.id === saved)?.id ?? panels[0]!.id);
}
