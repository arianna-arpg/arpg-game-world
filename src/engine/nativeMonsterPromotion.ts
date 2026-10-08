import type { Actor } from './actor';
import type { Vec2 } from '../core/math';
import type { MonsterRarity } from './rarity';
import type { SkillInstance } from './skills';
import type { MagicPackVisual } from './magicPackMechanics';

/** Explicit live native providers, not captured source authority. These callbacks
 * retain their transitive registries and native ambient random stream. */
export interface NativeMonsterPromotionSources {
  readonly RARITY_DEFS: typeof import('./rarity').RARITY_DEFS;
  readonly rarityMods: typeof import('./rarity').rarityMods;
  readonly MONSTER_NAME_CFG: typeof import('../data/monsterNames').MONSTER_NAME_CFG;
  readonly rollMonsterName: typeof import('../data/monsterNames').rollMonsterName;
  readonly MAGIC_PACKS: typeof import('../data/magicPacks').MAGIC_PACKS;
  readonly MAGIC_PACK_CFG: typeof import('../data/magicPacks').MAGIC_PACK_CFG;
  readonly magicPackMinimum: typeof import('./magicPacks').magicPackMinimum;
  readonly MONSTERS: typeof import('../data/monsters').MONSTERS;
  readonly stepMagicPackMechanics: typeof import('./magicPackMechanics').stepMagicPackMechanics;
  readonly updateMagicPacks: typeof import('./magicPacks').updateMagicPacks;
  readonly SKILLS: typeof import('../data/skills').SKILLS;
  readonly makeSkillInstance: typeof import('./skills').makeSkillInstance;
  readonly monsterSkillLevelOf: typeof import('./world').monsterSkillLevelOf;
  readonly random: () => number;
}
export interface NativeMonsterPromotionHost {
  readonly actors: readonly Actor[];
  magicPackResolving: boolean;
  magicPackRefreshPending: boolean;
  magicPackEffects: MagicPackVisual[];
  nextSquadId(): number;
  promoteRarity(a: Actor, rarity: MonsterRarity, opts?: { distinctName?: string | boolean }): void;
  refreshMagicPacks(dt?: number): void;
  enemiesOf(a: Actor): Actor[];
  lineOfSight(a: Vec2, b: Vec2, fromTier: number, toTier: number): boolean;
  clipShot(a: Vec2, b: Vec2, tier: number): Vec2;
  resolveHit(a: Actor, instance: SkillInstance, victim: Actor, areaMul: number, chainMul: number): unknown;
}

export function promoteNativeRarity(host: NativeMonsterPromotionHost, sources: NativeMonsterPromotionSources, a: Actor, rarity: MonsterRarity, opts?: { distinctName?: string | boolean }): void {
    if (a.magicPack && rarity !== 'magic') {
      a.magicPack = undefined;
      host.refreshMagicPacks();
    }
    const def = sources.RARITY_DEFS[rarity];
    a.rarity = rarity;
    a.sheet.setSource('rarity', (0, sources.rarityMods)(rarity, !a.magicPack));
    a.radius *= def.sizeMul;
    a.xpValue = Math.round(a.xpValue * def.xpMul);
    if (typeof opts?.distinctName === 'string') {
      a.name = opts.distinctName;
    } else if (opts?.distinctName && sources.MONSTER_NAME_CFG.namedRarities.includes(rarity)) {
      a.name = (0, sources.rollMonsterName)(sources.random, a.faction);
    } else if (def.label) {
      a.name = `${def.label} ${a.name}`;
    }
    a.fillResources(); // re-fill now that max life has grown
  }

export function promoteNativeRarityStacked(host: NativeMonsterPromotionHost, sources: NativeMonsterPromotionSources, a: Actor, rarity: MonsterRarity, stacks: number, opts?: { distinctName?: string | boolean }): void {
    host.promoteRarity(a, rarity, opts);
    for (let i = 1; i < stacks; i++) a.sheet.setSource('rarityStack' + i, (0, sources.rarityMods)(rarity));
    if (stacks > 1) a.fillResources();
  }

export function promoteNativeMagicPack(host: NativeMonsterPromotionHost, sources: NativeMonsterPromotionSources, members: Actor[], mechanic: string): boolean {
    const def = sources.MAGIC_PACKS[mechanic];
    if (!def || members.length < (0, sources.magicPackMinimum)(def) || members.length > sources.MAGIC_PACK_CFG.maxMembers) return false;
    if (new Set(members).size !== members.length || members.some(a => a.dead || a.owner
      || a.team !== 'enemy' || a.magicPack || (a.rarity && a.rarity !== 'normal')
      || a.level < def.minLevel || a.faction !== members[0].faction)) return false;
    const id = host.nextSquadId();
    members.forEach((a, i) => {
      a.magicPack = { id, mechanic, slot: i, size: members.length, fallen: 0, ...(i === 0 ? { leader: 1 as const } : {}) };
      a.squadId = id;
      a.squadLeader = i === 0;
      host.promoteRarity(a, 'magic');
      a.name = `${def.name} ${sources.MONSTERS[a.defId ?? '']?.name ?? a.name}`;
    });
    host.refreshMagicPacks();
    return true;
  }

export function refreshNativeMagicPacks(host: NativeMonsterPromotionHost, sources: NativeMonsterPromotionSources, dt = 0): void {
    // A reflected hit can kill a conductor during this fold. Reconcile the
    // death after the hit loop, without advancing any encounter clock twice.
    if (host.magicPackResolving) { host.magicPackRefreshPending = true; return; }
    host.magicPackResolving = true;
    try {
      host.magicPackEffects = (0, sources.stepMagicPackMechanics)(host.actors, dt, {
        enemies: a => host.enemiesOf(a),
        clear: (a, b, tier) => host.lineOfSight(a, b, tier, tier),
        clip: (a, b, tier) => host.clipShot(a, b, tier),
        hit: (caster, skill, victim) => {
          const def = sources.SKILLS[skill];
          if (def) host.resolveHit(caster, (0, sources.makeSkillInstance)(def, (0, sources.monsterSkillLevelOf)(caster.level)), victim, 1, 1);
        },
      });
      (0, sources.updateMagicPacks)(host.actors);
    } finally { host.magicPackResolving = false; }
    if (host.magicPackRefreshPending) { host.magicPackRefreshPending = false; host.refreshMagicPacks(); }
  }
