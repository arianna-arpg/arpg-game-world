// ============================================================================
// THE CLUTCH FABRIC — bodies as PAYLOADS of blows: the generic `birth` skill
// effect mints REAL monsters/minions at a delivery's resolution point.
//
// The world already births in fragments — the summon delivery stands a court
// at the caster's side, litePour bursts POOL rows where a flight ends (the
// vermin piper's rat-pod), proc 'summon' conscripts beside a struck victim
// (Forgebound / Phantasm), the construct pod incubates where planted
// (Broodpod), and the Demon Storm's meteor craters spit demons through a
// bespoke onImpact closure. THE GAP this fabric closes: nothing lets SKILL
// DATA say "a full Actor stands where this landed" — the thrown birth, the
// Vile-Mother mortar, the flame that leaves a living spark in the wound.
//
// ONE EFFECT, EVERY DELIVERY, at its own honest landing:
//   - ground        → births at the TARGET point (the kindle/vent law)
//   - storm         → each STRIKE's landing births (the mortar — stamped on
//                     the strike zone, executed at its detonation)
//   - projectile    → births where the flight ENDED (the litePour law:
//                     range spent, wall, the body that stopped it) — unless
//                     `onHit`, which moves the birth to resolveHit's per-
//                     victim site (dealt > 0, top-level: the flame-sprite
//                     "only if it struck" gate; pierce births per victim,
//                     roster caps bound it)
//   - anything else → births where the skill resolved (origin)
//
// THE LANES (the executor forks ONCE, on the caster's team):
//   - PLAYER-team casters mint through spawnMinion with a synthetic
//     SummonDelivery (the Vessel-of-Shadow graft idiom): roster caps
//     (minionMaxCount over `cap`), owner-stat bake, socket forwarding,
//     lifespans (`duration` × effectDuration), noBounty — the whole standing
//     minion law, nothing re-invented.
//   - ENEMY/wild casters mint kin at the CASTER'S level through
//     createMonster (party scale arrives free — no owner), placed by
//     findFreeSpot (an impact point can sit inside a rock blob), stamped
//     `bornOf` (the clutch census) and faction-inherited from the mother.
//
// THE LAWS:
//   - THE CLUTCH CAP: an enemy mother's live children are counted by
//     `Actor.bornOf` — at cap the birth simply doesn't happen (the mortar
//     still bursts, still wounds; the sac lands wet). No eviction: a
//     vanguard holds a WALL, it never rotates one. Player-lane caps are the
//     minion roster's own (evict-oldest — the standing summon UX).
//   - THE CONJURED-STREAM LAW (the standing bounty ruling): skill-conjured
//     bodies pay no bounty — the mother is the prize, her spawn is weather.
//     `bounty: 'full'` opts a spec out where design wants a paying brood.
//   - CHILDREN COUNT: births are real threats — they gate clears and feed
//     cull tallies like any counted body (kill the mother to stop the
//     bleeding; the tally the pour adds, the pour helps finish). An ambient
//     `tag` opts a spec out through the standing AMBIENT_TAGS exemption.
//   - POOLS BREATHE: `pool` rows ride World.weightedPick at the CASTER'S
//     level, so presence envelopes shape a mother's brood as she scales
//     (the gravemaker's zombies thin as worthier dead answer).
//   - ONE BIRTH PER SKILL: instanceBirth resolves the native effect first,
//     else the first socketed graft (SupportDef.birth — the kindred rule:
//     the native lane wins the slot). Each delivery executes it ONCE at its
//     own site.
//   - ARRIVALS READ: every birth plays the emergence grammar (ground-derived
//     at the landing; `onHit` births burst OUT of the struck body; `emerge`
//     overrides per spec — a fire sprite condenses).
//
// Faction-agnostic and source-agnostic by construction: a monster kit skill,
// a player gem, a support graft, and any future proc/affix door all speak
// the same row. Dials below are DIALS (unblessed — her walk blesses).
// ============================================================================

/** BIRTHS BODIES AT THE RESOLUTION POINT — the `birth` SkillEffect (and the
 *  SupportDef.birth graft's payload; engine/skills.ts joins it to the
 *  unions). See the header for the per-delivery landing law. */
export interface BirthEffect {
  type: 'birth';
  /** Fixed kind — or use `pool` for weighted selection (one of the two must
   *  name a registered MonsterDef; validated at boot). */
  monsterId?: string;
  /** Weighted pool, re-rolled per body, folded through the presence
   *  envelopes at the CASTER'S level (World.weightedPick — the brood
   *  breathes with the mother: per-row envelopes shape WHICH kin answer
   *  as she scales). */
  pool?: import('./presence').PresenceEntry[];
  /** Bodies per resolution [lo, hi] (default CLUTCH_CFG.count). */
  count?: [number, number];
  /** THE CLUTCH CAP — enemy lane: max live children per caster (bornOf
   *  census; at cap the birth is skipped, never evicted). Player lane: the
   *  synthetic delivery's maxActive base (minionMaxCount mods still apply).
   *  Default CLUTCH_CFG.cap / CLUTCH_CFG.minionCap by lane. */
  cap?: number;
  /** Player-lane lifespan seconds (× effectDuration — spawnMinion's own
   *  fold). Omit = permanent until killed. Enemy children are always
   *  permanent kin (the zone owns them now). */
  duration?: number;
  /** Projectile/strike gating: the birth moves to the per-victim hit site
   *  (resolveHit, dealt > 0, top-level) — it happens ONLY where a body was
   *  actually struck, bursting out of the wound. Without it, projectile
   *  births land at the flight's end whatever stopped it (the litePour
   *  law), and storms birth at every strike's landing. */
  onHit?: true;
  /** Enemy lane: children pay full bounty instead of the conjured-stream
   *  default (noBounty). */
  bounty?: 'full';
  /** Scatter radius around the landing (default CLUTCH_CFG.scatter). */
  scatter?: number;
  /** Spawn-time role tag (an AMBIENT_TAGS id exempts the brood from
   *  objectives — the standing exemption, never a new lever). */
  tag?: string;
  /** Emergence override (engine/emerge.ts EmergeSpec fields; default: the
   *  ground under the landing derives the motion — earth births RISE, water
   *  births SURFACE; onHit births burst out of the host). */
  emerge?: import('./emerge').EmergeSpec;
}

export const CLUTCH_CFG = {
  /** Default bodies per resolution. */
  count: [1, 1] as [number, number],
  /** THE CLUTCH CAP default — enemy lane: live children per caster. */
  cap: 8,
  /** Player-lane default roster cap (the synthetic delivery's maxActive
   *  base) when the spec is silent — minionMaxCount mods raise it. */
  minionCap: 2,
  /** Default scatter radius around the landing point (world units). */
  scatter: 26,
  /** Birth flash: radius + life (the accent stays small — the emergence
   *  grammar is the show; the flash is the punctuation). */
  flash: { radius: 34, life: 0.3 },
} as const;

/** Roll a birth's body count (the spec's band, else the config's). */
export function birthCount(fx: BirthEffect, roll: (lo: number, hi: number) => number): number {
  const band = fx.count ?? CLUTCH_CFG.count;
  return Math.max(0, Math.round(roll(band[0], band[1])));
}
