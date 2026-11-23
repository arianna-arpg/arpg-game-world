// ---------------------------------------------------------------------------
// DERIVED GAUGES — "per X" scaling over quantities the actor does not bank.
//
// The talent fabric's magnitude axis (docs/engine/talents.md). The sheet's
// gauge axis (Modifier.gauge / gaugeMod) already scales a modifier by any
// live INTEGER quantity the actor publishes — status stacks, charges, brim
// pips, reserve pips. This registry adds quantities that must be DERIVED:
// missing life in tenths, foes within reach, living minions, the ailments
// on your own body. Each row is a pure sampler; the world sweeps every
// actor at GAUGE_CFG.cadence and publishes only the gauges that something on
// that actor actually READS (Actor.gaugeReferenced — the whenRefs idiom), so
// a horde of uninvested monsters never pays a spatial scan.
//
// THE GAUGE GOLDEN RULE still governs (stats.ts Modifier.gauge): every row
// returns a bounded INTEGER, published on a cadence, never a per-frame
// float — the stat cache invalidates only when a published value changes.
// Rows never query the sheet for the stat they might scale (no loops).
//
// Quantities: 'life:missing' — tenths of maximum life missing (0–10);
// 'mana:missing' / 'es:missing' — the same for the other pools;
// 'foes:near' / 'allies:near' — living hostiles / same-side bodies within
// GAUGE_CFG.nearRadius (capped); 'minions' — the actor's living summons;
// 'afflictions' — distinct damaging ailments on the actor's own body;
// 'buffs' — distinct buffs the actor wears.
// ---------------------------------------------------------------------------

import type { Actor } from './actor';
import type { ItemInstance } from './items';
import { STATUS_DEFS } from './status';
import { ATTRIBUTES, type AttributeId } from './stats';
import { DEFENSE_CFG } from './defense';

export const GAUGE_CFG = {
  /** Seconds between samples per actor. */
  cadence: 0.25,
  /** The reach 'foes:near' / 'allies:near' count within (world units). */
  nearRadius: 220,
  /** Cap on the proximity counts (a gauge is bounded by construction). */
  nearCap: 10,
  /** Cap on the living-minion count. */
  minionCap: 20,
  /** Cap on 'still' — whole seconds stood still (THE ROOTED RAMP: a
   *  per-second gauge mod ramps to its full worth here). */
  stillCap: 5,
};

/** What a sampler may see of the world — a narrow view so the registry
 *  never depends on the World class. */
export interface GaugeWorld {
  actors: readonly Actor[];
  time: number;
  /** THE CASE GAUGE's read (engine/seatlaw.ts — 'seated:<container>'): the
   *  carry a body's seat holds, its side boards among it; undefined for a
   *  body that holds no seat (a minion, a monster). */
  carryOf?(actor: Actor): { containers: Record<string, readonly ItemInstance[]> } | undefined;
}

export interface DerivedGaugeDef {
  label: string;
  sample: (actor: Actor, world: GaugeWorld) => number;
}

export const DERIVED_GAUGES: Record<string, DerivedGaugeDef> = {};

export function registerDerivedGauge(id: string, def: DerivedGaugeDef): void {
  if (DERIVED_GAUGES[id]) console.warn(`[gauges] duplicate derived gauge '${id}' — last wins`);
  DERIVED_GAUGES[id] = def;
}

export const DERIVED_GAUGE_IDS = (): string[] => Object.keys(DERIVED_GAUGES);

const tenthsMissing = (cur: number, max: number): number =>
  max > 0 ? Math.max(0, Math.min(10, Math.floor((1 - cur / max) * 10 + 1e-6))) : 0;

const countNear = (a: Actor, w: GaugeWorld, hostile: boolean): number => {
  const r2 = GAUGE_CFG.nearRadius * GAUGE_CFG.nearRadius;
  let n = 0;
  for (const o of w.actors) {
    if (o === a || o.dead || o.downed) continue;
    if (hostile ? o.team === a.team : o.team !== a.team) continue;
    if (hostile && o.passive) continue;
    const dx = o.pos.x - a.pos.x, dy = o.pos.y - a.pos.y;
    if (dx * dx + dy * dy > r2) continue;
    if (++n >= GAUGE_CFG.nearCap) break;
  }
  return n;
};

registerDerivedGauge('life:missing', {
  label: 'per 10% of missing life',
  sample: a => tenthsMissing(a.life, a.maxLife()),
});
registerDerivedGauge('mana:missing', {
  label: 'per 10% of missing mana',
  sample: a => tenthsMissing(a.mana, a.maxMana()),
});
registerDerivedGauge('es:missing', {
  label: 'per 10% of missing energy shield',
  sample: a => tenthsMissing(a.es, a.maxEs()),
});
registerDerivedGauge('foes:near', {
  label: 'per nearby enemy',
  sample: (a, w) => countNear(a, w, true),
});
registerDerivedGauge('allies:near', {
  label: 'per nearby ally',
  sample: (a, w) => countNear(a, w, false),
});
registerDerivedGauge('minions', {
  label: 'per living minion',
  sample: (a, w) => {
    let n = 0;
    for (const o of w.actors) {
      if (o.owner === a && !o.dead) { if (++n >= GAUGE_CFG.minionCap) break; }
    }
    return n;
  },
});
registerDerivedGauge('solitary', {
  label: 'while you have no living minions',
  sample: (a, w) => {
    for (const o of w.actors) if (o.owner === a && !o.dead) return 0;
    return 1;
  },
});
registerDerivedGauge('afflictions', {
  label: 'per damaging ailment on you',
  sample: a => {
    let n = 0;
    for (const s of a.statuses) if (s.stacks > 0 && STATUS_DEFS[s.id]?.dotType) n++;
    return n;
  },
});
registerDerivedGauge('buffs', {
  label: 'per buff on you',
  sample: a => a.buffs.size,
});
// THE ROOTED RAMP (THE LEGEND FABRIC — The Unmoved): whole seconds this
// body has stood still (Actor.idleFor — zeroed by every willed step, dash,
// leap and live shove), capped so a per-second gauge mod is bounded by
// construction ("N% more damage per second standing still, up to 5").
registerDerivedGauge('still', {
  label: `per second standing still (up to ${GAUGE_CFG.stillCap})`,
  sample: a => Math.max(0, Math.min(GAUGE_CFG.stillCap, Math.floor(a.idleFor))),
});

// ATTRIBUTE-STACKING GAUGES ('attr10:<id>'): whole 10-point increments of each
// attribute (read off Actor.attributeValues, zero sheet queries). Bounded at
// 200 (2,000 attribute points) so cache invalidation stays sparse and honest.
for (const attrId of Object.keys(ATTRIBUTES) as AttributeId[]) {
  const lbl = ATTRIBUTES[attrId].label;
  registerDerivedGauge(`attr10:${attrId}`, {
    label: `per 10 ${lbl}`,
    sample: a => Math.max(0, Math.min(200, Math.floor((a.attributeValues?.[attrId] ?? 0) / 10))),
  });
}

// CHARACTER LEVEL GAUGE ('level'): lets flat passive magnitudes (flat hit DR,
// thorns, flat added damage, hitCap, block value, flat on-hit/block recovery)
// scale smoothly from Act 1 through endgame without breaking low-level curves.
registerDerivedGauge('level', {
  label: 'per character level',
  sample: a => Math.max(1, Math.min(200, Math.floor(a.level ?? 1))),
});

// EXCESS ACCURACY GAUGE ('accOver'): whole 50-point increments of accuracy
// standing above the character's level baseline (150 + 15 * level), capped at
// 40 (= 2,000 excess accuracy). Turns excess accuracy into a build-around scaler.
registerDerivedGauge('accOver', {
  label: 'per 50 excess accuracy',
  sample: a => {
    const base = 150 + 15 * Math.max(1, Math.floor(a.level ?? 1));
    const over = a.sheet.get('accuracy') - base;
    return over > 0 ? Math.min(40, Math.floor(over / 50)) : 0;
  },
});

// RECENT WOUNDS / TRAUMA GAUGE ('wounds'): integer stack count (0..25) fed by
// incoming life damage, voluntary costToLife payments, and traumaCost casts;
// decays after 4s without fresh wounds.
registerDerivedGauge('wounds', {
  label: 'per recent wound stack (up to 25)',
  sample: a => Math.max(0, Math.min(25, a.woundStacks ?? 0)),
});

// KINETIC INERTIA GAUGE ('inertia'): integer stack count (0..20) built by moving
// and decayed after 3.5s idle or discharged on hit by inertiaDischarge.
registerDerivedGauge('inertia', {
  label: 'per Kinetic Inertia stack (up to 20)',
  sample: a => Math.max(0, Math.min(20, a.inertiaStacks ?? 0)),
});

// HARMONIC PITCH GAUGE ('harmony'): integer stack count (0..10) climbed by
// alternating skill damage/class families; repeating resets to 0.
registerDerivedGauge('harmony', {
  label: 'per Harmonic Pitch stack (up to 10)',
  sample: a => Math.max(0, Math.min(10, a.harmonyStacks ?? 0)),
});

// CHITIN CARAPACE GAUGE ('molt'): integer stack count (0..10) hardened on
// taking or blocking hits; reaching 10 triggers Molt Shrapnel and resets to 0.
registerDerivedGauge('molt', {
  label: 'per Chitin stack (up to 10)',
  sample: a => Math.max(0, Math.min(10, a.moltStacks ?? 0)),
});

// POLYCHROME STRAIN GAUGE ('prism'): count of distinct damage types dealt
// within the last 6 seconds (0..5: physical, fire, cold, lightning, chaos).
registerDerivedGauge('prism', {
  label: 'per distinct damage type dealt recently (up to 5)',
  sample: a => Math.max(0, Math.min(5, a.prismCount ?? 0)),
});

// BONE-SHIELD CHARGES GAUGE ('aegisCharges'): charges banked on block/parry
// (0..5) and discharged on the next attack hit via blockBladeSlash.
registerDerivedGauge('aegisCharges', {
  label: 'per Bone-Shield Charge (up to 5)',
  sample: a => Math.max(0, Math.min(5, a.aegisCharges ?? 0)),
});

// OVERLOAD RUNES GAUGE ('overload'): escalating spell charge stacks (0..4)
// discharged by non-spell skills to restore mana.
registerDerivedGauge('overload', {
  label: 'per Overload Rune (up to 4)',
  sample: a => Math.max(0, Math.min(4, a.overloadStacks ?? 0)),
});

// ABYSSAL TRANCE GAUGE ('trance'): ramping chaos/curse trance stacks (0..15)
// climbing +1/s while in combat and draining mana/ES until exhausted.
registerDerivedGauge('trance', {
  label: 'per Abyssal Trance stack (up to 15)',
  sample: a => Math.max(0, Math.min(15, a.tranceStacks ?? 0)),
});

// REMAINING POOL GAUGES ('mana:full', 'es:full'): whole 10% increments of
// remaining Mana or Energy Shield (0..10) — the mirror of ':missing' for
// high-resource surplus builds (Brimming Frenzy, Crystalline Bastion).
const tenthsRemaining = (cur: number, max: number): number =>
  max > 0 ? Math.max(0, Math.min(10, Math.floor((cur / max) * 10 + 1e-6))) : 0;
registerDerivedGauge('mana:full', {
  label: 'per 10% remaining mana',
  sample: a => tenthsRemaining(a.mana, a.maxMana()),
});
registerDerivedGauge('es:full', {
  label: 'per 10% remaining energy shield',
  sample: a => tenthsRemaining(a.es, a.maxEs()),
});

// UNDYING OFFERING GAUGE ('offering'): stacks harvested by slaying afflicted
// foes (or every 3rd hit vs afflicted elites/bosses), 0..12.
registerDerivedGauge('offering', {
  label: 'per Undying Offering stack (up to 12)',
  sample: a => Math.max(0, Math.min(12, a.offeringStacks ?? 0)),
});

// STATIC TRANSFERRAL GAUGE ('staticCharge'): charges banked by non-cooldown
// attack hits (0..5) and discharged by spenders or cooldown skills.
registerDerivedGauge('staticCharge', {
  label: 'per Static Charge (up to 5)',
  sample: a => Math.max(0, Math.min(5, a.staticCharges ?? 0)),
});

// RECENT MINION DEATHS GAUGE ('recentMinionDeaths'): exact count of this
// actor's minions that died within actor.recentWindowFor() (0..25).
registerDerivedGauge('recentMinionDeaths', {
  label: 'per recent minion death (up to 25)',
  sample: a => Math.max(0, Math.min(25, a.recentMinionDeaths ?? 0)),
});

// PUGILIST'S CADENCE GAUGE ('cadence'): consecutive primary hits banked toward the 4th-hit finisher (0..3).
registerDerivedGauge('cadence', {
  label: 'per Pugilist Cadence count (up to 3)',
  sample: a => Math.max(0, Math.min(3, a.cadenceHits ?? 0)),
});

// ANOINTED SILVER QUIVER GAUGE ('silverAmmo'): loaded silver rounds (0..5); spent by projectiles, reloaded by movement or time.
registerDerivedGauge('silverAmmo', {
  label: 'per loaded Anointed Silver round (up to 5)',
  sample: a => Math.max(0, Math.min(5, a.silverAmmo ?? 0)),
});

// UNDERTAKER'S HARVEST GAUGE ('harvest'): necrotic harvest stacks collected from Bile Globes (0..8).
registerDerivedGauge('harvest', {
  label: 'per Undertaker Harvest stack (up to 8)',
  sample: a => Math.max(0, Math.min(8, a.harvestStacks ?? 0)),
});

// ACADEMIC FIELDWORK TROPHY GAUGE ('trophy'): elite/boss trophy stacks (0..5, 20s duration).
registerDerivedGauge('trophy', {
  label: 'per Academic Trophy stack (up to 5)',
  sample: a => Math.max(0, Math.min(5, a.trophyStacks ?? 0)),
});

// INTRAVENOUS NEURAL SURGE GAUGE ('neuralSurge'): crit-stacked neural surge charges (0..5); discharges at 5.
registerDerivedGauge('neuralSurge', {
  label: 'per Neural Surge stack (up to 5)',
  sample: a => Math.max(0, Math.min(5, a.neuralSurgeStacks ?? 0)),
});

// FUELED MOMENTUM GAUGE ('fueled'): kill / elite-hit momentum stacks (0..10, 7s duration).
registerDerivedGauge('fueled', {
  label: 'per Fueled Momentum stack (up to 10)',
  sample: a => Math.max(0, Math.min(10, a.fueledStacks ?? 0)),
});

// CARAPACE INTEGRATED BLOCK CHARGES GAUGE ('blockCharges'): banked guard charges from cooldown/guard casts (0..4).
registerDerivedGauge('blockCharges', {
  label: 'per Integrated Block Charge (up to 4)',
  sample: a => Math.max(0, Math.min(4, a.blockCharges ?? 0)),
});

// CRITICAL BLAST CHARGE GAUGE ('critCharge'): crit charges banked toward 3rd-crit concussive stun detonation (0..3).
registerDerivedGauge('critCharge', {
  label: 'per Critical Blast charge (up to 3)',
  sample: a => Math.max(0, Math.min(3, a.critChargeCount ?? 0)),
});

// OVERCAPPED RESISTANCE GAUGES ('overcap5:<el>'): whole 5% increments of
// uncapped resistance standing above the actor's active cap (capped at 40 = 200% overcap).
for (const [el, stat, lbl] of [
  ['fire', 'fireRes', 'Fire'],
  ['cold', 'coldRes', 'Cold'],
  ['lightning', 'lightningRes', 'Lightning'],
  ['chaos', 'chaosRes', 'Chaos'],
] as const) {
  registerDerivedGauge(`overcap5:${el}`, {
    label: `per 5% overcapped ${lbl} Resistance`,
    sample: a => {
      const cap = Math.min(a.sheet.get(stat + 'Max'), DEFENSE_CFG.resistance.hardCap);
      const over = a.sheet.get(stat) - cap;
      return over > 0 ? Math.min(40, Math.floor(over * 20 + 1e-6)) : 0;
    },
  });
}
