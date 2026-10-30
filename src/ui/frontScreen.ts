import { hollowWakeBrand } from './brand';
import { FRONT_ACTIONS, FRONT_SCREEN, type FrontScreenState } from './frontScreenConfig';
import { Z_LADDER } from './zorder';

const text = (s: string | number): string => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
let atmospherePaused = false;


function syncAtmosphere(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll<HTMLButtonElement>('[data-front-motion]').forEach(motion => {
    motion.textContent = reduced ? 'Reduced motion' : !FRONT_SCREEN.atmosphere.enabled ? 'Still atmosphere'
      : atmospherePaused ? 'Resume atmosphere' : 'Pause atmosphere';
    motion.disabled = reduced || !FRONT_SCREEN.atmosphere.enabled;
    motion.setAttribute('aria-pressed', String(atmospherePaused || reduced || !FRONT_SCREEN.atmosphere.enabled));
  });
  const backdrop = document.getElementById('front-backdrop');
  if (backdrop) backdrop.dataset.paused = String(atmospherePaused || !FRONT_SCREEN.atmosphere.enabled);
}

/** Fixed seeds keep the field stable across UI refreshes. Only CSS transforms
 * and opacity animate; these lights never consume the gameplay random stream. */
function aetherMotesHtml(): string {
  const unit = (seed: number, salt: number): number => {
    const n = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  return FRONT_SCREEN.atmosphere.strata.flatMap((layer, depth) =>
    Array.from({ length: layer.count }, (_, i) => {
      const seed = depth * 101 + i + 1;
      const sample = (range: readonly [number, number], salt: number): number =>
        range[0] + unit(seed, salt) * (range[1] - range[0]);
      const colors = FRONT_SCREEN.atmosphere.moteColors;
      const color = colors[Math.floor(unit(seed, 8) * colors.length)];
      const duration = sample(layer.seconds, 4);
      const sway = sample(layer.sway, 5) * (unit(seed, 9) < .5 ? -1 : 1);
      return `<i style="--x:${unit(seed, 1) * 100}%;--y:${12 + unit(seed, 2) * 93}%;
        --size:${sample(layer.size, 3)}px;--halo:${layer.halo}px;--tint:${color};--mote-alpha:${layer.alpha};
        --sway:${sway}px;--rise:${sample(layer.rise, 6)}px;
        --delay:${-unit(seed, 7) * duration}s;--duration:${duration}s"></i>`;
    }),
  ).join('');
}

/** A single passive backdrop survives menu refreshes; CSS owns visibility and
 * pauses it offscreen. No game loop, timers, save access or input listeners. */
export function ensureFrontAtmosphere(): void {
  if (document.getElementById('front-backdrop')) return;
  const el = document.createElement('div');
  el.id = 'front-backdrop';
  el.setAttribute('aria-hidden', 'true');
  el.style.zIndex = String(Z_LADDER.panel - 1);
  el.style.setProperty('--front-drift', `${FRONT_SCREEN.atmosphere.driftSeconds}s`);
  el.dataset.paused = String(atmospherePaused || !FRONT_SCREEN.atmosphere.enabled);
  // Lights sit above the darkening wash so their colors survive the vignette,
  // while the entire passive backdrop remains below text and controls.
  el.innerHTML = `<div class="front-haze"></div>
    <div class="front-vignette"></div><div class="front-motes">${aetherMotesHtml()}</div>`;
  // Keep the artwork in the browser's image pipeline: a CSS background can
  // compute to none even while its custom-property URL remains configured.
  const landscape = document.createElement('img');
  landscape.className = 'front-landscape';
  landscape.alt = '';
  landscape.draggable = false;
  landscape.src = FRONT_SCREEN.artwork;
  el.prepend(landscape);
  document.body.appendChild(el);
  // One document-lifetime preference listener, independent of view rebuilds.
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', syncAtmosphere);
}

export function frontScreenHtml(state: FrontScreenState): string {
  ensureFrontAtmosphere();
  const cfg = FRONT_SCREEN;
  const primary = state.resume ? 'continue' : 'start';
  const actions = FRONT_ACTIONS.filter(a => !a.visible || a.visible(state));
  // Primary first, while keeping the authored order of all remaining actions.
  actions.sort((a, b) => Number(b.id === primary) - Number(a.id === primary));
  const button = (a: typeof actions[number]): string => {
    const badge = a.badge?.(state);
    return `<button type="button" id="sm-${a.id}" class="front-action${a.id === primary ? ' front-primary' : ''}"
      ${a.enabled && !a.enabled(state) ? 'disabled' : ''} title="${text(a.detail(state))}">
      <span class="front-action-mark" aria-hidden="true">${a.id === primary ? '◇' : '·'}</span>
      <span class="front-action-copy"><span class="front-action-label">${text(a.label(state))}</span>${a.group === 'journey'
        ? `<span class="front-action-detail">${text(a.detail(state))}</span>` : ''}</span>
      ${badge ? `<span class="front-badge">${text(badge)}</span>` : ''}
      <span class="front-action-arrow" aria-hidden="true">›</span>
    </button>`;
  };
  return `<div class="front-screen" style="--front-ivory:${cfg.palette.ivory};--front-muted:${cfg.palette.muted};--front-gold:${cfg.palette.gold};--front-line:${cfg.palette.line}">
    <div class="front-shell">
      <header class="front-header">
        <span class="front-chapter"><span aria-hidden="true">◇</span> ${text(cfg.chapter)}</span>
        <span class="front-account">Account level <b>${state.accountLevel}</b></span>
      </header>
      <main class="front-main">
        <div class="front-left">
          <div class="front-brand">
            <h1 class="hw-brand-heading">${hollowWakeBrand('hero')}</h1>
            <p class="front-tagline">${text(cfg.tagline)}</p>
          </div>
          ${state.notice ? `<p class="front-notice" role="status">${text(state.notice)}</p>` : ''}
          <nav class="front-nav" aria-label="Main menu">
            <div class="front-journey">${actions.filter(a => a.group === 'journey').map(button).join('')}</div>
            <div class="front-legacy">${actions.filter(a => a.group === 'legacy').map(button).join('')}</div>
            <div class="front-utility">${actions.filter(a => a.group === 'utility').map(button).join('')}</div>
          </nav>
          <div class="esc-btns front-dev"></div>
        </div>
        <aside class="front-memory" aria-label="${state.resume ? 'Saved journey' : 'Your journey'}">
          <div class="front-memory-rule"><span aria-hidden="true">◇</span></div>
          <p class="front-eyebrow">${text(state.resume ? cfg.returnTitle : 'An unwritten chronicle')}</p>
          <h2>${text(state.resume?.name ?? cfg.freshTitle)}</h2>
          <p>${state.resume
            ? `Level ${state.resume.level} · ${text(state.resume.className)} · ${text(state.resume.mode)}`
            : text(cfg.freshBody)}</p>
          ${state.resume ? '<span class="front-saved"><i aria-hidden="true"></i>Ready to continue</span>' : ''}
        </aside>
      </main>
      <footer class="front-footer">
        <span class="front-world">${text(cfg.footer)} <span>· ${text(cfg.buildLabel)}</span></span>
        <div class="front-footer-controls">
          <span class="front-key-hints"><kbd>↑</kbd><kbd>↓</kbd> Navigate <kbd>Enter</kbd> Select</span>
          <button type="button" id="front-motion" data-front-motion aria-pressed="${atmospherePaused}" title="Pause ambient menu animation">Pause atmosphere</button>
        </div>
      </footer>
    </div>
  </div>`;
}

/** Local, disposable listeners: replacing the view cannot leak global handlers.
 * Preserve an existing focus target when asynchronous save hydration refreshes it. */
export function bindFrontScreen(root: HTMLElement, previousFocus?: string): void {
  const view = root.querySelector<HTMLElement>('.front-screen')!;
  bindFrontAtmosphere(view);
  view.addEventListener('keydown', e => {
    // The global gameplay Tab bind must not suppress native focus traversal.
    if (e.key === 'Tab') { e.stopPropagation(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const buttons = Array.from(view.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1
      : (current + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    e.preventDefault(); e.stopPropagation(); buttons[next]?.focus();
  });
  requestAnimationFrame(() => {
    if (!view.isConnected || root.classList.contains('hidden')) return;
    const previous = previousFocus ? view.querySelector<HTMLButtonElement>(`#${CSS.escape(previousFocus)}:not(:disabled)`) : null;
    if (previous) previous.focus({ preventScroll: true });
    else if (document.activeElement === document.body) view.querySelector<HTMLButtonElement>('.front-primary')?.focus({ preventScroll: true });
  });
}

/** Share one session motion preference across every entrance surface. */
export function bindFrontAtmosphere(root: HTMLElement): void {
  syncAtmosphere();
  root.querySelectorAll<HTMLButtonElement>('[data-front-motion]').forEach(motion => {
    motion.addEventListener('click', () => { atmospherePaused = !atmospherePaused; syncAtmosphere(); });
  });
}
