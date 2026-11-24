import type { PassiveNode } from './passives';
import type { IconSubject } from '../render/skillIconArt';
import { PASSIVE_BRANCH_PREFIXES, PASSIVE_BRANCH_THEMES } from './passiveNodeThemes';
import { damageTransferEmblem, majorPassiveEmblem, type PassiveEmblemMotif } from './passiveMajorEmblems';
import { PASSIVE_KEYSTONE_ART } from './passiveKeystoneArt';

export interface PassiveSymbol { icon:IconSubject; theme:string; motif?:PassiveEmblemMotif }
const rows = (icon:IconSubject,theme:string,stats:string):[string,PassiveSymbol][] => stats.split(' ').map(id=>[id,{icon,theme}]);
/** Semantic vocabulary for grants. These rows can serve any passive tree;
 * source IDs, node positions and translated descriptions do not pick icons. */
export const PASSIVE_STAT_SYMBOLS: Readonly<Record<string,PassiveSymbol>> = Object.fromEntries([
  ...rows('sword','impact','damage addedPhysical armorPen damageVs_bleed hitCap multiTarget proximityDamage cannotMiss doubleDamageChance fellingChance meleeSweep meleeReverb splashRadius sweepRange swingArc overmatch bondbreaker bleedNonBleedLess attritionRamp attritionFirstPenalty materialOnlyMore virtuoseStance equilibriumPower'),
  ...rows('hammer','impact','poiseDamage poiseOverflow impactDamage knockback knockBuffet displaceForce shoveAuthority spentbane plyRend uprooter sunderDuration aoeCascade cascadeStep cadenceFinisher'),
  ...rows('hand','impact','gripPower gripCrush wriggle'),...rows('mountain','impact','weight'),...rows('spear','impact','meleeReach impalePower'),
  ...rows('heart','life','life lifeRegen lifeOnHit lifeOnKill lifeOnEvade healPower overheal overhealToWard minionDeathHeal minionDeathHealFlat summonMend minionRegenPct minionRegenRate minionLife tempestMendPulse'),
  ...rows('blood','life','overleechWard vampiricShare minionLifePlyTrade minionLifePlyEcho offeringShare hitToAffliction lowLifeLine lastGasp lastGaspLife lastGaspCooldown costToLife costToMana lifeForgone recentDmgHeal'),
  ...rows('chalice','arcana','mana manaRegen manaRegenPct manaOnKill manaLeech maxManaDamage manaShield unleashMax surplusHitMore lowManaHitLess energyExtractPower'),
  ...rows('rune','arcana','manaCost castSpeed castMobility channelMobility channelTurnRate channelRamp channelThorns channelPersist channelAutoSpin critIgnoreRes triggerChance triggerThreshold triggerPower runeCap overloadPower'),
  ...rows('crystal','arcana','energyShield esRechargeRate esRechargeDelay esRechargeSteadfast esDotResist esForgone esOnHit esOnKill esLeech esShred esToMana esToPoise lifeRegenToEs lifeToEs lifeLeechToEs auraEsRecharge auraEsDelay'),
  ...rows('shield','bastion','guardStrength guardAegis parryCounterBonus parryDamageCooldown guardHoldTime guardMend bashInvert bashPower wardGain wardDecay wardLeech absorbPower minionGuard minionSquad summonWard minionDamageTaken minionAreaAvoidance minionUndying huskGuard blockPower blockBladeSlash blockToDamage karmaReflect salvatoryCounter'),
  ...rows('plate','bastion','armor armorAppliesToElemental flatHitReduction damageTaken evasionToArmor areaAvoidance'),
  ...rows('pillar','bastion','poise poiseRegenPct poiseOnHit poiseOvercharge poiseRearmAt staggerWindow staggerPurge staggerToWard burstStaggerPct minionAnchoredInvuln'),
  ...rows('shell','bastion','endurance enduranceDR enduranceRegenPct ailmentResist'),...rows('thorns','bastion','thorns thornsReflect thornsToHit'),
  ...rows('boot','guile','moveSpeed strideReach minionMoveSpeed phasing moveExplode moveTrail departSplash'),...rows('cloak','guile','evasion evasionForgone detectability concealment grazeChance grazeMitigation grazeWard evadeSurgeOnHurt'),
  ...rows('dagger','guile','ambushBonus ambushBurstMore ambushLowLifeLess nonCritLess killProcOnHit quailbane limbreaver regicide'),
  ...rows('target','ranged','accuracy critChance critMulti critAvoid farShotDamage overcritChance overcritMulti'),
  ...rows('blades','tempo','attackSpeed repeatScale repeatRetarget windfuryChance fueledRatePower'),...rows('drum','tempo','comboWindow'),
  ...rows('arrow','ranged','projectileSpeed projectileSize projAccel projInherit projRecurve guidePower castAtCursor'),
  ...rows('quiver','ranged','projectileCount projectileCountChance forkCount chainCount repeatCount fireVolley fireSalvo volleySpacing spreadAngle projNova randomArc silverQuiverPower'),
  ...rows('hook','ranged','projReturn homingPower'),...rows('crossbow','devices','reloadSpeed'),
  ...rows('clock','time','recentlyWindow effectDuration cooldownRecovery skillChargeRate skillCharges recuperate recuperateTime conduitRate brimFill brimPower brimDecay fuseDelay chronoVsSlowMore chronoSiphon'),
  ...rows('orb','arcana','aoeRadius aoeScatter aoeSpin conduction suffusion fieldCarryMore conduitEfficiency pulseCount lingerField'),
  ...rows('eye','arcana','insight insightEfficiency insightInversion insightStillTaper insightRegenPct insightTaper insightPen evasionToInsight evasionToInsightForgo mimicWitness mimicBank'),
  ...rows('skull','host','minionDamage minionDamageForgone minionExplodeDeath minionExplodeLowLife minionDeathEffectPower minionDecayRate minionDecayQuad minionDetectionRange sacrificeMinions minionShare bondShare remnantChance remnantOnCast summonCount summonSequence summonImpact summonAtCursor ownerWoundsToMinion minionInheritStatus offeringPower'),
  ...rows('paw','host','minionMaxCount minionHaste minionSize springBloomPower'),...rows('ribs','host','minionPlies'),
  ...rows('ghost','host','possessPower possessDuration mirageCount mirageDamage'),...rows('gear','devices','constructMaxCount constructCastRate constructTaunt tetherDamage tetherWidth embedIcd'),
  ...rows('venom','entropy','statusChance statusMagnitude ailmentStacks afflictionYield apply_poison apply_jinxed unluckyChance dotPropagates dotRupture dotCrit curseRupture hexBlast doomDot multiAilmentMore statusAmplifyOnCrit ruptureSeed ailmentMultiDot occultStackMore'),
  ...rows('wound','entropy','apply_bleed'),...rows('flame','fire','addedFire firePen fireRes fireResMax igniteToBomb gaugeGain gaugeNeed gaugeLockout minionMissingLifeFire minionStruckFirePulse burnDetonatePower'),
  ...rows('snowflake','cold','addedCold coldPen coldRes coldResMax apply_chill hypothermiaPower'),...rows('lightning','lightning','addedLightning lightningPen lightningRes lightningResMax apply_shock sparkWindow sparkBonus highRollShockChain'),
  ...rows('void','entropy','addedChaos chaosPen chaosRes chaosResMax esDotBypass tranceRamp plasmaDisintPower'),...rows('brokenNote','chorus','apply_silence'),
  ...rows('note','chorus','durationAuraCap echoMight reservedDamage'),...rows('banner','chorus','mercVigor mercEase mercHireDiscount mercRetinue commandDiscipline threatGen noiseOnHit goldenProcAmplify trophyPower'),
  ...rows('cards','fortune','luck luckyChance procDepth'),
  ...rows('bottle','life','restorePower restorePctMax pourPrime reflex thirstless pourPct_surge pourPct_settle flaskBlockCharge'),
  ...rows('spiral','tempo','weavePower spinPower erraticPower overdriveCap overdriveRecovery overdriveFlow overdriveLifeFactor channelSpool channelSpoolCap channelHitSpool'),
  ...rows('flame','fire','proc_spec_fire_relay proc_hot_streak proc_kindled_rage proc_slow_burn proc_exp_grand_finale proc_exp_triad_fire proc_exp_consecrated_ring proc_exp_wall_cinder_burst'),
  ...rows('snowflake','cold','proc_spec_cold_relay proc_weave_thermal_memory proc_native_thawing_reserve proc_exp_triad_cold proc_exp_frost_bulwark proc_exp_rime_flight'),
  ...rows('lightning','lightning','proc_spec_lightning_relay proc_thunderstruck proc_short_circuit proc_exp_eye_of_storm proc_exp_voltaic_arc proc_exp_triad_light proc_exp_shock_chain proc_exp_after_storm proc_exp_thermoelectric_arc proc_exp_tempest_flock'),
  ...rows('sword','impact','proc_spec_spell_to_blade proc_weave_spell_hunger proc_overpower proc_crimson_edge proc_exp_mercy_echo proc_exp_after_attack proc_exp_after_throw'),
  ...rows('rune','arcana','proc_spec_blade_to_spell proc_route_breach_spell proc_route_filled_spell proc_radiant_cascade proc_exp_after_spell proc_exp_after_channel proc_exp_aegis_incantation'),
  ...rows('crystal','arcana','proc_exp_ward_shatter proc_exp_empty_chalice_ward'),
  ...rows('clock','time','proc_spec_quick_preparation proc_spec_deliberate_release proc_weave_funeral_clock proc_route_evade_clock proc_route_funeral_clock proc_route_device_clock proc_route_block_clock proc_route_held_clock proc_native_wounded_clock proc_route_heal_clock proc_exp_temporal_echo proc_exp_harmonic_tide proc_exp_after_duration proc_exp_funeral_cooldown'),
  ...rows('boot','guile','proc_spec_advance proc_spec_return proc_weave_empty_stride proc_weave_break_for_breath proc_route_empty_footing proc_route_move_needle proc_exp_slipstream proc_exp_after_movement proc_exp_slip_rupture proc_exp_safe_horizon proc_exp_clean_escape'),
  ...rows('heart','life','proc_weave_still_mercy proc_native_field_patch proc_native_parting_blessing proc_mending_ward proc_native_song_of_return proc_exp_sanctuary_hymn proc_exp_bough_renewal proc_exp_after_heal proc_exp_sanctuary_flock'),
  ...rows('bottle','life','proc_exp_after_flask'),
  ...rows('shield','bastion','proc_weave_airborne_shelter proc_weave_red_glass proc_weave_blood_glass proc_shield_lesson proc_native_breach_reserve proc_route_varied_ward proc_native_broken_veil proc_route_summon_ward proc_native_vanishing_guard proc_route_rearmed_ward proc_native_halfway_shelter proc_tempered_rearm proc_last_stand proc_exp_shattered_halo proc_exp_iron_retort proc_exp_grave_refusal proc_exp_after_guard proc_exp_after_melee proc_exp_ward_to_endurance'),
  ...rows('hammer','impact','proc_weave_wall_fury proc_weave_trap_hammer proc_native_undertow_fist proc_cave_in proc_collision_crush proc_reprisal proc_exp_aftershock_pulse proc_exp_desperate_nova proc_exp_bleed_shatter_poise proc_exp_block_crushing_heft'),
  ...rows('chalice','arcana','proc_route_collision_mana proc_native_varied_mana proc_desperate_reserves proc_native_critical_reservoir proc_native_summoners_breath proc_route_back_mana proc_native_venom_breath proc_route_block_mana proc_native_verse_reservoir'),
  ...rows('pillar','bastion','proc_weave_block_reserve proc_route_shield_poise proc_shedding_plates proc_stalwart_rhythm proc_exp_nimble_footing'),
  ...rows('quiver','ranged','proc_weave_rack_memory proc_weave_unbroken_return proc_weave_rain_collector proc_exp_phantom_volley proc_exp_after_projectile'),
  ...rows('spear','ranged','proc_exp_after_javelin'),
  ...rows('crossbow','devices','proc_exp_after_munition proc_exp_after_reload'),
  ...rows('horn','chorus','proc_exp_after_warcry'),
  ...rows('banner','chorus','proc_exp_after_aura'),
  ...rows('note','chorus','proc_weave_warcry_verse proc_battle_chorus proc_exp_shepherd_rally proc_exp_after_song proc_exp_dawnbreaker_hymn'),
  ...rows('skull','host','proc_weave_delegated_breath proc_necrotic_feast proc_exp_martyr_harvest proc_exp_after_corpse proc_exp_after_summon proc_exp_funeral_surge'),
  ...rows('wolf','nature','proc_exp_kindred_bond proc_exp_after_companion'),
  ...rows('paw','nature','proc_exp_after_throng'),
  ...rows('gear','devices','proc_route_evade_device proc_native_workshop_fury proc_exp_workshop_aegis'),
  ...rows('blades','tempo','proc_native_repeated_frenzy proc_surging_frenzy proc_tempo proc_adrenal_rush proc_exp_twin_tempo proc_exp_shatter_opening proc_exp_rampage_streak proc_exp_escalating_tempo proc_exp_after_aoe proc_exp_crit_impale_poise proc_exp_slip_felling proc_exp_ghost_riposte'),
  ...rows('venom','entropy','proc_exp_virulent_pop proc_exp_hex_ripple proc_exp_blight_pop proc_exp_after_curse proc_exp_venomous_bleed'),
  ...rows('orb','arcana','proc_exp_gravity_pull'),
  ...rows('blood','life','proc_crimson_thirst proc_bloodletters_rhythm proc_exp_bleeding_vessel'),
  ...rows('eye','arcana','proc_battle_insight proc_mind_like_water proc_exp_foresight_evade'),
  ...rows('thorns','bastion','proc_native_barbed_reply proc_radiant_reprisal proc_exp_barbed_bleed'),
  ...rows('hook','devices','proc_magnetic_pull'),...rows('orb','arcana','proc_displacement_field'),
  ...rows('cards','fortune','proc_weave_missed_jackpot proc_exp_marked_deck'),

  // Specific build mechanics carry the same subject wherever their grant appears.
  ...rows('ricochet','ranged','projBounce projFrameBounce bounceDamageScale bounceFirstPenalty frostRicochet'),
  ...rows('pendulum','time','solsticePower inertiaGain inertiaDischarge'),
  ...rows('echo','time','hitEchoFrac hitEchoDelay hitEchoAoe astralEchoBuff'),
  ...rows('orbit','arcana','satelliteCount satelliteSpeed satelliteOrbit orbitPower'),
  ...rows('capacitor','lightning','staticDischargeMore staticBasicLess overchargeStages proc_crest_discharge'),
  ...rows('splice','entropy','ailmentCrossSplice dualAilmentApply'),
  ...rows('die','fortune','fateDiceBonus damageSpread highRollWindow'),
  ...rows('detonator','impact','critBlastPower'),
  ...rows('fault','impact','lithicFissurePower fissureCount fissureBranches proc_exp_after_fissure'),
  ...rows('guillotine','impact','overkillCarry overkillRadius bleedCullThreshold'),
  ...rows('brokenArmor','impact','rivenChance rivenPower'),
  ...rows('anvil','impact','heftBlowChance heftBlowScale'),
  ...rows('maul','impact','giantsbane siegebreaker'),
  ...rows('horns','impact','trample trampleContactDps'),
  ...rows('dome','bastion','domeDeflects fullEsDR'),
  ...rows('buckler','bastion','blockChance blockValue guardParry guardParryPower'),
  ...rows('shell','bastion','carapaceHitGain blockIntegratePower'),
  ...rows('quills','bastion','armorThornsScale moltShrapnel'),
  ...rows('hourglass','time','addedCooldown cooldownPower direDeferral staggerFrac'),
  ...rows('syringe','life','bleedTransfusePower traumaCost'),
  ...rows('leech','life','lifeLeech overleechPersist minionLeechToOwner'),
  ...rows('fountain','life','lifeRegenPct livingTidesPower'),
  ...rows('cross','life','lifeOnBlock healTaken'),
  ...rows('lantern','arcana','beaconPolarity'),
  ...rows('pylon','devices','pylonResonancePower'),
  ...rows('valve','devices','recyclePower'),
  ...rows('totem','devices','totemPlaceTime channelEffigyRate proc_exp_after_totem proc_exp_totem_overclock'),
  ...rows('trap','devices','proc_exp_after_trap'),
  ...rows('bomb','devices','fusePower proc_exp_sapper_chain'),
  ...rows('barrel','devices','finalRoundDamage'),
  ...rows('web','lightning','synapticLinkDmg tractorTetherPower'),
  ...rows('nerve','lightning','neuralSparkPower'),
  ...rows('pyre','fire','minionKindleBurn minionKindleFire minionPyreTether burnFeastPower proc_exp_cremation_pyre'),
  ...rows('phoenix','fire','phoenixBlinkNova'),
  ...rows('sun','fire','dawnConsecrate'),
  ...rows('ember','fire','apply_burn proc_exp_falling_cinder'),
  ...rows('ice','cold','cryoCocoonPower'),
  ...rows('icicle','cold','shatterSplinter shatterCritMult'),
  ...rows('wind','guile','windburnPower'),
  ...rows('shroud','guile','phaseStasisPower smokeVeilPower'),
  ...rows('prism','arcana','prismSinglePenalty constructRefract elemDestabPower omniElemCascade'),
  ...rows('portal','arcana','residualImprint'),
  ...rows('reaper','host','undertakerPower'),
  ...rows('sickle','entropy','ailmentReap fatalPactPower'),
  ...rows('coffin','host','minionRespawnTime minionExpiryIsDeath'),
  ...rows('egg','nature','minionSplitOnLowLife minionBloom minionBloomPower'),
  ...rows('bone','host','corpseBatch'),
  ...rows('tuningFork','chorus','harmonyPower proc_exp_harmonic_crescendo'),
  ...rows('bell','chorus','atonementHeal'),
  ...rows('roundFlask','life','flaskBeastMode'),
  ...rows('mask','guile','evadeDecoyBurst'),
  ...rows('ant','nature','throngPockets throngYield'),
  ...rows('acid','entropy','poisonMeltPower'),
  ...rows('plague','entropy','plagueWakeDps plagueDiffPower'),
  ...rows('scalpel','guile','cullThreshold'),
  ...rows('barb','ranged','pierceCount pierceDecay'),
  ...rows('splinter','ranged','projShrapnel returnShrapnel projReShatter'),
  ...rows('cloud','lightning','stormCount stormImmediate'),
  ...rows('spiral','tempo','spiralPower'),
  ...rows('helm','bastion','poiseCcAvoid poiseDR'),
  ...rows('shield','bastion','costWardCap'), ...rows('orb','arcana','chargeCap'),
  ...rows('ember','fire','minionApply_burn'), ...rows('venom','entropy','minionApply_poison'),
  ...rows('roots','nature','apply_rooted'), ...rows('brokenArmor','impact','apply_sundered apply_vulnerable'),
  ...rows('wound','entropy','apply_hemorrhage popPower_hemorrhage'), ...rows('brokenShield','bastion','apply_weaken'),
  ...rows('masks','guile','apply_disoriented'), ...rows('hourglass','time','apply_stasis'),
  ...rows('lungs','guile','survivalEase_breath'), ...rows('wisp','host','survivalEase_soul'),
  ...rows('candle','fire','chargeRegen_wakeflame chargeCap_wakeflame'), ...rows('fist','impact','chargeCap_fury'),
  ...rows('note','chorus','chargeCap_verse'), ...rows('bladeWard','bastion','chargeCap_riposte'),
  ...rows('ghost','host','chargeCap_soul'), ...rows('spiral','arcana','chargeCap_gyre'),
  ...rows('capacitor','lightning','chargeCap_static'), ...rows('roundFlask','life','chargeCap_flask_life'),
  ...rows('wingFlask','life','pourPower_surge'), ...rows('longFlask','life','pourPower_settle'),
]);
export const PASSIVE_TAG_SYMBOLS: Readonly<Record<string,PassiveSymbol>> = {
  fire:{icon:'flame',theme:'fire'},cold:{icon:'snowflake',theme:'cold'},lightning:{icon:'lightning',theme:'lightning'},chaos:{icon:'void',theme:'entropy'},
  physical:{icon:'sword',theme:'impact'},melee:{icon:'sword',theme:'impact'},spell:{icon:'rune',theme:'arcana'},projectile:{icon:'arrow',theme:'ranged'},
  song:{icon:'note',theme:'chorus'},warcry:{icon:'horn',theme:'chorus'},summon:{icon:'skull',theme:'host'},construct:{icon:'gear',theme:'devices'},munition:{icon:'crossbow',theme:'devices'},
  totem:{icon:'totem',theme:'devices'},trap:{icon:'trap',theme:'devices'},mine:{icon:'bomb',theme:'devices'},storm:{icon:'cloud',theme:'lightning'},conjure:{icon:'orb',theme:'arcana'},
  fissure:{icon:'fault',theme:'impact'},pulse:{icon:'echo',theme:'arcana'},javelin:{icon:'spear',theme:'ranged'},aura:{icon:'halo',theme:'chorus'},buff:{icon:'note',theme:'chorus'},
  corpse:{icon:'coffin',theme:'host'},throw:{icon:'dart',theme:'ranged'},channel:{icon:'spiral',theme:'arcana'},
  'vs:poiseBroken':{icon:'brokenShield',theme:'impact'},'vs:lowLife':{icon:'guillotine',theme:'impact'},
  'vs:bleed':{icon:'wound',theme:'entropy'},'vs:poison':{icon:'venom',theme:'entropy'},'vs:chill':{icon:'icicle',theme:'cold'},
  'vs:behind':{icon:'dagger',theme:'guile'},'vs:unaware':{icon:'hood',theme:'guile'},
  curse:{icon:'venom',theme:'entropy'},companion:{icon:'wolf',theme:'nature'},throng:{icon:'paw',theme:'nature'},guard:{icon:'shield',theme:'bastion'},heal:{icon:'heart',theme:'life'},
  ultimate:{icon:'flame',theme:'fortune'},chrono:{icon:'clock',theme:'time'},mimic:{icon:'eye',theme:'arcana'},possession:{icon:'ghost',theme:'host'},movement:{icon:'boot',theme:'guile'},
  aoe:{icon:'orb',theme:'impact'},duration:{icon:'clock',theme:'time'},
  attack:{icon:'sword',theme:'impact'},flask:{icon:'bottle',theme:'life'},'cast:held':{icon:'palm',theme:'tempo'},
  'vs:closeRing':{icon:'innerReach',theme:'ranged'},'vs:middleRing':{icon:'middleReach',theme:'ranged'},'vs:farRing':{icon:'farReach',theme:'ranged'},
  'vs:hardCC':{icon:'trap',theme:'guile'},'vs:shock':{icon:'lightning',theme:'lightning'},'vs:afflicted':{icon:'plague',theme:'entropy'},
  'vs:casting':{icon:'rune',theme:'arcana'},'vs:grabbed':{icon:'hand',theme:'impact'},'vs:fullLife':{icon:'heart',theme:'life'},
  'vs:fleeing':{icon:'boot',theme:'guile'},'vs:elite':{icon:'crown',theme:'fortune'},'vs:guarding':{icon:'shield',theme:'bastion'},
  'vs:poised':{icon:'pillar',theme:'bastion'},'vs:burn':{icon:'ember',theme:'fire'},'vs:silence':{icon:'brokenNote',theme:'chorus'},'vs:moving':{icon:'wind',theme:'guile'},
  'minion:swarm':{icon:'beetle',theme:'nature'},'minion:skeleton':{icon:'skull',theme:'host'},'minion:skeletal_mage':{icon:'runes',theme:'host'},'minion:golem':{icon:'golem',theme:'devices'},
  'body:skeleton_archer':{icon:'bow',theme:'host'},'body:stone_golem':{icon:'rock',theme:'bastion'},'body:bone_golem':{icon:'ribs',theme:'host'},
  'body:fire_golem':{icon:'flame',theme:'fire'},'body:ice_golem':{icon:'ice',theme:'cold'},'body:blood_golem':{icon:'blood',theme:'life'},
  'cast:instant':{icon:'lightning',theme:'time'},'cast:timed':{icon:'hourglass',theme:'time'},'cast:channel':{icon:'spiral',theme:'arcana'},
};
export const PASSIVE_ATTRIBUTE_SYMBOLS: Readonly<Record<string,PassiveSymbol>> = {
  strength:{icon:'fist',theme:'impact'},dexterity:{icon:'bow',theme:'ranged'},intelligence:{icon:'book',theme:'arcana'},wisdom:{icon:'eye',theme:'host'},
  finesse:{icon:'rapier',theme:'guile'},fortitude:{icon:'shield',theme:'bastion'},willpower:{icon:'flame',theme:'entropy'},prowess:{icon:'sword',theme:'tempo'},
  charisma:{icon:'banner',theme:'chorus'},vitality:{icon:'heart',theme:'life'},
};
/** Shared choice pools carry the same emblem wherever their chooser appears. */
export const PASSIVE_CHOICE_SYMBOLS: Readonly<Record<string, PassiveSymbol>> = {
  bulwark_doctrines: {icon:'towerShield', theme:'bastion'}, war_doctrines: {icon:'banner', theme:'impact'},
  arcane_doctrines: {icon:'runes', theme:'arcana'}, wake_litany: {icon:'candle', theme:'fire'},
  wake_paean: {icon:'bell', theme:'chorus'}, devotion_hunt: {icon:'wolf', theme:'nature'},
  pantheon_major: {icon:'crown', theme:'chorus'}, pantheon_minor: {icon:'censer', theme:'chorus'},
  wayposts: {icon:'flag', theme:'guile'}, road_oaths: {icon:'ledger', theme:'guile'},
  wild_covenants: {icon:'tree', theme:'nature'}, attr_calling: {icon:'star', theme:'attributes'},
  attr_temper: {icon:'anvil', theme:'attributes'}, attr_triad_force: {icon:'fist', theme:'impact'},
  attr_triad_execution: {icon:'rapier', theme:'tempo'}, attr_triad_resilience: {icon:'shield', theme:'bastion'},
};
export const PASSIVE_STAT_PREFIX_SYMBOLS: Readonly<Record<string,PassiveSymbol>> = {
  proc_:{icon:'rune',theme:'arcana'},procRider_:{icon:'lightning',theme:'lightning'},combo_:{icon:'drum',theme:'tempo'},sympathy_:{icon:'heart',theme:'chorus'},
  chargeCap_:{icon:'orb',theme:'arcana'},chargeRegen_:{icon:'orb',theme:'arcana'},orbShedRate:{icon:'candle',theme:'fire'},orbOn:{icon:'candle',theme:'fire'},orbRefund_:{icon:'candle',theme:'fire'},
  slotgraft_:{icon:'rune',theme:'arcana'},survivalEase_:{icon:'lantern',theme:'guile'},pourPower_:{icon:'bottle',theme:'life'},
  convert_:{icon:'prism',theme:'arcana'},gainAs_:{icon:'flame',theme:'fire'},extraAs_:{icon:'flame',theme:'fire'},takenAs_:{icon:'shield',theme:'bastion'},
  bequest_:{icon:'banner',theme:'host'},attune_:{icon:'orb',theme:'arcana'},terraform_:{icon:'mountain',theme:'nature'},
  dotLeech_:{icon:'blood',theme:'entropy'},relayStatus_:{icon:'venom',theme:'entropy'},costDamage_:{icon:'chalice',theme:'arcana'},costWard_:{icon:'shield',theme:'bastion'},
  damageVs_:{icon:'dagger',theme:'guile'},
};
/** Stable-ID exceptions for powers whose icon needs more specificity than its
 * primary grant. Extension point for hand-authored compound mechanics. */
export const PASSIVE_NODE_SYMBOL_OVERRIDES: Readonly<Record<string,Partial<PassiveSymbol>>> = {
  dev_hunt_root:{icon:'wolf',theme:'nature'},dev_bul_root:{icon:'towerShield',theme:'bastion'},
};
const own = <T>(r:Readonly<Record<string,T>>,id:string):T|undefined => Object.hasOwn(r,id)?r[id]:undefined;
const statSubject = (stat: string) => own(PASSIVE_STAT_SYMBOLS, stat)?.icon;
const tagSubject = (tag: string) => own(PASSIVE_TAG_SYMBOLS, tag)?.icon;
// What activates a plain damage bonus, in the same visual vocabulary as its wheel.
const conditionIcons: Readonly<Record<string,IconSubject>> = {
  stationary:'mountain',moving:'boot',recentlyMoved:'wind',channeling:'spiral',guarding:'buckler',
  recentlyCrit:'target',recentlyHit:'sword',recentlyKilled:'skull',recentlyEvaded:'cloak',recentlyBlocked:'shield',
  lowLife:'wound',recentlyHurt:'wound',recentlyHealed:'heart',notHurtRecently:'dome',
  comboVaried:'tuningFork',comboRepeated:'echo',poised:'pillar',poiseBroken:'brokenShield',
  fullEs:'crystal',lowEs:'crystal',hasEs:'crystal',esRecharging:'shoreWard',hasWard:'shield',hasEndurance:'shell',lowMana:'chalice',
};
/** The engine's gauge names describe what powers an otherwise generic damage grant. */
export const PASSIVE_GAUGE_SYMBOLS: Readonly<Record<string, PassiveSymbol>> = {
  'life:missing': {icon:'wound', theme:'life'}, 'mana:missing': {icon:'chalice', theme:'arcana'},
  'mana:full': {icon:'chalice', theme:'arcana'}, 'status:poison': {icon:'venom', theme:'entropy'},
  inertia: {icon:'pendulum', theme:'guile'}, harmony: {icon:'tuningFork', theme:'chorus'},
  wounds: {icon:'wound', theme:'life'}, prism: {icon:'prism', theme:'arcana'},
  minions: {icon:'paw', theme:'host'}, recentMinionDeaths: {icon:'grave', theme:'host'},
  accOver: {icon:'target', theme:'ranged'}, buffs: {icon:'halo', theme:'chorus'},
  ...Object.fromEntries([
    ...rows('crystal','bastion','es:missing es:full'), ...rows('mountain','bastion','still'),
    ...rows('figure','bastion','solitary'), ...rows('innerReach','impact','foes:near'), ...rows('banner','chorus','allies:near'),
    ...rows('venom','entropy','afflictions'), ...rows('drum','tempo','cadence'), ...rows('furnace','fire','fueled'),
    ...rows('shell','bastion','molt'), ...rows('grave','host','offering'), ...rows('capacitor','lightning','staticCharge'),
    ...rows('lastCartridge','ranged','silverAmmo'), ...rows('talon','nature','trophy'), ...rows('marrowPlate','host','aegisCharges'),
    ...rows('runes','arcana','overload'), ...rows('void','entropy','trance'), ...rows('reaper','host','harvest'),
    ...rows('nerve','lightning','neuralSurge'), ...rows('buckler','bastion','blockCharges'), ...rows('detonator','devices','critCharge'),
    ...rows('fist','impact','charge:rage'),
  ]),
};
function gaugeSymbol(gauge: string): PassiveSymbol | undefined {
  const [family, key] = gauge.split(':');
  if (family === 'attr10') return own(PASSIVE_ATTRIBUTE_SYMBOLS, key);
  if (family === 'overcap5') return own(PASSIVE_TAG_SYMBOLS, key);
  if (family === 'charge') return own(PASSIVE_STAT_SYMBOLS, 'chargeCap_' + key) ?? own(PASSIVE_GAUGE_SYMBOLS, gauge);
  return own(PASSIVE_GAUGE_SYMBOLS, gauge);
}
const prefixes=Object.entries(PASSIVE_BRANCH_PREFIXES).sort((a,b)=>b[0].length-a[0].length);
const prefixBuckets=new Map<string,[string,string][]>();
for(const entry of prefixes){
  const k=entry[0].slice(0,3);
  let bucket=prefixBuckets.get(k);
  if(!bucket){bucket=[];prefixBuckets.set(k,bucket);}
  bucket.push(entry);
}
export function passiveNodeMeaning(node:Pick<PassiveNode,'id'|'kind'|'mods'|'attributes'|'attributesPct'|'choice'|'conduit'>):PassiveSymbol & {source:string} {
  let symbol:PassiveSymbol|undefined,source='fallback';
  if (node.choice) {
    const group = node.choice.group;
    const mastery = group.startsWith('crossroads_') ? group.slice('crossroads_'.length) : '';
    const profile = own(PASSIVE_BRANCH_THEMES, mastery);
    symbol = own(PASSIVE_CHOICE_SYMBOLS, group)
      ?? (profile ? {icon:profile.icon, theme:mastery} : undefined)
      ?? (group.startsWith('attribute_training') ? {icon:'prism',theme:'attributes'} : {icon:'book',theme:'arcana'});
    source = 'choice:' + group;
  }
  if(!symbol)for(const id of Object.keys(node.attributes??node.attributesPct??{})){symbol=own(PASSIVE_ATTRIBUTE_SYMBOLS,id);if(symbol){source='attribute:'+id;break;}}
  if(!symbol)for(const mod of node.mods??[]){
    const selected=own(PASSIVE_STAT_SYMBOLS,mod.stat)??Object.entries(PASSIVE_STAT_PREFIX_SYMBOLS).find(([prefix])=>mod.stat.startsWith(prefix))?.[1];
    if(!selected)continue;
    symbol=selected;source='stat:'+mod.stat;
    if (node.kind === 'small' && mod.stat.includes('_')) {
      const transfer = damageTransferEmblem(mod,node.mods ?? []);
      if (transfer) symbol = {...symbol,icon:transfer.icon};
    }
    if(['damage','minionDamage','addedPhysical'].includes(mod.stat)) {
      // Specific subject/element wins over broad delivery, regardless of tag order.
      const tags=[...(mod.tags??[])].sort((a,b)=>tagPriority(b)-tagPriority(a));
      const tag=tags.find(t=>own(PASSIVE_TAG_SYMBOLS,t));
      const linked = mod.kind === 'link' && mod.fromStat ? own(PASSIVE_STAT_SYMBOLS, mod.fromStat) : undefined;
      const gauge = mod.gauge ? gaugeSymbol(mod.gauge) : undefined;
      const condition = mod.when ? own(conditionIcons,mod.when) : undefined;
      if (linked) { symbol = linked; source = 'link:' + mod.fromStat; }
      else if (gauge) { symbol = gauge; source = 'gauge:' + mod.gauge; }
      else if (condition && (!tag || tagPriority(tag) <= 1)) { symbol = {...symbol,icon:condition}; source = 'condition:' + mod.when; }
      else if (tag) { symbol = PASSIVE_TAG_SYMBOLS[tag]; source = 'tag:' + tag; }
    }
    break;
  }
  if(!symbol&&node.conduit){symbol={icon:'valve',theme:'arcana'};source='conduit';}
  const branch=prefixBuckets.get(node.id.slice(0,3))?.find(([prefix])=>node.id.startsWith(prefix))?.[1];
  const keystone = node.kind === 'keystone' ? own(PASSIVE_KEYSTONE_ART, node.id) : undefined;
  const emblem = keystone ? {...keystone, source:'keystone:' + node.id} : majorPassiveEmblem(node, statSubject, tagSubject);
  const override=own(PASSIVE_NODE_SYMBOL_OVERRIDES,node.id);
  const result={icon:'star' as IconSubject,theme:'attributes',...symbol,...emblem,...(branch?{theme:branch}:{}),...override,source:override?'authored':emblem?.source??source};
  if(!own(PASSIVE_BRANCH_THEMES,result.theme))result.theme='attributes';
  return result;
}
function tagPriority(tag:string):number {
  if (tag.startsWith('body:')) return 6;
  if (tag.startsWith('minion:')) return 5;
  if (['fire','cold','lightning','chaos'].includes(tag)) return 4;
  if (tag.startsWith('vs:') || tag.startsWith('cast:')) return 3;
  return ['attack','melee','spell','projectile','physical','aoe','duration'].includes(tag) ? 1 : 2;
}
