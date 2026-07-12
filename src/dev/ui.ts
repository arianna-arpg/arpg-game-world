// ---------------------------------------------------------------------------
// DEV PANEL UI KIT — the shared look for every dev tab (dev/panel.ts). One
// palette + a handful of element builders so tabs never hand-roll styles; the
// whole surface is throwaway QA chrome, deliberately self-contained DOM that
// touches nothing in the game UI.
// ---------------------------------------------------------------------------

/** The dev panel's palette — every tab pulls from here, no inline hexes. */
export const DEV_UI = {
  bg: 'rgba(18,16,26,0.97)',
  bgRaised: '#241f33',
  bgInput: '#0e0c14',
  bgActive: '#3a3450',
  border: '#5a4a6a',
  borderDim: '#3a3450',
  divider: '#2a2438',
  text: '#d8d4e0',
  textDim: '#6a6478',
  accent: '#e8d44a',
  heading: '#9a86c0',
  good: '#7ec850',
  font: '12px Verdana',
  fontSmall: '11px Verdana',
} as const;

export const css = (el: HTMLElement, s: Partial<CSSStyleDeclaration>): void => {
  Object.assign(el.style, s);
};

/** The standard dev action button. */
export function btn(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  css(b, {
    background: DEV_UI.bgRaised, color: DEV_UI.accent, border: `1px solid ${DEV_UI.border}`,
    borderRadius: '4px', padding: '4px 7px', font: DEV_UI.fontSmall, cursor: 'pointer',
  });
  b.addEventListener('click', onClick);
  return b;
}

/** A section heading with divider. */
export function section(title: string): HTMLElement {
  const h = document.createElement('div');
  h.textContent = title;
  css(h, {
    color: DEV_UI.heading, fontWeight: 'bold', margin: '6px 0 2px',
    borderBottom: `1px solid ${DEV_UI.divider}`, paddingBottom: '2px',
  });
  return h;
}

/** A hover-highlight list row: name (colored) left, sub right. `search` feeds
 *  filter inputs via dataset. */
export function listRow(name: string, color: string, sub: string, onClick?: () => void): HTMLElement {
  const r = document.createElement('div');
  r.dataset.search = (name + ' ' + sub).toLowerCase();
  css(r, { display: 'flex', justifyContent: 'space-between', gap: '6px', padding: '3px 5px', cursor: onClick ? 'pointer' : 'default', borderRadius: '3px', alignItems: 'center' });
  r.innerHTML = `<span style="color:${color}">${name}</span><span style="color:${DEV_UI.textDim};font-size:10px">${sub}</span>`;
  r.addEventListener('mouseenter', () => css(r, { background: DEV_UI.bgRaised }));
  r.addEventListener('mouseleave', () => css(r, { background: 'transparent' }));
  if (onClick) r.addEventListener('click', onClick);
  return r;
}

/** Wire a filter input over a container of rows carrying dataset.search
 *  (rows without it — section headers — always show). */
export function wireFilter(filter: HTMLInputElement, list: HTMLElement, display = 'flex'): void {
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    for (const el of Array.from(list.children) as HTMLElement[]) {
      if (!el.dataset.search) continue;
      el.style.display = !q || el.dataset.search.includes(q) ? display : 'none';
    }
  });
}

export function textInput(placeholder: string): HTMLInputElement {
  const i = document.createElement('input');
  i.placeholder = placeholder;
  css(i, { flex: '1', background: DEV_UI.bgInput, color: DEV_UI.text, border: `1px solid ${DEV_UI.borderDim}`, borderRadius: '4px', padding: '4px 6px', font: DEV_UI.font, minWidth: '0' });
  return i;
}

export function numInput(value: number, min: number, max: number, width = '46px'): HTMLInputElement {
  const i = document.createElement('input');
  i.type = 'number'; i.value = String(value); i.min = String(min); i.max = String(max);
  css(i, { width, background: DEV_UI.bgInput, color: DEV_UI.text, border: `1px solid ${DEV_UI.borderDim}`, borderRadius: '4px', padding: '4px 6px', font: DEV_UI.font });
  return i;
}

export function selectEl(): HTMLSelectElement {
  const s = document.createElement('select');
  css(s, { background: DEV_UI.bgInput, color: DEV_UI.text, border: `1px solid ${DEV_UI.borderDim}`, borderRadius: '4px', padding: '4px', font: DEV_UI.fontSmall, minWidth: '0' });
  return s;
}

export function option(value: string, label: string): HTMLOptionElement {
  const o = document.createElement('option');
  o.value = value; o.textContent = label;
  return o;
}

/** A small colored square chip (biome/dimension identity). */
export function dot(color: string): HTMLElement {
  const d = document.createElement('span');
  css(d, { display: 'inline-block', width: '9px', height: '9px', borderRadius: '2px', background: color, border: '1px solid rgba(255,255,255,0.25)', flexShrink: '0' });
  return d;
}

/** A labelled checkbox; returns the wrapper and the box. */
export function check(label: string, initial: boolean): { el: HTMLElement; box: HTMLInputElement } {
  const wrap = document.createElement('label');
  css(wrap, { display: 'inline-flex', gap: '4px', alignItems: 'center', font: DEV_UI.fontSmall, color: DEV_UI.text, cursor: 'pointer' });
  const box = document.createElement('input');
  box.type = 'checkbox'; box.checked = initial;
  const span = document.createElement('span');
  span.textContent = label;
  wrap.append(box, span);
  return { el: wrap, box };
}

/** A horizontal control row. */
export function hrow(gap = '5px'): HTMLElement {
  const r = document.createElement('div');
  css(r, { display: 'flex', gap, alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' });
  return r;
}
