import type { PassiveNode } from './passives';
import type { IconSubject } from '../render/skillIconArt';
import { PASSIVE_BRANCH_PREFIXES, PASSIVE_BRANCH_THEMES } from './passiveNodeThemes';

export interface PassiveSymbol { icon:IconSubject; theme:string }
const rows = (icon:IconSubject,theme:string,stats:string):[string,PassiveSymbol][] => stats.split(' ').map(id=>[id,{icon,theme}]);
/** Semantic vocabulary for grants. These rows can serve any passive tree;
 * source IDs, node positions and translated descriptions do not pick icons. */
export const PASSIVE_STAT_SYMBOLS: Readonly<Record<string,PassiveSymbol>> = Object.fromEntries([
  ...rows('sword','impact','damage addedPhysical armorPen damageVs_bleed damageSpread hitCap multiTarget proximityDamage'),
  ...rows('hammer','impact','poiseDamage impactDamage knockback displaceForce shoveAuthority siegebreaker trample plyRend giantsbane uprooter'),
  ...rows('hand','impact','gripPower wriggle'),...rows('mountain','impact','weight'),...rows('spear','impact','meleeReach'),
  ...rows('heart','life','life lifeRegen lifeRegenPct lifeOnHit lifeOnKill lifeOnEvade healPower healTaken minionDeathHeal minionDeathHealFlat summonMend minionRegenPct minionRegenRate minionLife'),
  ...rows('blood','life','lifeLeech vampiricShare minionLifePlyTrade offeringShare hitToAffliction lowLifeLine lastGasp lastGaspLife'),
  ...rows('chalice','arcana','mana manaRegen manaRegenPct manaOnKill manaLeech maxManaDamage manaShield'),
  ...rows('rune','arcana','manaCost castSpeed castMobility channelMobility channelTurnRate channelRamp channelThorns'),
  ...rows('crystal','arcana','energyShield esRechargeRate esRechargeDelay esRechargeSteadfast esDotResist esForgone esOnHit esOnKill esLeech esShred esToMana esToPoise lifeRegenToEs'),
  ...rows('shield','bastion','guardStrength guardAegis guardParry guardMend wardGain wardDecay absorbPower minionGuard minionDamageTaken minionUndying huskGuard'),
  ...rows('plate','bastion','armor damageTaken blockValue blockChance evasionToArmor'),
  ...rows('pillar','bastion','poise poiseRegenPct poiseOnHit poiseOvercharge poiseRearmAt staggerFrac'),
  ...rows('shell','bastion','endurance enduranceRegenPct ailmentResist'),...rows('thorns','bastion','thorns thornsReflect thornsToHit'),
  ...rows('boot','guile','moveSpeed strideReach minionMoveSpeed'),...rows('cloak','guile','evasion evasionForgone detectability'),
  ...rows('dagger','guile','ambushBonus cullThreshold quailbane limbreaver'),
  ...rows('target','ranged','accuracy critChance critMulti critAvoid'),
  ...rows('blades','tempo','attackSpeed'),
  ...rows('arrow','ranged','projectileSpeed projectileSize pierceCount projAccel'),
  ...rows('quiver','ranged','projectileCount projectileCountChance forkCount chainCount repeatCount'),
  ...rows('hook','ranged','projReturn projBounce homingPower'),...rows('crossbow','devices','reloadSpeed finalRoundDamage'),
  ...rows('clock','time','effectDuration cooldownRecovery skillChargeRate skillCharges recuperate recuperateTime'),
  ...rows('orb','arcana','aoeRadius conduction suffusion conduitEfficiency'),
  ...rows('eye','arcana','insight insightEfficiency insightInversion insightStillTaper insightRegenPct insightPen mimicWitness mimicBank'),
  ...rows('skull','host','minionDamage corpseBatch minionExplodeDeath minionShare bondShare remnantChance'),
  ...rows('paw','host','minionMaxCount minionHaste minionSize throngPockets throngYield'),...rows('ribs','host','minionPlies'),
  ...rows('ghost','host','possessPower possessDuration'),...rows('gear','devices','constructMaxCount tetherDamage'),
  ...rows('venom','entropy','statusChance statusMagnitude ailmentStacks afflictionYield apply_poison apply_jinxed unluckyChance dotPropagates dotCrit doomDot'),
  ...rows('wound','entropy','apply_bleed'),...rows('flame','fire','addedFire firePen fireRes fireResMax apply_burn igniteToBomb'),
  ...rows('snowflake','cold','addedCold coldPen coldRes coldResMax apply_chill'),...rows('lightning','lightning','addedLightning lightningPen lightningRes lightningResMax apply_shock'),
  ...rows('void','entropy','addedChaos chaosRes'),...rows('brokenNote','chorus','apply_silence'),
  ...rows('note','chorus','durationAuraCap echoMight reservedDamage'),...rows('banner','chorus','mercVigor mercEase mercHireDiscount mercRetinue commandDiscipline threatGen'),
  ...rows('cards','fortune','luck luckyChance highRollWindow procDepth'),
  ...rows('bottle','life','restorePower restorePctMax pourPrime reflex thirstless'),
  ...rows('spiral','tempo','orbitPower weavePower spinPower erraticPower overdriveCap'),
  ...rows('flame','fire','proc_spec_fire_relay proc_hot_streak proc_kindled_rage proc_slow_burn'),
  ...rows('snowflake','cold','proc_spec_cold_relay proc_weave_thermal_memory proc_native_thawing_reserve'),
  ...rows('lightning','lightning','proc_spec_lightning_relay proc_thunderstruck proc_short_circuit proc_crest_discharge'),
  ...rows('sword','impact','proc_spec_spell_to_blade proc_weave_spell_hunger proc_overpower proc_crimson_edge'),
  ...rows('rune','arcana','proc_spec_blade_to_spell proc_route_breach_spell proc_route_filled_spell proc_radiant_cascade'),
  ...rows('clock','time','proc_spec_quick_preparation proc_spec_deliberate_release proc_weave_funeral_clock proc_route_evade_clock proc_route_funeral_clock proc_route_device_clock proc_route_block_clock proc_route_held_clock proc_native_wounded_clock proc_route_heal_clock'),
  ...rows('boot','guile','proc_spec_advance proc_spec_return proc_weave_empty_stride proc_weave_break_for_breath proc_route_empty_footing proc_route_move_needle'),
  ...rows('heart','life','proc_weave_still_mercy proc_native_field_patch proc_native_parting_blessing proc_mending_ward proc_native_song_of_return'),
  ...rows('shield','bastion','proc_weave_airborne_shelter proc_weave_red_glass proc_weave_blood_glass proc_shield_lesson proc_native_breach_reserve proc_route_varied_ward proc_native_broken_veil proc_route_summon_ward proc_native_vanishing_guard proc_route_rearmed_ward proc_native_halfway_shelter proc_tempered_rearm proc_last_stand'),
  ...rows('hammer','impact','proc_weave_wall_fury proc_weave_trap_hammer proc_native_undertow_fist proc_cave_in proc_collision_crush proc_reprisal'),
  ...rows('chalice','arcana','proc_route_collision_mana proc_native_varied_mana proc_desperate_reserves proc_native_critical_reservoir proc_native_summoners_breath proc_route_back_mana proc_native_venom_breath proc_route_block_mana proc_native_verse_reservoir'),
  ...rows('pillar','bastion','proc_weave_block_reserve proc_route_shield_poise proc_shedding_plates proc_stalwart_rhythm'),
  ...rows('quiver','ranged','proc_weave_rack_memory proc_weave_unbroken_return proc_weave_rain_collector'),
  ...rows('note','chorus','proc_weave_warcry_verse proc_battle_chorus'),
  ...rows('skull','host','proc_weave_delegated_breath proc_necrotic_feast'),
  ...rows('gear','devices','proc_route_evade_device proc_native_workshop_fury'),
  ...rows('blades','tempo','proc_native_repeated_frenzy proc_surging_frenzy proc_tempo proc_adrenal_rush'),
  ...rows('blood','life','proc_crimson_thirst proc_bloodletters_rhythm'),
  ...rows('eye','arcana','proc_battle_insight proc_mind_like_water'),
  ...rows('thorns','bastion','proc_native_barbed_reply proc_radiant_reprisal'),
  ...rows('hook','devices','proc_magnetic_pull'),...rows('orb','arcana','proc_displacement_field'),
  ...rows('cards','fortune','proc_weave_missed_jackpot'),
]);
export const PASSIVE_TAG_SYMBOLS: Readonly<Record<string,PassiveSymbol>> = {
  fire:{icon:'flame',theme:'fire'},cold:{icon:'snowflake',theme:'cold'},lightning:{icon:'lightning',theme:'lightning'},chaos:{icon:'void',theme:'entropy'},
  physical:{icon:'sword',theme:'impact'},melee:{icon:'sword',theme:'impact'},spell:{icon:'rune',theme:'arcana'},projectile:{icon:'arrow',theme:'ranged'},
  song:{icon:'note',theme:'chorus'},warcry:{icon:'horn',theme:'chorus'},summon:{icon:'skull',theme:'host'},construct:{icon:'gear',theme:'devices'},munition:{icon:'crossbow',theme:'devices'},
  'minion:swarm':{icon:'beetle',theme:'nature'},'minion:skeleton':{icon:'skull',theme:'host'},'minion:skeletal_mage':{icon:'skull',theme:'host'},'minion:golem':{icon:'golem',theme:'devices'},
  'body:skeleton_archer':{icon:'bow',theme:'host'},'body:stone_golem':{icon:'rock',theme:'bastion'},'body:bone_golem':{icon:'ribs',theme:'host'},
  'body:fire_golem':{icon:'flame',theme:'fire'},'body:ice_golem':{icon:'ice',theme:'cold'},'body:blood_golem':{icon:'blood',theme:'life'},
  'cast:instant':{icon:'lightning',theme:'time'},'cast:timed':{icon:'hourglass',theme:'time'},'cast:channel':{icon:'spiral',theme:'arcana'},
};
export const PASSIVE_ATTRIBUTE_SYMBOLS: Readonly<Record<string,PassiveSymbol>> = {
  strength:{icon:'fist',theme:'impact'},dexterity:{icon:'bow',theme:'ranged'},intelligence:{icon:'book',theme:'arcana'},wisdom:{icon:'eye',theme:'host'},
  finesse:{icon:'rapier',theme:'guile'},fortitude:{icon:'shield',theme:'bastion'},willpower:{icon:'flame',theme:'entropy'},prowess:{icon:'sword',theme:'tempo'},
  charisma:{icon:'banner',theme:'chorus'},vitality:{icon:'heart',theme:'life'},
};
export const PASSIVE_STAT_PREFIX_SYMBOLS: Readonly<Record<string,PassiveSymbol>> = {
  proc_:{icon:'rune',theme:'arcana'},procRider_:{icon:'lightning',theme:'lightning'},combo_:{icon:'drum',theme:'tempo'},sympathy_:{icon:'heart',theme:'chorus'},
  chargeCap_:{icon:'orb',theme:'arcana'},chargeRegen_:{icon:'orb',theme:'arcana'},orbShedRate:{icon:'candle',theme:'fire'},orbOn:{icon:'candle',theme:'fire'},orbRefund_:{icon:'candle',theme:'fire'},
  slotgraft_:{icon:'rune',theme:'arcana'},survivalEase_:{icon:'lantern',theme:'guile'},pourPower_:{icon:'bottle',theme:'life'},
};
/** Stable-ID exceptions for powers whose icon needs more specificity than its
 * primary grant. Extension point for hand-authored compound mechanics. */
export const PASSIVE_NODE_SYMBOL_OVERRIDES: Readonly<Record<string,Partial<PassiveSymbol>>> = {
  dev_hunt_root:{icon:'wolf',theme:'nature'},dev_bul_root:{icon:'towerShield',theme:'bastion'},
};
const own = <T>(r:Readonly<Record<string,T>>,id:string):T|undefined => Object.hasOwn(r,id)?r[id]:undefined;
const prefixes=Object.entries(PASSIVE_BRANCH_PREFIXES).sort((a,b)=>b[0].length-a[0].length);
export function passiveNodeMeaning(node:Pick<PassiveNode,'id'|'kind'|'mods'|'attributes'|'attributesPct'|'choice'|'conduit'>):PassiveSymbol & {source:string} {
  let symbol:PassiveSymbol|undefined,source='fallback';
  if (node.choice) { symbol={icon:'book',theme:'arcana'};source='choice';
    if(node.choice.group.startsWith('attribute_training'))symbol={icon:'prism',theme:'attributes'};
    else if(node.choice.group.startsWith('crossroads_'))symbol={icon:'book',theme:node.choice.group.slice(11)};
  }
  if(!symbol)for(const id of Object.keys(node.attributes??node.attributesPct??{})){symbol=own(PASSIVE_ATTRIBUTE_SYMBOLS,id);if(symbol){source='attribute:'+id;break;}}
  if(!symbol)for(const mod of node.mods??[]){
    const selected=own(PASSIVE_STAT_SYMBOLS,mod.stat)??Object.entries(PASSIVE_STAT_PREFIX_SYMBOLS).find(([prefix])=>mod.stat.startsWith(prefix))?.[1];
    if(!selected)continue;
    symbol=selected;source='stat:'+mod.stat;
    if(['damage','minionDamage','addedPhysical'].includes(mod.stat)) {
      // Specific subject/element wins over broad delivery, regardless of tag order.
      const tags=[...(mod.tags??[])].sort((a,b)=>tagPriority(b)-tagPriority(a));
      const tag=tags.map(t=>own(PASSIVE_TAG_SYMBOLS,t)).find(Boolean);
      if(tag)symbol=tag;
    }
    break;
  }
  if(!symbol&&node.conduit){symbol={icon:'valve',theme:'arcana'};source='conduit';}
  const branch=prefixes.find(([prefix])=>node.id.startsWith(prefix))?.[1];
  const override=own(PASSIVE_NODE_SYMBOL_OVERRIDES,node.id);
  const result={icon:'star' as IconSubject,theme:'attributes',...symbol,...(branch?{theme:branch}:{}),...override,source:override?'authored':source};
  if(!own(PASSIVE_BRANCH_THEMES,result.theme))result.theme='attributes';
  return result;
}
function tagPriority(tag:string):number {
  return tag.startsWith('body:')?5:tag.startsWith('minion:')?4:['fire','cold','lightning','chaos'].includes(tag)?3:tag.startsWith('cast:')?2:1;
}
