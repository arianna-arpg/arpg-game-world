// ---------------------------------------------------------------------------
// BREACH — a NET-NEW package, proving the framework absorbs a new feature in one
// def file: a new faction (grafted by the faction generator), a new overlay
// mechanic (BreachField), and one registry line. A base-game feature
// (defaultEnabled true — it runs at defaults from level 10); the Vault unlock
// gates TUNING, and each investment tier widens the sliders. It amplifies
// Demon Invasions while both run (an inter-package relationship).
//
// SECOND PASS — the VEIL and the COURT. The field no longer conjures bodies at
// random points inside itself: its monsters PRE-EXIST as veiled knots across
// the full tear, and the advancing ring UNCOVERS them (EncounterDef.veil) — so
// a wide-fed breach is structurally the dangerous one, and the collapse comes
// back to evaporate what it uncovered. Over the field sits a COURT of four
// lords (packages/courts.ts): one is rolled per zone, its kin season the mix,
// its banner tints the ring, and a breach fed past the door threshold leaves
// a standing way into that lord's domain, where its VESSEL waits.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { courtLord, registerCourtLord } from '../courts';
import type { EncounterDef } from '../encounters';
import { BreachField, type BreachSurge } from '../overlays/breach';
import type { ContentPackage, FactionSpec } from '../types';

/** The ambient breach mechanic as data — every number is a knob (the in-zone
 *  encounter below owns the combat side; this drives the map-level tears). */
const BREACH_SURGE: BreachSurge = {
  igniteChance: 0.05,      // per step, at pressure 1
  maxConcurrent: 2,        // standing tears at once (×concurrency crank)
  lifeSeconds: [70, 130],  // how long a tear gapes (×severity crank)
  stepSeconds: 0.5,
};

/** The Riftspawn faction, grafted into the data registries at boot. */
const BREACH_FACTION: FactionSpec = {
  id: 'breach',
  name: 'the Riftspawn',
  color: '#b04ae8',
  traits: { roaming: 0.9, aggression: 1.4, warlordHome: 'capital' },
  roster: [
    { id: 'breach_spawn', weight: 4 },
    { id: 'breach_horror', weight: 2 },
    { id: 'breach_lord', weight: 1 },
  ],
  warlord: 'breach_lord',
  relations: [
    { a: 'breach', b: 'demon', kind: 'ally', strength: 1 },
    { a: 'breach', b: 'undead', kind: 'hostile', strength: 1 },
    { a: 'breach', b: 'goblin', kind: 'hostile', strength: 1 },
    { a: 'breach', b: 'sylvan', kind: 'hostile', strength: 1 },
  ],
};

// --- THE COURT OF THE BREACH — the four that press against the skin ----------
//
// One lord is rolled per zone (courtLordForZone — the map marker, the ring
// tint and the domain agree by construction). Each is one declarative row:
// banner, creed, themed kin (authored in data/monsters.ts with their own
// looks), a VESSEL, and a DOMAIN minted from an EXISTING tileset through the
// shared realm-arena pipeline — two of the four ward their vessel behind
// seals (the Chaos-Sanctuary move, data/arenas.ts), two field it at once.

registerCourtLord({
  id: 'ashkarra',
  name: 'Ashkarra, the Rose Pyre',
  short: 'Ashkarra', epithet: 'the Rose Pyre',
  creed: 'What burns on the far side burns hotter.',
  color: '#ff5a78', sigil: '✴',
  roster: [
    { id: 'breach_emberkin', weight: 4 },
    { id: 'breach_pyrelight', weight: 2 },
  ],
  vessel: 'vessel_ashkarra',
  domain: {
    tileset: 'magma_gallery', name: 'The Rose Furnace',
    packs: { count: [3, 5], size: [3, 5] },
    wards: {
      count: [3, 4], guards: { count: [3, 5] },
      announceBreak: 'A seal cracks — {n} of {total} still hold the Furnace shut!',
      announceAll: 'The last seal breaks — the Rose Pyre pours into its vessel!',
    },
  },
  gatePrompt: 'the Rose Furnace gapes',
  deeds: {
    deepen: 'The tear deepens — Ashkarra presses against the skin!',
    stands: 'The breach refuses to seal — the Rose Pyre\'s door stands!',
    manifest: '{name} burns through!',
  },
});

registerCourtLord({
  id: 'thulvane',
  name: 'Thulvane, the Stillness Between',
  short: 'Thulvane', epithet: 'the Stillness Between',
  creed: 'Every fire you ever lit was briefly warm.',
  color: '#58b8ff', sigil: '❆',
  roster: [
    { id: 'breach_rimehusk', weight: 4 },
    { id: 'breach_hollowchill', weight: 2 },
  ],
  vessel: 'vessel_thulvane',
  domain: {
    tileset: 'rime_gallery', name: 'The Stillness',
    packs: { count: [3, 5], size: [3, 5] },
  },
  gatePrompt: 'the Stillness gapes',
  deeds: {
    deepen: 'The tear deepens — the cold on the far side leans in!',
    stands: 'The breach refuses to seal — the Stillness stands open!',
    manifest: '{name} steps through, and the air stops!',
  },
});

registerCourtLord({
  id: 'vexira',
  name: 'Vexira, the Arc Across',
  short: 'Vexira', epithet: 'the Arc Across',
  creed: 'Between any two worlds, a spark will find the gap.',
  color: '#cfe8ff', sigil: '↯',
  roster: [
    { id: 'breach_arcling', weight: 4 },
    { id: 'breach_stormveil', weight: 2 },
  ],
  vessel: 'vessel_vexira',
  domain: {
    tileset: 'leyline_nexus', name: 'The Arclight Span',
    packs: { count: [3, 5], size: [3, 4] },
  },
  gatePrompt: 'the Arclight Span gapes',
  deeds: {
    deepen: 'The tear deepens — Vexira arcs across the gap!',
    stands: 'The breach refuses to seal — the Arclight Span holds open!',
    manifest: '{name} completes the circuit!',
  },
});

registerCourtLord({
  id: 'nulgrave',
  name: 'Nulgrave, the Hunger Behind the Skin',
  short: 'Nulgrave', epithet: 'the Hunger Behind the Skin',
  creed: 'The world is a rind. Everything under it is soft.',
  color: '#e044c8', sigil: '◉',
  roster: [
    { id: 'breach_gnawmouth', weight: 4 },
    { id: 'breach_unshaped', weight: 2 },
  ],
  vessel: 'vessel_nulgrave',
  domain: {
    tileset: 'gutworks', name: 'The Gnawing Dark',
    packs: { count: [3, 5], size: [3, 5] },
    wards: {
      count: [4, 5], guards: { count: [3, 4] },
      announceBreak: 'A seal is chewed away — {n} of {total} remain!',
      announceAll: 'The last seal parts — the Hunger uncoils into its vessel!',
    },
  },
  gatePrompt: 'the Gnawing Dark gapes',
  deeds: {
    deepen: 'The tear deepens — something behind the skin begins to chew!',
    stands: 'The breach refuses to seal — the Gnawing Dark yawns wide!',
    manifest: '{name} uncoils, still hungry!',
  },
});

/** The in-zone Breach encounter: a glowing diamond that opens a growing,
 *  kill-fed field. THE VEIL replaces pulse-spawning: rift-spawn pre-exist as
 *  knots across the whole tear and the ring ACTIVATES what it uncovers — the
 *  wider you feed it, the more of the far shore stands up (and the collapse
 *  evaporates what you leave standing). Three SCALES encode the small-window
 *  -vs-large-tear variance purely as numbers. */
const BREACH_ENCOUNTER: EncounterDef = {
  id: 'breach',
  packageId: 'breach',
  label: 'Breach',
  factions: ['breach'],
  trigger: { glyph: '◈', color: '#b04ae8', activateRadius: 30 },
  timePerKill: 0.18,   // the minuscule per-kill add that snowballs fast clears
  radiusPerKill: 1.2,
  scales: [
    { id: 'fracture', label: 'Breach Fracture', weight: 6,
      baseTime: 18, maxBonusTime: 25, startRadius: 90, maxRadius: 260, growthPerSec: 6,
      spawnInterval: [1.4, 2.2], spawnBatch: [2, 3], rewardMul: 1 },
    { id: 'rift', label: 'Breach Rift', weight: 3,
      baseTime: 30, maxBonusTime: 60, startRadius: 110, maxRadius: 420, growthPerSec: 9,
      spawnInterval: [1.0, 1.6], spawnBatch: [3, 5], rewardMul: 1.8 },
    { id: 'cataclysm', label: 'Tear in Reality', weight: 1,
      baseTime: 55, maxBonusTime: 120, startRadius: 140, maxRadius: 600, growthPerSec: 12,
      spawnInterval: [0.7, 1.2], spawnBatch: [5, 8], rewardMul: 3.2 },
  ],
  // THE VEIL: knots ride scale.spawnBatch (the per-scale batches keep their
  // character), density ~1.0/10k px² lands the classic total spawn budget on
  // a full uncover, and the collapse takes the same 2.6s beat at every size.
  veil: {
    knotPer10k: 1.0,
    maxPerTick: 2,
    uncoverSlack: 14,
    shard: { kind: 'riftshard', chance: 0.3 },
    rewardUncoverBonus: 0.6,
    collapseSec: 2.6,
    spareEngagedWithin: 150,
    text: { collapse: 'The breach collapses — the veil comes back for its own!' },
  },
  // THE COURT: one of the four themes each zone's tear. The door threshold
  // sits past what passive growth alone reaches on the common scales — feed
  // the tear (kills buy time, time buys ground) or it seals clean.
  court: {
    lords: ['ashkarra', 'thulvane', 'vexira', 'nulgrave'],
    rosterShare: 0.55,
    door: { atUncoverFrac: 0.85, gateKind: 'court', levelBonus: 2 },
  },
  ledger: {
    onEncounter: 'breach_encountered', // first open → "Breach discovered"
    onClose: 'breaches_closed',        // the investment milestone (Investigation @ 5)
  },
};

// THE VESSEL FALLS: the court's pinnacle bounty — the ledger key the
// Exploration tier reads (the collapse → vessel chain the tier comment
// always promised), a burst of gems, and the lord recoiling to wait for
// another tear. Rides the shared kill-handler registry like every bounty.
registerKillHandler({
  id: 'court_vessel_felled',
  tag: 'court_vessel',
  run: ctx => {
    ctx.bumpLedger('breach_vessels_slain');
    ctx.grantXp(260 + ctx.zone.level * 46);
    for (let i = 0; i < 3; i++) ctx.dropGemAt(ctx.actor.pos);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 56),
      'The vessel shatters — its lord recoils behind the veil!', '#d9a3ff', 18);
  },
});

export const BREACH: ContentPackage = {
  id: 'breach',
  label: 'Breach',
  blurb: 'Tears in reality split open, flooding a zone with rift-spawn until the breach seals.',
  color: '#a64dd8',
  cost: 80, // the base "Attunement" — grants the minor frequency slider
  // DISCOVERY: the Vault surfaces Breach's config once you've OPENED one (which
  // first happens around level 10, when breaches start appearing). Unlocking it
  // grants only a MINOR frequency band; investing further WIDENS it (tiers below).
  unlock: {
    id: 'breach_attune',
    label: 'Open a Breach (they appear from level 10)',
    test: (ctx) => (ctx.ledger.breach_encountered ?? 0) >= 1,
  },
  tiers: [
    { id: 'breach_invest', label: 'Breach Investigation', requirement: 'Seal 5 Breaches', cost: 120,
      test: (ctx) => (ctx.ledger.breaches_closed ?? 0) >= 5,
      grants: { weight: { min: 0, max: 80 } } },          // widen the frequency band
    { id: 'breach_explore', label: 'Breach Exploration', requirement: 'Seal 15 Breaches — or fell a Vessel of the court', cost: 220,
      // The deep seal-count — OR the court's pinnacle: felling a lord's vessel
      // (the collapse → door → domain chain) fast-tracks the exploration rung.
      // Its key lands here WITH its bump (the vessel kill handler above), the
      // ledger contract kept in the same commit that promised it.
      test: (ctx) => (ctx.ledger.breaches_closed ?? 0) >= 15 || (ctx.ledger.breach_vessels_slain ?? 0) >= 1,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } }, // free reign + enable/disable
  ],
  modifiers: [
    // Base bands are NARROW; the tiers above widen them. startLevel is locked at
    // 10 (the discovery level) until Exploration grants 0..101 (enable/disable).
    { id: 'breach_start', kind: 'startLevel', label: 'Breaches begin at level', min: 10, max: 10, step: 1, defaultValue: 10 },
    { id: 'breach_weight', kind: 'weight', label: 'Breach frequency', min: 30, max: 60, step: 5, defaultValue: 50 },
  ],
  defaultWeight: 50,
  defaultStartLevel: 10,         // breaches begin appearing at character level 10…
  defaultEnabled: true,         // …and they're a base-game feature DISCOVERED in play
                                // (the Vault unlock gates TUNING, not the feature).
  world: { overlay: (ctx) => new BreachField(ctx, BREACH_SURGE) },
  encounters: [BREACH_ENCOUNTER],
  factions: [BREACH_FACTION],
  relationships: [
    { a: 'breach', b: 'demon_invasion', kind: 'amplifies', strength: 1.25 },
  ],
  // SELF-VALIDATION (the colocated contract): every id the court references
  // must resolve, and every domain must PIN a real tileset — the court's own
  // requirement (enterCourtDomain refuses a tileset-less domain).
  validate: (look) => {
    const out: string[] = [];
    for (const id of BREACH_ENCOUNTER.court?.lords ?? []) {
      const lord = courtLord(id);
      if (!lord) { out.push(`court lord '${id}' is not registered`); continue; }
      if (!look.monster(lord.vessel)) out.push(`lord '${id}' vessel '${lord.vessel}' does not resolve`);
      for (const r of lord.roster) {
        if (!look.monster(r.id)) out.push(`lord '${id}' roster monster '${r.id}' does not resolve`);
      }
      if (!lord.domain.tileset) out.push(`lord '${id}' domain pins no tileset (the court contract)`);
      else if (!look.tileset(lord.domain.tileset)) out.push(`lord '${id}' domain tileset '${lord.domain.tileset}' does not resolve`);
    }
    return out;
  },
};
