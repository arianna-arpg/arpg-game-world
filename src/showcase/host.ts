// ---------------------------------------------------------------------------
// THE SKILL-SHOWCASE HOST — the game's side of the live skill showcase. A
// surface asks for a showcase and nothing more; WHERE showcases appear is a
// surface's choice, never this module's:
//
//   declarative  any element wearing data-skill-showcase="<skill id>" (with
//                optional data-showcase-level / data-showcase-supports="id:lv,…")
//                becomes a showcase while it is on screen — skillShowcaseMarkup()
//                writes one for HTML-string surfaces (tooltips, cards);
//   imperative   mountSkillShowcase(host, spec) → a handle to update/dispose.
//
// The host does the rest: boots THE ENGINE (showcase.html in a hidden
// same-origin frame — its own realm, so the showcase can never reach the live
// world or the player's saves) lazily and once, plays the skill of the
// showcase most recently brought on screen after a short settle, copies each
// engine frame into that element's own canvas (cover-fit), softens the loop
// seams, and tears the engine down when nothing has needed it for a while.
// Contract: docs/engine/skill-showcases.md.
// ---------------------------------------------------------------------------

import { SHOWCASE_CFG } from '../data/skillShowcase';
import type { ShowcaseEngineApi } from './engine';
import type { ShowcaseSpec } from './stage';

export const SHOWCASE_ATTR = 'data-skill-showcase';
const LEVEL_ATTR = 'data-showcase-level';
const SUPPORTS_ATTR = 'data-showcase-supports';
const EMPTY_ATTR = 'data-showcase-empty';
/** Hover intent: a showcase plays only once it has stayed on screen this long
 *  (a cursor sweeping a grid of skills restages nothing). */
const SETTLE_MS = 140;

export interface SkillShowcaseHandle {
  readonly element: HTMLElement;
  update(spec: ShowcaseSpec): void;
  dispose(): void;
}

interface Mount {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  spec: ShowcaseSpec;
  key: string;
  visible: boolean;
  shownAt: number;
  io: IntersectionObserver;
  ro: ResizeObserver;
}

const mounts = new Map<HTMLElement, Mount>();
const specKey = (s: ShowcaseSpec): string =>
  `${s.skillId}|${s.level ?? ''}|${(s.supports ?? []).map(x => `${x.id}:${x.level ?? ''}`).join(',')}`;

// ---- the markup a string-built surface drops in ----------------------------

/** One showcase element for HTML-string surfaces. `width` (CSS px) suits a
 *  shrink-wrapped box such as the tooltip; omit it to fill the container. */
export function skillShowcaseMarkup(spec: ShowcaseSpec, opts: { width?: number; className?: string } = {}): string {
  if (!SHOWCASE_CFG.enabled) return '';
  const esc = (v: string): string => v.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const sup = (spec.supports ?? []).map(s => `${s.id}${s.level ? `:${s.level}` : ''}`).join(',');
  return `<div class="skill-showcase${opts.className ? ` ${esc(opts.className)}` : ''}" ${SHOWCASE_ATTR}="${esc(spec.skillId)}"`
    + (spec.level ? ` ${LEVEL_ATTR}="${spec.level}"` : '')
    + (sup ? ` ${SUPPORTS_ATTR}="${esc(sup)}"` : '')
    + (opts.width ? ` style="--skill-showcase-w:${Math.round(opts.width)}px"` : '')
    + '></div>';
}

function specOf(el: HTMLElement): ShowcaseSpec | null {
  const skillId = el.getAttribute(SHOWCASE_ATTR);
  if (!skillId) return null;
  const level = Number(el.getAttribute(LEVEL_ATTR)) || undefined;
  const supports = (el.getAttribute(SUPPORTS_ATTR) ?? '').split(',').filter(Boolean).map(t => {
    const [id, lv] = t.split(':');
    return { id, level: Number(lv) || undefined };
  });
  return { skillId, level, supports };
}

// ---- the engine: one hidden frame, booted on first need ---------------------

let frame: HTMLIFrameElement | null = null;
let engine: ShowcaseEngineApi | null = null;
let booting: Promise<ShowcaseEngineApi | null> | null = null;
let playing: string | null = null;
let idleTimer: number | null = null;

function bootEngine(): Promise<ShowcaseEngineApi | null> {
  if (booting) return booting;
  booting = new Promise((resolve) => {
    const f = document.createElement('iframe');
    f.src = new URL('showcase.html', document.baseURI).href;
    // (no title: the game's hint fabric turns titles into hover hints)
    f.dataset.skillShowcaseEngine = '1';
    f.tabIndex = -1;
    f.setAttribute('aria-hidden', 'true');
    // Laid out (the engine sizes its canvas to this window) but never seen
    // and never touched: frames are copied out, input never goes in.
    Object.assign(f.style, {
      position: 'fixed', left: '-20000px', top: '0', border: '0', visibility: 'hidden', pointerEvents: 'none',
      width: `${SHOWCASE_CFG.render.w}px`, height: `${SHOWCASE_CFG.render.h}px`,
    });
    const fail = (): void => { resolve(null); };
    f.addEventListener('load', () => {
      const api = f.contentWindow?.__hwShowcase;
      if (!api) { fail(); return; }
      api.ready.then(() => { engine = api; resolve(api); }, fail);
    }, { once: true });
    f.addEventListener('error', fail, { once: true });
    frame = f;
    document.body.appendChild(f);
  });
  return booting;
}

function disposeEngine(): void {
  engine?.stop();
  frame?.remove();
  frame = null; engine = null; booting = null; playing = null;
}

/** Boot the engine now (a surface about to show showcases may call this when
 *  it opens, so the first showcase needs no wait). */
export function prewarmSkillShowcases(): void {
  if (SHOWCASE_CFG.enabled) void bootEngine();
}

// ---- the driver: one loop while anything is on screen ----------------------

let raf = 0;
let last = 0;
let acc = 0;
/** Frames copied out since boot (QA reads it through skillShowcaseStats). */
let blits = 0;
let phase: { t: number; cycle: number } | null = null;

function activeMount(now: number): Mount | null {
  let best: Mount | null = null;
  for (const m of mounts.values()) {
    if (!m.visible || !m.host.isConnected || now - m.shownAt < SETTLE_MS) continue;
    if (!best || m.shownAt > best.shownAt) best = m;
  }
  return best;
}

function blit(m: Mount, alpha: number): void {
  const src = engine!.canvas, cw = m.canvas.width, ch = m.canvas.height;
  if (!cw || !ch || !src.width || !src.height) return;
  // cover-fit: fill the element, crop the engine frame's overflow evenly
  const k = Math.max(cw / src.width, ch / src.height);
  const sw = cw / k, sh = ch / k;
  m.ctx.globalAlpha = 1;
  m.ctx.fillStyle = '#000';
  m.ctx.fillRect(0, 0, cw, ch);
  m.ctx.globalAlpha = alpha;
  m.ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, cw, ch);
  m.ctx.globalAlpha = 1;
  blits++;
}

/** QA: what the host holds right now (the hidden harness reads this). */
export function skillShowcaseStats(): { mounts: number; visible: number; engine: boolean; playing: string | null; running: boolean; blits: number } {
  const all = [...mounts.values()];
  return {
    mounts: all.length, visible: all.filter(m => m.visible && m.host.isConnected).length,
    engine: !!engine, playing, running: raf !== 0, blits,
  };
}

function loop(now: number): void {
  raf = 0;
  const anyVisible = [...mounts.values()].some(m => m.visible && m.host.isConnected);
  if (!anyVisible) { scheduleIdle(); return; }
  cancelIdle();
  raf = requestAnimationFrame(loop);
  const dt = Math.min(100, last ? now - last : 0);
  last = now;
  const m = activeMount(now);
  if (!m) return;
  if (!engine) { void bootEngine(); return; }
  if (playing !== m.key) {
    const info = engine.play(m.spec);
    playing = m.key;
    acc = 0; phase = null;
    if (!info) { m.host.setAttribute(EMPTY_ATTR, engine.why ?? 'no showcase'); return; }
    m.host.removeAttribute(EMPTY_ATTR);
  }
  if (m.host.hasAttribute(EMPTY_ATTR)) return;
  const step = 1000 / SHOWCASE_CFG.fps;
  acc += dt;
  let steps = 0;
  while (acc >= step && steps < 2) {
    const info = engine.frame(step);
    acc -= step; steps++;
    if (!info) { m.host.setAttribute(EMPTY_ATTR, engine.why ?? 'stopped'); playing = null; return; }
    phase = info;
  }
  if (acc > step) acc = 0; // a long stall resumes in step, never in a burst
  if (!phase || !steps) return; // nothing new drawn: the element keeps its frame
  // the loop seam: a soft blink out at a cycle's end, in at the next start
  const { fade } = SHOWCASE_CFG;
  const alpha = Math.min(1, phase.t / fade.in, Math.max(0, (phase.cycle - phase.t) / fade.out));
  blit(m, Math.max(0, alpha));
}

function wake(): void {
  if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
}

function scheduleIdle(): void {
  if (idleTimer !== null || !frame) return;
  idleTimer = window.setTimeout(() => {
    idleTimer = null;
    if (![...mounts.values()].some(m => m.visible && m.host.isConnected)) disposeEngine();
  }, SHOWCASE_CFG.idleDisposeSec * 1000);
}

function cancelIdle(): void {
  if (idleTimer !== null) { window.clearTimeout(idleTimer); idleTimer = null; }
}

// ---- mounts ----------------------------------------------------------------

/** Turn an element into a live showcase of `spec` (the element's own CSS
 *  decides its size; the showcase fills it). */
export function mountSkillShowcase(host: HTMLElement, spec: ShowcaseSpec): SkillShowcaseHandle {
  const existing = mounts.get(host);
  if (existing) { handleOf(existing).update(spec); return handleOf(existing); }
  injectStyle();
  host.classList.add('skill-showcase');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  const m: Mount = {
    host, canvas, ctx, spec, key: specKey(spec), visible: false, shownAt: 0,
    io: new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      const vis = e.isIntersecting && e.intersectionRatio > 0;
      if (vis && !m.visible) m.shownAt = performance.now();
      m.visible = vis;
      if (vis) wake();
    }),
    ro: new ResizeObserver(() => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.min(SHOWCASE_CFG.render.w, Math.round(host.clientWidth * dpr));
      const h = Math.min(SHOWCASE_CFG.render.h, Math.round(host.clientHeight * dpr));
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; }
    }),
  };
  m.io.observe(host);
  m.ro.observe(host);
  mounts.set(host, m);
  return handleOf(m);
}

function handleOf(m: Mount): SkillShowcaseHandle {
  return {
    element: m.host,
    update(spec: ShowcaseSpec): void {
      const key = specKey(spec);
      if (key === m.key) return;
      m.spec = spec; m.key = key; m.shownAt = performance.now();
      m.host.removeAttribute(EMPTY_ATTR);
      wake();
    },
    dispose(): void {
      m.io.disconnect(); m.ro.disconnect();
      m.canvas.remove();
      mounts.delete(m.host);
      if (playing === m.key && ![...mounts.values()].some(x => x.key === m.key)) playing = null;
    },
  };
}

// ---- the declarative door --------------------------------------------------

let installed = false;

/** Watch `root` for data-skill-showcase elements: mount on arrival, follow
 *  attribute changes, dispose on removal. Call once at boot. */
export function installSkillShowcases(root: HTMLElement = document.body): void {
  if (installed || !SHOWCASE_CFG.enabled) return;
  installed = true;
  (window as unknown as { __skillShowcases?: object }).__skillShowcases = { stats: skillShowcaseStats, prewarm: prewarmSkillShowcases };
  const sel = `[${SHOWCASE_ATTR}]`;
  const adopt = (el: HTMLElement): void => {
    const spec = specOf(el);
    if (spec) mountSkillShowcase(el, spec);
  };
  root.querySelectorAll<HTMLElement>(sel).forEach(adopt);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes') {
        const el = r.target as HTMLElement;
        const m = mounts.get(el), spec = specOf(el);
        if (m && spec) handleOf(m).update(spec);
        else if (!m && spec) adopt(el);
        else if (m && !spec) handleOf(m).dispose();
        continue;
      }
      r.addedNodes.forEach(n => {
        if (!(n instanceof HTMLElement)) return;
        if (n.matches(sel)) adopt(n);
        n.querySelectorAll<HTMLElement>(sel).forEach(adopt);
      });
      r.removedNodes.forEach(n => {
        if (!(n instanceof HTMLElement)) return;
        const gone = n.matches(sel) ? [n] : [];
        n.querySelectorAll<HTMLElement>(sel).forEach(e => gone.push(e));
        for (const el of gone) if (!el.isConnected) { const m = mounts.get(el); if (m) handleOf(m).dispose(); }
      });
    }
  }).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: [SHOWCASE_ATTR, LEVEL_ATTR, SUPPORTS_ATTR] });
}

// ---- the one rule set every surface shares ---------------------------------

let styled = false;
function injectStyle(): void {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.dataset.owner = 'skill-showcase';
  s.textContent =
    '.skill-showcase{position:relative;display:block;width:var(--skill-showcase-w,100%);max-width:100%;aspect-ratio:16/9;'
    + 'overflow:hidden;border-radius:3px;background:#0b0e13;}'
    + '.skill-showcase>canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}'
    + `.skill-showcase[${EMPTY_ATTR}]{display:none;}`;
  document.head.appendChild(s);
}
