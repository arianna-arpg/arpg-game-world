// --- THE RESERVE FABRIC — finite bodily fuel as data (engine/reserves.ts) ---
//
// The engine has always modelled bodies that RUN OUT — the kite budget's
// wind (BEHAVIOR_CFG.defaultKite), lightwell drain, charge banks, mana on a
// monster's own pool — and never once showed it. So every fight read the
// same way: kill it before it kills you. A RESERVE is that missing half of
// the pressure curve made honest: a named, finite, per-body pool that its
// own casting SPENDS, that living BURNS, that travel LEAKS, that recovers
// on a stated clock, and that — emptied — opens a real VENT window.
//
// The player verb this buys is DENIAL. Bait the expensive move, deny the
// recovery, outlast the burn. Nothing here is a hidden timer: every reserve
// wears a tell (`reserve:<id>` — the tell fabric's source, resolving off
// THIS map), so the reservoir the player is starving is the reservoir they
// can see.
//
// THREE DIALS, ONE FABRIC. The debut bodies are the same rows tuned apart:
//   THE BELLOWS  `costs` + `vent`      — spent by its big attack; empty, it
//                                        must vent, and the vent is the
//                                        punish window.
//   THE WICK     `drain` + gauge mods  — burns itself down by living.
//                                        Strongest now, weaker later: LET
//                                        IT BURN.
//   THE LEAKING  `drainPerUnit`        — pays to move. Bleeds out fleeing,
//                                        and its wake makes it trackable.
//
// THE LAWS:
//  - HONEST OR NOTHING. A reserve that gates a cast must be visible.
//    `validateReserves` refuses a spec that spends without telling (the
//    census names shirkers), exactly as validateWatch refuses a blind
//    watcher and validateTells refuses an unbandable read.
//  - ONE READING. The sweep, the tell, the AI condition, the slayer axis
//    and the gauge-scaled modifier all read the SAME `ReserveState.cur`.
//    Host and client can never disagree, because the tell wire ships the
//    derived scalar and nothing else.
//  - THE QUANTA LAW. Reserves publish to the stat sheet as INTEGER pips
//    (`reserve:<id>` gauges — the brim-fill precedent), so "more damage
//    per unit of wick left" is authorable and the sheet cache never churns
//    on a per-frame float.
//  - COSTS REFUSE, THEY NEVER DEBT. A cast the pool cannot pay does not
//    fire (the useSkill gate) — the denial is real, not cosmetic.
//
// This module is a PURE LEAF (the mounts.ts / tells.ts idiom): types,
// config, the pure resolvers, the integrity walk. The sweep lives in
// World.updateReserves; the spend gate in World.useSkill; the tell binding
// in engine/tells.ts. Docs: docs/engine/reserves.md; probe
// balance/probe_spent.ts.
// ---------------------------------------------------------------------------

// --- config ----------------------------------------------------------------

export const RESERVE_CFG = {
  /** Seconds between reserve sweeps per declaring body. Drain/regen scale
   *  by the real elapsed span, so the cadence changes rates by nothing —
   *  it only bounds how often thresholds are re-judged. */
  sweepSec: 0.1,
  /** Default fill fraction at spawn (a body arrives rested). */
  start: 1,
  /** Default seconds of no-spend before `regen` begins. */
  regenDelay: 1.2,
  /** Default fraction refilled when a vent window closes. */
  ventRefill: 1,
  /** Default vent floater tint (the beat the player is waiting for). */
  ventColor: '#ffd9a0',
  /** Fraction at/below which a body reads SPENT (Actor.spent — the slayer
   *  lane's `spentbane` arming, the `spent` tell source, AI conditions).
   *  A venting body reads spent regardless. */
  spentAt: 0,
  /** Pip quantization for the `reserve:<id>` stat gauge: pips = round(cur
   *  × this). 1 = one pip per unit (pools are authored small). */
  gaugePips: 1,
} as const;

// --- data shapes -------------------------------------------------------------

/** WHEN the per-second `drain` burns. 'always' = the wick (living costs);
 *  'aggroed' = only in the fight (a body that stokes to fight); 'moving' =
 *  only under way (effort, not existence). */
export type ReserveDrainWhen = 'always' | 'aggroed' | 'moving';

/** WHEN `regen` recovers. 'always' = it knits back mid-fight; 'calm' = only
 *  once it has lost you — the denial lever with teeth, since staying
 *  engaged IS the starvation. */
export type ReserveRegenWhen = 'always' | 'calm';

/** A STAGE: a status worn while the fill sits inside a band. The
 *  discrete half of a reserve's power curve (the continuous half is
 *  `gaugeMod(..., 'reserve:<id>')` on the def's own mods) — and because
 *  statuses carry their own mods, art and icons, a stage is the whole
 *  authoring surface for "weaker as it burns" with zero new machinery. */
export interface ReserveStage {
  /** Worn while fill (0..1) ≤ this. Omit for an open top. */
  below?: number;
  /** Worn while fill (0..1) > this. Omit for an open bottom. */
  above?: number;
  /** STATUS_DEFS row worn while the band holds (refreshed by the sweep). */
  status: string;
  /** One floater on ENTRY (the beat reads once, never per sweep). */
  note?: string;
  color?: string;
}

/** THE VENT: what an emptied pool does. The window is the whole point —
 *  a body that spends its last breath must PAY for it in openable time. */
export interface ReserveVent {
  /** Seconds the window lasts. */
  forSec: number;
  /** STATUS_DEFS row worn for the window — where the punish lives
   *  (hardCC, damageTaken, a slow: ordinary status data). */
  status?: string;
  /** A free-cast at the vent moment: the telegraph the player learns to
   *  read from across the room (a steam plume, a shed cloud). Runs the
   *  ordinary pipeline — no cost, no cooldown. */
  skillId?: string;
  /** Fraction refilled when the window closes (default
   *  RESERVE_CFG.ventRefill — a full breath). */
  refill?: number;
  /** Floater printed as the window opens. */
  note?: string;
  color?: string;
}

/** ONE reserve row on a body. Every dial is optional but `id` and `pool`;
 *  an absent dial costs exactly nothing at runtime. */
export interface ReserveSpec {
  /** The pool's name — the tell source's arg, the gauge's key, the AI
   *  condition's id ('breath', 'wick', 'ichor'). */
  id: string;
  /** Capacity in UNITS. Author these SMALL (2–8): they are the pips a
   *  gauge-scaled modifier counts and the notches a player learns. */
  pool: number;
  /** Fill fraction at spawn (default RESERVE_CFG.start). */
  start?: number;
  /** Human label for HUD/bestiary surfaces ('Breath', 'Wick'). */
  label?: string;

  // --- THE PRICE ------------------------------------------------------
  /** What each named skill costs to cast. A cast the pool cannot pay is
   *  REFUSED at the one pipeline (World.useSkill) — the brain falls
   *  through to its next rule exactly as it does when mana is short. */
  costs?: Record<string, number>;
  /** Charged for any cast not named in `costs` (default 0 — most bodies
   *  price only their signature move). */
  perCast?: number;

  // --- THE BURN -------------------------------------------------------
  /** Units per second spent passively (THE WICK). */
  drain?: number;
  /** When `drain` burns (default 'always'). */
  drainWhile?: ReserveDrainWhen;
  /** Units per UNIT OF TRAVEL spent (THE LEAKING) — walks, dashes and
   *  shoves alike, the body-wake odometer's law: displacement is
   *  displacement, however it happened. */
  drainPerUnit?: number;

  // --- THE RECOVERY ---------------------------------------------------
  /** Units per second recovered. */
  regen?: number;
  /** Seconds since the last SPEND before `regen` starts (default
   *  RESERVE_CFG.regenDelay). Deny the pause and you deny the recovery. */
  regenDelay?: number;
  /** When `regen` runs (default 'always'). */
  regenWhile?: ReserveRegenWhen;

  // --- THE READING ----------------------------------------------------
  /** Fill fraction at/below which the body reads SPENT (default
   *  RESERVE_CFG.spentAt). */
  spentAt?: number;
  /** Statuses worn by band — the discrete power curve. */
  stages?: ReserveStage[];
  /** What EMPTY does. Absent = the pool simply floors at 0 (a cast gate
   *  with no window: fine for a reserve whose whole job is refusal). */
  vent?: ReserveVent;
}

// --- runtime -----------------------------------------------------------------

/** The live row. Owned by the Actor (`Actor.reserves`), swept by World. */
export interface ReserveState {
  /** Units remaining, 0..max. */
  cur: number;
  /** Capacity (spec.pool, resolved once at mint). */
  max: number;
  /** World time of the last SPEND (the regenDelay clock). */
  lastSpendAt: number;
  /** World time the current vent window ENDS (0 = not venting). */
  ventUntil: number;
  /** The stage status currently worn (so the sweep can drop it on exit). */
  stage?: string;
  /** Published gauge pips — the churn guard (the sheet only re-folds when
   *  an integer actually moves). */
  pips: number;
}

/** Mint a fresh live row from a spec. Pure. */
export function makeReserve(spec: ReserveSpec): ReserveState {
  const max = Math.max(0, spec.pool);
  const start = spec.start ?? RESERVE_CFG.start;
  const cur = Math.max(0, Math.min(max, max * start));
  return {
    cur, max, lastSpendAt: -Infinity, ventUntil: 0,
    pips: pipsOf(cur),
  };
}

/** Fill fraction 0..1 (0 when the pool is degenerate — a body with no
 *  capacity is permanently spent, which is the honest reading). */
export function reserveFrac(st: ReserveState): number {
  return st.max > 0 ? Math.max(0, Math.min(1, st.cur / st.max)) : 0;
}

/** Integer gauge pips for the stat sheet (the quanta law). */
export function pipsOf(cur: number): number {
  return Math.max(0, Math.round(cur * RESERVE_CFG.gaugePips));
}

/** The gauge key a `gaugeMod` names to scale by remaining fuel:
 *  `gaugeMod('damage', 'more', 0.1, reserveGauge('wick'))`. */
export function reserveGauge(id: string): string {
  return 'reserve:' + id;
}

/** What ONE cast of `skillId` costs against this row (0 = free). */
export function reserveCostOf(spec: ReserveSpec, skillId: string): number {
  const named = spec.costs?.[skillId];
  return Math.max(0, named ?? spec.perCast ?? 0);
}

/** Does this row currently read SPENT? (Venting always reads spent — the
 *  window IS the depletion, and the slayer axis must arm through it even
 *  while a refill is pending.) */
export function reserveSpent(spec: ReserveSpec, st: ReserveState, time: number): boolean {
  if (st.ventUntil > time) return true;
  return reserveFrac(st) <= (spec.spentAt ?? RESERVE_CFG.spentAt);
}

/** The stage row whose band holds at this fill, or undefined. Rows are
 *  checked IN ORDER and the FIRST match wins — author narrow-to-wide. */
export function stageAt(spec: ReserveSpec, frac: number): ReserveStage | undefined {
  const rows = spec.stages;
  if (!rows) return undefined;
  for (const r of rows) {
    if (r.below !== undefined && frac > r.below) continue;
    if (r.above !== undefined && frac <= r.above) continue;
    return r;
  }
  return undefined;
}

/** Does the per-second drain burn right now? Pure over a narrow view, so
 *  the probe can hand-build a body in three lines. */
export function drainHolds(
  spec: ReserveSpec, body: { aggroed: boolean; moving: boolean },
): boolean {
  switch (spec.drainWhile ?? 'always') {
    case 'aggroed': return body.aggroed;
    case 'moving': return body.moving;
    default: return true;
  }
}

/** Does regen run right now? */
export function regenHolds(
  spec: ReserveSpec, st: ReserveState, time: number,
  body: { aggroed: boolean },
): boolean {
  if (!spec.regen) return false;
  if (st.ventUntil > time) return false; // a venting body is not recovering yet
  if ((spec.regenWhile ?? 'always') === 'calm' && body.aggroed) return false;
  return time - st.lastSpendAt >= (spec.regenDelay ?? RESERVE_CFG.regenDelay);
}

// --- integrity ---------------------------------------------------------------

/** Walk a def registry: every reserve row must carry a usable pool, name
 *  real skills in its costs, name registered statuses in its stages and
 *  vent, name a real skill in its vent cast — and, THE HONESTY LAW, must
 *  be VISIBLE: a row that gates casts, burns down or vents without a
 *  `reserve:<its id>` tell row somewhere on the def (or on any of its
 *  brain variants) is a hidden timer, and this names it.
 *
 *  Takes the registries as lookups (the validateCreep idiom) so the leaf
 *  imports nothing. Returns human-readable faults — probe food. */
export function validateReserves(
  defs: Record<string, {
    reserves?: ReserveSpec[];
    tells?: { source: string }[];
    brainVariants?: { tells?: { source: string }[] }[];
  } | undefined>,
  has: { skill(id: string): boolean; status(id: string): boolean },
): string[] {
  const bad: string[] = [];
  for (const id in defs) {
    const def = defs[id];
    const rows = def?.reserves;
    if (!def || !rows?.length) continue;
    const seen = new Set<string>();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const tag = `${id} reserves[${i}] '${r.id}'`;
      if (!r.id) bad.push(`${tag}: missing id`);
      if (seen.has(r.id)) bad.push(`${tag}: duplicate reserve id on one def`);
      seen.add(r.id);
      if (!(r.pool > 0)) bad.push(`${tag}: pool must be > 0`);
      if (r.start !== undefined && (r.start < 0 || r.start > 1)) {
        bad.push(`${tag}: start ${r.start} outside 0..1`);
      }
      for (const sid in r.costs) {
        if (!has.skill(sid)) bad.push(`${tag}: costs names unknown skill '${sid}'`);
        if (!(r.costs[sid] > 0)) bad.push(`${tag}: costs['${sid}'] must be > 0`);
        if (r.costs[sid] > r.pool) {
          bad.push(`${tag}: costs['${sid}'] ${r.costs[sid]} exceeds pool ${r.pool} — the cast can never fire`);
        }
      }
      if (r.perCast !== undefined && r.perCast > r.pool) {
        bad.push(`${tag}: perCast ${r.perCast} exceeds pool ${r.pool} — nothing can ever fire`);
      }
      r.stages?.forEach((s, si) => {
        if (!has.status(s.status)) {
          bad.push(`${tag} stages[${si}]: unknown status '${s.status}'`);
        }
        if (s.below !== undefined && s.above !== undefined && s.above >= s.below) {
          bad.push(`${tag} stages[${si}]: empty band (above ${s.above} ≥ below ${s.below})`);
        }
      });
      const v = r.vent;
      if (v) {
        if (!(v.forSec > 0)) bad.push(`${tag} vent: forSec must be > 0`);
        if (v.status && !has.status(v.status)) {
          bad.push(`${tag} vent: unknown status '${v.status}'`);
        }
        if (v.skillId && !has.skill(v.skillId)) {
          bad.push(`${tag} vent: unknown skill '${v.skillId}'`);
        }
        if (v.refill !== undefined && (v.refill < 0 || v.refill > 1)) {
          bad.push(`${tag} vent: refill ${v.refill} outside 0..1`);
        }
      }
      // THE HONESTY LAW — a reserve the player must learn to starve has to
      // be readable on the body. A row that neither gates, burns nor vents
      // is inert bookkeeping and is exempt.
      const gates = !!r.costs || !!r.perCast || !!r.drain || !!r.drainPerUnit || !!r.vent;
      if (gates && !tellsReserve(def, r.id)) {
        bad.push(`${tag}: spends/burns/vents with no 'reserve:${r.id}' tell — a hidden timer`);
      }
    }
  }
  return bad;
}

/** Does this def (or any rolled variant) wear a tell reading `id`? */
function tellsReserve(
  def: { tells?: { source: string }[]; brainVariants?: { tells?: { source: string }[] }[] },
  id: string,
): boolean {
  const want = 'reserve:' + id;
  const hit = (rows?: { source: string }[]): boolean =>
    !!rows?.some(t => t.source === want || t.source === 'spent');
  if (hit(def.tells)) return true;
  return !!def.brainVariants?.some(v => hit(v.tells));
}
