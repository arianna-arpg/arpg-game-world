// ---------------------------------------------------------------------------
// TERRAIN ATTUNEMENTS & TERRAFORMS — actor↔doodad resonance as DATA.
//
// Two generated stat families let any modifier source (passive node, vocation
// node, support gem, future affix, monster innate) interact with the living
// terrain:
//
//   • ATTUNEMENT (`attune_<id>` > 0): while the bearer stands near a doodad of
//     the def's kinds for `attuneTime`, the def's STATUS is applied and then
//     refreshed every engine tick spent in range — walk away and the status
//     wilts off on its own short duration. "Near a tree you knit flesh" is
//     one def + one status + one modifier.
//
//   • TERRAFORM (`terraform_<id>` > 0): the bearer periodically GROWS a
//     transient doodad of the def's kind nearby, which wilts away after its
//     ttl. The stat's VALUE is a RATE multiplier (1 = the def's interval,
//     2 = twice as fast) — investable. Grown doodads are REAL doodads: they
//     cull/render/spatial-index like terrain and — the intended synergy —
//     they satisfy attunement defs whose `kinds` include them. A Greenwarden
//     carries the forest with them.
//
// Both engine passes live in world.ts (updateAttunements/updateTerraforms,
// throttled). Registries here are open: add a def + a status and any actor
// with the stat participates — no engine edits.
// ---------------------------------------------------------------------------

import { STAT_DEFS } from '../engine/stats';
import { registerDoodadRule } from '../engine/levelgen';
import { SPATIAL_CFG } from '../engine/spatial';

export interface DoodadAttunementDef {
  id: string;
  label: string;
  /** Doodad kinds that resonate (any of). */
  kinds: string[];
  /** Reach from the bearer's centre to the doodad's disc edge. MUST stay ≤
   *  SPATIAL_CFG.queryPad (96): the engine reads the one-bucket doodadsAt
   *  candidate set, which is complete only up to the pad. The validator
   *  enforces this. */
  radius: number;
  /** Status applied once attuned (its StatusDef carries the actual power);
   *  refreshed every tick spent in range, so its own short duration is the
   *  linger-after-leaving. */
  status: string;
  /** Seconds of standing near before the communion begins. */
  attuneTime: number;
}

export interface TerraformDef {
  id: string;
  label: string;
  /** The doodad kind grown. Non-blocking kinds recommended (a wilting solid
   *  would fence the arena); 'sapling' registers as ground overlap below. */
  doodadKind: string;
  /** Seconds between growths at stat value 1 (the value DIVIDES this). */
  interval: number;
  /** Lifespan band rolled per growth; the doodad's `wilt` fraction (0→1)
   *  drives the renderer's fade/shrink. */
  ttl: [number, number];
  /** Distance band from the bearer where growth lands. */
  radius: [number, number];
  /** Doodad disc radius band. */
  size: [number, number];
  /** Living growths per bearer — the oldest is released past the cap. */
  maxAlive: number;
}

// --- registries ----------------------------------------------------------------

export const ATTUNEMENTS: Record<string, DoodadAttunementDef> = {
  verdant_communion: {
    id: 'verdant_communion', label: 'Verdant Communion',
    kinds: ['tree', 'sapling', 'thicket', 'palm'],
    radius: 90,
    status: 'verdant_communion',
    attuneTime: 1.2,
  },
};

export const TERRAFORMS: Record<string, TerraformDef> = {
  sapling_ring: {
    id: 'sapling_ring', label: 'Seedbearer',
    doodadKind: 'sapling',
    interval: 5,
    ttl: [8, 13],
    radius: [55, 130],
    size: [7, 11],
    maxAlive: 4,
  },
};

export const ATTUNEMENT_LIST: DoodadAttunementDef[] = Object.values(ATTUNEMENTS);
export const TERRAFORM_LIST: TerraformDef[] = Object.values(TERRAFORMS);

/** The stat whose value (> 0) switches an attunement on for its bearer. */
export function attuneStat(id: string): string { return 'attune_' + id; }
/** The stat whose value multiplies a terraform's growth RATE for its bearer. */
export function terraformStat(id: string): string { return 'terraform_' + id; }

// Register the generated stat families (the status.ts apply_<id> idiom: the
// stats live beside the registry they mirror, so they can never drift).
for (const def of ATTUNEMENT_LIST) {
  STAT_DEFS[attuneStat(def.id)] = {
    label: `Attunement: ${def.label}`, base: 0, min: 0,
  };
}
for (const def of TERRAFORM_LIST) {
  STAT_DEFS[terraformStat(def.id)] = {
    label: `Terraform: ${def.label}`, base: 0, min: 0,
  };
}

// The sapling: a young, NON-blocking tree (a wilting solid would fence the
// arena). Registered here so the kind exists wherever attunements load.
registerDoodadRule('sapling', { overlap: 'ground' });

/** Authoring guard used by validateContent — attunement reach must stay inside
 *  the spatial index's one-bucket completeness guarantee. */
export const MAX_ATTUNE_RADIUS = SPATIAL_CFG.queryPad;
