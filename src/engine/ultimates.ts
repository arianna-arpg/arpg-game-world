// ---------------------------------------------------------------------------
// THE ULTIMATE FABRIC — super arts as data, and THE EYECATCH as their face.
//
// An ULTIMATE is an ordinary catalog skill wearing `SkillDef.ultimate`: no new
// cast pipeline, no special caster, no bespoke damage lane — the mark buys
// exactly two things, both priced and dialed here:
//
//   · THE EYECATCH — the anime cut-away pane: when the cast COMMITS
//     (executeSkill, the chrono block's sibling — scheduled repeats never
//     re-flash), the screen sweeps with a banner whose AVATAR is the caster's
//     OWN live body rendered through the portrait fabric (worn exactly as it
//     stands — the panels' companion-roster idiom), the skill's name in big
//     ink beside it. Styles are an OPEN registry (render/vis/eyecatch.ts,
//     `registerEyecatchStyle`) picked per skill by data. The pane is
//     screen-anchored BY LAW: like the status overlays, it happens TO the
//     player — the anchored-sky doctrine's one standing exception.
//   · THE HELD BEAT — a world-scoped scale-0 TimeHold for a breath while the
//     pane sweeps, under the SAME solo-only policy the pause menu, harvest
//     rite and steady hand wear (Timeflow.allowHold — a shared world is never
//     one player's to stop; in co-op the pane plays over a living world).
//     Kind 'ultimate', never 'menu' (a menu hard-hold stops its own aging).
//     A skill that carries `chrono` defaults its beat to 0 — the time-stop IS
//     the cinematic, and a world-hold would eat the caster's own stop window
//     (holds age on raw seconds).
//
// THE LAWS:
//   · THE SAME DOOR — the mark works for ANY caster through the one pipeline:
//     a monster's super wears the same banner yours does (side-coded by
//     team), and in that direction the pane is a TELEGRAPH, not flair.
//   · THE PRICE FLOOR — an ultimate prices itself in cooldown:
//     ULT_CFG.minCooldown is an AUTHORING law pinned by the census probe
//     (balance/probe_ultimates.ts), never a runtime clamp — data stays
//     sovereign, the probe is the censor.
//   · THE THROTTLE ONLY SKIPS THE BANNER — a throttled flash never delays or
//     refuses the cast itself. Panes are presentation; the sim never waits
//     on one (headless worlds carry a null state at zero cost).
//   · DRAWN == TIMED — the pane's clock is Timeflow.age (raw seconds, frozen
//     only by a true pause), and eyecatchElapsed/eyecatchAlive below are the
//     ONE fold both the renderer and the probes read.
//   · THE SPEC IS THE MARK, THE TAG IS THE SCOPE — the 'ultimate' SkillTag
//     (stats.ts) is the modifier/support scope for the family; every marked
//     skill wears it (census-pinned) and payload kin (a follow-up collapse)
//     may wear the tag WITHOUT the mark: scaling reaches the whole art, the
//     price floor binds only the pressable face.
//   · THE LAB LEVER (ULT_QA below) — QA builds cap the STAMPED cooldown and
//     run an eager banner throttle so the arts re-fire back-to-back; the
//     authored numbers are never edited, and the probes pin both regimes.
//
// Docs: docs/engine/ultimates.md. Probe: balance/probe_ultimates.ts.
// ---------------------------------------------------------------------------

/** SkillDef.ultimate — everything optional: `ultimate: {}` is a full mark. */
export interface UltimateSpec {
  /** Eyecatch style id (render/vis/eyecatch.ts EYECATCH_STYLES; default
   *  ULT_CFG.style). Unknown ids fall back to the default style. */
  style?: string;
  /** Pane headline (default: the skill's name). */
  title?: string;
  /** Small flavor line under the headline. */
  sub?: string;
  /** Pane accent color (default: the skill's own color). */
  tint?: string;
  /** Seconds the pane rides the screen (default ULT_CFG.paneSec). */
  paneSec?: number;
  /** THE HELD BEAT in seconds — world-scoped scale-0, solo policy. Default
   *  ULT_CFG.holdSec (enemy casters ULT_CFG.enemyHoldSec); a skill carrying
   *  `chrono` defaults to 0 (the stop is the cinematic). 0 = never hold. */
  holdSec?: number;
  /** Portrait override: draw this MonsterDef instead of the caster's live
   *  body (a patron, an idol — the summoner whose art is not their face). */
  avatarDefId?: string;
}

/** The one live pane (World.eyecatch — at most one; later flashes replace,
 *  the throttle keeps that rare). Plain serializable data: the co-op wire
 *  ships it as-is and the client rebuilds the pane from its own registry. */
export interface EyecatchState {
  casterId: number;
  skillId: string;
  style: string;
  title: string;
  sub?: string;
  tint: string;
  /** Side-coding for the pane's dressing: the caster's team at flash time. */
  side: 'ally' | 'enemy';
  /** Timeflow.age stamp at flash (raw seconds — frozen only by a true pause,
   *  so the pane animates through its own held beat). */
  t0: number;
  paneSec: number;
  avatarDefId?: string;
}

/** Central levers. Every consumer reads these — never inline the numbers. */
export const ULT_CFG = {
  /** Seconds the pane rides the screen. */
  paneSec: 1.15,
  /** THE HELD BEAT for player-side flashes (solo policy; see holdSec). */
  holdSec: 0.65,
  /** The held beat for ENEMY flashes — shorter: a telegraph, not a movie. */
  enemyHoldSec: 0.45,
  /** Min seconds between panes per CASTER — later banners skip, casts never
   *  wait. Keeps a monster's rotation from re-running the movie. */
  throttleSec: 20,
  /** Min seconds between ANY two panes — no same-beat banner pileups. */
  globalGapSec: 1.5,
  /** THE PRICE FLOOR: a skill wearing `ultimate` must carry at least ONE
   *  price — this many seconds of cooldown, OR a gauge needing at least
   *  minGaugeNeed points (engine/gauge.ts — priced in bodies), OR a pool
   *  spend (chargeCost) of at least minPoolCost. Authoring law,
   *  probe-pinned — never clamped at runtime. */
  minCooldown: 45,
  minGaugeNeed: 20,
  minPoolCost: 5,
  /** Default pane style when the spec names none (or an unknown id). The
   *  'flank' fighting-game cut-in: the slice announces, the WORLD stays in
   *  the shot performing the art ('sunder'/'eclipse' stay registered — any
   *  spec may opt back into the full-screen movie). */
  style: 'flank',
  /** Engine sweep: a spent pane is nulled this many seconds after it ends
   *  (keeps the wire from shipping a stale row forever). */
  expireSlackSec: 0.5,
} as const;

/** THE LAB LEVER — iteration builds want super arts back-to-back: the cap
 *  rides the STAMPED clock (never the authored data — THE PRICE FLOOR stays
 *  sovereign and probe-pinned) and the eager throttle re-runs the banner
 *  nearly at will. Mutable by design: `?ultqa=0` / `__game.ultqa(false)`
 *  restore the shipped pacing live; the probes pin the shipped law by
 *  setting `active` false themselves, then pin THIS lever in its own rig.
 *  SHIPS OFF (merged to main 2026-09-02): `?ultqa` / `__game.ultqa()` open
 *  the lab for a session — capped clocks, eager panes, the lab kit. */
export const ULT_QA = {
  active: false,
  /** THE LAB KIT: a fresh run's bag holds every droppable ultimate + gauge
   *  debut, unlearned — seat what you want to try (World.dealLabArts). */
  grantArts: true,
  /** Ceiling on an ultimate's STAMPED cooldown seconds while active. */
  cooldownCap: 3,
  /** Eager per-caster banner window (replaces ULT_CFG.throttleSec). */
  throttleSec: 0.6,
  /** Eager global banner gap (replaces ULT_CFG.globalGapSec). */
  globalGapSec: 0.25,
};

/** THE ONE FOLDS the lever rides — every consumer reads these, never the
 *  raw configs (world.ts throttle ledgers + the cooldown stamp). */
export function ultThrottleSec(): number {
  return ULT_QA.active ? ULT_QA.throttleSec : ULT_CFG.throttleSec;
}
export function ultGlobalGapSec(): number {
  return ULT_QA.active ? ULT_QA.globalGapSec : ULT_CFG.globalGapSec;
}
/** Cooldown ceiling for skills wearing the mark (Infinity = the authored
 *  clock stands untouched). */
export function ultCooldownCap(): number {
  return ULT_QA.active ? ULT_QA.cooldownCap : Infinity;
}

/** Raw seconds the pane has lived — THE ONE FOLD (renderer + probes). */
export function eyecatchElapsed(st: EyecatchState, timeflowAge: number): number {
  return timeflowAge - st.t0;
}

/** Is the pane still riding the screen? */
export function eyecatchAlive(st: EyecatchState, timeflowAge: number): boolean {
  const el = eyecatchElapsed(st, timeflowAge);
  return el >= 0 && el < st.paneSec;
}

/** THE ONE HOLD RESOLVER: how long this flash may hold the world (before
 *  the solo policy has its say). A chrono skill's beat defaults to 0 — the
 *  stop is the cinematic; a spec'd holdSec always wins. */
export function eyecatchHoldSec(
  spec: UltimateSpec, hasChrono: boolean, side: 'ally' | 'enemy',
): number {
  if (spec.holdSec !== undefined) return spec.holdSec;
  if (hasChrono) return 0;
  return side === 'enemy' ? ULT_CFG.enemyHoldSec : ULT_CFG.holdSec;
}
