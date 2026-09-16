// ---------------------------------------------------------------------------
// THE TOUCH PAD — the DOM half of THE TOUCH FABRIC (core/touch.ts owns the
// laws; this module owns the browser).
//
// The canvas takes every TOUCH pointer (mouse pointers pass by untouched —
// the keyboard/mouse source keeps its byte-identical path) and hands it to
// THE ROUTER; the widgets the player sees — the floating stick, the 'stick'
// aim style's right stick, the verb tiles — are POINTER-TRANSPARENT DOM
// children of one root on the `touch` stack rung, positioned by the SAME
// functions the router hit-tests with (drawn == tested by construction).
// Verb tiles speak through the keyboard: a tile's press dispatches the
// player's own bind for that action as a synthetic keystroke (the
// synthEscape idiom), so panel toggles, pickup, the meta modifier and the
// Escape cascade stay single-sourced in main.ts. Pauses/panels then arrive
// through the very same handler a key would reach.
//
// THE LAWS:
//   · THE SOLO INVARIANT — while the platform view says no touch controls
//     (a desktop), every listener early-returns before preventDefault, the
//     root stays hidden and the compat mouse events flow as they always did:
//     a touchscreen laptop with a mouse plays exactly as before.
//   · COMPAT MOUSE SUPPRESSED — a routed touch cancels its pointerdown, so
//     the browser mints no mousedown/mouseup twins: a finger on the aim
//     field can never ALSO swing the primary through the mouse lane.
//   · THE HAND THAT SPEAKS — widgets show while touch spoke at least as
//     recently as the pad (a handheld's pad hides them; a finger recalls
//     them); the menu pointer and the bar's labels read the same clock
//     through ownsHand().
//   · A KEY THAT GOES DOWN COMES UP — every synthetic key is tracked and
//     released on blur, on a disabled fabric and on a layout refresh; a
//     latch never strands the meta layer.
//   · THE FIRST TOUCH ASKS ONCE — fullscreen (+ landscape) is requested on
//     the first touch's RELEASE (the activation gesture) and never again this
//     page, only where a browser is the host (a standalone PWA and the
//     desktop shell already stand full).
// ---------------------------------------------------------------------------

import {
  TOUCH_CFG, TouchRouter, buttonRect, resolveTouchWidgets, touchLayoutOf, zoneRect,
  type SlotRect, type TouchFrame, type TouchWidgetDef,
} from '../core/touch';
import { synthEscape } from '../core/gamepad';
import { iconSvg } from './icons';
import { Z_LADDER } from './zorder';
import type { Settings } from '../meta/settings';

/** Everything the pad reads from the machine — thunks, so live Settings
 *  edits and a re-resolved platform land at once. */
export interface TouchPadDeps {
  settings: () => Settings;
  /** The platform view's verdict: the fabric stands. */
  wanted: () => boolean;
  /** The pad's own last-activity clock (seconds) — THE HAND THAT SPEAKS. */
  padLastActive: () => number;
  /** The LOCAL hero's bar slots in CSS px (renderer.hudSlotRects, filtered). */
  slotRects: () => ReadonlyArray<SlotRect>;
  /** Deliver a synthetic keystroke of a bind to the one Input source. */
  synthKey: (key: string, down: boolean) => void;
  /** A browser hosts us (not a standalone PWA, not the desktop shell). */
  webFullscreenAllowed: () => boolean;
  /** The frame clock (seconds) pointer events stamp with. */
  nowSec: () => number;
}

const STYLE_ID = 'touch-pad-fabric';
export const TOUCH_PAD_ID = 'touch-pad';

/** The pad's stylesheet — injected once (HMR-safe). Colors ride her palette:
 *  ether rings, gold knobs and lit tiles, the panel's void for faces. */
export function installTouchStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    #${TOUCH_PAD_ID} { position: fixed; inset: 0; pointer-events: none; z-index: ${Z_LADDER.touch};
      opacity: var(--touch-opacity, ${TOUCH_CFG.widget.opacity}); user-select: none; -webkit-user-select: none; }
    #${TOUCH_PAD_ID}.hidden { display: none; }
    #${TOUCH_PAD_ID} .tp-stick { position: absolute; left: 0; top: 0; border-radius: 50%; box-sizing: border-box;
      border: 2px solid #8fa8d8; background: rgba(143,168,216,0.10); box-shadow: inset 0 0 14px rgba(143,168,216,0.35); }
    #${TOUCH_PAD_ID} .tp-knob { position: absolute; left: 0; top: 0; border-radius: 50%; box-sizing: border-box;
      background: rgba(200,168,75,0.85); box-shadow: 0 0 10px rgba(200,168,75,0.55); }
    #${TOUCH_PAD_ID} .tp-aim .tp-stick { border-color: var(--gold, #c8a84b); background: rgba(200,168,75,0.08); box-shadow: inset 0 0 14px rgba(200,168,75,0.3); }
    #${TOUCH_PAD_ID} .tp-aim .tp-knob { background: rgba(143,168,216,0.9); box-shadow: 0 0 10px rgba(143,168,216,0.6); }
    #${TOUCH_PAD_ID} .tp-btn { position: absolute; left: 0; top: 0; display: flex; align-items: center; justify-content: center;
      box-sizing: border-box; border-radius: 50%; border: 1px solid #3a3a52; background: rgba(12,12,18,0.88);
      color: var(--gold, #c8a84b); font: bold 11px/1 'Segoe UI', Verdana, sans-serif; letter-spacing: 1px; }
    #${TOUCH_PAD_ID} .tp-btn svg { width: 55%; height: 55%; }
    #${TOUCH_PAD_ID} .tp-btn.down, #${TOUCH_PAD_ID} .tp-btn.latched { border-color: var(--gold, #c8a84b); background: #2a2a3e;
      box-shadow: 0 0 10px rgba(200,168,75,0.5); }
    #${TOUCH_PAD_ID} .tp-btn.latched { color: #fff; }
  `;
  document.head.appendChild(el);
}

const vibrate = (ms: number): void => {
  if (ms <= 0 || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try { navigator.vibrate(ms); } catch { /* a platform that refuses is fine */ }
};

export class TouchPad {
  readonly router: TouchRouter;
  private root: HTMLDivElement;
  private stickWrap: HTMLDivElement;
  private stickBase: HTMLDivElement;
  private stickKnob: HTMLDivElement;
  private aimWrap: HTMLDivElement;
  private aimBase: HTMLDivElement;
  private aimKnob: HTMLDivElement;
  private tiles = new Map<string, HTMLDivElement>();
  private widgets: TouchWidgetDef[] = [];
  private last: TouchFrame | null = null;
  private wasWanted = false;
  private shown = false;
  private fullscreenAsked = false;
  /** Synthetic keys currently DOWN (per widget id) — released on every seam. */
  private heldKeys = new Map<string, string>();
  private layoutSig = '';

  constructor(canvas: HTMLCanvasElement, private deps: TouchPadDeps) {
    installTouchStyles();
    this.router = new TouchRouter({
      widgets: () => this.widgets,
      viewport: () => ({ w: window.innerWidth, h: window.innerHeight }),
      slotRects: () => this.deps.slotRects(),
      stick: () => {
        const s = this.deps.settings().touch, c = TOUCH_CFG.stick;
        return { radiusPx: c.radiusPx, deadzone: c.deadzone, curve: c.curve, follow: c.follow, followSlackPx: c.followSlackPx, fixed: s.stick === 'fixed' };
      },
      aim: () => {
        const s = this.deps.settings().touch, a = TOUCH_CFG.aim;
        return { style: s.aimStyle, stickRadiusPx: a.stickRadiusPx, holdFires: a.holdFires, fireMag: a.fireMag };
      },
      scale: () => this.deps.settings().touch.scale,
    });

    this.root = document.createElement('div');
    this.root.id = TOUCH_PAD_ID;
    this.root.className = 'hidden';
    const stickPair = (cls: string): [HTMLDivElement, HTMLDivElement, HTMLDivElement] => {
      const wrap = document.createElement('div');
      wrap.className = cls;
      wrap.style.display = 'none';
      const base = document.createElement('div'); base.className = 'tp-stick';
      const knob = document.createElement('div'); knob.className = 'tp-knob';
      wrap.appendChild(base); wrap.appendChild(knob);
      this.root.appendChild(wrap);
      return [wrap, base, knob];
    };
    [this.stickWrap, this.stickBase, this.stickKnob] = stickPair('tp-move');
    [this.aimWrap, this.aimBase, this.aimKnob] = stickPair('tp-aim');
    document.body.appendChild(this.root);

    // --- the canvas takes every touch pointer; mice pass by ---
    const opts: AddEventListenerOptions = { passive: false };
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || !this.deps.wanted()) return;
      e.preventDefault(); // no compat mouse twin for this finger
      this.router.down(e.pointerId, e.clientX, e.clientY, this.deps.nowSec());
    }, opts);
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch' || !this.router.knows(e.pointerId)) return;
      e.preventDefault();
      this.router.move(e.pointerId, e.clientX, e.clientY, this.deps.nowSec());
    }, opts);
    const lift = (e: PointerEvent, cancel: boolean): void => {
      if (e.pointerType !== 'touch') return;
      const known = this.router.knows(e.pointerId);
      if (known) {
        e.preventDefault();
        if (cancel) this.router.cancel(e.pointerId, this.deps.nowSec());
        else this.router.up(e.pointerId, this.deps.nowSec());
      }
      if (!cancel && this.deps.wanted()) this.askFullscreenOnce();
    };
    canvas.addEventListener('pointerup', (e) => lift(e, false), opts);
    canvas.addEventListener('pointercancel', (e) => lift(e, true), opts);
    // Belt and suspenders under touch-action: none — an engine that still
    // tries to scroll/zoom on a routed finger is told no here too.
    canvas.addEventListener('touchmove', (e) => { if (this.deps.wanted()) e.preventDefault(); }, opts);
    window.addEventListener('blur', () => this.dropAll());
    window.addEventListener('resize', () => this.layoutTiles());
    this.refresh();
  }

  /** Re-resolve the layout (a settings edit, a hand swap): rebuild the
   *  tiles, release every latch and held key, re-seat the fixed stick. */
  refresh(): void {
    const s = this.deps.settings();
    const def = touchLayoutOf(s.touch.layout);
    this.widgets = def ? resolveTouchWidgets(def, s.touch.hand, s) : [];
    this.dropAll();
    for (const t of this.tiles.values()) t.remove();
    this.tiles.clear();
    for (const w of this.widgets) {
      if (w.kind !== 'button') continue;
      const el = document.createElement('div');
      el.className = 'tp-btn';
      el.dataset.touchBtn = w.id;
      el.innerHTML = (w.icon ? iconSvg(w.icon) : '') + (w.label ? `<span>${w.label}</span>` : '');
      this.root.appendChild(el);
      this.tiles.set(w.id, el);
    }
    this.root.style.setProperty('--touch-opacity', String(s.touch.opacity));
    this.layoutSig = ''; // fresh tiles: the seat cache must not skip them
    this.layoutTiles();
  }

  /** Seat every tile at the SAME rect the router hit-tests (drawn == tested). */
  private layoutTiles(): void {
    const vw = window.innerWidth, vh = window.innerHeight;
    const scale = this.deps.settings().touch.scale;
    const sig = `${vw}x${vh}@${scale}`;
    if (sig === this.layoutSig && this.tiles.size > 0) return;
    this.layoutSig = sig;
    for (const w of this.widgets) {
      if (w.kind !== 'button') continue;
      const el = this.tiles.get(w.id);
      if (!el) continue;
      const r = buttonRect(w, vw, vh, scale);
      el.style.transform = `translate(${r.x}px, ${r.y}px)`;
      el.style.width = `${r.w}px`;
      el.style.height = `${r.h}px`;
    }
  }

  /** Once per frame from the main loop. Null while the fabric is not
   *  wanted (the caller then folds nothing — the solo invariant). */
  update(nowSec: number): TouchFrame | null {
    const wanted = this.deps.wanted();
    if (!wanted) {
      if (this.wasWanted) { this.dropAll(); this.setShown(false); this.wasWanted = false; }
      this.last = null;
      return null;
    }
    this.wasWanted = true;
    const f = this.router.frame();
    for (const id of f.buttonEdges) this.pressTile(id, true);
    for (const id of f.buttonReleases) this.pressTile(id, false);
    const s = this.deps.settings();
    if (s.touch.haptics) {
      if (f.slotsEdge.some(Boolean)) vibrate(TOUCH_CFG.haptics.slotMs);
      else if (f.buttonEdges.length > 0) vibrate(TOUCH_CFG.haptics.buttonMs);
    }
    this.syncDom(f);
    this.setShown(this.router.lastActive >= this.deps.padLastActive());
    this.last = f;
    return f;
  }

  /** The last fold (null while the fabric is not wanted). */
  frameNow(): TouchFrame | null { return this.last; }

  /** Seconds of the last touch event (-Infinity = never). */
  lastActiveSec(): number { return this.router.lastActive; }

  /** Touch is the hand of the moment: the fabric stands, no pad spoke since
   *  the last finger, and either a finger spoke inside the active window or
   *  no pad has EVER spoken (a phone with no pad reads touch from its first
   *  frame — the bar prints no key names before the first tap). */
  ownsHand(nowSec: number): boolean {
    if (!this.deps.wanted()) return false;
    const padLast = this.deps.padLastActive();
    return this.router.lastActive >= padLast
      && (this.router.activeRecently(nowSec) || !Number.isFinite(padLast));
  }

  /** Every finger lifts, every latch opens, every synthetic key comes up. */
  dropAll(): void {
    this.router.clear(this.deps.nowSec());
    this.router.unlatchAll();
    for (const [id, key] of this.heldKeys) { this.deps.synthKey(key, false); this.tiles.get(id)?.classList.remove('down', 'latched'); }
    this.heldKeys.clear();
    // Drain the releases the unlatch banked so the next fold starts clean.
    this.router.frame();
  }

  private widgetOf(id: string): TouchWidgetDef | undefined {
    return this.widgets.find(w => w.id === id);
  }

  /** A tile's press/release → the action's own bind as a keystroke (or the
   *  hardwired Escape on its press). */
  private pressTile(id: string, down: boolean): void {
    const w = this.widgetOf(id);
    if (!w || !w.action) return;
    if (w.action === 'escape') { if (down) synthEscape(); return; }
    const key = this.deps.settings().keybinds[w.action];
    if (!key) return;
    if (down) {
      if (this.heldKeys.has(id)) return;
      this.heldKeys.set(id, key);
      this.deps.synthKey(key, true);
    } else {
      const held = this.heldKeys.get(id);
      if (held === undefined) return;
      this.heldKeys.delete(id);
      this.deps.synthKey(held, false);
    }
  }

  private setShown(on: boolean): void {
    if (on === this.shown) return;
    this.shown = on;
    this.root.classList.toggle('hidden', !on);
  }

  private seatPair(wrap: HTMLDivElement, base: HTMLDivElement, knob: HTMLDivElement,
    ox: number, oy: number, kx: number, ky: number, radiusPx: number, knobPx: number): void {
    wrap.style.display = 'block';
    base.style.width = base.style.height = `${radiusPx * 2}px`;
    base.style.transform = `translate(${ox - radiusPx}px, ${oy - radiusPx}px)`;
    knob.style.width = knob.style.height = `${knobPx}px`;
    knob.style.transform = `translate(${kx - knobPx / 2}px, ${ky - knobPx / 2}px)`;
  }

  private syncDom(f: TouchFrame): void {
    const s = this.deps.settings().touch;
    const scale = s.scale;
    const r = TOUCH_CFG.stick.radiusPx * scale, k = TOUCH_CFG.stick.knobPx * scale;
    if (f.stick) {
      this.seatPair(this.stickWrap, this.stickBase, this.stickKnob, f.stick.ox, f.stick.oy, f.stick.kx, f.stick.ky, r, k);
    } else if (s.stick === 'fixed') {
      const w = this.widgets.find(x => x.kind === 'stick');
      if (w) {
        const z = zoneRect(w.zone, window.innerWidth, window.innerHeight);
        const cx = z.x + z.w / 2, cy = z.y + z.h / 2;
        this.seatPair(this.stickWrap, this.stickBase, this.stickKnob, cx, cy, cx, cy, r, k);
      } else this.stickWrap.style.display = 'none';
    } else this.stickWrap.style.display = 'none';
    if (f.aim && s.aimStyle === 'stick') {
      const ar = TOUCH_CFG.aim.stickRadiusPx * scale;
      this.seatPair(this.aimWrap, this.aimBase, this.aimKnob, f.aim.ox, f.aim.oy, f.aim.kx, f.aim.ky, ar, k);
    } else this.aimWrap.style.display = 'none';
    const down = new Set(f.buttonsDown), latched = new Set(f.latched);
    for (const [id, el] of this.tiles) {
      el.classList.toggle('down', down.has(id));
      el.classList.toggle('latched', latched.has(id));
    }
  }

  /** THE FIRST TOUCH ASKS ONCE: fullscreen (+ landscape) from a real
   *  activation, web builds only; refusals are silent. */
  private askFullscreenOnce(): void {
    if (this.fullscreenAsked) return;
    this.fullscreenAsked = true;
    const s = this.deps.settings().touch;
    if (!s.fullscreen || !TOUCH_CFG.fullscreen.onFirstTouch || !this.deps.webFullscreenAllowed()) return;
    if (typeof document === 'undefined' || !document.fullscreenEnabled || document.fullscreenElement) return;
    const el = document.documentElement;
    const p = el.requestFullscreen?.({ navigationUI: 'hide' });
    if (!p || typeof p.then !== 'function') return;
    p.then(() => {
      if (!TOUCH_CFG.fullscreen.lockLandscape) return;
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      o?.lock?.('landscape').catch(() => { /* the platform said no */ });
    }).catch(() => { /* refused without a gesture, or unsupported */ });
  }
}
