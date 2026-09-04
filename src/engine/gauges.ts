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
import { STATUS_DEFS } from './status';

export const GAUGE_CFG = {
  /** Seconds between samples per actor. */
  cadence: 0.25,
  /** The reach 'foes:near' / 'allies:near' count within (world units). */
  nearRadius: 220,
  /** Cap on the proximity counts (a gauge is bounded by construction). */
  nearCap: 10,
  /** Cap on the living-minion count. */
  minionCap: 20,
};

/** What a sampler may see of the world — a narrow view so the registry
 *  never depends on the World class. */
export interface GaugeWorld {
  actors: readonly Actor[];
  time: number;
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
