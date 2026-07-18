// ---------------------------------------------------------------------------
// CRUSADES — a faction's holy war as a LIVING WARFRONT on the warfield fabric.
//
// A Crusade ignites somewhere in the wilds — often entirely unbeknownst to the
// player — and grows as a CAMPAIGN: its territory is an analytic field (power ×
// drifting noise × a well around its HEART), painted on the map as a faction-
// coloured GRADIENT that deepens as it strengthens… once the player has FOUND
// it. Real zones under the field raise the faction's works from the local
// gradient —
//
//   touched (an outpost) → occupied (a war camp) → entrenched (a fortress) →
//   converted (the heartland: a faction-city whose throne gate opens onto the
//   Leader's arena — a true one-on-one before the stands).
//
// Its power OSCILLATES while young — the player, a rival crusade pressing the
// same ground, or a consuming event can SNUFF it — until it crosses the anchor
// threshold and plants its THRONE: from then on it can be beaten back but
// never extinguished, until the Leader falls in his arena.
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
// in parallel (maxConcurrent > 1) — and where rival fields overlap, the map
// becomes a true warfront that fights itself.
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

/** The whole campaign — field, power arc, clash, ladder, throne — as data.
 *  Distances are MAP UNITS (node pitch 78); rates per second of overlay time.
 *  (Exported for the balance probe — the shipped dials ARE the tested dials.) */
export const CRUSADE_SURGE: CrusadeSurge = {
  triggerChance: 0.006,   // per 0.5s step (×ignition pressure) — now and then, a war kindles
  maxConcurrent: 3,       // several crusades / factions march at once
  // THE SEED SEAT (world/seats.ts): far-tilted + unknown-heavy over the whole
  // minted web — with the forechart's veiled halo, a war kindles a genuine
  // country away, on real ground nobody has walked. min keeps embers off the
  // player's doorstep; no max — the deep halo and soundings are fair country.
  seat: { range: { min: 220 }, unknownMul: 3, veiledMul: 1.5, prefer: 'far' },
  seedSteps: [3, 5],      // …then the heart plants 3-5 node-steps BEYOND the seed — deeper still
  // ENTRENCHMENT: age buys ranks — a war standing 10 minutes fields ~1.5×
  // garrison heads; one found a half-hour late fields the full 1.9× press.
  // (Power buys the WORKS; age buys the YARD. Both read at materialize.)
  entrench: { perMin: 0.05, maxMul: 1.9 },
  // THE FIELD: territory = power × drifting noise × heart well × reach falloff.
  // reachBase + reachPerPower×power is the footprint's e-folding radius — the
  // territory literally grows and retracts with the campaign's might.
  field: {
    noiseScale: 230, noiseBase: 0.55, noiseAmp: 0.5,
    driftVel: 2.2, driftTurn: [420, 700],
    wellAmp: 1.5, wellRange: 240,
    reachBase: 90, reachPerPower: 1.9,
  },
  // THE POWER ARC: ember (~22) → anchor (100, ~2-4 min at pressure 1 depending
  // on vigor) → cap (200, an unchecked holy war consuming a region). Young wars
  // breathe ±16% (the oscillation the map shows); anchored seats settle to ±5%
  // and can be beaten back to the floor but never snuffed.
  power: {
    start: 22, cap: 200,
    growth: 0.6, growthFloorMul: 0.3, growthCapMul: 1.5,
    anchorAt: 100, snuffBelow: 12, anchoredFloor: 55,
    tideAmp: 0.16, tideAmpAnchored: 0.05, tidePeriod: [70, 110],
    vigor: [0.75, 1.35],
    devIgnite: 126,       // devIgnite plants past anchor: city + throne gate, immediately
  },
  // CLASH: a rival's control over YOUR heart drains your power — two wars on
  // the same ground squeeze each other until one is snuffed (or both anchor
  // and grind forever). Contested real zones field BOTH rosters.
  clash: { drainPerSec: 0.9, contestNear: 0.62, contestHot: 0.8, injectContested: true },
  // A LIBERATED hold: the field collapses locally (and heals), the campaign
  // pays a nick — sustained pressure can gutter an unrooted war entirely.
  suppress: { radius: 130, mul: 0.25, forSec: 150, powerNick: 8 },
  // CONTROL: influence 9..200 normalizes to grip 0..1; the city rises only
  // within 150u of the heart; walking ≥5% ground reveals the war.
  control: { edge: 9, full: 200, heartland: 150, discoverAt: 0.05, nonHeartMaxTier: 3 },
  // The ladder over the LOCAL GRADIENT — an anchored war reads city at the
  // heart, fortresses in the inner ring, camps beyond, outposts at the rim;
  // beaten-back ground sheds its works on the next entry (generation re-asks
  // the field every load).
  tiers: [
    { tier: 1, label: 'Touched', atControl: 0.06, structure: 'crusade_outpost',
      garrison: [2, 3], leaderRarity: 'none', leaderTag: null,
      suppressNatives: false, countMul: 1.0, amp: 1.4, rewardMul: 1.0 },
    { tier: 2, label: 'Occupied', atControl: 0.25, structure: 'crusade_camp',
      garrison: [4, 6], leaderRarity: 'champion', leaderTag: 'crusade_camp',
      suppressNatives: false, countMul: 0.85, amp: 1.6, rewardMul: 1.6 },
    { tier: 3, label: 'Entrenched', atControl: 0.5, structure: 'crusade_fortress',
      garrison: [6, 9], leaderRarity: 'crowned', leaderTag: 'crusade_fortress',
      suppressNatives: true, countMul: 0.7, amp: 1.8, rewardMul: 2.4 },
    { tier: 4, label: 'Converted', atControl: 0.85, structure: 'crusade_bastion',
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
  // THE THRONE: once anchored, the gate stands in owned ground within 120u of
  // the heart (≤ heartland, so the gate zone is always heart ground).
  throne: { gateRange: 120 },
  // The Leader's GRAND ARENA — a gladiatorial colosseum where he fights before
  // his own people, TRULY one-on-one: no ambient packs, no standing court. The
  // crowd on the stands is his only reinforcement — it answers his champion-
  // calls (rows vault the rail as the add-phase), and the stands EMPTY when
  // the crown falls. All data (data/arenas.ts ArenaCrowdSpec).
  sanctum: {
    tileset: 'grand_arena', rewardMul: 3.5, levelBonus: 4,
    rewardPerPower: 0.35,  // Leader-kill premium per anchor-unit of standing power
    bossBump: 2, xpFloor: 140, // the Leader's spawn shaping (spawnArenaBoss)
    packs: null,               // the Daresso purity: the sand is his alone
    garrison: { count: [0, 0] },
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
  // MAP: the gradient IS the strength readout — wash opacity climbs with local
  // grip and standing power; ♜/☗ hearts; ⚔ + thrust arrows where wars meet.
  map: {
    cellBase: 39, maxCellsPerAxis: 42, pad: 130,
    washAlpha: 0.12, washPowerAlpha: 0.1, washFloor: 0.3,
    arrows: 4, extentBase: 0.7, extentPerPower: 0.9,
  },
  color: '#d8b040',
};

export const CRUSADE: ContentPackage = {
  id: 'crusade',
  label: 'Crusades',
  color: '#d8b040',
  blurb: 'A faction kindles a holy war in the wilds — a living warfront that grows, clashes with rivals, and plants a throne — beat it back, or cut down its Leader in his arena.',
  cost: 130,
  // DISCOVERED in play (runs at defaults from level 12); the Vault unlock gates
  // TUNING, surfacing once you've encountered a Crusade in the world.
  unlock: {
    id: 'crusade_unlock',
    label: 'Encounter a Crusade (they appear from level 12)',
    test: (ctx) => (ctx.ledger.crusade_seen ?? 0) >= 1,
  },
  // INVESTMENT LADDER — each owned tier widens a slider so pressure climbs higher,
  // scaling ignition + growth harder (no table edits).
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
    let prev = -1;
    for (const t of s.tiers) {
      if (t.atControl <= prev) out.push(`tier ladder must ascend by atControl (saw ${t.atControl} after ${prev})`);
      prev = t.atControl;
      if (t.structure && !look.structure(t.structure)) out.push(`tier ${t.tier} structure '${t.structure}' unknown`);
      for (const cs of t.cityFill?.structures ?? []) {
        if (!look.structure(cs.structure)) out.push(`cityFill structure '${cs.structure}' unknown`);
      }
      if (t.cityFill?.square && !look.structure(t.cityFill.square)) out.push(`cityFill square '${t.cityFill.square}' unknown`);
    }
    if (!look.tileset(s.sanctum.tileset)) out.push(`sanctum tileset '${s.sanctum.tileset}' unknown`);
    if (s.sanctum.arena?.tileset && !look.tileset(s.sanctum.arena.tileset)) out.push(`sanctum arena tileset '${s.sanctum.arena.tileset}' unknown`);
    if (s.sanctum.arena?.layoutType && !look.layout(s.sanctum.arena.layoutType)) out.push(`sanctum arena layout '${s.sanctum.arena.layoutType}' unknown`);
    // The power arc must be a real arc, and the throne gate must be reachable
    // heart ground (isStronghold gates the engine's portal — a gateRange past
    // the heartland would author a gate that can never open).
    if (!(s.power.snuffBelow < s.power.start)) out.push(`power.snuffBelow ${s.power.snuffBelow} must be < start ${s.power.start}`);
    if (!(s.power.start < s.power.anchorAt)) out.push(`power.start ${s.power.start} must be < anchorAt ${s.power.anchorAt}`);
    if (!(s.power.anchorAt <= s.power.cap)) out.push(`power.anchorAt ${s.power.anchorAt} must be ≤ cap ${s.power.cap}`);
    if (!(s.power.anchoredFloor < s.power.anchorAt)) out.push(`power.anchoredFloor ${s.power.anchoredFloor} must be < anchorAt`);
    if (!(s.control.edge < s.control.full)) out.push(`control.edge ${s.control.edge} must be < full ${s.control.full}`);
    if (!(s.throne.gateRange <= s.control.heartland)) out.push(`throne.gateRange ${s.throne.gateRange} must be ≤ control.heartland ${s.control.heartland}`);
    return out;
  },
};

// A Crusade camp / fortress COMMANDER — felling it LIBERATES the zone (the
// field collapses locally and the campaign bleeds power), for a tier-scaled
// bounty. (Whoever lands the blow.)
// (The LEADER in its arena consumes World.crusadeRealmContext, so its row
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
