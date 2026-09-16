// ---------------------------------------------------------------------------
// THE TOUCH FABRIC — the pure half: a finger's grammar as DATA, DOM-free.
//
// A phone (or a handheld's touchscreen) is the game's THIRD input dialect,
// beside the keyboard/mouse and the pad. This module owns the laws that need
// no browser: the dials (TOUCH_CFG), the LAYOUT REGISTRY (a layout is a list
// of widget rows — a floating move stick, an aim field, verb buttons — each a
// zone in viewport FRACTIONS so one layout serves every screen), the stick
// math (the pad's own shapeStick, so a thumb and a thumbstick share ONE
// deadzone/curve law), and THE ROUTER: a multi-pointer state machine that
// hands every touch to exactly one owner and folds them into a per-frame
// TouchFrame the local input read consumes beside the keys and the pad.
//
// THE LAWS (docs/engine/platform-touch.md):
//   · THE BAR WINS — a touch that lands on a published skill-slot rect
//     (renderer.hudSlotRects, CSS px — drawn == tested, the pressable bar's
//     law) is THAT slot's press before any zone is consulted.
//   · ONE OWNER PER FINGER — a pointer is routed once, at its down, and keeps
//     that owner until it lifts (a stick finger that wanders over the aim
//     field stays the stick; a slot hold that slides off keeps channeling).
//   · ONE STICK, ONE AIM — a second finger in the stick zone while a stick
//     is live owns nothing; likewise the aim field.
//   · THE FINGER IS THE CURSOR — under the 'cursor' aim style the aim
//     finger's screen point is the aim (the mouse's own law); under 'stick'
//     it is a floating right stick (deflection = reach, the pad's law) that
//     fires the primary past a deflection.
//   · EDGES ARE FRAME-SCOPED — a press lands as an edge on the next frame()
//     fold and never twice, exactly as Input.justPressed delivers a key.
//   · THE HAND THAT SPEAKS — lastActive stamps every touch; the DOM half and
//     main.ts compare it with the pad's own clock to decide who owns the
//     hand (widgets, the menu pointer, the bar's labels).
// Every number here is unblessed (her standing word); the probe
// (balance/probe_touch.ts) pins the laws, not the dials.
// ---------------------------------------------------------------------------

import { PAD_CFG, shapeStick } from './gamepad';
import type { ActionId, Settings } from '../meta/settings';

export const TOUCH_CFG = {
  /** Seconds a touch counts as the ACTIVE hand after its last event (the
   *  pad's PAD_CFG.activeWindow twin — the two clocks are compared). */
  activeWindow: 4,
  stick: {
    /** Base ring radius (CSS px, pre-scale) — full deflection at the rim. */
    radiusPx: 56,
    /** Knob diameter (CSS px, pre-scale). */
    knobPx: 40,
    /** FLOATING stick: the base spawns UNDER the thumb. FOLLOW drags the
     *  base along once the finger runs past the rim + slack, so a long
     *  swipe never pins the stick at full tilt in a stale direction. */
    follow: true,
    followSlackPx: 10,
    /** Shared with the pad: the same radial deadzone + response curve. */
    deadzone: PAD_CFG.deadzone,
    curve: PAD_CFG.stickCurve,
  },
  aim: {
    /** Default soft-assist strength while touch owns the reticle — a thumb
     *  has no precision, so the assist snaps fully by default (the bar-press
     *  aim law, generalized). Settings.touch.aimAssist overrides. */
    assist: 1,
    /** A finger down on the aim field HOLDS the primary (hold to attack,
     *  drag to steer — the LMB's own shape). */
    holdFires: true,
    /** 'stick' aim style: the floating right stick's rim radius (CSS px). */
    stickRadiusPx: 64,
    /** 'stick' aim style: the primary fires once the shaped deflection
     *  passes this (a twin-stick shooter's auto-fire). */
    fireMag: 0.35,
  },
  button: {
    /** Verb tile size (CSS px, pre-scale). Platform guidance floors touch
     *  targets at 44pt/48dp — never below minTargetPx after scaling. */
    sizePx: 48,
    minTargetPx: 44,
  },
  haptics: {
    /** navigator.vibrate pulses (ms) — a slot press, a verb tile. 0 = none. */
    slotMs: 12,
    buttonMs: 8,
  },
  fullscreen: {
    /** Ask the browser for fullscreen on the first touch's release (the
     *  activation gesture) — web builds only; a standalone PWA or the
     *  desktop shell already stands full. */
    onFirstTouch: true,
    /** Then try to lock landscape (best effort; refused silently where the
     *  platform says no). */
    lockLandscape: true,
  },
  widget: {
    /** Default alpha + size multiplier of every drawn widget; the Options
     *  rails for the player's dials. */
    opacity: 0.55,
    opacityMin: 0.15,
    opacityMax: 1,
    scale: 1,
    scaleMin: 0.6,
    scaleMax: 1.8,
  },
  layout: {
    /** The registered layout a fresh install wakes with. */
    defaultId: 'thumbs',
  },
} as const;

// ---------------------------------------------------------------------------
// THE LAYOUT REGISTRY — widgets as rows.
// ---------------------------------------------------------------------------

/** A viewport-fraction rectangle (0..1 on both axes; origin top-left). */
export interface TouchZone { x: number; y: number; w: number; h: number }

export type TouchWidgetKind = 'stick' | 'aim' | 'button';

export interface TouchWidgetDef {
  id: string;
  kind: TouchWidgetKind;
  /** The hit region. 'stick'/'aim': the whole zone takes the finger; a
   *  'button' seats a tile of `sizePx` at the zone's CENTER (the zone is
   *  the seat, the tile is the target). Mirrored under a left hand. */
  zone: TouchZone;
  /** button: the keyboard ACTION it presses — delivered as a synthetic
   *  keystroke of the player's own bind (the one Input source, the
   *  synthEscape idiom) — or 'escape', the hardwired pause/close cascade. */
  action?: ActionId | 'escape';
  /** button: the tile's face — a ui/icons.ts id and/or a short label. */
  icon?: string;
  label?: string;
  /** button: tile size (CSS px, pre-scale); TOUCH_CFG.button.sizePx when unset. */
  sizePx?: number;
  /** button: a LATCH toggles on each tap and holds its key DOWN while
   *  latched (the meta modifier — shift you don't have to keep pressing). */
  latch?: boolean;
  /** Optional gate — the widget exists only while it holds (live settings;
   *  a pickup tile only under the 'key' pickup style, say). */
  when?: (s: Settings) => boolean;
}

export interface TouchLayoutDef {
  id: string;
  /** Options face. */
  name: string;
  blurb: string;
  /** Routing order = row order (after the bar's slots, which always win). */
  widgets: ReadonlyArray<TouchWidgetDef>;
}

export const TOUCH_LAYOUTS: TouchLayoutDef[] = [];

export function registerTouchLayout(def: TouchLayoutDef): TouchLayoutDef {
  if (TOUCH_LAYOUTS.some(l => l.id === def.id)) throw new Error(`touch layout '${def.id}' registered twice`);
  const ids = new Set<string>();
  for (const w of def.widgets) {
    if (ids.has(w.id)) throw new Error(`touch layout '${def.id}': widget '${w.id}' twice`);
    ids.add(w.id);
    if (w.kind === 'button' && !w.action) throw new Error(`touch layout '${def.id}': button '${w.id}' names no action`);
  }
  TOUCH_LAYOUTS.push(def);
  return def;
}

/** Registry lookup with the default as the safety net (a renamed layout in
 *  an old save degrades to the default, never to no controls). */
export function touchLayoutOf(id: string | undefined): TouchLayoutDef | null {
  return TOUCH_LAYOUTS.find(l => l.id === id)
    ?? TOUCH_LAYOUTS.find(l => l.id === TOUCH_CFG.layout.defaultId)
    ?? TOUCH_LAYOUTS[0] ?? null;
}

export type TouchHand = 'right' | 'left';

/** Mirror a zone across the vertical axis (the left-handed layout). */
export function mirrorZone(z: TouchZone): TouchZone {
  return { x: 1 - z.x - z.w, y: z.y, w: z.w, h: z.h };
}

/** The widgets a layout stands on screen this moment: gated rows dropped,
 *  zones mirrored for a left hand. Pure — the DOM half and the probe fold
 *  the same list. */
export function resolveTouchWidgets(def: TouchLayoutDef, hand: TouchHand, settings: Settings): TouchWidgetDef[] {
  const out: TouchWidgetDef[] = [];
  for (const w of def.widgets) {
    if (w.when && !w.when(settings)) continue;
    out.push(hand === 'left' ? { ...w, zone: mirrorZone(w.zone) } : w);
  }
  return out;
}

export interface PxRect { x: number; y: number; w: number; h: number }

export function zoneRect(z: TouchZone, vw: number, vh: number): PxRect {
  return { x: z.x * vw, y: z.y * vh, w: z.w * vw, h: z.h * vh };
}

/** A button's TARGET: a `sizePx × scale` square centered in its zone, floored
 *  at the platform's minimum touch target so a small scale dial can never
 *  shrink a tile past a thumb. */
export function buttonRect(w: TouchWidgetDef, vw: number, vh: number, scale: number): PxRect {
  const z = zoneRect(w.zone, vw, vh);
  const size = Math.max(TOUCH_CFG.button.minTargetPx, (w.sizePx ?? TOUCH_CFG.button.sizePx) * scale);
  return { x: z.x + z.w / 2 - size / 2, y: z.y + z.h / 2 - size / 2, w: size, h: size };
}

export const inRect = (px: number, py: number, r: PxRect): boolean =>
  px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;

// ---------------------------------------------------------------------------
// THE STICK LAW — one thumb, the pad's math.
// ---------------------------------------------------------------------------

export interface StickRead {
  /** Shaped direction × curved magnitude (the pad's move vector shape). */
  x: number; y: number; mag: number;
  /** Raw deflection fraction (0..1, pre-deadzone). */
  raw: number;
  /** Knob seat (CSS px): the finger, clamped to the rim. */
  kx: number; ky: number;
}

/** Deflection of a finger at (px,py) from a base at (ox,oy) with a rim at
 *  radiusPx, through the pad's radial deadzone + response curve. */
export function stickRead(ox: number, oy: number, px: number, py: number,
  radiusPx: number, deadzone: number, curve: number): StickRead {
  const dx = px - ox, dy = py - oy;
  const d = Math.hypot(dx, dy);
  const r = Math.max(1, radiusPx);
  const clampedD = Math.min(d, r);
  const ux = d > 1e-6 ? dx / d : 0, uy = d > 1e-6 ? dy / d : 0;
  const s = shapeStick(ux * (clampedD / r), uy * (clampedD / r), deadzone, curve);
  return { x: s.x, y: s.y, mag: s.mag, raw: s.raw, kx: ox + ux * clampedD, ky: oy + uy * clampedD };
}

/** FOLLOW: when the finger runs past the rim + slack, the base slides
 *  along so the finger sits exactly on the rim — returns the new base. */
export function followBase(ox: number, oy: number, px: number, py: number,
  radiusPx: number, slackPx: number): { ox: number; oy: number } {
  const dx = px - ox, dy = py - oy;
  const d = Math.hypot(dx, dy);
  if (d <= radiusPx + slackPx || d < 1e-6) return { ox, oy };
  const k = (d - radiusPx) / d;
  return { ox: ox + dx * k, oy: oy + dy * k };
}

// ---------------------------------------------------------------------------
// THE ROUTER — every finger to one owner; one fold per frame.
// ---------------------------------------------------------------------------

export interface SlotRect { slot: number; x: number; y: number; w: number; h: number }

export interface TouchStickTuning {
  radiusPx: number; deadzone: number; curve: number;
  follow: boolean; followSlackPx: number;
  /** A FIXED stick keeps its base at the zone's seat; floating spawns under the thumb. */
  fixed: boolean;
}

export interface TouchAimTuning {
  style: 'cursor' | 'stick';
  stickRadiusPx: number;
  holdFires: boolean;
  fireMag: number;
}

/** Everything the router reads from the world each event — thunks, so live
 *  settings edits and a resized viewport land at once. */
export interface TouchRouterReads {
  widgets: () => ReadonlyArray<TouchWidgetDef>;
  viewport: () => { w: number; h: number };
  /** The LOCAL hero's bar slots in CSS px (the renderer's published rects). */
  slotRects: () => ReadonlyArray<SlotRect>;
  stick: () => TouchStickTuning;
  aim: () => TouchAimTuning;
  /** The widget size multiplier (Settings.touch.scale). */
  scale: () => number;
}

export type TouchOwner =
  | { kind: 'stick'; ox: number; oy: number }
  | { kind: 'aim'; ox: number; oy: number }
  | { kind: 'slot'; slot: number }
  | { kind: 'button'; id: string; latch: boolean }
  | { kind: 'none' };

interface Ptr { id: number; x: number; y: number; downAt: number; owner: TouchOwner }

export interface TouchFrame {
  /** Any finger is down on a widget/slot/field. */
  engaged: boolean;
  /** The move stick's shaped vector (zero when no stick is live). */
  move: { x: number; y: number; mag: number };
  /** The live stick's drawn state (base + knob, CSS px) or null. */
  stick: { ox: number; oy: number; kx: number; ky: number; mag: number } | null;
  /** The live aim finger: screen point, its base, and the 'stick' style's
   *  shaped vector (zero under 'cursor'). Null when no aim finger is down. */
  aim: { x: number; y: number; ox: number; oy: number; vx: number; vy: number; mag: number; kx: number; ky: number } | null;
  /** The aim finger went down or moved since the last fold. */
  aimSpoke: boolean;
  primaryHeld: boolean;
  primaryEdge: boolean;
  /** Per bar slot: held / pressed-this-frame (index = slot). */
  slotsHeld: boolean[];
  slotsEdge: boolean[];
  /** Verb tiles: held ids, this frame's presses and releases, latched ids. */
  buttonsDown: string[];
  buttonEdges: string[];
  buttonReleases: string[];
  latched: string[];
}

const SLOT_COUNT = 8;

export class TouchRouter {
  private ptrs = new Map<number, Ptr>();
  private slotEdges = new Set<number>();
  private buttonEdges: string[] = [];
  private buttonReleases: string[] = [];
  private latchedIds = new Set<string>();
  private primaryEdgePending = false;
  private primaryWas = false;
  private aimSpokePending = false;
  /** Seconds of the last touch event (THE HAND THAT SPEAKS). */
  lastActive = -Infinity;

  constructor(private reads: TouchRouterReads) {}

  /** A stick or aim owner is live. */
  private has(kind: 'stick' | 'aim'): boolean {
    for (const p of this.ptrs.values()) if (p.owner.kind === kind) return true;
    return false;
  }

  private find(kind: 'stick' | 'aim'): Ptr | null {
    for (const p of this.ptrs.values()) if (p.owner.kind === kind) return p;
    return null;
  }

  /** Route a fresh finger: the bar's slots first, then the layout's rows in
   *  order, else nothing (still stamped as spoken — a stray tap is a hand). */
  private route(x: number, y: number): TouchOwner {
    for (const r of this.reads.slotRects()) if (inRect(x, y, r)) return { kind: 'slot', slot: r.slot };
    const { w: vw, h: vh } = this.reads.viewport();
    const scale = this.reads.scale();
    for (const wd of this.reads.widgets()) {
      if (wd.kind === 'button') {
        if (inRect(x, y, buttonRect(wd, vw, vh, scale))) return { kind: 'button', id: wd.id, latch: !!wd.latch };
        continue;
      }
      const z = zoneRect(wd.zone, vw, vh);
      if (!inRect(x, y, z)) continue;
      if (wd.kind === 'stick') {
        if (this.has('stick')) continue;
        const st = this.reads.stick();
        if (st.fixed) return { kind: 'stick', ox: z.x + z.w / 2, oy: z.y + z.h / 2 };
        // A floating base spawns under the thumb, nudged inward so its rim
        // never hangs off the screen (the knob would be unreachable there).
        const r = st.radiusPx * scale;
        return { kind: 'stick', ox: Math.min(Math.max(x, r), vw - r), oy: Math.min(Math.max(y, r), vh - r) };
      }
      if (wd.kind === 'aim') {
        if (this.has('aim')) continue;
        return { kind: 'aim', ox: x, oy: y };
      }
    }
    return { kind: 'none' };
  }

  down(id: number, x: number, y: number, t: number): TouchOwner {
    if (this.ptrs.has(id)) this.up(id, t); // a re-used id is a fresh finger
    const owner = this.route(x, y);
    this.ptrs.set(id, { id, x, y, downAt: t, owner });
    this.lastActive = t;
    switch (owner.kind) {
      case 'slot': this.slotEdges.add(owner.slot); break;
      case 'button':
        if (owner.latch) {
          if (this.latchedIds.has(owner.id)) { this.latchedIds.delete(owner.id); this.buttonReleases.push(owner.id); }
          else { this.latchedIds.add(owner.id); this.buttonEdges.push(owner.id); }
        } else this.buttonEdges.push(owner.id);
        break;
      case 'aim':
        this.aimSpokePending = true;
        if (this.reads.aim().style === 'cursor' && this.reads.aim().holdFires) this.primaryEdgePending = true;
        break;
      default: break;
    }
    return owner;
  }

  move(id: number, x: number, y: number, t: number): void {
    const p = this.ptrs.get(id);
    if (!p) return;
    p.x = x; p.y = y;
    this.lastActive = t;
    if (p.owner.kind === 'stick') {
      const st = this.reads.stick();
      if (st.follow && !st.fixed) {
        const nb = followBase(p.owner.ox, p.owner.oy, x, y, st.radiusPx * this.reads.scale(), st.followSlackPx);
        p.owner = { kind: 'stick', ox: nb.ox, oy: nb.oy };
      }
    } else if (p.owner.kind === 'aim') {
      this.aimSpokePending = true;
      const a = this.reads.aim();
      if (a.style === 'stick') {
        // Rising edge past the fire deflection = a fresh primary press.
        const s = stickRead(p.owner.ox, p.owner.oy, x, y, a.stickRadiusPx * this.reads.scale(),
          this.reads.stick().deadzone, this.reads.stick().curve);
        const firing = s.mag >= a.fireMag;
        if (firing && !this.primaryWas) this.primaryEdgePending = true;
        this.primaryWas = firing;
      }
    }
  }

  up(id: number, t: number): void {
    const p = this.ptrs.get(id);
    if (!p) return;
    this.ptrs.delete(id);
    this.lastActive = t;
    if (p.owner.kind === 'button' && !p.owner.latch) this.buttonReleases.push(p.owner.id);
    if (p.owner.kind === 'aim') this.primaryWas = false;
  }

  /** The browser took the finger (a system gesture, a tab switch): release
   *  without any press semantics beyond what the down already delivered. */
  cancel(id: number, t: number): void { this.up(id, t); }

  /** Everything down comes up (a blur, a disabled fabric). */
  clear(t: number): void {
    for (const id of [...this.ptrs.keys()]) this.up(id, t);
  }

  /** Release every latch (a settings change, a disabled fabric): the held
   *  keys must come up, so the ids are handed back as releases. */
  unlatchAll(): string[] {
    const ids = [...this.latchedIds];
    this.latchedIds.clear();
    this.buttonReleases.push(...ids);
    return ids;
  }

  engaged(): boolean {
    for (const p of this.ptrs.values()) if (p.owner.kind !== 'none') return true;
    return false;
  }

  /** The router owns this pointer id (its down was routed here). */
  knows(id: number): boolean { return this.ptrs.has(id); }

  activeRecently(t: number): boolean {
    return this.ptrs.size > 0 || t - this.lastActive <= TOUCH_CFG.activeWindow;
  }

  /** ONE fold per frame: the live state plus the edges banked since the last
   *  fold (consumed here — an edge is delivered exactly once). */
  frame(): TouchFrame {
    const st = this.reads.stick();
    const scale = this.reads.scale();
    const stickP = this.find('stick');
    let move = { x: 0, y: 0, mag: 0 };
    let stick: TouchFrame['stick'] = null;
    if (stickP && stickP.owner.kind === 'stick') {
      const s = stickRead(stickP.owner.ox, stickP.owner.oy, stickP.x, stickP.y, st.radiusPx * scale, st.deadzone, st.curve);
      move = { x: s.x, y: s.y, mag: s.mag };
      stick = { ox: stickP.owner.ox, oy: stickP.owner.oy, kx: s.kx, ky: s.ky, mag: s.mag };
    }
    const a = this.reads.aim();
    const aimP = this.find('aim');
    let aim: TouchFrame['aim'] = null;
    let primaryHeld = false;
    if (aimP && aimP.owner.kind === 'aim') {
      if (a.style === 'stick') {
        const s = stickRead(aimP.owner.ox, aimP.owner.oy, aimP.x, aimP.y, a.stickRadiusPx * scale, st.deadzone, st.curve);
        aim = { x: aimP.x, y: aimP.y, ox: aimP.owner.ox, oy: aimP.owner.oy, vx: s.x, vy: s.y, mag: s.mag, kx: s.kx, ky: s.ky };
        primaryHeld = a.holdFires && s.mag >= a.fireMag;
      } else {
        aim = { x: aimP.x, y: aimP.y, ox: aimP.owner.ox, oy: aimP.owner.oy, vx: 0, vy: 0, mag: 0, kx: aimP.x, ky: aimP.y };
        primaryHeld = a.holdFires;
      }
    }
    const slotsHeld: boolean[] = new Array(SLOT_COUNT).fill(false);
    const slotsEdge: boolean[] = new Array(SLOT_COUNT).fill(false);
    const buttonsDown: string[] = [];
    for (const p of this.ptrs.values()) {
      if (p.owner.kind === 'slot' && p.owner.slot < SLOT_COUNT) slotsHeld[p.owner.slot] = true;
      if (p.owner.kind === 'button' && !p.owner.latch) buttonsDown.push(p.owner.id);
    }
    for (const s of this.slotEdges) if (s < SLOT_COUNT) slotsEdge[s] = true;
    const out: TouchFrame = {
      engaged: this.engaged(),
      move, stick, aim,
      aimSpoke: this.aimSpokePending,
      primaryHeld,
      primaryEdge: this.primaryEdgePending,
      slotsHeld, slotsEdge,
      buttonsDown,
      buttonEdges: this.buttonEdges,
      buttonReleases: this.buttonReleases,
      latched: [...this.latchedIds],
    };
    this.slotEdges = new Set();
    this.buttonEdges = [];
    this.buttonReleases = [];
    this.primaryEdgePending = false;
    this.aimSpokePending = false;
    return out;
  }

  /** Live pointer census (QA + the probe). */
  pointers(): ReadonlyArray<{ id: number; x: number; y: number; owner: TouchOwner }> {
    return [...this.ptrs.values()].map(p => ({ id: p.id, x: p.x, y: p.y, owner: p.owner }));
  }
}
