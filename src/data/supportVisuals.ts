import type { SupportDef } from '../engine/skills';
import type { ProcEffect } from './procs';

/** Ordered by the information a player needs at the button. A support may have several destinations. */
export const SUPPORT_ROLES = {
  ammo:'Skill charges', stack:'Skill stacks', seals:'Repeat seals', fuel:'Charge spender', gauge:'Rolled mechanic',
  trigger:'Automatic cast', timing:'Cast timing', meta:'Secondary action', gate:'Cast condition',
  condition:'Conditional modifier', buff:'Buff grant', gain:'Charge grant', capacity:'Charge capacity', target:'Target condition',
  proc:'Triggered effect', recovery:'Recovery or protection', companion:'Companion',
  field:'Battlefield effect', flight:'Projectile path', hit:'Strike or impact', sequence:'Repeats or follow-ups',
  wearer:'Wearer stats', resource:'Resource flow', channel:'Channel', cast:'Cast behaviour', cooldown:'Cooldown', mod:'Skill modifier',
} as const;
export type SupportRole = keyof typeof SUPPORT_ROLES;
/** A socket always has its linked portrait. These describe where its gameplay can also be read. */
export const ROLE_DESTINATIONS = {
  ammo:'Skill charges', stack:'Skill counter', seals:'Skill counter', fuel:'Skill counter', gauge:'Linked skill',
  trigger:'Skill arming', timing:'Cast timing', meta:'Skill command', gate:'Skill availability', condition:'Socket condition',
  buff:'Buff recipient', gain:'Charge holder', capacity:'Existing charge bank', target:'Affected target', proc:'Triggered payload',
  recovery:'Recovery recipient', companion:'Companion or construct', field:'Battlefield', flight:'Projectile', hit:'Impact',
  sequence:'Cast or follow-up', wearer:'Wearer stats', resource:'Resource pool', channel:'Channel', cast:'Skill action',
  cooldown:'Skill cooldown', mod:'Linked skill',
} as const satisfies Record<SupportRole,string>;
export type SupportCounter = 'chamber'|'score'|'cistern'|'pressure'|'feathers'|'runes'|'clutch'|'brew'|'fangs'|'gate'
  |'shield'|'embers'|'venom'|'wounds'|'bolts'|'husks'|'bobbin'|'barbs'
  |'glass'|'ripostes'|'scales'|'crawlers'|'spirits'|'crowns'|'brood'|'shrouds'|'hatchlings'|'shadows'
  |'mirrors'|'ancestors'|'totems'|'effigies'|'mires'|'carapace'|'hive';

type Metadata = 'id'|'name'|'color'|'description'|'requiresTags'|'excludeTags'|'requiresMechanisms'
  |'weight'|'dropTags'|'minDropLevel'|'maxLevel'|'mods'|'perLevel'|'presentation';
/** New structural mechanics require a placement decision at compile time. Rolled axes are resolved separately. */
export const FIELD_ROLES = {
  constructLooks:['companion'], levelBonus:['mod'], levelBonusPer:['mod'], tether:['field'], aim:['cast'],
  overcharge:['timing'], constructFx:['companion','field'], meta:['meta'], munition:['ammo'], orbShedGraft:['field'],
  useChargeGraft:['ammo'], devour:['companion','buff','recovery'], throngSource:['companion'], fissureVolatile:['field'],
  fissureAftershock:['field','sequence'], fissureRoulette:['field'], fissureReclose:['field','sequence'],
  fissurePath:['field'], meleeFissure:['hit','field'], trigger:['trigger'], triggerPermit:['trigger'],
  guardCast:['gate'], guardBash:['hit'], spreadOnHit:['target'], curseOnHit:['target'], breakableGraft:['target'],
  massGraft:['hit'], corpseSpawn:['companion'], birth:['companion'], rollBase:['gauge'], minionAuraPool:['companion','buff'],
  dominate:['companion','target'], sacrifice:['companion','hit'], auraDuration:['cast'], reserveLife:['resource'],
  healField:['field','recovery'], spawnBuff:['buff','companion'], zoneEmit:['field'], madden:['field','target'],
  releaseOrder:['sequence'], healOverTime:['recovery'], chargeGain:['gain'], brood:['companion'],
  gate:['gate'], chargeCost:['fuel'], curseField:['field','target'], minionAura:['companion','buff'],
  resonance:['cast'], strikeTiming:['timing'], selfStack:['stack'], conduit:['resource'], tameMod:['companion'],
  trail:['flight','field'], fuse:['timing'], gather:['timing'], shellGraft:['cast','recovery'], fissureTrail:['field'],
  targeting:['cast'], turret:['companion'], cascade:['field','sequence'], pulse:['field','sequence'],
  followUp:['sequence'], zoneFollow:['field'], exposure:['target'], zoneGrow:['field'], zoneSizeOver:['field'],
  cadence:['timing'], variance:['cast'], sequel:['sequence'], contagion:['target'], pendulum:['cast'],
  echo:['sequence','companion'], summon:['companion'], grantsTags:['cast'],
} as const satisfies Record<Exclude<keyof SupportDef,Metadata>,readonly SupportRole[]>;

/** The proc trigger is one fact. Its recipient and payload are separate facts. */
export const PROC_ROLES = {
  extraHit:['hit'], explosion:['field','hit'], arc:['hit'], displace:['hit'], collisionDamage:['hit'],
  gainCharge:['gain'], buff:['buff'], summon:['companion'], birth:['companion'], status:['target'],
  heal:['recovery'], restore:['recovery','resource'], burst:['field'], delayedBurst:['field'],
  fortify:['recovery'], cooldown:['cooldown'], removeBuff:['buff'], ward:['recovery'], cleanse:['recovery'],
  kindle:['field'], vent:['field'], cast:['cast'],
} as const satisfies Record<ProcEffect['type'],readonly SupportRole[]>;

const STAT_ROLES: Record<string,SupportRole> = {};
function register(role:SupportRole, stats:string) {
  for(const stat of stats.split(' ')) STAT_ROLES[stat]=role;
}
register('ammo','skillCharges skillChargeRate reloadSpeed finalRoundDamage');
register('seals','unleashMax');
register('timing','overchargeStages sparkWindow sparkBonus');
register('trigger','triggerChance triggerThreshold triggerPower');
register('cooldown','addedCooldown cooldownRecovery');
register('capacity','chargeCap');
register('target','impalePower igniteToBomb dotPropagates hexBlast curseRupture dotRupture ailmentStacks embedIcd sunderDuration esShred hitToAffliction');
register('hit','knockback knockBuffet shoveAuthority impactDamage gripPower gripCrush plyRend meleeSweep meleeReverb splashRadius bashPower bashInvert bashFloor swingArc');
register('sequence','repeatCount repeatScale repeatRetarget repeatLock fireVolley fireSalvo volleySpacing pulseCount');
register('field','tetherDamage tetherWidth fissureCount fissureBranches cloudTrail cloudCharge cloudSalve moveTrail moveExplode stormCount stormImmediate aoeShape aoeSpin aoeScatter lingerField departSplash');
register('flight','projectileCount projectileSize projectileSpeed pierceCount chainCount forkCount homingPower erraticPower orbitPower weavePower spinPower spiralPower randomArc spreadAngle guidePower returnShrapnel');
register('companion','constructCastRate constructMaxCount constructTaunt mimicWitness mimicBank huskGuard possessDuration corpseBatch castAsTotem sacrificeMinions offeringShare');
register('resource','costToLife reservedDamage brimPower brimDecay brimFill overdriveFlow overdriveRecovery conduitRate conduitEfficiency');
register('recovery','lifeLeech lifeRegen healPower restorePower overheal guardStrength poiseRegenPct auraEsRecharge auraEsDelay guardAegis');
register('mod','accuracy afflictionYield ambushBonus armor attackSpeed blockChance blockValue bondbreaker castSpeed critChance critMulti damage damageSpread effectDuration giantsbane insightPen limbreaver luckyChance manaCost maxManaDamage moveSpeed overmatch poise proximityDamage quailbane regicide siegebreaker spentbane statusChance statusMagnitude threatGen tuneFavor uprooter');
register('cast','aoeRadius castAtCursor castMobility meleeReach multiTarget phasing sweepRange targetMinionFallback');
register('hit','conduction noiseOnHit poiseDamage guardParry guardParryPower thornsToHit');
register('field','domeDeflects');
register('target','doomDot');
register('timing','fuseDelay fusePower');
register('buff','echoMight');
register('resource','thirstless');
register('target','hedonism');
register('timing','reflex');
register('field','suffusion');
export function visualRoleForStat(stat:string):SupportRole|undefined {
  if (Object.hasOwn(STAT_ROLES,stat)) return STAT_ROLES[stat];
  if (/^(added(Min_|Max_|[A-Z])|convert_|damageVs_|costDamage_)/.test(stat)) return 'mod';
  if (stat.startsWith('dotLeech_')) return 'recovery';
  if (/^(apply_|applyWet_)/.test(stat)) return 'target';
  if (/^(minion|summon|sympathy_|throng|mirage)/.test(stat)) return 'companion';
  if (stat.startsWith('channel')) return 'channel';
  if (stat.startsWith('proj')) return 'flight';
  if (/^(orbOn|orbShed|remnant)/.test(stat)) return 'field';
  if (stat.startsWith('pour')) return 'resource';
}
