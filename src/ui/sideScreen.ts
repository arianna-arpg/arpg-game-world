import { GAME_TITLE } from '../config';
import { bindFrontAtmosphere, ensureFrontAtmosphere } from './frontScreen';
import { SIDE_SCREEN, type SideScreenProfile } from './sideScreenConfig';
import './sideScreen.css';

export type SideScreenContext = 'entrance' | 'world';
const esc = (value: string): string => value.replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Capture BEFORE hideAll. Hidden menu markup cannot turn an in-world visit
 * into a trip to the entrance. Nested readers may pass this context onward. */
export function sideScreenContext(): SideScreenContext {
  return document.querySelector('#start-menu:not(.hidden), .panel:not(.hidden) > .side-screen[data-context="entrance"]')
    ? 'entrance' : 'world';
}

/** A stable control address survives a view refresh, without retaining DOM. */
export function captureSideScreenFocus(root: HTMLElement): string | undefined {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !root.contains(active)) return;
  if (active.id) return '#' + CSS.escape(active.id);
  const key = Array.from(active.attributes).find(a => a.name.startsWith('data-'));
  return key ? '[' + key.name + '="' + CSS.escape(key.value) + '"]' : undefined;
}

/** Decorate freshly rendered content without replacing its elements or handlers.
 * Call after each view render. No navigation, account mutations or global input
 * listeners: closing/sealing, nested readers and their cleanup stay with UI. */
export function mountSideScreen(root: HTMLElement, profile: SideScreenProfile,
  context: SideScreenContext, previousFocus?: string): void {
  if (root.querySelector(':scope > .side-screen')) return;
  if (context === 'entrance') ensureFrontAtmosphere();
  const shell = document.createElement('section');
  shell.className = 'side-screen';
  shell.dataset.context = context;
  shell.dataset.screen = profile.id;
  const css = {
    '--side-accent': profile.accent, '--side-share': profile.width.share + '%',
    '--side-min': profile.width.min + 'px', '--side-max': profile.width.max + 'px',
    '--side-surface': SIDE_SCREEN.palette.surface, '--side-text': SIDE_SCREEN.palette.text,
    '--side-muted': SIDE_SCREEN.palette.muted, '--side-line': SIDE_SCREEN.palette.line,
    '--side-enter-ms': SIDE_SCREEN.transitionMs + 'ms',
  };
  for (const [key, value] of Object.entries(css)) shell.style.setProperty(key, value);
  shell.innerHTML = `<div class="side-pane">
    <div class="side-masthead"><span>${esc(GAME_TITLE)} <i aria-hidden="true">/</i> ${esc(profile.chapter)}</span>
      ${context === 'entrance' ? '<button type="button" data-front-motion aria-pressed="false">Pause atmosphere</button>' : ''}</div>
    <div class="side-content"></div>
  </div>
  ${context === 'entrance' ? `<aside class="side-echo" aria-label="${esc(profile.chapter)}">
    <span aria-hidden="true">◇</span><p>${esc(SIDE_SCREEN.entranceLabel)}</p><blockquote>${esc(profile.caption)}</blockquote>
  </aside>` : ''}`;
  const content = shell.querySelector<HTMLElement>('.side-content')!;
  content.append(...Array.from(root.childNodes));
  for (const [region, selector] of Object.entries(profile.regions)) {
    content.querySelectorAll(selector).forEach(el => el.classList.add('side-' + region));
  }
  root.appendChild(shell);
  bindFrontAtmosphere(shell);
  shell.addEventListener('keydown', e => {
    // Native Tab must reach fields instead of the gameplay inventory binding.
    // Rebind capture runs at window capture phase and remains authoritative.
    if (e.key === 'Tab') e.stopPropagation();
  });
  const heading = content.querySelector<HTMLElement>('h1');
  if (heading) heading.tabIndex = -1;
  requestAnimationFrame(() => {
    if (!shell.isConnected || root.classList.contains('hidden')) return;
    const target = previousFocus ? shell.querySelector<HTMLElement>(previousFocus) : null;
    if (target && !target.matches(':disabled')) target.focus({ preventScroll: true });
    else if (document.activeElement === document.body) heading?.focus({ preventScroll: true });
  });
}
