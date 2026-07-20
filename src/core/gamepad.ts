// ---------------------------------------------------------------------------
// GAMEPAD — controller input as data, riding the exact same seams as the
// keyboard. Nothing downstream knows a pad exists:
//
//   • Buttons are BINDING CODES ('pad:a', 'pad:rt', …) living in a second
//     settings map (padBinds) parallel to keybinds — same actions, same
//     swap-on-conflict rebinding, keyboard and pad coexist.
//   • Sticks are AXES, not binds: the move stick feeds the PlayerInput dx/dy
//     accumulator (analog magnitude preserved), the aim stick synthesizes a
//     WORLD-space aim point (deflection = reach), so cursor-space combat —
//     castAtCursor, GUIDE trajectories, meta targeting — works unchanged.
//   • Menus get a stick-driven virtual pointer (ui/padpointer.ts) that
//     dispatches real mouse events, so every DOM panel works without a
//     controller rewrite.
//
// All feel numbers live in PAD_CFG (engine defaults) or Settings.pad
// (player-tunable overrides, persisted). The device layer reads
// navigator.getGamepads() — or window.__fakePad when a test injects one, so
// live tests and headless smokes can drive the pad without hardware.
// ---------------------------------------------------------------------------

/** Engine-side pad tunables. The player-facing subset (deadzone, aim reach,
 *  pointer speed, stick swap) lives in Settings.pad and OVERRIDES these; what
 *  remains here is feel plumbing a player rarely wants to touch — but a mod
 *  or a test freely can. */
export const PAD_CFG = {
  /** Radial stick deadzone (fraction of full deflection). */
  deadzone: 0.18,
  /** Response exponent past the deadzone: 1 = linear, higher = finer control
   *  near center without giving up full-tilt speed. */
  stickCurve: 1.5,
  /** AIM-STICK SENSITIVITY SPAN: Settings.pad.aimSensitivity (0..1) maps
   *  linearly across these exponent ends for the AIM stick only — relaxed
   *  (high exponent = soft, fine control near center) through twitchy
   *  (sub-linear = reach leaps out on a small tilt). The midpoint lands
   *  exactly on stickCurve, so the default dial position IS the classic feel.
   *  The move stick and menu pointer stay on stickCurve — walking precision
   *  is not an aim preference. */
  aimCurve: { relaxed: 2.5, twitchy: 0.5 },
  /** Analog triggers (LT/RT) count as "pressed" past this pull fraction. */
  triggerThreshold: 0.35,
  /** Aim-stick reach: deflection maps min→max world units from the hero.
   *  maxRadius is the PAD_CFG default; Settings.pad.aimRadius overrides. */
  aim: { minRadius: 70, maxRadius: 460 },
  /** SNAPBACK FILTER — a released aim stick springs home through arbitrary
   *  angles (often overshooting past center) before it settles, and every
   *  one of those transient samples used to steer the reticle: releasing
   *  the stick "bounced" your facing. The filter freezes aim the moment
   *  deflection COLLAPSES faster than a hand plausibly steers, and keeps it
   *  frozen until the spring settles or the player visibly re-commits. */
  aimFilter: {
    /** Deflection collapse rate (full deflections/sec) that reads as a
     *  release, not steering. Deliberate reach pull-ins measure ≈1–3;
     *  a sprung release measures ≈10–30. */
    fallVeto: 4,
    /** Seconds aim stays frozen after a veto — long enough for the spring
     *  oscillation (~100–150ms on real sticks) to die out. */
    holdoffSec: 0.25,
    /** Raw deflection that re-engages aim INSTANTLY, holdoff or not — a
     *  real flick must never wait on the filter. */
    resumeMag: 0.55,
  },
  /** The menu pointer (virtual mouse). speed = px/sec at full deflection
   *  (Settings.pad.pointerSpeed overrides); confirm/cancel are HARDWIRED
   *  pointer-mode buttons (like Escape on the keyboard — you can never
   *  rebind yourself out of clicking). scroll = px/sec of right-stick wheel;
   *  where nothing scrolls, the same stick banks synthetic wheel notches
   *  (zoomNotchesPerSec at full tilt) so pan/zoom surfaces zoom instead. */
  pointer: { speed: 1100, scrollSpeed: 900, zoomNotchesPerSec: 6, confirm: 'pad:a', cancel: 'pad:b' },
  /** Pressing START is the pad's hardwired Escape (pause / close cascade). */
  escapeButton: 'pad:start',
  /** While the PAD owns the reticle, the mouse must travel this many px
   *  (accumulated) to reclaim aim — a desk bump or sensor drift on an idle
   *  mouse must never yank targeting to wherever the arrow was abandoned. */
  mouseReclaimPx: 10,
  /** MOUSE HANDOFF: when the mouse does reclaim aim from the pad, the
   *  reticle HANDS IT the cursor — aim begins exactly where the reticle was
   *  (a parked, invisible arrow must never flip your facing), carried by a
   *  screen-space offset that MELTS as the mouse travels: each px of travel
   *  scales the offset down by (1 − px/mergePx), so arrow and aim re-unify
   *  after roughly mergePx of deliberate motion and the honest OS arrow
   *  returns. doneEps = the offset length (px) that counts as unified. */
  mouseHandoff: { mergePx: 240, doneEps: 2 },
  /** The pad counts as the ACTIVE input source for this long after its last
   *  activity (seconds) — drives pointer-mode handoff between mouse and pad. */
  activeWindow: 4,
} as const;

// ---------------------------------------------------------------------------
// AIM ASSIST DELIVERY MODES — how the soft assist (engine/aimassist.ts) hands
// its pull to the game. A registry, not a flag: settings validates against it,
// the options screen iterates it, and a future SkillDef-level override can
// name an id to force a mode per skill (a beam that must bend without moving
// your cursor, say) without touching this file.
// ---------------------------------------------------------------------------
export type AimAssistMode = 'cursor' | 'view';
export interface AimAssistModeDef {
  id: AimAssistMode;
  /** Player-facing button label (options screen). */
  name: string;
  /** One-line tooltip explaining the feel. */
  blurb: string;
}
export const AIM_ASSIST_MODES: AimAssistModeDef[] = [
  {
    id: 'cursor',
    name: 'MOVES THE CURSOR',
    blurb: 'The assist steers your aim itself — when a lock breaks or you grab the mouse, aim continues from where the reticle truly is. While the stick rests, a held lock gently tracks its target.',
  },
  {
    id: 'view',
    name: 'BENDS THE SHOT',
    blurb: 'The assist curves the delivered shot and reticle only; your underlying stick aim never moves, and losing the lock returns aim to your raw stick point.',
  },
];

/** Standard-mapping button names, in w3c index order (0–16). */
export const PAD_BUTTON_ORDER = [
  'a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt',
  'select', 'start', 'l3', 'r3', 'up', 'down', 'left', 'right', 'home',
] as const;
export type PadButton = (typeof PAD_BUTTON_ORDER)[number];

/** A pad binding code as stored in settings ('pad:a'). '' = unbound. */
export const padCode = (b: PadButton): string => 'pad:' + b;
export const isPadCode = (code: string): boolean => code.startsWith('pad:');

/** Display names for binding buttons/HUD (VIEW/MENU cover Xbox+Deck naming). */
const PAD_DISPLAY_NAMES: Record<string, string> = {
  a: 'Ⓐ', b: 'Ⓑ', x: 'Ⓧ', y: 'Ⓨ',
  lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT',
  select: 'VIEW', start: 'MENU', l3: 'L3', r3: 'R3',
  up: 'D-PAD ↑', down: 'D-PAD ↓', left: 'D-PAD ←', right: 'D-PAD →',
  home: 'GUIDE',
};
export function padDisplay(code: string): string {
  if (!code) return '—';
  const name = code.slice('pad:'.length);
  return PAD_DISPLAY_NAMES[name] ?? name.toUpperCase();
}

/** The resolved feel numbers PadState runs on each frame — PAD_CFG defaults
 *  merged with the player's Settings.pad by the caller (main.ts). */
export interface PadTuning {
  deadzone: number;
  stickCurve: number;
  /** AIM stick's response exponent — resolved from Settings.pad.aimSensitivity
   *  across PAD_CFG.aimCurve; the move stick stays on stickCurve. */
  aimCurve: number;
  triggerThreshold: number;
  aimMinRadius: number;
  aimMaxRadius: number;
  pointerSpeed: number;
  swapSticks: boolean;
}

/** Injectable stand-in for a physical pad: tests set window.__fakePad and the
 *  poll reads it INSTEAD of navigator.getGamepads(). Buttons accept bare
 *  numbers (value) or {pressed,value} objects, axes are [-1..1]. */
export interface FakePad {
  axes: number[];
  buttons: Array<number | { pressed?: boolean; value?: number }>;
}

declare global {
  interface Window {
    __fakePad?: FakePad | null;
    /** Indexed fakes (couch tests): __fakePads[i] serves pad slot i exactly as
     *  a physical pad at that index would — connection census included. */
    __fakePads?: (FakePad | null | undefined)[];
  }
}

interface PadSource {
  axes: ReadonlyArray<number>;
  buttons: ReadonlyArray<number | { pressed?: boolean; value?: number }>;
}

/** Read one specific pad slot (couch seats bind by index). Fakes win. */
function readPadAt(index: number): PadSource | null {
  const fake = window.__fakePads?.[index];
  if (fake) return fake;
  if (window.__fakePads) return null; // an indexed fake rig owns the whole census
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  const p = navigator.getGamepads()[index];
  return p && p.connected ? p : null;
}

/** The device read behind PadState.poll. Bound to a slot when `index` is set
 *  (a couch seat's claimed pad); otherwise the classic solo read — the most
 *  recently active connected pad — SKIPPING any slots in `exclude` (pads
 *  claimed by couch guests must never steer the hero's merged input). With
 *  no index and no exclusions this is byte-identical to the original read.
 *  Returns the winning SLOT too (null for the legacy any-pad fake) — the
 *  couch join scan excludes the hero's live pad through it. */
function readPadSource(index?: number, exclude?: ReadonlySet<number>):
  { src: PadSource; index: number | null } | null {
  if (index !== undefined) {
    const src = readPadAt(index);
    return src ? { src, index } : null;
  }
  if (window.__fakePads) {
    // Indexed fake rig: the "any pad" read scans the fake census like the
    // physical scan below (first unexcluded connected slot — fakes carry no
    // activity timestamps, so claim order is the tiebreak).
    for (let i = 0; i < window.__fakePads.length; i++) {
      if (exclude?.has(i)) continue;
      const f = window.__fakePads[i];
      if (f) return { src: f, index: i };
    }
    return null;
  }
  if (window.__fakePad) return { src: window.__fakePad, index: null };
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  let best: Gamepad | null = null;
  for (const p of navigator.getGamepads()) {
    if (p && p.connected && !exclude?.has(p.index) && (!best || p.timestamp > best.timestamp)) best = p;
  }
  return best ? { src: best, index: best.index } : null;
}

/** Connected pad slots (couch join census). Fake rigs count their fakes. */
export function connectedPadIndices(): number[] {
  if (window.__fakePads) {
    const out: number[] = [];
    for (let i = 0; i < window.__fakePads.length; i++) if (window.__fakePads[i]) out.push(i);
    return out;
  }
  if (window.__fakePad) return [0];
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return [];
  const out: number[] = [];
  for (const p of navigator.getGamepads()) if (p && p.connected) out.push(p.index);
  return out;
}

/** Raw pressed-state of one button on one pad slot — the couch join panel's
 *  claim scan ("press Ⓐ on the joining controller") polls this per frame and
 *  edge-detects itself; gameplay reads stay on PadState. */
export function padButtonDown(index: number, button: PadButton): boolean {
  const src = readPadAt(index);
  if (!src) return false;
  const i = PAD_BUTTON_ORDER.indexOf(button);
  return buttonValue(src.buttons[i]) >= 0.5;
}

const buttonValue = (b: number | { pressed?: boolean; value?: number } | undefined): number => {
  if (b === undefined) return 0;
  if (typeof b === 'number') return b;
  if (typeof b.value === 'number') return b.value;
  return b.pressed ? 1 : 0;
};

/** Radial deadzone + response curve: returns the shaped vector and magnitude,
 *  plus the RAW deflection (pre-deadzone) — the snapback filter reasons about
 *  the physical stick, not the shaped signal. */
function shapeStick(x: number, y: number, deadzone: number, curve: number):
  { x: number; y: number; mag: number; raw: number } {
  const raw = Math.hypot(x, y);
  if (raw <= deadzone) return { x: 0, y: 0, mag: 0, raw };
  const t = Math.min(1, (raw - deadzone) / (1 - deadzone));
  const mag = Math.pow(t, curve);
  return { x: (x / raw) * mag, y: (y / raw) * mag, mag, raw };
}

/** Synthesize the hardwired Escape (pause / close-cascade) exactly as the
 *  keyboard would deliver it — down through window so Input, armed rebind
 *  captures, and every existing listener see a normal keystroke. */
export function synthEscape(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }));
}

/** Per-frame pad state, polled once at the top of the main loop. Mirrors the
 *  Input class discipline exactly: `down` = held set, `pressed` = consumable
 *  edge set cleared in endFrame(), justPressed() consumes. */
export class PadState {
  connected = false;
  /** Bind this state to ONE physical pad slot (a couch guest's claimed pad).
   *  null = the classic solo read (most recently active pad). */
  padIndex: number | null = null;
  /** Slots the unbound read must skip — the couch guests' claims. Solo (no
   *  claims) supplies null and the read is byte-identical to the original. */
  padExclude: (() => ReadonlySet<number> | null) | null = null;
  /** The slot the last poll actually read (null = none / the legacy any-pad
   *  fake) — the couch join scan treats a recently-active hero pad as taken. */
  sourceIndex: number | null = null;
  /** Shaped MOVE stick (left unless swapped): unit direction × curved magnitude. */
  move = { x: 0, y: 0 };
  moveMag = 0;
  /** Shaped AIM stick (right unless swapped). */
  aimStick = { x: 0, y: 0 };
  aimMag = 0;
  /** STICKY AIM: last nonzero aim direction (unit) + magnitude — releasing the
   *  stick keeps the reticle where you left it instead of snapping home. The
   *  PAD_CFG.aimFilter snapback gate decides which samples may write here, so
   *  the release transient itself never smears the held aim. */
  lastAimDir = { x: 1, y: 0 };
  lastAimMag = 0.5;
  /** Held pad codes ('pad:a') and this frame's press edges (consumable). */
  down = new Set<string>();
  pressed = new Set<string>();
  /** Seconds timestamp of the last nonzero pad activity (buttons or sticks). */
  lastActive = -Infinity;
  /** Snapback-filter state: last raw aim deflection, previous poll time (for
   *  collapse-rate math), and when the current release-holdoff expires. */
  private prevAimRaw = 0;
  private lastPollSec = -Infinity;
  private aimHoldUntil = -Infinity;
  /** Armed rebind capture: the NEXT button edge is swallowed (never reaches
   *  gameplay) and delivered to the callback as a binding code. */
  private capture: ((code: string) => void) | null = null;

  constructor(private tuning: () => PadTuning) {}

  armCapture(cb: (code: string) => void): void { this.capture = cb; }
  disarmCapture(): void { this.capture = null; }
  captureArmed(): boolean { return this.capture !== null; }

  poll(nowSec: number): void {
    // Poll spacing for the snapback filter's collapse-rate math — clamped so
    // a first frame or a long tab-freeze can't produce a degenerate rate.
    const dt = Math.min(0.1, Math.max(1e-3, nowSec - this.lastPollSec));
    this.lastPollSec = nowSec;
    const read = readPadSource(this.padIndex ?? undefined, this.padExclude?.() ?? undefined);
    const src = read?.src;
    this.sourceIndex = read?.index ?? null;
    if (!src) {
      if (this.connected) { this.down.clear(); this.pressed.clear(); }
      this.connected = false;
      this.move.x = this.move.y = this.moveMag = 0;
      this.aimStick.x = this.aimStick.y = this.aimMag = 0;
      this.prevAimRaw = 0;
      return;
    }
    const t = this.tuning();
    this.connected = true;

    // --- buttons: rebuild the held set, edge-detect against last frame ---
    const was = this.down;
    this.down = new Set<string>();
    for (let i = 0; i < PAD_BUTTON_ORDER.length; i++) {
      const name = PAD_BUTTON_ORDER[i];
      const v = buttonValue(src.buttons[i]);
      const threshold = (name === 'lt' || name === 'rt') ? t.triggerThreshold : 0.5;
      if (v < threshold) continue;
      const code = padCode(name);
      this.down.add(code);
      if (!was.has(code)) {
        // A rebind capture eats the edge whole — it must not leak into play.
        if (this.capture) {
          const cb = this.capture;
          this.capture = null;
          cb(code);
        } else {
          this.pressed.add(code);
        }
        this.lastActive = nowSec;
      }
    }
    if (this.down.size > 0) this.lastActive = nowSec;

    // --- sticks: axes 0/1 = left, 2/3 = right (standard mapping) ---
    const ax = (i: number): number => src.axes[i] ?? 0;
    const swap = t.swapSticks;
    const mv = shapeStick(ax(swap ? 2 : 0), ax(swap ? 3 : 1), t.deadzone, t.stickCurve);
    const am = shapeStick(ax(swap ? 0 : 2), ax(swap ? 1 : 3), t.deadzone, t.aimCurve);
    this.move.x = mv.x; this.move.y = mv.y; this.moveMag = mv.mag;

    // SNAPBACK FILTER: a deflection collapsing faster than a hand steers is a
    // release in flight — freeze aim (direction AND reach) so the reticle
    // holds exactly where it was left, and sit out the spring-back
    // oscillation until it dies or the player visibly re-commits. Filtered
    // frames report a DEAD stick downstream (aimMag 0), so the sticky
    // lastAimDir/lastAimMag pair is the only aim anyone sees.
    const f = PAD_CFG.aimFilter;
    const falling = this.prevAimRaw > t.deadzone && (this.prevAimRaw - am.raw) / dt > f.fallVeto;
    if (falling) this.aimHoldUntil = nowSec + f.holdoffSec;
    // Re-commit clears the holdoff — but only on a sample that is NOT itself
    // part of the collapse, or a release passing through resumeMag territory
    // would bleed the held reach inward on its way out.
    else if (am.raw >= f.resumeMag) this.aimHoldUntil = -Infinity;
    this.prevAimRaw = am.raw;
    if (am.mag > 0 && nowSec >= this.aimHoldUntil) {
      this.aimStick.x = am.x; this.aimStick.y = am.y; this.aimMag = am.mag;
      this.lastAimDir.x = am.x / am.mag;
      this.lastAimDir.y = am.y / am.mag;
      this.lastAimMag = am.mag;
    } else {
      this.aimStick.x = this.aimStick.y = 0; this.aimMag = 0;
    }
    if (mv.mag > 0 || am.mag > 0) this.lastActive = nowSec;
  }

  /** External aim steering — the 'cursor' assist mode writes the assisted
   *  point back HERE, making the sticky aim (the pad's persistent cursor)
   *  really and truly follow the assist. Live stick samples keep absolute
   *  priority: the very next poll with a live, unfiltered deflection
   *  overwrites whatever was steered — the player always wins the stick. */
  setStickyAim(dir: { x: number; y: number }, mag: number): void {
    this.lastAimDir.x = dir.x;
    this.lastAimDir.y = dir.y;
    this.lastAimMag = Math.min(1, Math.max(0, mag));
  }

  /** True once per physical press of the bound button ('' never fires). */
  justPressed(code: string): boolean {
    if (code && this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  }

  isDown(code: string): boolean { return !!code && this.down.has(code); }

  /** The pad has spoken recently — it owns pad-flavored UX (pointer mode). */
  activeRecently(nowSec: number): boolean {
    return this.connected && nowSec - this.lastActive <= PAD_CFG.activeWindow;
  }

  /** Aim reach in world units for a given deflection magnitude (0..1). */
  aimReach(mag: number, t: PadTuning): number {
    return t.aimMinRadius + (t.aimMaxRadius - t.aimMinRadius) * Math.min(1, Math.max(0, mag));
  }

  endFrame(): void { this.pressed.clear(); }
}
