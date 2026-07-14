// ---------------------------------------------------------------------------
// CONTAGION — a slow-burn, initially invisible PLAGUE that spreads zone-to-zone
// along the adjacency graph (a net-new package).
//
// On a slow tick the world sickens: an outbreak IGNITES at one zone far from town —
// PATIENT ZERO — and creeps outward along the existing road edges, each zone taking
// an intensity that falls off with its hop-distance from the source. It festers
// silently, with NO map tell, until the player STUMBLES into a corrupted zone; only
// then does it begin to read on the map as a glowing, pulsing outline on the infected
// ADJACENT zones — brighter + faster the nearer the source. Following the strongest
// pulse backward inevitably leads home to Patient Zero. Clearing zones changes
// NOTHING; only felling the boss does — and not at once: it destroys the source, and
// the contagion recedes outward from there over time (the Migration recession turned
// inside-out), a slow chain-reaction cleanse.
//
// It fields a DEDICATED 'plague' faction (contexts:['contagion'] keeps it out of all
// ordinary generation). Discovered in play (runs at defaults; the Vault unlock gates
// TUNING), like Deadwake / Migration / Hunt. The whole mechanic — ignition cadence,
// spread/cure timings, the falloff, the reveal radius, the roster, and the boss — is
// DATA on the surge below, so it tunes + extends without touching the engine.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { ContagionField, type ContagionSurge } from '../overlays/contagion';
import type { ContentPackage, FactionSpec } from '../types';

/** THE plague-green — one hue for the map glow AND the faction, so the sickly
 *  colour reads as one thing everywhere it appears. */
const PLAGUE_COLOR = '#8fd24a';

/** The whole Contagion mechanic as data — every number is a knob. */
const CONTAGION_SURGE: ContagionSurge = {
  igniteChance: 0.012,   // per 0.5s step — a RARE, slow-burning outbreak
  maxConcurrent: 1,      // one disease at a time reads cleanest (a knob)
  spreadInterval: 14,    // seconds (×severity) between creeping to one more zone — slow
  initialHops: 2,        // ignites already a 2-hop ball deep, so by the time it's NOTICED it's pronounced
  maxHops: 6,            // the spread never reaches further than 6 hops from the source…
  minIntensity: 0.12,    // …and the faintest edge still dimly glows
  cureInterval: 7,       // after Patient Zero falls, one ring heals every 7s (a visibly gradual recession)
  revealHops: 1,         // a stumble unveils strictly the ADJACENT infected zones (the user's ask)
  seedMinDist: 200,      // ignite ≥200 node-units from town — a genuine trek out in the world
  faction: 'plague',
  bossDefId: 'patient_zero',
  bossPromote: 'crowned',
  packCount: [1, 3],     // 1-3 plague packs per infected zone (lerped by intensity — denser near the source)
  packSize: [2, 4],      // …of 2-4 diseased each
  reward: { xpBase: 260, xpPerLevel: 46, gems: 4 },
  color: PLAGUE_COLOR,
};

/** THE PLAGUEBOUND — the diseased 'plague' faction. contexts:['contagion'] keeps them
 *  out of ordinary generation; they appear ONLY inside an infected zone. No warlord,
 *  no relations — Patient Zero is overlay-injected, not a faction warlord. */
const PLAGUE_FACTION: FactionSpec = {
  id: 'plague',
  name: 'the Plaguebound',
  color: PLAGUE_COLOR,
  traits: { roaming: 0.4, aggression: 1.0, warlordHome: 'capital', contexts: ['contagion'] },
  roster: [
    { id: 'plague_carrier', weight: 5 },
    { id: 'plague_spitter', weight: 3 },
    { id: 'plague_bloat', weight: 2 },
  ],
};

export const CONTAGION: ContentPackage = {
  id: 'contagion',
  label: 'Contagion',
  color: PLAGUE_COLOR,
  blurb: 'A sickness moves through the world unseen. It begins at one cursed place — Patient Zero — and creeps zone by zone along the roads, each step a little weaker than the last, until one day you wander into a corrupted land and feel the rot in the air. Only then does the spread show itself on the map, glowing strongest nearest its heart. Clearing the infected ground does nothing; the disease holds until you trace the pulse back to its source and cut out Patient Zero — and even then it does not vanish at once, but recedes slowly outward from where it began, the world healing in its own time.',
  cost: 130,
  // DISCOVERED in play (runs at defaults); the Vault unlock gates TUNING, surfacing
  // once the player has stumbled into an outbreak.
  unlock: {
    id: 'contagion_unlock',
    label: 'Stumble into a corrupted zone (the plague spreads on its own)',
    test: (ctx) => (ctx.ledger.contagion_seen ?? 0) >= 1,
  },
  // INVESTMENT LADDER — each owned tier widens the frequency slider (and the first
  // frees the start-level lock) as the player proves they can trace + cull outbreaks.
  tiers: [
    { id: 'contagion_tracker', label: 'Plague Tracker', requirement: 'Cleanse 1 contagion', cost: 170,
      test: (ctx) => (ctx.ledger.contagion_cleansed ?? 0) >= 1,
      grants: { weight: { min: 0, max: 80 }, startLevel: { min: 1 } } },
    { id: 'contagion_purger', label: 'Plague Purger', requirement: 'Cleanse 4 contagions', cost: 240,
      test: (ctx) => (ctx.ledger.contagion_cleansed ?? 0) >= 4,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'contagion_start', kind: 'startLevel', label: 'Contagion begins at level', min: 6, max: 6, step: 1, defaultValue: 6 },
    { id: 'contagion_weight', kind: 'weight', label: 'Contagion frequency', min: 20, max: 50, step: 5, defaultValue: 35 },
  ],
  defaultWeight: 35,
  defaultStartLevel: 6,
  defaultEnabled: true,
  world: { overlay: (ctx) => new ContagionField(ctx, CONTAGION_SURGE) },
  factions: [PLAGUE_FACTION],
  validate: (look) => [
    ...(look.faction(CONTAGION_SURGE.faction) ? [] : [`plague faction '${CONTAGION_SURGE.faction}' unknown`]),
    ...(look.monster(CONTAGION_SURGE.bossDefId) ? [] : [`Patient Zero '${CONTAGION_SURGE.bossDefId}' unknown`]),
  ],
};

// PATIENT ZERO — felling the source boss does NOT cure the infected zones at
// once; it destroys the SOURCE, and the contagion then recedes OUTWARD from here
// over time (the slow chain-reaction cleanse). Big, level-scaled spoils; the
// cleansed ledger gates the Vault tiers. (Counts whoever lands the blow.)
registerKillHandler({
  id: 'patient_zero',
  tag: 'patient_zero',
  run: ctx => {
    const cured = ctx.sim.contagionField?.onPatientZeroSlain(ctx.zone.id) ?? false;
    if (cured) ctx.bumpLedger('contagion_cleansed');
    ctx.bumpLedger('patient_zero_slain');
    const cgn = ctx.sim.contagionField?.surge();
    if (cgn?.reward) {
      ctx.grantXp(Math.round(cgn.reward.xpBase + ctx.zone.level * cgn.reward.xpPerLevel));
      for (let i = 0; i < cgn.reward.gems; i++) ctx.dropGemAt(ctx.actor.pos);
    }
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 56),
      'Patient Zero falls — the contagion begins to recede!', cgn?.color ?? '#8fd24a', 18);
  },
});
