// ---------------------------------------------------------------------------
// EXTRACTION — the inverse of Breach, in one def file.
//
// Breach places a door and asks you to SHUT it; Extraction places a PRIZE and
// asks you to keep it standing. While adventuring you come across a seam where
// the world's marrow wells up (its face is per-biome — data/extraction.ts).
// DWELL to tap it and a rolled defense clock starts — long clocks are rare and
// rich (the scale weights). The zone's own population pours in fixated on the
// disturbance (the tuning graft + the threat chart), turning on you only when
// you give it a reason; a minority of essence-drawn opportunists (the Marrow-
// Drawn, this package's grafted faction) follow seams into any country. When
// it ends — drained dry or torn down — the swarm disperses back the way it
// came, each body by its own TEMPER, and the seam pays out in ESSENCE packets
// scaled by how long the stand held. Coarse essence is the salvage station's
// bootstrap faucet, so this event is also the Vault's front door — which is
// exactly why the pots are SMALL (the essence economy stays reined in).
//
// Map-level: the ExtractionField overlay is just the SPENT LEDGER (a drained
// zone can't re-roll its seam until it replenishes) — the in-zone machinery is
// the extract encounter, engine-side.
// ---------------------------------------------------------------------------

import type { World } from '../../engine/world';
import { ESSENCES } from '../../data/essences';
import { extractionNodeIds, extractionLookFor } from '../../data/extraction';
import { registerAttentionSource, type AttentionPoint } from '../../world/attention';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { ExtractionField, type ExtractionSurge } from '../overlays/extraction';
import type { EncounterDef } from '../encounters';
import type { ContentPackage, FactionSpec } from '../types';

/** Map-level knobs (the in-zone numbers ride the encounter's extract block). */
const EXTRACTION_SURGE: ExtractionSurge = {
  respawnSec: 600, // a spent seam refills after ten world-minutes elsewhere
};

/** THE MARROW-DRAWN — essence-starved opportunists that follow seams into any
 *  country (the minority seasoning in every extraction swarm; swarm.mixChance).
 *  contexts:['extraction'] keeps them OUT of ordinary generation entirely —
 *  they exist only where marrow bleeds. Neutral to every other faction by
 *  silence: at a feeding, everything faces the seam first. Skittish temper:
 *  the moment the marrow stops, so does their interest. */
const MARROWDRAWN_FACTION: FactionSpec = {
  id: 'marrowdrawn',
  name: 'the Marrow-Drawn',
  color: '#a5e3b4',
  traits: { roaming: 0.5, aggression: 0.9, warlordHome: 'capital', contexts: ['extraction'], temper: 'skittish' },
  roster: [
    { id: 'marrow_moth', weight: 5 },
    { id: 'marrow_leech', weight: 4 },
    { id: 'seep_burrower', weight: 3 },
    { id: 'vein_glutton', weight: 2 },
    // The muster pass: the lancer of set bone and the harrow that calls
    // the marrow up through the floor.
    { id: 'ossein_lancer', weight: 2 },
    { id: 'spur_harrow', weight: 1 },
    { id: 'marrow_tyrant', weight: 1 },
  ],
};

/** The in-zone extract encounter: every number of the defense, as data. */
const EXTRACTION_ENCOUNTER: EncounterDef = {
  id: 'extraction',
  packageId: 'extraction',
  label: 'Extraction',
  factions: ['marrowdrawn'], // the MIX roster — the zone's own table is the body of the swarm
  trigger: { glyph: '❖', color: '#a5e3b4', activateRadius: 52 },
  timePerKill: 0,   // the extract clock is NEVER kill-fed — it counts down, honestly
  radiusPerKill: 0,
  // THE ROLLED CLOCK: longer draws are rarer and richer — weight is the
  // rarity dial, baseTime the ceiling, rewardMul the pot, nodeLifeMul the
  // node's stubbornness. (startRadius doubles as the field's drawn ring;
  // spawnInterval/Batch are superseded by the swarm director's ramp bands.)
  scales: [
    { id: 'shallow', label: 'Shallow Seam', weight: 58,
      baseTime: 40, maxBonusTime: 0, startRadius: 340, maxRadius: 340, growthPerSec: 0,
      spawnInterval: [3.4, 4.6], spawnBatch: [2, 3], rewardMul: 1, nodeLifeMul: 1 },
    { id: 'deep', label: 'Deep Seam', weight: 27,
      baseTime: 70, maxBonusTime: 0, startRadius: 340, maxRadius: 340, growthPerSec: 0,
      spawnInterval: [3.4, 4.6], spawnBatch: [2, 3], rewardMul: 1.9, nodeLifeMul: 1.35 },
    { id: 'rich', label: 'Rich Seam', weight: 11,
      baseTime: 105, maxBonusTime: 0, startRadius: 340, maxRadius: 340, growthPerSec: 0,
      spawnInterval: [3.4, 4.6], spawnBatch: [2, 3], rewardMul: 3.2, nodeLifeMul: 1.75 },
    { id: 'primeval', label: 'Primeval Seam', weight: 4,
      baseTime: 150, maxBonusTime: 0, startRadius: 340, maxRadius: 340, growthPerSec: 0,
      spawnInterval: [3.4, 4.6], spawnBatch: [2, 3], rewardMul: 5, nodeLifeMul: 2.2 },
  ],
  ledger: {
    onEncounter: 'extraction_begun',       // first armed dwell → discovery
    onClose: 'extractions_completed',      // the investment milestone
  },
  extract: {
    node: { lifeBase: 110, lifePerLevel: 24 },
    arm: { dwellSec: 1.7, radius: 52 },
    swarm: {
      source: 'native',       // the DISTURBED LOCALS thesis — the zone itself objects
      mixChance: 0.22,        // …seasoned with the Marrow-Drawn
      intervalStart: [3.4, 4.6], intervalEnd: [1.5, 2.2],
      batchStart: [2, 3], batchEnd: [3, 5],
      rampPower: 1.35,
      fieldCap: 14,
      levelBonus: 1,
      entryRadius: [300, 420],
      seedThreat: 55,         // the disturbance, stamped at spawn (× aggro.fixation)
      pulseThreat: 26,        // the standing pull, re-seeded each beat
      beaconSec: 2.2,
      decay: 0.10,            // player grudges melt a touch faster than the chart default…
      stickiness: 1.15,       // …and locks hold with a little loyalty (no ping-pong)
    },
    yield: {
      essence: 'coarse',
      potBase: 2.6, potPerLevel: 0.09,   // small on purpose — a faucet, not a fortune
      packets: 3,
      partialPower: 1.35, minFrac: 0.12,
      rungs: [                            // the essences.ts tierRungs idiom
        { atLevel: 8, chance: 0.15 },     // coarse → glimmering
        { atLevel: 16, chance: 0.10 },    // glimmering → brilliant
        { atLevel: 26, chance: 0.06 },    // brilliant → pristine
      ],
      fullDefenseRungBonus: 0.06,
      xpBase: 26, xpPerLevel: 9,
    },
    disperse: { lingerSec: [14, 26], arriveDist: 56 },
    ledgerLost: 'extractions_lost',
    text: {
      found: 'something wells up from below…',
      armed: 'the seam is tapped — the ground remembers who it belongs to',
      depleted: 'the seam runs dry — its marrow is yours',
      shattered: 'the seam is torn apart — what little bled free is yours',
    },
  },
};

export const EXTRACTION: ContentPackage = {
  id: 'extraction',
  label: 'Extraction',
  blurb: 'Seams of the world\'s marrow well up in the wilds. Tap one, and hold the line while it pays out in essence — the longer the draw, the richer the vein.',
  color: '#a5e3b4',
  cost: 70,
  // DISCOVERY: the Vault surfaces Extraction's config once you've TAPPED one
  // (they seed from level 5 — deliberately early: the coarse trickle is the
  // salvage station's front door).
  unlock: {
    id: 'extraction_attune',
    label: 'Tap an essence seam (they well up from level 5)',
    test: (ctx) => (ctx.ledger.extraction_begun ?? 0) >= 1,
  },
  tiers: [
    { id: 'extraction_invest', label: 'Deeper Veins', requirement: 'Drain 4 seams dry', cost: 110,
      test: (ctx) => (ctx.ledger.extractions_completed ?? 0) >= 4,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'extraction_master', label: 'The Long Draw', requirement: 'Drain 12 seams dry', cost: 200,
      test: (ctx) => (ctx.ledger.extractions_completed ?? 0) >= 12,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
  ],
  modifiers: [
    { id: 'extraction_start', kind: 'startLevel', label: 'Seams well up at level', min: 5, max: 5, step: 1, defaultValue: 5 },
    { id: 'extraction_weight', kind: 'weight', label: 'Seam frequency', min: 30, max: 60, step: 5, defaultValue: 45 },
  ],
  defaultWeight: 45,
  defaultStartLevel: 5,
  defaultEnabled: true, // a base-game feature DISCOVERED in play (the Vault unlock gates tuning)
  world: { overlay: (ctx) => new ExtractionField(ctx, EXTRACTION_SURGE) },
  encounters: [EXTRACTION_ENCOUNTER],
  factions: [MARROWDRAWN_FACTION],
  validate: (look) => {
    const bad: string[] = [];
    // The seam's per-biome faces: every node body must resolve (roster ids are
    // swept generically; these are private to the looks registry).
    for (const id of extractionNodeIds()) {
      if (!look.monster(id)) bad.push(`extraction look node '${id}' is not a monster`);
    }
    const ex = EXTRACTION_ENCOUNTER.extract!;
    if (!(ex.yield.essence in ESSENCES)) bad.push(`extraction yield essence '${ex.yield.essence}' unknown`);
    for (let i = 1; i < ex.yield.rungs.length; i++) {
      if (ex.yield.rungs[i].atLevel <= ex.yield.rungs[i - 1].atLevel) {
        bad.push('extraction yield rungs must ascend by atLevel');
      }
    }
    if (!(ex.yield.minFrac >= 0 && ex.yield.minFrac < 1)) bad.push('extraction yield.minFrac out of [0,1)');
    if (!(ex.swarm.mixChance >= 0 && ex.swarm.mixChance <= 1)) bad.push('extraction swarm.mixChance out of [0,1]');
    if (ex.yield.packets < 1) bad.push('extraction yield.packets must be >= 1');
    if (ex.arm.dwellSec <= 0) bad.push('extraction arm.dwellSec must be > 0');
    if (ex.swarm.entryRadius[0] > ex.swarm.entryRadius[1]) bad.push('extraction swarm.entryRadius inverted');
    for (const s of EXTRACTION_ENCOUNTER.scales) {
      if (!(s.nodeLifeMul && s.nodeLifeMul > 0)) bad.push(`extraction scale '${s.id}' needs nodeLifeMul > 0`);
    }
    return bad;
  },
};

// --- In-zone surfaces (import-time registration; no engine edits) ------------

/** The screen-edge chevron: point at the seam while it's off-screen — dormant
 *  (a discovery you'd otherwise walk past) and open (the thing to defend). */
registerAttentionSource((world: World): AttentionPoint[] => {
  const out: AttentionPoint[] = [];
  for (const e of world.encountersView()) {
    if (!e.def.extract || e.phase === 'closing') continue;
    const look = extractionLookFor(world.zone.biome);
    out.push({
      id: `extraction-${e.pos.x | 0}-${e.pos.y | 0}`,
      pos: e.pos,
      color: look.accent,
      glyph: e.def.trigger.glyph,
      label: e.phase === 'open' ? `the ${look.title.toLowerCase()} — hold the line!` : undefined,
      z: e.phase === 'open' ? 8 : 4,
    });
  }
  return out;
});

/** The zone-info row (map side panel) for the zone you stand in. */
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  if (zoneId !== world.zone.id) return [];
  const out: ZoneInfoEntry[] = [];
  for (const e of world.encountersView()) {
    if (!e.def.extract || e.phase === 'closing') continue;
    const look = extractionLookFor(world.zone.biome);
    out.push({
      kind: 'event', icon: e.def.trigger.glyph, color: look.accent,
      label: e.phase === 'open' ? `${look.title} — extraction underway` : `${look.title} wells up here`,
      z: 5,
    });
  }
  return out;
});
