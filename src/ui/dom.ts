type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined>;

/** Tiny element builder: h('button', { class: 'x', onclick: fn }, 'Label'). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2), value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  append(el, ...children);
  return el;
}

export function append(el: Element, ...children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** German text, rendered in the course blue. */
export function de(...children: Child[]): HTMLElement {
  return h('span', { class: 'de', lang: 'de' }, ...children);
}

export function clear(el: Element): void {
  el.replaceChildren();
}

let keysSuspended = false;

/** While another panel is showing, the sentence drill's document-level shortcuts stay quiet. */
export function suspendKeys(suspended: boolean): void {
  keysSuspended = suspended;
}

/**
 * Keyboard handler bound to the current item. Registered on the next tick so the key press
 * that submitted an answer does not also trigger the "next" shortcut.
 */
export function onKeys(signal: AbortSignal, handler: (e: KeyboardEvent) => void): void {
  setTimeout(() => {
    if (signal.aborted) return;
    document.addEventListener(
      'keydown',
      (e) => {
        if (keysSuspended || e.ctrlKey || e.metaKey || e.altKey) return;
        handler(e);
      },
      { signal },
    );
  }, 0);
}

export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
}

export function percent(x: number): string {
  return `${Math.round(x * 100)}%`;
}
