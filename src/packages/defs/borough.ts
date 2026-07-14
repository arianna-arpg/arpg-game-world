// ---------------------------------------------------------------------------
// BOROUGH — the defended village, in one def file.
//
// Extraction asks you to keep a PRIZE standing; the Borough asks you to keep
// PEOPLE standing. While adventuring you come across a small settlement of
// friendly folk in temperate country (the biomes allowlist). Sighting it
// starts a fair, visible MUSTER — a countdown to an incoming horde (the
// zone's own population, poured through the shared swarm director and
// fixated on the FOLK via the threat chart, so Goad and the Quiet Hand are
// emergently the bodyguard levers). During the muster — and, this def says,
// right through the fight — you may ARM villagers: dwell by one to offer
// your gear (its compiled mods graft onto their body) or spend the essence
// wallet on the per-tint packages below. Armed folk step out of the huddle
// and fight through the one shared pipeline; unarmed folk cower (a dormant
// tag with no rouse rule — helpless is the point). Hold until the horde
// spends itself and the survivors take the road: LASTLIGHT'S POPULATION
// GROWS (the BoroughField overlay), Brandt's shelf richens with it
// (data/boroughs.ts), and the run's town-building layer has its founding
// stone. Lose every villager and the ground falls silent.
//
// Map-level: the BoroughField overlay is the SPENT LEDGER + THE POPULATION —
// the in-zone machinery is the borough encounter, engine-side.
// ---------------------------------------------------------------------------

import { POPULATION_CFG } from '../../data/boroughs';
import { ESSENCES } from '../../data/essences';
import { registerTransit } from '../../data/transit';
import { START_ZONE } from '../../data/zones';
import { registerDormantTag } from '../../engine/ai';
import { mod } from '../../engine/stats';
import type { World } from '../../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../../world/attention';
import { registerBulletinSource } from '../../world/bulletins';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { BoroughField, type BoroughSurge } from '../overlays/borough';
import type { EncounterDef } from '../encounters';
import type { ContentPackage } from '../types';

const ACCENT = '#e8c87a'; // lamplight gold — the borough speaks in hearth tones

/** Map-level knobs (the in-zone numbers ride the encounter's borough block). */
const BOROUGH_SURGE: BoroughSurge = {
  resettleSec: 900, // spent ground resettles after fifteen world-minutes elsewhere
  arrivalBulletin: '+{n} souls reach Lastlight — the town grows',
  arrivalColor: ACCENT,
};

/** The in-zone borough encounter: every number of the stand, as data. */
const BOROUGH_ENCOUNTER: EncounterDef = {
  id: 'borough',
  packageId: 'borough',
  label: 'Borough',
  factions: [], // the horde is the zone's OWN population (swarm.source 'native')
  trigger: { glyph: '⌂', color: ACCENT, activateRadius: 60 },
  timePerKill: 0,   // the muster and the assault are honest clocks — never kill-fed
  radiusPerKill: 0,
  // Villages settle temperate, homestead-able country only — the generic
  // encounter biome allowlist (a seam wells up anywhere; a village does not).
  biomes: ['grove', 'forest', 'field', 'highland', 'taiga', 'beach'],
  // THE ROLLED SETTLEMENT: bigger stands are rarer — more souls to save (and
  // to lose), a longer assault, richer close xp. baseTime = ASSAULT seconds.
  scales: [
    { id: 'hamlet', label: 'Hamlet', weight: 56,
      baseTime: 45, maxBonusTime: 0, startRadius: 320, maxRadius: 320, growthPerSec: 0,
      spawnInterval: [3.6, 4.8], spawnBatch: [2, 3], rewardMul: 1 },
    { id: 'village', label: 'Village', weight: 32,
      baseTime: 70, maxBonusTime: 0, startRadius: 320, maxRadius: 320, growthPerSec: 0,
      spawnInterval: [3.6, 4.8], spawnBatch: [2, 3], rewardMul: 1.6 },
    { id: 'borough', label: 'Borough', weight: 12,
      baseTime: 100, maxBonusTime: 0, startRadius: 320, maxRadius: 320, growthPerSec: 0,
      spawnInterval: [3.6, 4.8], spawnBatch: [2, 3], rewardMul: 2.4 },
  ],
  ledger: {
    onEncounter: 'borough_found',   // first sighting → discovery (the muster starts)
    onClose: 'boroughs_held',       // the investment milestone
  },
  borough: {
    folk: {
      roster: [
        { id: 'borough_villager', weight: 4 },
        { id: 'borough_warden', weight: 1 },
      ],
      byScale: { hamlet: [3, 4], village: [5, 6], borough: [7, 9] },
      levelBonus: 0,
      huddleRadius: 60,
    },
    muster: {
      seconds: 45,
      discoverRadius: 340,
      armWindow: 'always', // battlefield triage is allowed — arming mid-fight is play
    },
    arming: {
      radius: 64,
      dwellSec: 0.8, // fallback; the 'borough_arm' transit row is the tuned truth
      maxGifts: 3,
      // The act of being armed at all — any gift makes a militiaman.
      gearBaseline: [
        mod('life', 'flat', 30),
        mod('damage', 'increased', 0.25),
        mod('armor', 'flat', 12),
      ],
      giftRarityMul: { common: 1, magic: 1.35, rare: 1.8, unique: 2.4 },
      // The essence channels — coarse and above, each tint its own doctrine.
      essence: {
        coarse: { cost: 4, maxStacks: 5, label: '+22 life, +2 life regen',
          mods: [mod('life', 'flat', 22), mod('lifeRegen', 'flat', 2)] },
        glimmering: { cost: 3, maxStacks: 4, label: '+16% damage, +15 accuracy',
          mods: [mod('damage', 'increased', 0.16), mod('accuracy', 'flat', 15)] },
        brilliant: { cost: 3, maxStacks: 3, label: '+24% damage, +24 armor',
          mods: [mod('damage', 'increased', 0.24), mod('armor', 'flat', 24)] },
        pristine: { cost: 2, maxStacks: 2, label: '25% MORE life and damage',
          mods: [mod('life', 'more', 0.25), mod('damage', 'more', 0.25)] },
      },
    },
    assault: {
      graceSec: 20,
      swarm: {
        source: 'native',      // the wilds converge on the settlement — the land objects to a home
        mixChance: 0,          // no grafted seasoning (a raider faction is one FactionSpec away)
        intervalStart: [3.6, 4.8], intervalEnd: [1.6, 2.4],
        batchStart: [2, 3], batchEnd: [3, 5],
        rampPower: 1.3,
        fieldCap: 13,
        levelBonus: 1,
        entryRadius: [340, 460],
        seedThreat: 60,        // the folk are the quarry, stamped at spawn (× aggro.fixation)
        pulseThreat: 30,       // the standing peril, re-seeded each beat
        beaconSec: 2.4,
        decay: 0.10,           // a Goad's grudge melts back toward the folk…
        stickiness: 1.2,       // …but locks hold with loyalty (no ping-pong)
      },
      disperse: { lingerSec: [12, 22], arriveDist: 56 },
    },
    refugees: {
      populationPer: 1,
      arriveDist: 56,
      xpBase: 30, xpPerSurvivor: 12,
    },
    site: {
      center: { kind: 'campfire' },
      dressing: [
        { kind: 'hay_bale', count: [2, 4], ring: [46, 120] },
        { kind: 'broken_cart', count: [1, 2], ring: [80, 160] },
      ],
    },
    ledgerLost: 'boroughs_lost',
    ledgerRefugees: 'borough_refugees',
    text: {
      found: 'a borough! its folk brace for the horde…',
      assault: 'the horde breaks upon the borough!',
      held: 'the borough stands — its folk take the road to Lastlight',
      lost: 'the borough falls silent…',
    },
  },
};

export const BOROUGH: ContentPackage = {
  id: 'borough',
  label: 'Borough',
  blurb: 'Settlements of friendly folk raise their hearths in the wilds — and the wilds object. Arm the villagers with your gear and essence, hold the line when the horde breaks, and every survivor becomes a soul in Lastlight.',
  color: ACCENT,
  cost: 90,
  // DISCOVERY: the Vault surfaces the Borough's config once you've SIGHTED one
  // (they muster from level 4 — early: the population economy should start
  // growing while the run is young).
  unlock: {
    id: 'borough_attune',
    label: "Come to a borough's aid (they muster from level 4)",
    test: (ctx) => (ctx.ledger.borough_found ?? 0) >= 1,
  },
  tiers: [
    { id: 'borough_invest', label: 'Raised Palisades', requirement: 'Hold 2 boroughs', cost: 120,
      test: (ctx) => (ctx.ledger.boroughs_held ?? 0) >= 2,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'borough_master', label: 'The Long Refuge', requirement: 'Hold 6 boroughs', cost: 220,
      test: (ctx) => (ctx.ledger.boroughs_held ?? 0) >= 6,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
  ],
  modifiers: [
    { id: 'borough_start', kind: 'startLevel', label: 'Boroughs muster at level', min: 4, max: 4, step: 1, defaultValue: 4 },
    { id: 'borough_weight', kind: 'weight', label: 'Settlement frequency', min: 25, max: 60, step: 5, defaultValue: 40 },
  ],
  defaultWeight: 40,
  defaultStartLevel: 4,
  defaultEnabled: true, // a base-game feature DISCOVERED in play (the Vault unlock gates tuning)
  world: { overlay: (ctx) => new BoroughField(ctx, BOROUGH_SURGE) },
  encounters: [BOROUGH_ENCOUNTER],
  validate: (look) => {
    const bad: string[] = [];
    const bo = BOROUGH_ENCOUNTER.borough!;
    for (const r of bo.folk.roster) {
      if (!look.monster(r.id)) bad.push(`borough folk '${r.id}' is not a monster`);
      if (!(r.weight > 0)) bad.push(`borough folk '${r.id}' needs weight > 0`);
    }
    for (const s of BOROUGH_ENCOUNTER.scales) {
      const band = bo.folk.byScale[s.id];
      if (!band) bad.push(`borough scale '${s.id}' has no folk.byScale row`);
      else if (!(band[0] >= 1 && band[1] >= band[0])) bad.push(`borough folk.byScale['${s.id}'] band inverted`);
    }
    for (const [tint, pkg] of Object.entries(bo.arming.essence)) {
      if (!(tint in ESSENCES)) bad.push(`borough arming essence '${tint}' unknown`);
      if (!(pkg.cost >= 1)) bad.push(`borough arming '${tint}' cost must be >= 1`);
      if (!(pkg.maxStacks >= 1)) bad.push(`borough arming '${tint}' maxStacks must be >= 1`);
      if (!pkg.mods.length) bad.push(`borough arming '${tint}' has no mods`);
    }
    if (!(bo.arming.maxGifts >= 1)) bad.push('borough arming.maxGifts must be >= 1');
    if (!(bo.arming.dwellSec > 0)) bad.push('borough arming.dwellSec must be > 0');
    if (!(bo.muster.seconds > 0)) bad.push('borough muster.seconds must be > 0');
    if (!(bo.muster.discoverRadius > 0)) bad.push('borough muster.discoverRadius must be > 0');
    if (bo.assault.swarm.entryRadius[0] > bo.assault.swarm.entryRadius[1]) bad.push('borough swarm.entryRadius inverted');
    if (!(bo.assault.swarm.mixChance >= 0 && bo.assault.swarm.mixChance <= 1)) bad.push('borough swarm.mixChance out of [0,1]');
    if (bo.assault.swarm.mixChance > 0 && !BOROUGH_ENCOUNTER.factions.length) {
      bad.push('borough swarm.mixChance > 0 needs a factions roster to mix from');
    }
    if (!(bo.refugees.populationPer > 0)) bad.push('borough refugees.populationPer must be > 0');
    if (!bo.ledgerLost || !bo.ledgerRefugees) bad.push('borough ledger keys must be non-empty');
    return bad;
  },
};

// --- Module-init fabric rows (data registrations; no engine edits) -----------

// The huddle: unarmed folk are DELIBERATELY helpless — a dormant tag with no
// rouse rule and no cool-down. Arming clears the tag; nothing else wakes them.
registerDormantTag('borough_huddled');
// The road out: survivors walk to the exit wheeled by the world tick, deaf to
// wounds (the resolute-walker posture) — no rouse rule, no reset.
registerDormantTag('borough_refugee');

// The arming dwell's tuning + progress ring (the transit registry row).
registerTransit({ kind: 'borough_arm', dwell: 0.8, radius: 64, ring: { radius: 30, width: 3, color: ACCENT } });

// --- In-zone + town surfaces (import-time registration; no engine edits) -----

/** Screen-edge chevron: the settlement while off-screen — a discovery when
 *  dormant, THE thing to defend once the muster runs. */
registerAttentionSource((world: World): AttentionPoint[] => {
  const out: AttentionPoint[] = [];
  for (const e of world.encountersView()) {
    if (!e.def.borough || e.phase === 'closing') continue;
    out.push({
      id: `borough-${e.pos.x | 0}-${e.pos.y | 0}`,
      pos: e.pos,
      color: ACCENT,
      glyph: e.def.trigger.glyph,
      label: e.phase === 'open' ? 'the borough — defend the folk!' : undefined,
      z: e.phase === 'open' ? 8 : 4,
    });
  }
  return out;
});

/** Zone-info rows: the settlement in the zone you stand in. (Lastlight's
 *  census reaches the town's info box through the MARKER below — zoneInfoFor
 *  folds marker pins in as event rows, so a second explicit row would
 *  double-speak it.) */
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  if (zoneId !== world.zone.id) return [];
  const out: ZoneInfoEntry[] = [];
  for (const e of world.encountersView()) {
    if (!e.def.borough || e.phase === 'closing') continue;
    out.push({
      kind: 'event', icon: e.def.trigger.glyph, color: ACCENT,
      label: e.phase === 'open' ? 'a borough stands its ground here' : 'a settlement raises hearths here',
      z: 5,
    });
  }
  return out;
});

/** The town pin: Lastlight wears its census on the map once refugees arrive. */
registerMarkerSource((world: World): MapMarker[] => {
  const pop = world.sim.boroughField?.population ?? 0;
  if (pop <= 0) return [];
  return [{
    id: 'borough-lastlight-census',
    zoneId: START_ZONE,
    glyph: '⌂', fill: '#3a3020', stroke: ACCENT, text: String(POPULATION_CFG.base + pop),
    title: `Lastlight — population ${POPULATION_CFG.base + pop} (${pop} sheltered)`,
    fog: 'always',
    z: 3,
  }];
});

/** Arrival toasts: "+N souls reach Lastlight" as refugees make it home. */
registerBulletinSource((world: World) => world.sim.boroughField?.drainBulletins() ?? []);
