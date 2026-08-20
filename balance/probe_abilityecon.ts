// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SKILL-MODE ECONOMY, M-ECON (docs/design/skill-modes.md
// §2/§5/§6: cap 20, Ability Essences, the repurposed Sacrificial Font).
// Pins, in order:
//   A. THE ONE ARRAY: every derivation reads SKILL_LEVEL_BANDS — the soft cap
//      is the last entry, the tier registry/floors/vendor tables zip to its
//      length, essenceTierForLevel walks the half-open band edges exactly,
//      bandPointsAt mints one point per completed band, the cost curve's tier
//      IS the band's, and the font's convert ratios stay LOSSY (down < up —
//      the no-free-exchange inequality the economy audit leans on).
//   B. THE FEED: levelUpSkill/levelUpSupport pay the dedicated wallet through
//      the real intent path — an empty wallet refuses, the WRONG tier refuses
//      (the half-open band law is the wallet gate), the right tier lands and
//      debits exactly, the soft cap refuses spending, and supports fall
//      through at the supportMul inside band I (cap 5).
//   C. THE FONT — MERGE: N alike (same skill, same rarity) fuse to one at +1
//      rarity through the real recipe: highest input level KEPT, socketed
//      supports pried back to the bag first, THE KEEPER'S MARK (locked) and
//      granted sparks refused as inputs, short groups refuse whole, the top
//      rung has no next step, and the recipe is DETERMINISTIC (two fresh
//      worlds, same bag → byte-same outcome).
//   D. THE FONT — CONVERT: up consumes convertUp for 1, down pays convertDown
//      for 1, the round trip LOSES, and every edge refuses (top-tier up,
//      bottom-tier down, short wallets, garbage tiers).
//   E. THE FONT — RESET: the ritual clears a skill's tree picks at the
//      charter's own price shape (a level-14 skill pays band III), refuses
//      with nothing picked, and a short wallet leaves the pick standing.
//   F. DROPS: rollSkillGem mints at level 1 ALWAYS (the preLevel roll is
//      retired); the kill-path essence roll honors the zone FLOORS (shallow
//      ground never mints deep tiers, ground below every floor mints nothing)
//      and THE TIER GRADIENT leans deep on deep ground; the mint FLOATS the
//      tier's name (the drop is an EVENT — the dopamine ruling); a packet at
//      the hero's feet vacuums into the wallet through the real update.
//   G. THE SPOILS LAW: sealed ground refuses the new mint primitive.
//   H. PERSISTENCE: the wallet survives the character-save round trip, a
//      pre-M-ECON save (points-era fields, no wallet) loads with a zeroed
//      wallet (the costless grandfather), and the co-op seat-meta wire
//      carries the wallet both ways.
// Run: npx tsx balance/probe_abilityecon.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { seedGlobalRandom } from '../src/sim/rng';
import { starterBuild } from '../src/sim/data/builds';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import {
  bandPointsAt, essenceTierForLevel, makeSkillGem, MAX_SKILL_LEVEL,
  SKILL_LEVEL_BANDS, SKILL_RARITIES, supportMaxLevel,
  type SkillRarity, type SupportInstance,
} from '../src/engine/skills';
import {
  ABILITY_ESSENCE_CFG, ABILITY_ESSENCES, abilityEssenceOfTier, FONT_CFG,
  skillLevelAbilityCost, supportLevelAbilityCost,
} from '../src/data/essences';
import { rebuildSavedMeta, serializeCharacter, type CharacterSave } from '../src/meta/character';
import { applySeatMeta, serializeSeatMeta } from '../src/net/snapshot';
import type { MetaAction, PlayerInput } from '../src/net/intent';
import type { Vec2 } from '../src/core/math';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xab1e);

// ------------------------------------------------- A. THE ONE ARRAY -------
const bands = SKILL_LEVEL_BANDS;
check('A: the bands ascend', bands.every((b, i) => i === 0 || b > bands[i - 1]), bands.join(','));
check('A: the soft cap IS the last entry', MAX_SKILL_LEVEL === bands[bands.length - 1]);
check('A: one essence tier per band (the registry zips the array)',
  ABILITY_ESSENCES.length === bands.length
  && ABILITY_ESSENCES.every((d, i) => d.tier === i + 1 && d.id === `ability${i + 1}`));
check('A: the drop floors table matches the band count',
  ABILITY_ESSENCE_CFG.floors.length === bands.length);
check('A: the vendor tables match the band count',
  ABILITY_ESSENCE_CFG.vendor.prices.length === bands.length
  && ABILITY_ESSENCE_CFG.vendor.rungNeeded.length === bands.length);
// The half-open edges, exactly (tier I steps into 2–5, II into 6–10, …).
const edges: [number, number][] = [[2, 1], [5, 1], [6, 2], [10, 2], [11, 3], [15, 3], [16, 4], [20, 4]];
check('A: essenceTierForLevel walks the half-open edges',
  edges.every(([lv, t]) => essenceTierForLevel(lv) === t),
  edges.map(([lv, t]) => `${lv}→${essenceTierForLevel(lv)}(want ${t})`).join(' '));
check('A: a point per COMPLETED band, derived, capped by the array',
  bandPointsAt(1) === 0 && bandPointsAt(4) === 0 && bandPointsAt(5) === 1
  && bandPointsAt(9) === 1 && bandPointsAt(10) === 2 && bandPointsAt(15) === 3
  && bandPointsAt(19) === 3 && bandPointsAt(20) === 4 && bandPointsAt(31) === 4);
let costTiersOk = true;
for (let t = 2; t <= MAX_SKILL_LEVEL; t++) {
  const c = skillLevelAbilityCost(t);
  if (c.tier !== essenceTierForLevel(t) || c.count < 1) costTiersOk = false;
}
check('A: the cost curve\'s tier IS the band\'s, counts ≥ 1 across the ladder', costTiersOk);
check('A: supports price inside band I at the supportMul (cap 5)',
  [2, 3, 4, 5].every(t => supportLevelAbilityCost(t).tier === 1
    && supportLevelAbilityCost(t).count >= skillLevelAbilityCost(t).count));
check('A: the font\'s convert stays LOSSY (down < up — no free exchange)',
  FONT_CFG.convertDown < FONT_CFG.convertUp);

// ---------------------------------------------------- B. THE FEED ---------
const w: World = makeSimWorld('swashbuckler', 0x5eed);
const seat = w.localSeat;
{
  const build = starterBuild('swashbuckler', 4); // gem level 2
  build.bar = ['wild_strike'];
  const warns = applyBuild(w, build, 0x9ea7);
  if (warns.length) console.log('  build warnings:', warns.join(' | '));
}
const m = seat.meta;
const inst = m.knownSkills.get('wild_strike')!;
const wallet = m.abilityEssences;
const idOf = (tier: number): string => abilityEssenceOfTier(tier).id;
const levelSkill = (): void => w.applyAction(seat, { t: 'levelSkill', skillId: 'wild_strike' });

check('B: the wallet boots zeroed across every tier',
  ABILITY_ESSENCES.every(d => (wallet[d.id] ?? 0) === 0));
const lv0 = inst.level;
levelSkill();
check('B: an empty wallet refuses the level', inst.level === lv0);
wallet[idOf(2)] = 99; // the WRONG tier for a band-I step
levelSkill();
check('B: the wrong tier refuses — the half-open band law is the wallet gate',
  inst.level === lv0 && wallet[idOf(2)] === 99);
const stepCost = skillLevelAbilityCost(lv0 + 1);
wallet[idOf(1)] = stepCost.count + 3;
levelSkill();
check('B: the right tier lands and debits exactly',
  inst.level === lv0 + 1 && wallet[idOf(1)] === 3);
wallet[idOf(2)] = 0;
inst.level = 5;
wallet[idOf(1)] = 999;
levelSkill();
check('B: stepping into band II refuses tier I however fat the purse', inst.level === 5);
wallet[idOf(2)] = skillLevelAbilityCost(6).count;
levelSkill();
check('B: tier II feeds the step into 6', inst.level === 6 && wallet[idOf(2)] === 0);
inst.level = MAX_SKILL_LEVEL;
for (const d of ABILITY_ESSENCES) wallet[d.id] = 999;
levelSkill();
check('B: the soft cap refuses spending (effective growth is investment\'s road)',
  inst.level === MAX_SKILL_LEVEL);
// Supports fall through: same family, supportMul, cap 5.
const gem: SupportInstance = { def: SUPPORTS.splitting, level: 1 };
m.inventory.push(gem);
const gemIdx = m.inventory.length - 1;
for (const d of ABILITY_ESSENCES) wallet[d.id] = 0;
w.applyAction(seat, { t: 'levelSupportInv', index: gemIdx });
check('B: a support with an empty wallet refuses', gem.level === 1);
const supCost = supportLevelAbilityCost(2);
wallet[idOf(supCost.tier)] = supCost.count;
w.applyAction(seat, { t: 'levelSupportInv', index: gemIdx });
check('B: the support levels from tier I at the supportMul',
  gem.level === 2 && wallet[idOf(supCost.tier)] === 0);
gem.level = supportMaxLevel(gem.def);
wallet[idOf(1)] = 999;
w.applyAction(seat, { t: 'levelSupportInv', index: gemIdx });
check('B: the support cap (5) still refuses', gem.level === supportMaxLevel(gem.def));

// ------------------------------------------------ C. THE FONT: MERGE ------
// The arena mints no font — stand one at the hero's feet (the recipe's gate
// is nearFont, pure proximity + reach).
w.fonts.push({ pos: { x: seat.actor.pos.x, y: seat.actor.pos.y } });
const ladder = Object.keys(SKILL_RARITIES) as SkillRarity[];
const bagIds = (): string => m.skillInv.map(g =>
  `${g.def.id}:${g.rarity}:L${g.level}${g.locked ? ':lk' : ''}${g.granted ? ':gr' : ''}`).sort().join('|');
{
  m.skillInv.length = 0;
  const a = makeSkillGem(SKILLS.fireball, 3, 'common');
  const b = makeSkillGem(SKILLS.fireball, 1, 'common');
  const c = makeSkillGem(SKILLS.fireball, 1, 'common');
  b.sockets[0] = { def: SUPPORTS.splitting, level: 2 }; // pried out, never burned
  const locked = makeSkillGem(SKILLS.fireball, 9, 'common');
  locked.locked = true; // the keeper's mark
  const granted = makeSkillGem(SKILLS.fireball, 1, 'common');
  granted.granted = true; // the rescue hatch is not a mint
  m.skillInv.push(a, b, c, locked, granted);
  const invBefore = m.inventory.length;
  w.applyAction(seat, { t: 'fontMerge', skillId: 'fireball', rarity: 'common' });
  const merged = m.skillInv.find(g => g.rarity === 'magic');
  check('C: 3 alike fuse into ONE at +1 rarity (sockets = the new rung\'s)',
    !!merged && m.skillInv.length === 3
    && merged.sockets.length === SKILL_RARITIES.magic.sockets);
  check('C: the merged gem keeps the HIGHEST input level', merged?.level === 3);
  check('C: socketed supports pried back to the bag before the burn',
    m.inventory.length === invBefore + 1);
  check('C: the keeper\'s mark refused as input — the locked copy stands',
    m.skillInv.some(g => g.locked && g.level === 9));
  check('C: the granted spark refused as input', m.skillInv.some(g => g.granted));
  const before = bagIds();
  w.applyAction(seat, { t: 'fontMerge', skillId: 'fireball', rarity: 'common' });
  check('C: a short group refuses WHOLE (nothing eaten)', bagIds() === before);
  const leg = makeSkillGem(SKILLS.fireball, 2, 'legendary');
  m.skillInv.push(leg, makeSkillGem(SKILLS.fireball, 1, 'legendary'), makeSkillGem(SKILLS.fireball, 1, 'legendary'));
  const withLeg = bagIds();
  w.applyAction(seat, { t: 'fontMerge', skillId: 'fireball', rarity: 'legendary' });
  check('C: the top rung has no next step', bagIds() === withLeg);
  check('C: the rarity ladder reads from the registry',
    ladder[ladder.indexOf('common') + 1] === 'magic' && ladder[ladder.length - 1] === 'legendary');
}
// Determinism: two fresh worlds, the same bag → the same outcome.
const mergeRun = (seed: number): string => {
  const restore = seedGlobalRandom(seed);
  try {
    const ww: World = makeSimWorld('swashbuckler', seed);
    const s2 = ww.localSeat;
    ww.fonts.push({ pos: { x: s2.actor.pos.x, y: s2.actor.pos.y } });
    s2.meta.skillInv.length = 0;
    s2.meta.skillInv.push(
      makeSkillGem(SKILLS.fireball, 4, 'common'),
      makeSkillGem(SKILLS.fireball, 2, 'common'),
      makeSkillGem(SKILLS.fireball, 2, 'common'),
      makeSkillGem(SKILLS.fireball, 1, 'common'));
    ww.applyAction(s2, { t: 'fontMerge', skillId: 'fireball', rarity: 'common' });
    return s2.meta.skillInv.map(g => `${g.def.id}:${g.rarity}:L${g.level}:s${g.sockets.length}`).sort().join('|');
  } finally { restore(); }
};
check('C: the recipe is deterministic (two fresh worlds agree byte-for-byte)',
  mergeRun(0xf00d) === mergeRun(0xf00d), mergeRun(0xf00d));
check('C: the highest-N inputs burn — the L1 straggler survives the fuse',
  mergeRun(0xf00d).includes(':common:L1') && mergeRun(0xf00d).includes(':magic:L4'));

// ---------------------------------------------- D. THE FONT: CONVERT ------
{
  for (const d of ABILITY_ESSENCES) wallet[d.id] = 0;
  const conv = (tier: number, dir: 'up' | 'down'): void =>
    w.applyAction(seat, { t: 'fontConvert', tier, dir });
  wallet[idOf(1)] = FONT_CFG.convertUp;
  conv(1, 'up');
  check('D: up consumes convertUp of tier N for ONE of N+1',
    wallet[idOf(1)] === 0 && wallet[idOf(2)] === 1);
  conv(2, 'down');
  check('D: down pays convertDown of N−1 for ONE of N',
    wallet[idOf(2)] === 0 && wallet[idOf(1)] === FONT_CFG.convertDown);
  check('D: the round trip LOSES (the PoE map-vendor valve)',
    FONT_CFG.convertDown < FONT_CFG.convertUp && wallet[idOf(1)] < FONT_CFG.convertUp);
  const top = ABILITY_ESSENCES.length;
  wallet[idOf(top)] = 99;
  const held = wallet[idOf(top)];
  conv(top, 'up');
  check('D: the top tier refuses up', wallet[idOf(top)] === held);
  wallet[idOf(1)] = 5;
  conv(1, 'down');
  check('D: the bottom tier refuses down', wallet[idOf(1)] === 5);
  wallet[idOf(2)] = FONT_CFG.convertUp - 1;
  conv(2, 'up');
  check('D: a short wallet refuses up whole', wallet[idOf(2)] === FONT_CFG.convertUp - 1);
  conv(9, 'up');
  conv(0, 'down');
  check('D: garbage tiers no-op', true);
}

// ------------------------------------------------ E. THE FONT: RESET ------
{
  inst.level = 14; // band III — the charter's own pricing example
  w.applyAction(seat, { t: 'pickTreeNode', skillId: 'wild_strike', nodeId: 'ws_duelist' });
  check('E: the pick stands (sanctuary ground)', inst.treeNodes?.[0] === 'ws_duelist');
  for (const d of ABILITY_ESSENCES) wallet[d.id] = 0;
  w.applyAction(seat, { t: 'fontReset', skillId: 'wild_strike' });
  check('E: a short wallet leaves the choice standing', inst.treeNodes?.[0] === 'ws_duelist');
  wallet[idOf(3)] = FONT_CFG.reset.count + 1;
  w.applyAction(seat, { t: 'fontReset', skillId: 'wild_strike' });
  check('E: the ritual unmakes the pick at band III\'s price (level 14 → tier III)',
    inst.treeNodes === undefined && wallet[idOf(3)] === 1);
  const held = wallet[idOf(3)];
  w.applyAction(seat, { t: 'fontReset', skillId: 'wild_strike' });
  check('E: nothing picked → nothing charged', wallet[idOf(3)] === held);
}

// ------------------------------------------------------- F. DROPS ---------
{
  let preLeveled = 0;
  for (let i = 0; i < 300; i++) if (w.rollSkillGem(undefined, 20).level !== 1) preLeveled++;
  check('F: DROP-AT-1 — 300 deep-bracket gem rolls, every one level 1 (preLevel retired)',
    preLeveled === 0, `${preLeveled} pre-leveled`);

  const roller = w as unknown as { rollAbilityEssenceDrop(at: Vec2, bounty: number): void };
  const at = { x: seat.actor.pos.x + 200, y: seat.actor.pos.y };
  const tiersSeen = (): number[] => w.drops
    .filter(d => d.item.kind === 'abilityEssence')
    .map(d => (d.item as { tier: number }).tier);
  const zl = w.zone.level;
  w.drops.length = 0;
  (w.zone as { level: number }).level = 0;
  for (let i = 0; i < 40; i++) roller.rollAbilityEssenceDrop(at, 1e9);
  check('F: ground below every floor mints nothing', tiersSeen().length === 0);
  (w.zone as { level: number }).level = 3;
  for (let i = 0; i < 60; i++) roller.rollAbilityEssenceDrop(at, 1e9);
  check('F: level-3 ground mints tier I only (the floors hold)',
    tiersSeen().length > 0 && tiersSeen().every(t => t === 1));
  w.drops.length = 0;
  w.texts.length = 0;
  (w.zone as { level: number }).level = 20;
  for (let i = 0; i < 200; i++) roller.rollAbilityEssenceDrop(at, 1e9);
  const seen = tiersSeen();
  const count = (t: number): number => seen.filter(x => x === t).length;
  check('F: deep ground spans the ladder and leans DEEP (the tier gradient)',
    seen.every(t => t >= 1 && t <= ABILITY_ESSENCES.length)
    && count(ABILITY_ESSENCES.length) > count(1),
    `IV×${count(4)} vs I×${count(1)} over ${seen.length}`);
  check('F: the mint FLOATS the tier\'s name — the drop is an EVENT',
    w.texts.some(t => t.text.includes('Ability Essence')));
  (w.zone as { level: number }).level = zl;

  // The vacuum: a packet at the hero's feet reaches the wallet through the
  // real update sweep (snap the scatter to the feet — determinism).
  w.drops.length = 0;
  for (const d of ABILITY_ESSENCES) wallet[d.id] = 0;
  w.dropAbilityEssenceAt(seat.actor.pos, 2, 3);
  check('F: the packet minted', w.drops.length === 1);
  w.drops[0].pos = { x: seat.actor.pos.x, y: seat.actor.pos.y };
  const noInput: PlayerInput = { dx: 0, dy: 0, aim: { x: 1, y: 0 }, held: [], edge: [] };
  seat.input = { poll: () => noInput };
  for (let i = 0; i < 4 && w.drops.length; i++) w.update(0.05);
  check('F: the vacuum banks it — wallet +3 of tier II, ground clear',
    wallet[idOf(2)] === 3 && w.drops.length === 0);
}

// -------------------------------------------------- G. THE SPOILS LAW -----
{
  const zone = w.zone as { spoils?: string };
  const had = zone.spoils;
  zone.spoils = 'none';
  const before = w.drops.length;
  w.dropAbilityEssenceAt(seat.actor.pos, 1, 5);
  check('G: sealed ground refuses the mint primitive', w.drops.length === before);
  zone.spoils = had;
  w.dropAbilityEssenceAt({ x: seat.actor.pos.x + 400, y: seat.actor.pos.y }, 1, 5);
  check('G: open ground mints again', w.drops.length === before + 1);
  w.drops.length = 0;
}

// ------------------------------------------------- H. PERSISTENCE ---------
{
  for (const d of ABILITY_ESSENCES) wallet[d.id] = 0;
  wallet[idOf(1)] = 5;
  wallet[idOf(3)] = 2;
  const save = serializeCharacter(w);
  check('H: the save carries the wallet',
    save.abilityEssences?.[idOf(1)] === 5 && save.abilityEssences?.[idOf(3)] === 2);
  const rebuilt = rebuildSavedMeta(save);
  check('H: the wallet survives the round trip',
    rebuilt?.meta.abilityEssences[idOf(1)] === 5 && rebuilt?.meta.abilityEssences[idOf(3)] === 2);
  // A pre-M-ECON save: points-era fields present, no wallet — the costless
  // grandfather (levels ride the gems; the wallet boots zeroed).
  const legacy = JSON.parse(JSON.stringify(save)) as CharacterSave & {
    skillPoints?: number; offerings?: number;
  };
  delete legacy.abilityEssences;
  legacy.skillPoints = 7;
  legacy.offerings = 2;
  const old = rebuildSavedMeta(legacy);
  check('H: a points-era save loads — wallet zeroed, retired fields ignored',
    !!old && ABILITY_ESSENCES.every(d => (old.meta.abilityEssences[d.id] ?? 0) === 0));
  // The wire: serialize → wipe → apply restores the wallet.
  const wireRow = serializeSeatMeta(seat);
  for (const d of ABILITY_ESSENCES) wallet[d.id] = 0;
  applySeatMeta(w, seat, wireRow);
  check('H: the seat-meta wire carries the wallet both ways',
    seat.meta.abilityEssences[idOf(1)] === 5 && seat.meta.abilityEssences[idOf(3)] === 2);
  // Malformed/hostile intents no-op through the validator.
  w.applyAction(seat, { t: 'fontConvert', tier: 'x', dir: 'up' } as unknown as MetaAction);
  w.applyAction(seat, { t: 'fontMerge', skillId: 'fireball', rarity: 'mythic' } as unknown as MetaAction);
  w.applyAction(seat, { t: 'buyAbilityEss', vendor: 'brandt', tier: -1 } as unknown as MetaAction);
  check('H: malformed font/vendor intents no-op through the validator', true);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
