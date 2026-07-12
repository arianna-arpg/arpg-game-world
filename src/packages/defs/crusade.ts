// ---------------------------------------------------------------------------
// CRUSADES — faction influence as a spreading state machine over the zone graph,
// with Warbands leading the vanguard (tiered content built ON Warbands).
//
// A Crusade plants a STRONGHOLD off in unexplored territory (a banner minted
// beyond the player's vision), then spreads: warbands push into adjacent zones,
// and every held zone matures by time-held + closeness to the stronghold —
//
//   touched (an outpost) → occupied (a war camp) → entrenched (a fortress) →
//   converted (the capital: a faction-city LABYRINTH whose sanctum opens onto
//   the Crusade Leader's inner realm).
//
// TWO faction modes, both honoured (the user's pick):
//   • a NET-NEW dedicated faction — the Iron Crusade — grafted here. Its traits
//     declare contexts:['crusade'], so the spawn-context gate keeps it OUT of
//     ordinary world generation; it appears ONLY inside a Crusade.
//   • the existing warband factions (goblin/gnoll/wild/elemental/sylvan/undead)
//     each ALSO crusade — their traits list 'crusade' alongside 'baseline', and
//     their own warlord (goblin_chief, lich_marshal, …) becomes the Leader.
// The ignition pool is DERIVED from factionsInContext('crusade') — never a
// hardcoded id list (see world/traits.ts). Many crusades, many factions, run
// in parallel (maxConcurrent > 1).
//
// All escalation is DATA on the surge below; the Vault tunes purely via pressure.
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { CrusadeField, type CrusadeSurge } from '../overlays/crusade';
import type { ContentPackage, FactionSpec } from '../types';

/** The Iron Crusade — a dedicated zealot faction that exists ONLY in a Crusade
 *  (contexts:['crusade'] ⇒ never spawns in baseline generation). Grafted at boot
 *  by the faction generator; its warlord is the Crusade Marshal (the Leader). */
const CRUSADE_FACTION: FactionSpec = {
  id: 'crusade',
  name: 'the Iron Crusade',
  color: '#d8b040',
  traits: { roaming: 0.9, aggression: 1.3, warlordHome: 'capital', contexts: ['crusade'] },
  roster: [
    { id: 'crusade_footman', weight: 4 },
    { id: 'crusade_zealot', weight: 3 },
    { id: 'crusade_arbalest', weight: 2 },
    { id: 'crusade_templar', weight: 2 },
    { id: 'crusade_standard_bearer', weight: 1 },
    { id: 'crusade_marshal', weight: 1 },
  ],
  warlord: 'crusade_marshal',
  // Zealots: hostile to every other faction (so they brawl natives on a frontier).
  // seedWar is suppressed for a crusade-only faction (factionGen), so these never
  // spawn an ordinary procedural war zone — only a Crusade fields them.
  relations: [
    { a: 'crusade', b: 'goblin', kind: 'hostile', strength: 1 },
    { a: 'crusade', b: 'gnoll', kind: 'hostile', strength: 1 },
    { a: 'crusade', b: 'undead', kind: 'hostile', strength: 1 },
    { a: 'crusade', b: 'demon', kind: 'hostile', strength: 1 },
    { a: 'crusade', b: 'sylvan', kind: 'hostile', strength: 1 },
    { a: 'crusade', b: 'wild', kind: 'hostile', strength: 1 },
    { a: 'crusade', b: 'elemental', kind: 'hostile', strength: 1 },
    { a: 'crusade', b: 'breach', kind: 'hostile', strength: 1 },
  ],
};

/** The spreading + maturation + sanctum config — the whole event as data. */
const CRUSADE_SURGE: CrusadeSurge = {
  triggerChance: 0.006,   // per 0.5s step (×pressure) — a crusade ignites now and then
  maxConcurrent: 3,       // several crusades / factions march at once
  seedSteps: [2, 4],      // strongholds plant 2-4 node-steps off in the UNKNOWN
  strongholdTileset: 'wasteland',
  strongholdAccel: 2.6,   // the capital festers ~2.6× faster → converts first
  networkRange: 320,      // proximity-to-stronghold accel falls off over this
  minNetFactor: 0.35,
  maxNetFactor: 1.2,      // the top of the proximity gradient (near-capital zones)
  frontierDedupDist: 52,  // a pushed frontier lands no closer than this to held ground
  claimInterval: 22,      // the vanguard pushes a node roughly every 22s (×pressure)
  maxHeldZones: 7,
  frontierMintChance: 0.6, // mostly SIMULATE forward into the wilds (floating nodes)…
  maxMints: 5,             // …up to 5 simulated frontier nodes per crusade
  accessRadius: 130,       // a floating crusade node wires in (its exit spawns) once
                           // within ~1.5 node-steps of charted ground — the stopgap
  nonCapitalMaxTier: 3,   // only the capital reaches Converted (city + sanctum)
  color: '#d8b040',
  // The maturation ladder. atSecondsHeld is the zone's OWN held-clock (the capital
  // crosses these fast via strongholdAccel; far zones crawl via netFactor).
  tiers: [
    { tier: 1, label: 'Touched', atSecondsHeld: 0, structure: 'crusade_outpost',
      garrison: [2, 3], leaderRarity: 'none', leaderTag: null,
      suppressNatives: false, countMul: 1.0, amp: 1.4, rewardMul: 1.0 },
    { tier: 2, label: 'Occupied', atSecondsHeld: 45, structure: 'crusade_camp',
      garrison: [4, 6], leaderRarity: 'champion', leaderTag: 'crusade_camp',
      suppressNatives: false, countMul: 0.85, amp: 1.6, rewardMul: 1.6 },
    { tier: 3, label: 'Entrenched', atSecondsHeld: 120, structure: 'crusade_fortress',
      garrison: [6, 9], leaderRarity: 'crowned', leaderTag: 'crusade_fortress',
      suppressNatives: true, countMul: 0.7, amp: 1.8, rewardMul: 2.4 },
    { tier: 4, label: 'Converted', atSecondsHeld: 230, structure: 'crusade_bastion',
      garrison: [8, 12], leaderRarity: 'crowned', leaderTag: null,
      suppressNatives: true, countMul: 0.6, amp: 2.0, rewardMul: 3.2,
      // The faction CITY: a street-mix off the shared village kit (real plan
      // structures — roofs, doors, floors) around a raised town square, rampart
      // runs keeping the labyrinth feel. Pure data — retune the mix freely.
      cityFill: {
        structures: [
          { structure: 'cottage', weight: 3 },
          { structure: 'longhouse', weight: 2 },
          { structure: 'crusade_rampart', weight: 2 },
          { structure: 'market_row', weight: 1 },
          { structure: 'chapel', weight: 1 },
        ],
        count: [4, 6],
        square: 'village_square',
      } },
  ],
  // The capital's sanctum tears open `atSecondsHeld` after it converts; stepping
  // through it enters the Leader's GRAND ARENA — a gladiatorial colosseum where
  // the Leader fights before his own people: the crowd answers his champion-
  // calls (rows vault the rail as an add-phase), and the stands EMPTY when the
  // crown falls. All data (data/arenas.ts ArenaCrowdSpec).
  sanctum: {
    atSecondsHeld: 55, tileset: 'grand_arena', rewardMul: 3.5, levelBonus: 4,
    rewardPerConverted: 0.25, // Leader-kill premium per converted zone held
    bossBump: 2, xpFloor: 140, // the Leader's spawn shaping (spawnArenaBoss)
    arena: {
      crowd: {
        championCalls: [
          { atLifeFrac: 0.55, count: [2, 3], announce: 'The Leader beckons — challengers vault the rail!' },
          { atLifeFrac: 0.22, count: [3, 4], announce: 'A last cry to the stands — the faithful answer!' },
        ],
        disperseOnBossDeathSec: 3.2,
        disperseAnnounce: 'The stands fall silent — the crowd melts away from a fallen crown.',
      },
    },
  },
  // CLASH (Crusade vs Crusade): where two different-faction fronts meet, the
  // stronger side wrests the border zone — a tug-of-war that shifts the warfront on
  // its own. takeMargin > 1 so a weak vanguard can never overrun a mighty capital
  // (capital ≈ tier4×3 + (size+4)×1 ≈ 23 vs a fresh vanguard ≈ 1×3 + 3×1 = 6).
  clash: { interval: 6, chance: 0.5, takeMargin: 1.25, perTier: 3, perMight: 1, holdGuard: 18 },
};

export const CRUSADE: ContentPackage = {
  id: 'crusade',
  label: 'Crusades',
  blurb: 'A faction plants a banner in the wilds and CRUSADES — warbands spread its influence zone by zone until a faction-city rises and its leader must be cut down.',
  cost: 130,
  // DISCOVERED in play (runs at defaults from level 12); the Vault unlock gates
  // TUNING, surfacing once you've encountered a Crusade in the world.
  unlock: {
    id: 'crusade_unlock',
    label: 'Encounter a Crusade (they appear from level 12)',
    test: (ctx) => (ctx.ledger.crusade_seen ?? 0) >= 1,
  },
  // INVESTMENT LADDER — each owned tier widens a slider so pressure climbs higher,
  // scaling ignition + spread + maturation harder (no table edits).
  tiers: [
    { id: 'crusade_muster', label: 'Crusade Muster', requirement: 'Liberate 3 crusade zones', cost: 170,
      test: (ctx) => (ctx.ledger.crusade_zones_cleared ?? 0) >= 3,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'crusade_warlord', label: "Leader's Bane", requirement: 'Slay a Crusade Leader', cost: 300,
      test: (ctx) => (ctx.ledger.crusade_leaders_slain ?? 0) >= 1,
      grants: { weight: { min: 0, max: 100 } } },
    { id: 'crusade_dominion', label: 'Holy War', requirement: 'Slay 3 Crusade Leaders or liberate 12 zones', cost: 280,
      test: (ctx) => (ctx.ledger.crusade_leaders_slain ?? 0) >= 3 || (ctx.ledger.crusade_zones_cleared ?? 0) >= 12,
      grants: { startLevel: { min: 0, max: 101 } } },
  ],
  modifiers: [
    // Base bands NARROW (discovery gating): start locked at 12 until Holy War frees
    // it; frequency widens with Muster → Leader's Bane.
    { id: 'crusade_start', kind: 'startLevel', label: 'Crusades begin at level', min: 12, max: 12, step: 1, defaultValue: 12 },
    { id: 'crusade_weight', kind: 'weight', label: 'Crusade frequency', min: 25, max: 55, step: 5, defaultValue: 40 },
  ],
  defaultWeight: 40,
  defaultStartLevel: 12,
  defaultEnabled: true,
  world: { overlay: (ctx) => new CrusadeField(ctx, CRUSADE_SURGE) },
  factions: [CRUSADE_FACTION],
  relationships: [
    // Warbands lead the vanguard — with both live, crusades press harder.
    { a: 'warbands', b: 'crusade', kind: 'amplifies', strength: 1.15 },
  ],
  validate: (look) => {
    const out: string[] = [];
    const s = CRUSADE_SURGE;
    if (!look.tileset(s.strongholdTileset)) out.push(`stronghold tileset '${s.strongholdTileset}' unknown`);
    for (const t of s.tiers) {
      if (t.structure && !look.structure(t.structure)) out.push(`tier ${t.tier} structure '${t.structure}' unknown`);
      for (const cs of t.cityFill?.structures ?? []) {
        if (!look.structure(cs.structure)) out.push(`cityFill structure '${cs.structure}' unknown`);
      }
      if (t.cityFill?.square && !look.structure(t.cityFill.square)) out.push(`cityFill square '${t.cityFill.square}' unknown`);
    }
    if (!look.tileset(s.sanctum.tileset)) out.push(`sanctum tileset '${s.sanctum.tileset}' unknown`);
    if (s.sanctum.arena?.tileset && !look.tileset(s.sanctum.arena.tileset)) out.push(`sanctum arena tileset '${s.sanctum.arena.tileset}' unknown`);
    if (s.sanctum.arena?.layoutType && !look.layout(s.sanctum.arena.layoutType)) out.push(`sanctum arena layout '${s.sanctum.arena.layoutType}' unknown`);
    return out;
  },
};

// A Crusade camp / fortress COMMANDER — felling it LIBERATES the zone (its
// influence obliterated), for a tier-scaled bounty. (Whoever lands the blow.)
// (The LEADER in its sanctum consumes World.crusadeRealmContext, so its row
// lives on World.worldKillRules.)
registerKillHandler({
  id: 'crusade_camp',
  when: ctx => ctx.actor.tag === 'crusade_camp' || ctx.actor.tag === 'crusade_fortress',
  run: ctx => {
    const mul = ctx.sim.crusadeField?.resolveCrusadeZone(ctx.zone.id) ?? 1;
    ctx.bumpLedger('crusade_zones_cleared');
    ctx.grantXp(Math.round((150 + ctx.zone.level * 30) * mul));
    for (let i = 0; i < 1 + Math.floor(mul); i++) ctx.dropGemAt(ctx.actor.pos);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 56),
      `The crusade is driven from ${ctx.zone.name}! (×${mul.toFixed(1)} spoils)`, '#ffd700', 18);
  },
});
