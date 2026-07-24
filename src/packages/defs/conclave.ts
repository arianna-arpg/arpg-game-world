// ---------------------------------------------------------------------------
// CONCLAVE — a NET-NEW risk/reward package: the Occult RITUAL SITE and the seed
// of the Eldritch route. A pentagram with five stationary Occult cultists,
// mid-rite and neutral until you draw blood; slay them all (each may erupt into
// an Eldritch blood-demon) to SUBDUE the rite for an immediate fight + spoils —
// or leave them to INCUBATE, and the world's hidden Eldritch tally climbs toward
// a spreading invasion (Pass 2). A plethora of unknowns, left to player inference.
//
// Two conclave-only factions are grafted at boot (contexts:['conclave'] keeps
// them out of ordinary generation — they appear ONLY at ritual sites):
//   • OCCULT  — the stationary cultists; NEUTRAL to everyone (no relations).
//   • ELDRITCH — the blood-demons a dying cultist erupts into; hostile to the
//     player AND to the Occult (so the rite can turn on its own).
//
// Discovered in play (runs at defaults; the Vault unlock gates TUNING + the
// deeper Eldritch route), exactly like Breach / Fractures. The whole site — open
// rate, cultist count, HP rouse fraction, blood-demon chance, rewards, and the
// incubation threshold — is DATA on the surge below; the Vault tunes via pressure.
// ---------------------------------------------------------------------------

import { chance, vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { ConclaveField, type ConclaveSurge } from '../overlays/conclave';
import type { ContentPackage, FactionSpec } from '../types';

/** The Occult — stationary ritualists. NEUTRAL to all (no relations declared;
 *  unlisted faction pairs default to neutral), so other monsters ignore them and
 *  they ignore everyone — they only ever fight the player, and only once roused
 *  (the dormancy is engine-side, keyed on the ritual tag). contexts:['conclave']
 *  keeps them out of baseline generation; no warlord (they never march). */
const OCCULT_FACTION: FactionSpec = {
  id: 'occult',
  name: 'the Occult',
  color: '#a86ad8',
  traits: { roaming: 0, aggression: 0, warlordHome: 'origin', contexts: ['conclave'] },
  roster: [
    // The full lodge musters (the muster rolls): cultists carry the rite,
    // the maze-moths cloud the candles, the widdershin lights walk the
    // circle the wrong way round.
    { id: 'conclave_cultist', weight: 3 },
    { id: 'mazer_moth', weight: 2 },
    { id: 'widdershin_wisp', weight: 1 },
    // The muster pass: the lodge's inner offices — the scribe, the
    // binder, and the reader of what the rite spills.
    { id: 'hex_scrivener', weight: 2, presence: { from: 4, fadeIn: 3 } },
    { id: 'goetic_binder', weight: 1, presence: { from: 6, fadeIn: 3 } },
    { id: 'ninth_haruspex', weight: 1, presence: { from: 8, fadeIn: 4 } },
  ],
};

/** The Eldritch — what a slain cultist's blood erupts into. Hostile to the player
 *  (team) AND to the Occult (so a blood-demon turns on the surviving cultists —
 *  the rite devouring itself). seedWar is auto-suppressed for a conclave-only
 *  faction (factionGen), so these never spawn an ordinary procedural war zone.
 *  The roster + warlord seat the Pass-2 Eldritch spread (mirroring the demon). */
const ELDRITCH_FACTION: FactionSpec = {
  id: 'eldritch',
  name: 'the Eldritch',
  color: '#c2362b',
  traits: { roaming: 0.4, aggression: 1.6, warlordHome: 'capital', contexts: ['conclave'] },
  roster: [
    { id: 'conclave_blood_demon', weight: 3 },
    // The null adepts serve what the blood becomes (the muster rolls) —
    // the Blight's own artillery, sworn wherever the eruption stands.
    { id: 'null_adept', weight: 2 },
    // The muster pass: the eruption's deeper anatomy — the shepherd that
    // grows its herd, the gaze that holds, the crawler between lines.
    { id: 'polyp_shepherd', weight: 2, presence: { from: 5, fadeIn: 3 } },
    { id: 'gaze_warden', weight: 2, presence: { from: 6, fadeIn: 3 } },
    { id: 'meridian_crawler', weight: 1, presence: { from: 4, fadeIn: 3 } },
    { id: 'conclave_eldritch_horror', weight: 1 },
  ],
  warlord: 'conclave_eldritch_horror',
  relations: [
    { a: 'eldritch', b: 'occult', kind: 'hostile', strength: 1 },
  ],
};

/** The whole Conclave mechanic as data — every number is a knob. */
const CONCLAVE_SURGE: ConclaveSurge = {
  ritual: {
    openChance: 0.01,        // per 0.5s step (×pressure) — a ritual opens now and then
    openChanceCap: 0.35,
    maxConcurrent: 2,        // at most this many rituals stand across the world at once
    chartedChance: 0.12,     // mostly spawn in UNCHARTED zones (≈1-in-8 lands on charted ground)
    cultistCount: 5,         // the five points of the pentagram
    cultistId: 'conclave_cultist',
    bloodDemonId: 'conclave_blood_demon',
    pentagramRadius: 80,     // cultist ring + drawn star radius
    farFrom: 460,            // placed this far from the player (a trek across the zone)
    rouseFrac: 0.66,         // a cultist turns hostile once at ≤66% life (the brief's "taken to 66%")
    bloodDemonChance: 0.15,  // "fairly low" per-cultist-death eruption chance
    clearReward: { xpBase: 90, xpPerLevel: 22, gems: 1 },
  },
  eldritch: {
    incubationThreshold: 6,  // six fully-incubated rites → the Eldritch influence awakens (Pass 2)
    archetype: 'eldritch',   // which Incursion archetype the awakening lands (INCURSION_ARCHETYPES)
  },
};

export const CONCLAVE: ContentPackage = {
  id: 'conclave',
  label: 'Conclave',
  color: '#a86ad8',
  blurb: 'Occult cultists gather at pentagram rituals — neutral until you draw blood. Subdue the rite for an immediate fight, or let it incubate and feed a spreading Eldritch awakening.',
  cost: 120,
  // DISCOVERED in play (runs at defaults); the Vault unlock gates TUNING, and
  // surfaces once you've found your first ritual site.
  unlock: {
    id: 'conclave_unlock',
    label: 'Discover an Occult ritual (they appear from level 10)',
    test: (ctx) => (ctx.ledger.rituals_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'conclave_initiate', label: 'Conclave Initiate', requirement: 'Subdue 3 rituals', cost: 160,
      test: (ctx) => (ctx.ledger.rituals_subdued ?? 0) >= 3,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'conclave_adept', label: 'Conclave Adept', requirement: 'Slay 15 cultists', cost: 240,
      test: (ctx) => (ctx.ledger.cultists_slain ?? 0) >= 15,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
    // Reachable once the Pass-2 Eldritch event ships (bumping eldritch_repelled);
    // the gate is stable now so the tier never drifts.
    { id: 'conclave_warden', label: 'Eldritch Warden', requirement: 'Repel an Eldritch awakening', cost: 320,
      test: (ctx) => (ctx.ledger.eldritch_repelled ?? 0) >= 1,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'conclave_start', kind: 'startLevel', label: 'Rituals begin at level', min: 10, max: 10, step: 1, defaultValue: 10 },
    { id: 'conclave_weight', kind: 'weight', label: 'Ritual frequency', min: 25, max: 55, step: 5, defaultValue: 40 },
  ],
  defaultWeight: 40,
  defaultStartLevel: 10,
  defaultEnabled: true,
  world: { overlay: (ctx) => new ConclaveField(ctx, CONCLAVE_SURGE) },
  factions: [OCCULT_FACTION, ELDRITCH_FACTION],
  validate: (look) => [
    ...(look.monster(CONCLAVE_SURGE.ritual.cultistId) ? [] : [`cultist '${CONCLAVE_SURGE.ritual.cultistId}' unknown`]),
    ...(look.monster(CONCLAVE_SURGE.ritual.bloodDemonId) ? [] : [`blood-demon '${CONCLAVE_SURGE.ritual.bloodDemonId}' unknown`]),
  ],
};

// CONCLAVE: a slain cultist may erupt into an Eldritch blood-demon — the
// ritual's backlash. "Fairly low" per-death chance, data-driven. The demon is
// hostile to the player AND (via faction relations) to the surviving Occult,
// so the rite can turn on its own. Fires whoever lands the blow.
registerKillHandler({
  id: 'ritual_cultist',
  tag: 'ritual_cultist',
  run: ctx => {
    // Tier progress counts PLAYER-side kills only — a turncoat blood-demon
    // culling its own cultists must not pad the "Slay N cultists" tier.
    if (ctx.credit) ctx.bumpLedger('cultists_slain');
    const rf = ctx.sim.conclaveField?.surge().ritual;
    if (rf && chance(rf.bloodDemonChance)) {
      ctx.spawnHostileAt(rf.bloodDemonId, Math.max(1, ctx.actor.level), ctx.actor.pos);
      ctx.flash(ctx.actor.pos, 64, '#e8003a', 0.6);
      ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 40), 'Blood erupts — something crawls forth!', '#e85050', 16);
    }
  },
});
