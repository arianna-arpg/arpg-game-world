import { transmutationOf } from './minionTransmutation';
import type { Actor } from './actor';
import { RELIQUARY_CFG } from '../data/reliquary';
import { STAT_DEFS, StatSheet, mod, type Modifier, type SkillTag } from './stats';
import { instanceMods, skillContextTags, type SkillInstance } from './skills';
import { minionBodyContext } from './skillScopes';
import { minionCombatOf, MINION_COMBAT } from './minionCombat';
import { THRONG_EVOLUTION, throngEvolution } from './throngEvolution';
import { STATUS_DEFS } from './status';
import { plyCountOf } from './plies';

const STATUS_IDS = Object.keys(STATUS_DEFS);

/** A pure inheritance result. Callers own lifetime, body size, and source
 * attribution; summons and persistent companions resolve the same investment. */
export interface MinionInheritance {
  tags: Set<SkillTag>;
  extra: Modifier[];
  ownerMods: Modifier[];
  combatMods: Modifier[];
  size: number;
  guard: boolean;
  squad: boolean;
  plyBonus: number;
}

export function minionAreaAvoidanceOf(caster: Actor, inst: SkillInstance,
  tags = skillContextTags(inst), extra = instanceMods(inst)): number {
  return Math.max(0, Math.min(MINION_COMBAT.maxAreaAvoidance,
    (minionCombatOf(inst.def).areaAvoidance ?? 0)
    + caster.sheet.get('minionAreaAvoidance', tags, extra) * (inst.relicSource ? RELIQUARY_CFG.minion.ordinaryStats : 1)));
}

/** Owner contributions pay the throng batch divisor once. Rates, body size,
 * survival fractions and discrete plies are not divided. The life trade and
 * echo both read the original investment, never one another's output. */
export function resolveMinionInheritance(caster: Actor, inst: SkillInstance,
  bodyId?: string, scale = 1): MinionInheritance {
  const tags = minionBodyContext(skillContextTags(inst), bodyId), extra = instanceMods(inst);
  // A transmuted body still owns its summon-tree/support investment. Only the
  // keeper's minion-specific sheet channels are replaced by personal sources.
  const inheritanceSheet = transmutationOf(caster, bodyId) ? new StatSheet() : caster.sheet;
  const get = (stat: string): number => {
    const raw = inheritanceSheet.get(stat, tags, extra);
    if (!inst.relicSource) return raw;
    const base = STAT_DEFS[stat]?.base ?? 0;
    return base + (raw - base) * RELIQUARY_CFG.minion.ordinaryStats;
  };
  const combat = minionCombatOf(inst.def);
  const threat = Math.max(MINION_COMBAT.minThreat, (combat.threat ?? 1) * get('minionThreat'));
  const combatMods = [
    mod('armorDamageFloor', 'flat', (inst.def.throng || inst.def.hivecall) ? THRONG_EVOLUTION.armorFloor : 0),
    mod('threatGen', 'more', threat - 1),
    mod('targetPriority', 'more', threat - 1),
    mod('areaAvoidance', 'flat', minionAreaAvoidanceOf(caster, inst, tags, extra)),
  ];
  const lifeInc0 = get('minionLife') - 1;
  const tradeAt = get('minionLifePlyTrade'), echoAt = get('minionLifePlyEcho');
  // Epsilon keeps an exactly purchased threshold whole despite IEEE rounding.
  const tradedPlies = tradeAt > 0 && lifeInc0 > 0 ? Math.floor(lifeInc0 / tradeAt + 1e-9) : 0;
  const echoPlies = echoAt > 0 && lifeInc0 > 0 ? Math.floor(lifeInc0 / echoAt + 1e-9) : 0;
  const lifeInc = tradeAt > 0 && lifeInc0 > 0 ? Math.max(0, lifeInc0 - tradedPlies * tradeAt) : lifeInc0;
  const haste = get('minionHaste'), regenRate = get('minionRegenRate');
  const baseMd = get('minionDamage');
  const ownerMods = [
    mod('damage', 'more', (baseMd - 1) * scale),
    mod('life', 'more', lifeInc * (throngEvolution(inst).lifeScale ?? scale)),
    mod('damageTaken', 'more', (get('minionDamageTaken') - 1) * scale),
    mod('moveSpeed', 'more', (get('minionMoveSpeed') * haste - 1) * scale),
    mod('attackSpeed', 'more', (haste - 1) * scale),
    mod('castSpeed', 'more', (haste - 1) * scale),
    mod('detectionRange', 'more', (get('minionDetectionRange') - 1) * scale),
    mod('lifeRegen', 'flat', get('minionRegen') * scale),
    mod('lifeRegenPct', 'flat', get('minionRegenPct') * scale),
    // Rate quickens native AND inherited regeneration. Scaling it again
    // would apply the batch divisor twice to the investment product.
    mod('lifeRegen', 'increased', regenRate - 1),
    mod('lifeRegenPct', 'increased', regenRate - 1),
  ];
  // Forward element-tagged minionDamage (e.g. ['fire'], ['chaos']) even when the
  // summon skill itself lacks that elemental tag so converted/added elemental minion hits scale.
  for (const elem of ['physical', 'fire', 'cold', 'lightning', 'chaos'] as const) {
    if (tags.has(elem)) continue;
    const rawElem = inheritanceSheet.get('minionDamage', new Set<SkillTag>([...tags, elem]), extra);
    const elemMd = inst.relicSource ? 1 + (rawElem - 1) * RELIQUARY_CFG.minion.ordinaryStats : rawElem;
    if (Math.abs(elemMd - baseMd) > 1e-6) {
      ownerMods.push(mod('damage', 'more', (elemMd / Math.max(0.01, baseMd) - 1) * scale, [elem]));
    }
  }
  // Socketed damage bonuses and penalties ride every descendant. Keep their
  // attack/spell/etc. filters for the recipient's own damage context.
  for (const m of extra) if (m.stat === 'damage') {
    ownerMods.push(m.kind === 'override' ? m : { ...m, value: m.value * scale });
  }
  for (const sid of caster.sheet.armedFamily('minionApply_', STATUS_IDS, extra)) {
    const carry = get('minionApply_' + sid);
    if (carry > 0) ownerMods.push(mod('apply_' + sid, 'flat', carry * scale));
  }
  // GRAFTED LINEAGE (minionInheritStatus): summoned minions inherit a share
  // of the owner's own ailment chances and bonus critical strike stats.
  const inheritFrac = get('minionInheritStatus');
  if (inheritFrac > 0) {
    for (const sid of STATUS_IDS) {
      const ownApply = caster.sheet.get('apply_' + sid);
      if (ownApply > 0) ownerMods.push(mod('apply_' + sid, 'flat', ownApply * inheritFrac * scale));
    }
    const ownCrit = Math.max(0, caster.sheet.get('critChance') - (STAT_DEFS.critChance.base ?? 0.05));
    const ownCritMult = Math.max(0, caster.sheet.get('critMulti') - (STAT_DEFS.critMulti.base ?? 1.5));
    if (ownCrit > 0) ownerMods.push(mod('critChance', 'flat', ownCrit * inheritFrac * scale));
    if (ownCritMult > 0) ownerMods.push(mod('critMulti', 'flat', ownCritMult * inheritFrac * scale));
  }
  return { tags, extra, ownerMods, combatMods, size: get('minionSize'),
    guard: get('minionGuard') > 0, squad: get('minionSquad') > 0,
    plyBonus: tradedPlies + echoPlies + Math.max(0, Math.round(get('minionPlies'))) };
}

/** Re-derive capacity without refilling spent armor on an unchanged refresh.
 * Runtime gifts (Hivecall / Assault) remain independent of owner investment. */
export function applyMinionPlyBonus(minion: Actor, inherited: number): void {
  const bonus = inherited + minion.hiveDeathPlies + minion.assaultWardCount;
  if (!minion.plySpec && bonus <= 0) return;
  minion.plySpec ??= { count: 0 };
  const spent = Math.max(0, minion.pliesMax - minion.plies);
  minion.pliesMax = plyCountOf(minion.plySpec, minion.level) + bonus;
  minion.plies = Math.max(0, minion.pliesMax - spent);
}
