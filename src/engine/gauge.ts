// ---------------------------------------------------------------------------
// THE GAUGE FABRIC — a skill that pays in the world's own events.
//
// A skill wearing `SkillDef.gauge` carries a BANK on its own instance: the
// world's events FEED it (kills, deaths near you, landed blows, orbs — the
// charge-tap vocabulary, one filter chain: World.tapFires), a regen clock may
// trickle into it, and pressing the skill SPENDS `need` points and arms a
// LOCKOUT during which the bank takes nothing. The Vaal-soul shape: an art
// that scales with how fast you kill, priced in bodies instead of seconds —
// and, through the ordinary stat engine, a playstyle to build around.
//
// TWO SHAPES, ONE VOCABULARY (docs/engine/gauge.md):
//   · THE GAUGE (this file) — per-SKILL banks. Two gauge skills on the bar
//     each fill from the same kill: souls are not a shared purse.
//   · THE POOL (engine/charges.ts) — per-ACTOR banks a skill SPENDS
//     (`chargeCost`) that REGENERATE on the def's own clock (ChargeDef.regen,
//     baseline; `chargeRegen_<id>` the investment). The Titan-Quest Shade
//     shape: every few seconds another, faster with investment. Nothing new
//     was needed for it beyond the def-level clock — the wisp pool is the
//     debut (data/ultimates.ts).
//
// THE LAWS:
//   · ONE READINESS — an unfilled gauge is "not ready" through the SAME
//     predicate a charge floor uses (Actor.unmetGate): the bar greys, the AI
//     waits, the press refuses; the note reads the fill.
//   · THE PRESS PAYS — the bank spends at the press beside mana (a use is a
//     use: an interrupted bar still spent its souls) and the lockout arms.
//   · THE LOCKOUT TAKES NOTHING — feeds and regen alike are refused whole
//     while it stands (the anti-chain law); it ages on the OWNER's own
//     seconds (a frozen caster's lockout stands frozen).
//   · THREE ORDINARY STATS — gaugeGain (more per feed), gaugeNeed (fewer
//     points to fire), gaugeLockout (a shorter silence): base-1 multipliers
//     registered beside the charge stats, tag-scopable like any modifier
//     ("30% less Ultimate gauge required" is one mod line).
//   · TRANSIENT — the bank lives on SkillInstance.state, reset on load like
//     the trigger-gem clocks and the self-stack piles.
//   · THE SAME DOOR — monsters wearing a gauge art feed and refuse through
//     the same taps and the same predicate.
//
// Probe: balance/probe_gauge.ts.
// ---------------------------------------------------------------------------

import type { ChargeGainSpec, SkillInstance } from './skills';
import { STAT_DEFS } from './stats';

/** A feed row: the charge-tap vocabulary minus the bank it would fill
 *  (`on` + amount + the filters — radius, elite victim, orb kind, chance,
 *  whileToggled). */
export type GaugeFeedSpec = Omit<ChargeGainSpec, 'charge' | 'max'>;

/** SkillDef.gauge — the skill's own bank. */
export interface GaugeSpec {
  /** Points required to fire (the gaugeNeed stat scales it; min 1). */
  need: number;
  /** Event feeds (World.tapCharges → tapFires — the one filter chain). */
  feeds?: GaugeFeedSpec[];
  /** Points per second, unconditionally (the regenerating shape). */
  regen?: number;
  /** Seconds after a press during which the bank takes NOTHING (default
   *  GAUGE_CFG.defaultLockoutSec; the gaugeLockout stat scales it). */
  lockoutSec?: number;
  /** Bank ceiling as a multiple of need (default 1 — full is full; 2 banks
   *  a second cast's worth of overflow). */
  bankMult?: number;
  /** HUD/tooltip unit word ("souls"). */
  unit?: string;
  /** THE PARTIAL PRESS: the skill may fire BELOW need — from `minFrac` of
   *  need (default 0: any point at all) — spending everything banked, at
   *  POWER = fill/need (the linear law; `floorPower` lifts the bottom of the
   *  ramp so a one-soul press is not a joke). Power scales the use's damage
   *  and its counts (projectiles, storm strikes, summons) and any buff
   *  wearing `powerStacks` — full at need, never above 1 without
   *  `overflow`. */
  partial?: { minFrac?: number; floorPower?: number };
  /** THE OVERFLOW: a press spends the WHOLE bank and power runs PAST 1 —
   *  fill/need up to bankMult (the effect that keeps growing while you
   *  keep banking). Pairs with a cooldown: the bank fills while the clock
   *  is clear, and the bigger the bank, the bigger the blow. */
  overflow?: true;
  /** THE HASTENING: while THIS skill's cooldown is running, every banked
   *  point SHAVES this many seconds off it INSTEAD of banking (the
   *  resource hurries the clock; once the clock is clear, points bank as
   *  usual — the two-phase art). Scaled by gaugeGain like any feed. */
  cooldownPer?: number;
}

/** Central levers. Every consumer reads these — never inline the numbers. */
export const GAUGE_CFG = {
  defaultLockoutSec: 6,
  defaultBankMult: 1,
  /** The unmet-gate notes: a gathering bank prints its fill; a locked one
   *  says so. */
  noteGathering: 'gathering',
  noteLocked: 'spent',
} as const;

// THE THREE STATS — ordinary, tag-scopable, base-1 multipliers (the
// chargeCap_/chargeRegen_ registration idiom: this module owns its rows).
STAT_DEFS.gaugeGain = {
  label: 'Gauge Gain', base: 1, min: 0,
  desc: 'Multiplies every point a gauge skill banks from kills, deaths, blows and its own clock.',
};
STAT_DEFS.gaugeNeed = {
  label: 'Gauge Requirement', base: 1, min: 0.1,
  desc: 'Scales how many points a gauge skill must bank before it can fire — less is sooner.',
};
STAT_DEFS.gaugeLockout = {
  label: 'Gauge Lockout', base: 1, min: 0,
  desc: 'Scales the silence after a gauge skill fires, during which its bank takes nothing.',
};

/** The EFFECTIVE terms for one instance after investment — resolved by the
 *  owner (Actor.gaugeEff) and read everywhere else. */
export interface GaugeEff {
  need: number;
  /** Multiplier on every banked point. */
  gain: number;
  lockoutSec: number;
  /** The bank's ceiling. */
  cap: number;
}

/** THE ONE FOLD: spec × the three stat reads → effective terms. */
export function gaugeEffOf(spec: GaugeSpec, needMul: number, gainMul: number, lockMul: number): GaugeEff {
  const need = Math.max(1, Math.round(spec.need * needMul));
  return {
    need,
    gain: Math.max(0, gainMul),
    lockoutSec: Math.max(0, (spec.lockoutSec ?? GAUGE_CFG.defaultLockoutSec) * lockMul),
    cap: need * (spec.bankMult ?? GAUGE_CFG.defaultBankMult),
  };
}

/** The bank's current points. */
export function gaugeFill(inst: SkillInstance): number {
  return inst.state?.gauge ?? 0;
}

/** Is the post-press silence standing? */
export function gaugeLocked(inst: SkillInstance): boolean {
  return (inst.state?.gaugeLock ?? 0) > 0;
}

/** Seconds of lockout left (0 when open). */
export function gaugeLockLeft(inst: SkillInstance): number {
  return Math.max(0, inst.state?.gaugeLock ?? 0);
}

/** THE FIRING FLOOR: need, or — under a partial press — minFrac of need
 *  (at least one whole point, so an empty bank never fires). */
export function gaugeFloor(spec: GaugeSpec, eff: GaugeEff): number {
  if (!spec.partial) return eff.need;
  return Math.max(1, Math.ceil(eff.need * (spec.partial.minFrac ?? 0)));
}

export function gaugeReady(inst: SkillInstance, eff: GaugeEff, spec?: GaugeSpec): boolean {
  return gaugeFill(inst) >= (spec ? gaugeFloor(spec, eff) : eff.need);
}

/** THE POWER LAW: what a press at this fill is worth. Full (or more, with
 *  no overflow) = 1; a partial press ramps linearly from `floorPower` at
 *  the firing floor to 1 at need; an overflow press runs fill/need past 1
 *  (capped by the bank itself). Pure — the HUD/tooltips read it too. */
export function gaugePowerOf(spec: GaugeSpec, eff: GaugeEff, fill: number): number {
  if (spec.overflow) return Math.max(0, fill / eff.need);
  if (fill >= eff.need || !spec.partial) return 1;
  const floor = gaugeFloor(spec, eff);
  const fp = spec.partial.floorPower ?? (floor / eff.need);
  if (eff.need <= floor) return 1;
  const t = (fill - floor) / (eff.need - floor);
  return Math.max(0, Math.min(1, fp + (1 - fp) * t));
}

/** Fill fraction 0..1 against the effective need (overflow reads full). */
export function gaugeFrac(inst: SkillInstance, eff: GaugeEff): number {
  return Math.max(0, Math.min(1, gaugeFill(inst) / eff.need));
}

/** FEED the bank: refused whole during the lockout, scaled by gain, capped.
 *  Returns the points actually banked. */
export function gaugeAdd(inst: SkillInstance, amount: number, eff: GaugeEff): number {
  if (amount <= 0 || gaugeLocked(inst)) return 0;
  const st = (inst.state ??= {});
  const cur = st.gauge ?? 0;
  const next = Math.min(eff.cap, cur + amount * eff.gain);
  st.gauge = next;
  return next - cur;
}

/** THE PRESS PAYS: need leaves the bank (a partial or overflow press
 *  drinks the WHOLE bank), the lockout arms, and the press's POWER is
 *  stamped on the instance for the execution to read (state.gaugePower —
 *  scheduled repeats of the same use read the same stamp). Returns it. */
export function gaugeSpend(inst: SkillInstance, spec: GaugeSpec, eff: GaugeEff): number {
  const st = (inst.state ??= {});
  const fill = st.gauge ?? 0;
  const power = gaugePowerOf(spec, eff, fill);
  st.gauge = (spec.overflow || (spec.partial && fill < eff.need))
    ? 0 : Math.max(0, fill - eff.need);
  st.gaugeLock = eff.lockoutSec;
  st.gaugePower = power;
  return power;
}

/** AGE on the owner's seconds: the lockout burns first (taking nothing),
 *  then the regen clock banks. */
export function gaugeTick(inst: SkillInstance, spec: GaugeSpec, eff: GaugeEff, dt: number): void {
  const st = (inst.state ??= {});
  if ((st.gaugeLock ?? 0) > 0) {
    const left = st.gaugeLock! - dt;
    if (left > 0) { st.gaugeLock = left; return; }
    // The silence ends mid-frame: the remainder of the frame is open time.
    st.gaugeLock = 0;
    dt = -left;
  }
  if (spec.regen && dt > 0) gaugeAdd(inst, spec.regen * dt, eff);
}

/** The gate note for an unready bank (Actor.unmetGate speaks it). */
export function gaugeNote(inst: SkillInstance, spec: GaugeSpec, eff: GaugeEff): string {
  if (gaugeLocked(inst)) return GAUGE_CFG.noteLocked;
  return `${Math.floor(gaugeFill(inst))}/${eff.need} ${spec.unit ?? GAUGE_CFG.noteGathering}`;
}

/** THE HASTENING's fold: seconds a banked amount shaves off a running
 *  cooldown (0 when the spec carries no cooldownPer). */
export function gaugeShaveSec(spec: GaugeSpec, eff: GaugeEff, amount: number): number {
  return spec.cooldownPer ? Math.max(0, amount * eff.gain * spec.cooldownPer) : 0;
}
