// ---------------------------------------------------------------------------
// THE PLATFORM FABRIC — where the game is running, as DATA the rest reads.
//
// One capability READ (PlatformCaps: touch, hover, a connected pad, the
// viewport, the pixel ratio, standalone/PWA, the desktop shell, safe-area
// insets) resolved through a PRESET REGISTRY (PLATFORM_PRESETS — rows with a
// predicate over the caps and a bundle of DEFAULTS: touch controls on or off,
// the compact layout, a UI-scale floor). The player's Settings.platform can
// pin a preset; 'auto' lets the first matching row win. Nothing downstream
// sniffs a user agent: main.ts asks for ONE PlatformView per change and
// stamps it (ui/compact.ts stampPlatform), the touch fabric asks whether it
// is wanted, the UI scale asks for its floor.
//
// THE LAWS:
//   · THE REGISTRY IS THE POLICY — a new device class (a TV, a car display)
//     is one row here, never a branch in a consumer.
//   · ORDER IS PRIORITY — rows are tested top-down; 'desktop' is the
//     catch-all and must stay last (registerPlatformPreset seats new rows
//     before it).
//   · THE READ IS LIVE — a resize, a rotation, a pad plugged in, a display
//     mode change re-resolves; consumers get a change only when the VIEW
//     changed (preset, compact verdict, touch verdict or floor), never every
//     resize tick.
//   · THE PLAYER WINS — every default is a default: Settings.touch.controls,
//     Settings.compactUi and Settings.platform each override their fold.
//   · HEADLESS-SAFE — readPlatformCaps() guards every DOM read, so a probe
//     folds fixture caps through the same resolver the browser runs.
// Every number here is unblessed (her standing word).
// ---------------------------------------------------------------------------

import { connectedPadIndices } from './gamepad';
import type { Settings } from '../meta/settings';

export interface SafeInsets { top: number; right: number; bottom: number; left: number }

export interface PlatformCaps {
  /** A touchscreen exists (touch events / maxTouchPoints). */
  touch: boolean;
  /** The primary pointer is coarse (a finger). */
  coarse: boolean;
  /** The primary pointer can HOVER (a mouse/trackpad): tooltips are a language. */
  hover: boolean;
  /** A gamepad is connected (the hardware census — fakes count in rigs). */
  pad: boolean;
  /** Viewport in CSS px. */
  width: number;
  height: number;
  dpr: number;
  /** Installed PWA / fullscreen display mode. */
  standalone: boolean;
  /** The Electron desktop shell (launcher/). */
  electron: boolean;
  /** A phone/tablet user agent (a hint only — never the verdict alone). */
  mobileUa: boolean;
  /** env(safe-area-inset-*) in CSS px (notches, home bars). */
  safe: SafeInsets;
}

export type PlatformPresetId = 'desktop' | 'handheld' | 'tablet' | 'phone';

export interface PlatformDefaults {
  /** THE TOUCH FABRIC stands (Settings.touch.controls 'auto'). */
  touchControls: boolean;
  /** THE COMPACT LAYOUT stamps regardless of width (Settings.compactUi 'auto'). */
  compact: boolean;
  /** Effective UI scale = max(Settings.uiScale, this) — a phone's legibility floor. */
  uiScaleFloor: number;
}

export interface PlatformPresetDef {
  id: PlatformPresetId | string;
  /** Options face. */
  name: string;
  blurb: string;
  when: (c: PlatformCaps) => boolean;
  defaults: PlatformDefaults;
}

export const PLATFORM_CFG = {
  /** Under this CSS width the compact layout stamps under 'auto' whatever
   *  the preset says (a small desktop window benefits too). */
  compactMaxWidthPx: 1000,
  /** A touch device whose SHORT side is under this is a phone. */
  phoneMaxShortSidePx: 600,
  /** Settings.platform's sentinel for "resolve it". */
  autoId: 'auto',
  /** Seconds between live re-reads while the watch runs (resize/rotation
   *  and pad events re-read at once; this catches env() insets settling). */
  pollSec: 2,
} as const;

const DESKTOP: PlatformPresetDef = {
  id: 'desktop',
  name: 'Desktop',
  blurb: 'A mouse or a pad on a monitor: no touch widgets, the full layout.',
  when: () => true,
  defaults: { touchControls: false, compact: false, uiScaleFloor: 1 },
};

/** THE REGISTRY — priority order; the desktop catch-all stays last. */
export const PLATFORM_PRESETS: PlatformPresetDef[] = [
  {
    id: 'handheld',
    name: 'Handheld',
    blurb: 'A pad AND a touchscreen (Steam Deck, an Android handheld): the pad plays, the glass answers a finger when it speaks.',
    when: c => c.pad && c.touch,
    defaults: { touchControls: true, compact: false, uiScaleFloor: 1 },
  },
  {
    id: 'phone',
    name: 'Phone',
    blurb: 'A small touchscreen with no hover: the touch widgets, the compact layout.',
    when: c => c.touch && !c.hover && Math.min(c.width, c.height) < PLATFORM_CFG.phoneMaxShortSidePx,
    defaults: { touchControls: true, compact: true, uiScaleFloor: 1 },
  },
  {
    id: 'tablet',
    name: 'Tablet',
    blurb: 'A large touchscreen with no hover: the touch widgets; compact only when the window is narrow.',
    when: c => c.touch && !c.hover,
    defaults: { touchControls: true, compact: false, uiScaleFloor: 1 },
  },
  DESKTOP,
];

/** Seat a new preset BEFORE the catch-all (or before a named row). */
export function registerPlatformPreset(def: PlatformPresetDef, before: string = DESKTOP.id): void {
  if (PLATFORM_PRESETS.some(p => p.id === def.id)) throw new Error(`platform preset '${def.id}' registered twice`);
  const i = PLATFORM_PRESETS.findIndex(p => p.id === before);
  if (i < 0) PLATFORM_PRESETS.push(def); else PLATFORM_PRESETS.splice(i, 0, def);
}

export function platformPresetOf(id: string | undefined): PlatformPresetDef | null {
  return PLATFORM_PRESETS.find(p => p.id === id) ?? null;
}

/** THE RESOLVER: a pinned preset wins; 'auto' (or an unknown pin — a renamed
 *  row in an old save) walks the registry top-down. */
export function resolvePlatform(caps: PlatformCaps, pin: string = PLATFORM_CFG.autoId): PlatformPresetDef {
  const pinned = pin === PLATFORM_CFG.autoId ? null : platformPresetOf(pin);
  if (pinned) return pinned;
  return PLATFORM_PRESETS.find(p => p.when(caps)) ?? DESKTOP;
}

/** What the rest of the game reads: the preset plus every fold the player
 *  may override. */
export interface PlatformView {
  preset: PlatformPresetDef;
  caps: PlatformCaps;
  touchControls: boolean;
  compact: boolean;
  uiScaleFloor: number;
}

/** THE FOLD — preset defaults under the player's three overrides. */
export function platformViewOf(caps: PlatformCaps, s: Pick<Settings, 'platform' | 'touch' | 'compactUi'>): PlatformView {
  const preset = resolvePlatform(caps, s.platform);
  const d = preset.defaults;
  const touchControls = s.touch.controls === 'on' ? true : s.touch.controls === 'off' ? false : d.touchControls;
  const compact = s.compactUi === 'on' ? true : s.compactUi === 'off' ? false
    : (d.compact || caps.width < PLATFORM_CFG.compactMaxWidthPx);
  return { preset, caps, touchControls, compact, uiScaleFloor: d.uiScaleFloor };
}

/** Two views agree on everything a consumer stamps. */
export function platformViewSame(a: PlatformView | null, b: PlatformView): boolean {
  return !!a && a.preset.id === b.preset.id && a.touchControls === b.touchControls
    && a.compact === b.compact && a.uiScaleFloor === b.uiScaleFloor
    && a.caps.safe.top === b.caps.safe.top && a.caps.safe.right === b.caps.safe.right
    && a.caps.safe.bottom === b.caps.safe.bottom && a.caps.safe.left === b.caps.safe.left;
}

// ---------------------------------------------------------------------------
// THE READ — DOM-guarded, so the resolver above stays headless.
// ---------------------------------------------------------------------------

const ZERO_SAFE: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** The fixture a headless caller starts from (a desktop with nothing). */
export function desktopCaps(over: Partial<PlatformCaps> = {}): PlatformCaps {
  return {
    touch: false, coarse: false, hover: true, pad: false,
    width: 1280, height: 720, dpr: 1,
    standalone: false, electron: false, mobileUa: false,
    safe: { ...ZERO_SAFE },
    ...over,
  };
}

let safeProbe: HTMLElement | null = null;

/** env(safe-area-inset-*) measured through a hidden probe element — the
 *  one way CSS environment values reach script. Zero where unsupported. */
function readSafeInsets(): SafeInsets {
  if (typeof document === 'undefined' || !document.body) return { ...ZERO_SAFE };
  if (!safeProbe || !safeProbe.isConnected) {
    safeProbe = document.createElement('div');
    safeProbe.setAttribute('aria-hidden', 'true');
    safeProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;'
      + 'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);';
    document.body.appendChild(safeProbe);
  }
  const cs = getComputedStyle(safeProbe);
  const px = (v: string): number => { const n = parseFloat(v); return Number.isFinite(n) ? Math.max(0, n) : 0; };
  return { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
}

const mq = (q: string): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia(q).matches : false;

/** The live capability read. Headless (no window) = the desktop fixture. */
export function readPlatformCaps(): PlatformCaps {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return desktopCaps();
  const ua = navigator.userAgent ?? '';
  const touchPoints = typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : 0;
  const touch = touchPoints > 0 || 'ontouchstart' in window;
  return {
    touch,
    coarse: mq('(pointer: coarse)'),
    hover: mq('(hover: hover)'),
    pad: connectedPadIndices().length > 0,
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
    standalone: mq('(display-mode: standalone)') || mq('(display-mode: fullscreen)')
      || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    electron: /Electron/i.test(ua),
    mobileUa: /Android|iPhone|iPad|iPod|Mobile/i.test(ua),
    safe: readSafeInsets(),
  };
}

/** THE WATCH: re-read on every seam that can change the caps and report
 *  the raw read; the caller folds it into a view and decides what changed. */
export class PlatformWatch {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lists: Array<() => void> = [];
  private last: PlatformCaps | null = null;

  constructor(private onRead: (caps: PlatformCaps) => void) {}

  caps(): PlatformCaps { return this.last ?? readPlatformCaps(); }

  /** Read now and report (the caller's fold decides whether it changed). */
  read(): PlatformCaps {
    const c = readPlatformCaps();
    this.last = c;
    this.onRead(c);
    return c;
  }

  start(): void {
    if (typeof window === 'undefined') return;
    const fire = (): void => { this.read(); };
    const on = (t: EventTarget | null, ev: string): void => {
      if (!t) return;
      t.addEventListener(ev, fire);
      this.lists.push(() => t.removeEventListener(ev, fire));
    };
    on(window, 'resize');
    on(window, 'orientationchange');
    on(window, 'gamepadconnected');
    on(window, 'gamepaddisconnected');
    on(window.visualViewport ?? null, 'resize');
    for (const q of ['(pointer: coarse)', '(hover: hover)', '(display-mode: standalone)', '(display-mode: fullscreen)']) {
      if (typeof window.matchMedia !== 'function') break;
      const m = window.matchMedia(q);
      if (typeof m.addEventListener === 'function') on(m, 'change');
    }
    this.timer = setInterval(fire, PLATFORM_CFG.pollSec * 1000);
    this.read();
  }

  stop(): void {
    for (const off of this.lists) off();
    this.lists = [];
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
  }
}
