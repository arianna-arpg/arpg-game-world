import { DEFAULT_INTERFACE_STYLE, INTERFACE_STYLE_CATEGORIES, INTERFACE_STYLE_TOKENS,
  normalizeInterfaceStyle, type InterfaceStyle } from './interfaceStyleConfig';
import { installInterfaceSurfaceStyles } from './interfaceSurfaces';

const styleSignature = (style: InterfaceStyle): string =>
  INTERFACE_STYLE_CATEGORIES.map(c => `${c.key}:${style[c.key]}`).join('|');

let activeStyle: InterfaceStyle = { ...DEFAULT_INTERFACE_STYLE };
let activeStyleSig = styleSignature(activeStyle);
let activeTokens = INTERFACE_STYLE_TOKENS;
/** Canvas prompts use the same resolved colors as the live interface. */
export const currentInterfaceTokens = () => activeTokens;
/** A copied presentation snapshot, also safe to send to the isolated loading UI. */
export const currentInterfaceStyle = (): InterfaceStyle => ({ ...activeStyle });

const runeActivityListeners = new Set<(activity: number) => void>();
export function onRuneActivityChange(listener: (activity: number) => void): () => void {
  runeActivityListeners.add(listener);
  return () => runeActivityListeners.delete(listener);
}

const appliedSurfaceStyle = new WeakMap<HTMLElement, string>();

/** Apply colors and ornament grammar to a surface, including the Wardrobe's isolated sample. */
export function styleInventorySurface(root: HTMLElement, value: InterfaceStyle): void {
  const isActive = value === activeStyle;
  const style = isActive ? activeStyle : normalizeInterfaceStyle(value);
  const sig = isActive ? activeStyleSig : styleSignature(style);
  const isDocRoot = root === document.documentElement;
  if (appliedSurfaceStyle.get(root) === sig) return;
  appliedSurfaceStyle.set(root, sig);
  const tokens: Record<string, string> = { ...INTERFACE_STYLE_TOKENS };
  for (const category of INTERFACE_STYLE_CATEGORIES) {
    const choice = category.choices.find(c => c.id === style[category.key])!;
    if (!isDocRoot) root.setAttribute(`data-ui-${category.key}`, choice.motif);
    Object.assign(tokens, choice.tokens);
  }
  for (const [key, tokenValue] of Object.entries(tokens)) root.style.setProperty(key, tokenValue);
  if (!('--inv-ward-seal' in tokens)) root.style.removeProperty('--inv-ward-seal');
  if (isDocRoot) activeTokens = tokens;
}

export function applyInterfaceStyle(value: InterfaceStyle): void {
  const previousActivity = activeStyle.runeActivity;
  activeStyle = normalizeInterfaceStyle(value);
  activeStyleSig = styleSignature(activeStyle);
  installInterfaceSurfaceStyles();
  // Inheritance covers existing and future cards/tabs without a DOM observer.
  // Separate attribute names keep the Inventory sample's local motifs isolated.
  const root = document.documentElement;
  if (!root.hasAttribute('data-interface-theme')) root.setAttribute('data-interface-theme', 'true');
  styleInventorySurface(root, activeStyle);
  document.querySelectorAll<HTMLElement>('.inventory-surface:not([data-interface-preview])')
    .forEach(surface => styleInventorySurface(surface, activeStyle));
  if (activeStyle.runeActivity !== previousActivity) {
    for (const listener of runeActivityListeners) listener(activeStyle.runeActivity);
  }
}

let headingOrnamentTpl: HTMLTemplateElement | undefined;
let frameChromeTpl: HTMLTemplateElement | undefined;
let ribbonInsetTpl: HTMLTemplateElement | undefined;

function ensureTemplates(): void {
  if (headingOrnamentTpl) return;
  headingOrnamentTpl = document.createElement('template');
  headingOrnamentTpl.innerHTML = '<span class="inv-heading-ornament" aria-hidden="true"><span class="inv-heading-line main"></span><span class="inv-heading-line echo"></span><span class="inv-heading-gem one"></span><span class="inv-heading-gem two"></span><span class="inv-heading-gem three"></span><span class="inv-heading-inscription">ᛟ ᚨ ᛉ</span></span>';
  frameChromeTpl = document.createElement('template');
  frameChromeTpl.innerHTML = '<span class="inv-frame-chrome" aria-hidden="true"><span class="inv-frame-corner tl"></span><span class="inv-frame-corner tr"></span><span class="inv-frame-corner br"></span><span class="inv-frame-corner bl"></span><span class="inv-frame-crest"><span></span></span><span class="inv-frame-crest bottom"><span></span></span></span>';
  ribbonInsetTpl = document.createElement('template');
  ribbonInsetTpl.innerHTML = '<span class="inv-ribbon-inset" aria-hidden="true"></span>';
}

/** Called after an actual markup rebuild, never from the frame loop. Decorations
 * occupy no layout or hit area. The live panel's cache remains authoritative. */
export function decorateInventoryPanel(el: Element): void {
  if (!(el instanceof HTMLElement) || !el.matches('#inventory,.inventory-page,[data-interface-preview]')) return;
  el.classList.add('inventory-surface');
  if (!el.hasAttribute('data-interface-preview')) styleInventorySurface(el, activeStyle);
  const heading = el.querySelector('h2'); // Character keeps its heading inside its native sticky wrapper.
  if (!heading) return;
  ensureTemplates();
  const headingHost = heading.parentElement === el ? heading : heading.parentElement!;
  if (headingHost !== heading) headingHost.classList.add('inv-heading-band');
  if (!headingHost.querySelector('.inv-heading-ornament')) {
    headingHost.appendChild(headingOrnamentTpl!.content.firstElementChild!.cloneNode(true));
  }
  const frameHost = el.querySelector(':scope > [data-frame-content]') ?? el;
  if (!frameHost.querySelector(':scope > .inv-frame-chrome')) {
    frameHost.appendChild(frameChromeTpl!.content.firstElementChild!.cloneNode(true));
  }
  el.querySelectorAll('.build-ribbon').forEach(button => {
    if (!button.querySelector('.inv-ribbon-inset')) {
      button.prepend(ribbonInsetTpl!.content.firstElementChild!.cloneNode(true));
    }
  });
}
