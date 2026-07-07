// ---------------------------------------------------------------------------
// AMALGAMATION — a NET-NEW package: "build your own boss to slaughter."
//
// A roving NECROMANCER (the Bonewright) appears mostly in UNCHARTED zones. Dwell
// near it for a hunt; slay the rare undead miniboss it points you to; return and
// graft a BODY PART. Each part decides what the Amalgamation BECOMES and what it
// DROPS — you assemble the boss and choose its spoils across 3 hunts (rarely a 4th),
// the graves cracking one by one, until it RISES at the Bonewright for the kill.
//
// Discovered in play (runs at defaults; the Vault unlock gates TUNING), exactly
// like Conclave / Fractures. The WHOLE mechanic is DATA on the surge below — open
// rate, part count, and the AMALGAM_PARTS registry (each part = stat mods + a
// granted skill/support + a themed drop). Add a part = one row; the engine
// assembles the boss from the union of chosen parts with zero engine edit.
//
// One overlay-only faction is grafted at boot (contexts:['amalgamation'] keeps it
// out of ordinary generation — it appears ONLY at the Bonewright's site):
//   • AMALGAM — the Bonewright (neutral, untargetable), the rare-undead minibosses,
//     and the assembled Amalgamation boss. No warlord, no relations (it never
//     brawls or holds territory; it is pure event content).
// ---------------------------------------------------------------------------

import { vec } from '../../core/math';
import { registerKillHandler } from '../../engine/killHandlers';
import { mod } from '../../engine/stats';
import { AmalgamationField, type AmalgamationSurge, type AmalgamPartSpec } from '../overlays/amalgamation';
import type { ContentPackage, FactionSpec } from '../types';

/** THE PART REGISTRY — the build-your-own-boss menu. Each part bends the boss (stat
 *  mods + a granted skill/support that rides the normal cast pipeline) AND decides a
 *  guaranteed, part-themed DROP. Tuning these IS tuning the feature. */
export const AMALGAM_PARTS: AmalgamPartSpec[] = [
  {
    id: 'heart', label: 'Wretched Heart', epithet: 'the Undying', glyph: '♥',
    mods: [mod('life', 'more', 0.7), mod('lifeRegen', 'flat', 8)],
    grantSupport: 'vampiric',
    drop: { support: 'crimson_harvest', gems: 2 },
  },
  {
    id: 'skull', label: 'Sorcerous Skull', epithet: 'the Cinderbound', glyph: '✶',
    mods: [mod('mana', 'flat', 140), mod('damage', 'increased', 0.45)],
    grantSkill: 'flame_wave',
    drop: { skill: 'meteor', gems: 1 },
  },
  {
    id: 'ribs', label: 'Warden Ribcage', epithet: 'the Unbroken', glyph: '⛨',
    mods: [mod('armor', 'flat', 70), mod('damageTaken', 'more', -0.12)],
    grantSkill: 'war_cry',
    drop: { support: 'colossal', gems: 1 },
  },
  {
    id: 'claws', label: 'Savage Claws', epithet: 'the Render', glyph: '✦',
    mods: [mod('damage', 'increased', 0.5), mod('attackSpeed', 'increased', 0.25)],
    grantSkill: 'whirlwind', grantSupport: 'brutality',
    drop: { skill: 'eviscerate', gems: 1 },
  },
  {
    id: 'maw', label: 'Devouring Maw', epithet: 'the Ravenous', glyph: '◆',
    mods: [mod('lifeLeech', 'flat', 0.06), mod('damage', 'increased', 0.3)],
    grantSkill: 'heavy_strike',
    drop: { support: 'vampiric', gems: 2 },
  },
  {
    id: 'legs', label: 'Loping Legs', epithet: 'the Relentless', glyph: '➤',
    mods: [mod('moveSpeed', 'increased', 0.35), mod('attackSpeed', 'increased', 0.2)],
    grantSkill: 'bone_arrow',
    drop: { support: 'swiftness', gems: 1 },
  },
  {
    id: 'eyes', label: 'Hunger Eyes', epithet: 'the Unerring', glyph: '◉',
    mods: [mod('accuracy', 'flat', 70), mod('critChance', 'flat', 0.15), mod('detectionRange', 'more', 0.5)],
    grantSupport: 'precision',
    drop: { support: 'precision', gems: 1 },
  },
];

/** The whole Amalgamation mechanic as data — every number is a knob. */
const AMALGAMATION_SURGE: AmalgamationSurge = {
  openChance: 0.008,        // per 0.5s step (×pressure) — a Bonewright now and then
  openChanceCap: 0.3,
  maxConcurrent: 1,         // ONE roving Bonewright at a time (it migrates on completion)
  chartedChance: 0.12,      // mostly appears in UNCHARTED zones (explore to find it)
  necromancerId: 'amalgam_necromancer',
  bossBaseId: 'amalgam_horror',
  minibossIds: ['amalgam_bonelord', 'amalgam_fleshweaver', 'amalgam_gravewarden'],
  minibossChartedChance: 0.3, // adjacent, charted or not — biased toward the uncharted
  minibossLevelBonus: 1,
  partCount: 3,             // gather three parts…
  rareExtraChance: 0.15,    // …rarely a fourth
  offerCount: [2, 3],       // two-to-three parts offered per return
  ringRadius: 92,
  farFrom: 460,
  bossReward: { xpBase: 260, xpPerLevel: 40, gems: 2 },
  minibossReward: { xpBase: 90, xpPerLevel: 18, gems: 1 },
  parts: AMALGAM_PARTS,
};

/** The AMALGAM faction — the Bonewright, its minibosses, and the assembled boss.
 *  contexts:['amalgamation'] keeps it out of ordinary generation (it appears ONLY
 *  at the overlay's site). No warlord, no relations — it never marches, brawls, or
 *  holds territory; it is pure event content. seedWar is auto-suppressed for a
 *  context-only faction (factionGen). */
const AMALGAM_FACTION: FactionSpec = {
  id: 'amalgam',
  name: 'the Amalgam',
  color: '#9ad0b0',
  traits: { roaming: 0, aggression: 1.3, warlordHome: 'origin', contexts: ['amalgamation'] },
  roster: [
    { id: 'amalgam_bonelord', weight: 1 },
    { id: 'amalgam_fleshweaver', weight: 1 },
    { id: 'amalgam_gravewarden', weight: 1 },
  ],
};

export const AMALGAMATION: ContentPackage = {
  id: 'amalgamation',
  label: 'Amalgamation',
  blurb: 'A roving Necromancer hunts you down work: slay the undead it marks, return to graft a body part, and BUILD the boss — and its drops — that you will then slaughter.',
  cost: 140,
  // DISCOVERED in play (runs at defaults); the Vault unlock gates TUNING, surfacing
  // once you've found your first Bonewright.
  unlock: {
    id: 'amalgamation_unlock',
    label: 'Discover the Bonewright (it appears from level 12)',
    test: (ctx) => (ctx.ledger.necromancers_seen ?? 0) >= 1,
  },
  tiers: [
    { id: 'amalgam_apprentice', label: 'Amalgam Apprentice', requirement: 'Build & slay 1 Amalgamation', cost: 200,
      test: (ctx) => (ctx.ledger.amalgamations_completed ?? 0) >= 1,
      grants: { weight: { min: 0, max: 90 } } },
    { id: 'amalgam_artisan', label: 'Amalgam Artisan', requirement: 'Build & slay 5 Amalgamations', cost: 300,
      test: (ctx) => (ctx.ledger.amalgamations_completed ?? 0) >= 5,
      grants: { weight: { min: 0, max: 100 }, startLevel: { min: 0, max: 101 } } },
  ],
  modifiers: [
    { id: 'amalgam_start', kind: 'startLevel', label: 'Bonewright appears at level', min: 12, max: 12, step: 1, defaultValue: 12 },
    { id: 'amalgam_weight', kind: 'weight', label: 'Bonewright frequency', min: 25, max: 55, step: 5, defaultValue: 40 },
  ],
  defaultWeight: 40,
  defaultStartLevel: 12,
  defaultEnabled: true,
  world: { overlay: (ctx) => new AmalgamationField(ctx, AMALGAMATION_SURGE) },
  factions: [AMALGAM_FACTION],
};

// AMALGAMATION: the marked undead falls — return to the Bonewright to graft a
// part (the overlay advances to 'choose'; the bone marker clears).
// (The assembled BOSS's fall despawns the Bonewright via World.amalgamSite, so
// its row lives on World.worldKillRules.)
registerKillHandler({
  id: 'amalgam_miniboss',
  tag: 'amalgam_miniboss',
  run: ctx => {
    const af = ctx.sim.amalgamationField;
    af?.onMinibossSlain();
    ctx.bumpLedger('amalgam_parts_gathered');
    const cfg = af?.surge();
    if (cfg) {
      ctx.grantXp(Math.round(cfg.minibossReward.xpBase + ctx.zone.level * cfg.minibossReward.xpPerLevel));
      for (let i = 0; i < cfg.minibossReward.gems; i++) ctx.dropGemAt(ctx.actor.pos);
    }
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 52), 'Slain — return to the Bonewright to choose a part. (M)', '#9ad0b0', 16);
  },
});
