import { DEFAULT_INTERFACE_STYLE, INTERFACE_STYLE_CATEGORIES, INTERFACE_STYLE_TOKENS,
  normalizeInterfaceStyle, type InterfaceStyle } from './interfaceStyleConfig';

let activeStyle: InterfaceStyle = { ...DEFAULT_INTERFACE_STYLE };

/** Apply colors and ornament grammar to a surface, including the Wardrobe's isolated sample. */
export function styleInventorySurface(root: HTMLElement, value: InterfaceStyle): void {
  const style = normalizeInterfaceStyle(value);
  const tokens = { ...INTERFACE_STYLE_TOKENS };
  for (const category of INTERFACE_STYLE_CATEGORIES) {
    const choice = category.choices.find(c => c.id === style[category.key])!;
    root.setAttribute(`data-ui-${category.key}`, choice.motif);
    Object.assign(tokens, choice.tokens);
  }
  for (const [key, value] of Object.entries(tokens)) root.style.setProperty(key, value);
}

export function applyInterfaceStyle(value: InterfaceStyle): void {
  activeStyle = normalizeInterfaceStyle(value);
  document.querySelectorAll<HTMLElement>('.inventory-surface:not([data-interface-preview])')
    .forEach(root => styleInventorySurface(root, activeStyle));
}

/** Called after an actual markup rebuild, never from the frame loop. Decorations
 * occupy no layout or hit area. The live panel's cache remains authoritative. */
export function decorateInventoryPanel(el: Element): void {
  if (!(el instanceof HTMLElement) || !el.matches('#inventory,.inventory-page,[data-interface-preview]')) return;
  el.classList.add('inventory-surface');
  if (!el.hasAttribute('data-interface-preview')) styleInventorySurface(el, activeStyle);
  const heading = el.querySelector('h2'); // Character keeps its heading inside its native sticky wrapper.
  if (!heading) return;
  const headingHost = heading.parentElement === el ? heading : heading.parentElement!;
  if (headingHost !== heading) headingHost.classList.add('inv-heading-band');
  if (!headingHost.querySelector('.inv-heading-ornament')) headingHost.insertAdjacentHTML('beforeend',
    '<span class="inv-heading-ornament" aria-hidden="true"><span class="inv-heading-line main"></span><span class="inv-heading-line echo"></span><span class="inv-heading-gem one"></span><span class="inv-heading-gem two"></span><span class="inv-heading-gem three"></span><span class="inv-heading-inscription">ᛟ ᚨ ᛉ</span></span>');
  if (!el.querySelector(':scope > .inv-frame-chrome')) el.insertAdjacentHTML('beforeend',
    '<span class="inv-frame-chrome" aria-hidden="true"><span class="inv-frame-corner tl"></span><span class="inv-frame-corner tr"></span><span class="inv-frame-corner br"></span><span class="inv-frame-corner bl"></span><span class="inv-frame-crest"><span></span></span><span class="inv-frame-crest bottom"><span></span></span></span>');
  el.querySelectorAll('.build-ribbon').forEach(button => {
    if (!button.querySelector('.inv-ribbon-inset')) button.insertAdjacentHTML('afterbegin', '<span class="inv-ribbon-inset" aria-hidden="true"></span>');
  });
}
