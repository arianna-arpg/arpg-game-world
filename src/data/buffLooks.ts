import type { Modifier } from '../engine/stats';
import type { IconSubject } from '../render/skillIconArt';
import { PASSIVE_STAT_SYMBOLS } from './passiveNodeSymbols';

/** A 24-unit silhouette shared by the HUD and its worn material. The pose
 * specifies where it belongs on a body. 'native' leaves existing body art in charge. */
export type BuffPose = 'hand' | 'shoulder' | 'trail' | 'rise' | 'crown' | 'native';
export interface BuffLook { subject: IconSubject; pose: BuffPose; color?: string; }
const CONDITION_MARKS: Record<string,IconSubject> = {
  fullMana:'orb', lowMana:'droplet', fullLife:'heart', lowLife:'blood', recentlyHealed:'cross',
  fullEs:'dome', hasEs:'crystal', lowEs:'brokenShield', esRecharging:'prism',
  guarding:'buckler', poised:'pillar', poiseBroken:'rubble', stationary:'roots', moving:'boot',
  recentlyMoved:'wind', strided:'feather', recentlyHurt:'wound', notHurtRecently:'shell',
  recentlyBlocked:'shield', recentlyEvaded:'cloak', recentlyCrit:'target', recentlyKilled:'skull',
  comboVaried:'cards', comboRepeated:'blades',
};
const GAUGE_MARKS: Record<string,IconSubject> = {
  still:'roots', 'foes:near':'skull', 'allies:near':'banner', minions:'paw', afflictions:'thorns',
  'es:missing':'brokenShield', 'mana:missing':'droplet', 'life:missing':'blood',
};
export function passiveGateMark(mod: Modifier): IconSubject {
  if (mod.gauge?.startsWith('charge:')) return CHARGE_LOOKS[mod.gauge.slice(7)]?.subject ?? 'crystal';
  if (mod.gauge?.startsWith('status:')) return 'wound';
  return GAUGE_MARKS[mod.gauge ?? ''] ?? CONDITION_MARKS[mod.when ?? ''] ?? 'rune';
}
const hand = (subject: IconSubject): BuffLook => ({ subject, pose: 'hand' });
const shoulder = (subject: IconSubject): BuffLook => ({ subject, pose: 'shoulder' });
const trail = (subject: IconSubject): BuffLook => ({ subject, pose: 'trail' });
const rise = (subject: IconSubject): BuffLook => ({ subject, pose: 'rise' });
const crown = (subject: IconSubject): BuffLook => ({ subject, pose: 'crown' });
const native = (subject: IconSubject): BuffLook => ({ subject, pose: 'native' });

export const BUFF_POSE_COLORS: Record<BuffPose, string> = {
  hand: '#ffbb77', shoulder: '#a8d5eb', trail: '#93ead6', rise: '#b2e99b', crown: '#d3b9fa', native: '#e6d7af',
};
export const BUFF_WEAR = { maxLayers: 3, maxPieces: 3, ink: '#fff4d9', outline: '#1c1b27' };

/** Status identities are scoped separately from buff and charge identities. */
export const BENEFICIAL_LOOKS: Record<string, BuffLook> = {
  moonlit: trail('eclipse'), companion_recovery: native('dome'), hedonism: hand('chalice'),
  belligerence: crown('eye'), furor: hand('claws'), rally: crown('banner'),
  verdant_communion: rise('leaf'), stone_communion: shoulder('rock'),
  attuned_physical: hand('sword'), attuned_fire: hand('flame'), attuned_cold: hand('icicle'),
  attuned_lightning: hand('lightning'), attuned_chaos: hand('void'), kindled: rise('ember'),
  consecrated: rise('cross'), phasing: trail('ghost'), caroming: native('comet'),
  windswept: trail('feather'), cloudform: trail('cloud'), aloft: native('wings'),
  cloudhaven: shoulder('cloud'), windlane: trail('wind'), stormlaced: hand('lightning'),
  silverlined: rise('droplet'), hearthglow: shoulder('lantern'), emboldened: crown('horn'),
  quickborn: trail('falcon'), wisp_ridden_pale: shoulder('wisp'), wisp_ridden_flame: hand('pyre'),
  wisp_ridden_grave: hand('skull'), wisp_ridden_gloam: crown('candle'),
  burrowed: native('grub'), mu_veiled: native('shroud'), mu_faint: native('ghost'),
  mu_sworn: native('crown'), vent_submerged: native('wave'), vent_sinking: native('geyser'),
  warded: native('shield'), basking_torpor: shoulder('shell'), basking_fury: hand('sun'),
  concealed: trail('cloak'), caulfed: rise('membrane'), blightfed: rise('mushroom'),
};

export const BUFF_LOOKS: Record<string, BuffLook> = {
  war_cry: crown('horn'), frenzy: hand('claws'), sun_sworn: hand('sun'), renew: rise('leaf'),
  court_shadow_cloak: trail('shroud'), mirage_step_veil: trail('ghost'), vampiric_embrace: rise('fangs'),
  life_bond: rise('heart'), stealth_step: trail('boot'), cloak: trail('cloak'), invisibility: trail('shroud'),
  iron_ward: shoulder('towerShield'), well_fed: rise('seed'), gorged: hand('maw'), quickstep: trail('feather'), stone_skin: shoulder('plate'),
  quiet_step: trail('paw'), power_surge: shoulder('crystal'), enraged: hand('fist'), stacked_deck: crown('cards'),
  convocation_mend: rise('cross'), galvanize: hand('lightning'), flame_wreath: hand('flame'),
  fresh_moult: trail('membrane'), quaffing: native('bottle'), catalyst_high: hand('prism'),
  quicksilver: trail('droplet'), stoneskin: shoulder('rock'), antidote: shoulder('bottle'),
  chaser_edge: hand('dagger'), vigil_flare: hand('candle'), stalk: trail('paw'),
  carve: hand('blade'), deep_carve: hand('axes'), cerement_shroud: shoulder('shroud'),
  oblation_life: hand('heart'), oblation_mana: hand('orb'), bone_offering: shoulder('ribs'),
  surgewind: trail('wind'), symbiote_skin: rise('vine'), bulwark_set: shoulder('towerShield'),
  last_rites_fury: hand('scythe'), hushed: shoulder('hood'), red_hour: hand('blood'), long_cold: shoulder('icicle'),
  votive_zeal: hand('candle'), pathcutter_stride: trail('machete'), tempo: hand('drum'),
  adrenal_rush: rise('heart'), quickening: trail('feather'), phase_surge: trail('ghost'),
  breakers_momentum: hand('hammer'), last_stand: shoulder('towerShield'), unbroken_wrath: hand('fist'),
  tempered_rearm: shoulder('plate'), adrenaline: hand('nerve'), necrotic_feast: rise('skull'),
  fleetfeather_refusal: trail('wings'), native_barbed_reply: shoulder('thorns'), weave_still_mercy: rise('cross'),
  weave_thermal_memory: shoulder('snowflake'), weave_warcry_verse: crown('note'), weave_missed_jackpot: crown('cards'),
  blessing_of_might: hand('hammer'), plague_blades: hand('fangs'), flame_imbue: hand('flame'), venom_ammo: hand('venom'),
  hot_streak: hand('pyre'), heating_up: hand('ember'), overpower: hand('maul'), reprisal: hand('rapier'),
  unspent_reply: hand('orb'), route_breach_spell: hand('brokenShield'), route_filled_spell: hand('prism'),
  route_move_needle: hand('dart'), route_evade_device: hand('trap'), weave_rack_memory: hand('crossbow'),
  weave_trap_hammer: hand('hammer'), weave_spell_hunger: hand('fangs'), spec_fire_relay: hand('icicle'),
  spec_cold_relay: hand('lightning'), spec_lightning_relay: hand('flame'), spec_blade_to_spell: hand('rune'),
  spec_spell_to_blade: hand('sword'), spec_quick_preparation: hand('hourglass'), spec_deliberate_release: hand('comet'),
  spec_advance: hand('spear'), spec_return: hand('bow'),
};

/** Additional banks granted by a tree or a triggered mechanic can share a casting skill. */
export const GRANTED_BUFF_LOOKS: Record<string, BuffLook> = {
  assault_orders: crown('banner'), assault_tempo: hand('drum'), enrage: hand('fist'),
  orphan_frenzy: hand('claws'), frag_ferocity: hand('fangs'), frag_bulwark: shoulder('plate'),
  shrine_swiftness: trail('wings'), shrine_wrath: hand('axes'), shrine_stoneskin: shoulder('rock'),
  shrine_barrage: hand('quiver'), shrine_renewal: rise('flower'), remnant_fire: hand('flame'),
  remnant_cold: hand('icicle'), remnant_lightning: hand('lightning'),
  virtuose_probing: hand('rapier'), virtuose_stalwart: shoulder('buckler'),
  sheltering_charge: shoulder('towerShield'), pact_signal: crown('paw'), flowing_draw: hand('quiver'),
  dash_entry: hand('spear'), dash_escape: trail('boot'), prepared_warp: hand('rune'),
  sheltered_warp: shoulder('dome'), step_preparation: hand('dagger'), step_smoke: trail('cloud'),
  assassins_intent: hand('rapier'), quiet_departure: trail('feather'), sheltered_departure: shoulder('shell'),
  duelists_pass: trail('blades'), rallying_challenge: crown('horn'), defiant_challenge: shoulder('plate'),
  sentencers_stride: trail('gavel'), aegis_thorns: shoulder('thorns'), aegis_vigil: rise('cross'),
  rally_vanguard: crown('banner'), rally_preparation: hand('axe'), steel_resolve: shoulder('pillar'),
  retrievers_stride: trail('wolf'), fleet_turn: trail('wind'), borrowed_momentum: hand('hammer'),
  hunters_signal: crown('target'), iron_absolution: shoulder('shield'), steady_absolution: rise('candle'),
  returning_absolution: rise('orb'), defiant_absolution: hand('fist'), mobile_defiance: trail('wings'),
  scarlet_answer: hand('blood'), sheltering_cape: shoulder('cloak'), sheltered_riot: shoulder('buckler'),
  vanishing_orator: trail('ghost'), assault_preparation: hand('blades'), assault_shelter: shoulder('towerShield'),
  red_brace: shoulder('plate'), red_overflow: rise('chalice'), red_bloodguard: shoulder('blood'),
  blue_clarity: crown('prism'), blue_insulate: shoulder('crystal'), green_bless: trail('leaf'),
  hunters_opening: hand('bow'), warband_verdict: crown('gavel'), personal_challenge: hand('rapier'),
  cloud_shelter: shoulder('cloud'), cloud_ambush: hand('dart'), rallying_peal: crown('tollingBell'),
  leader_frenzy: crown('banner'), hivecall_fury: hand('claws'), feral_draught: hand('fangs'),
  static_discharge: hand('lightning'), astral_cadence: crown('note'), fate_broadside: hand('crossbow'),
  fate_true_bearing: crown('clock'), fate_sharpened_edge: hand('dagger'), fate_swift_tide: trail('wave'),
  fate_snake_eyes: crown('die'), lunar_zenith: crown('eclipse'), solar_zenith: crown('sun'),
  waltzing_smoke: trail('shroud'), lure_haste_spell: hand('runes'), lure_haste_attack: hand('blades'),
  frenzied_stride: trail('claws'), academic_trophy: crown('skull'), fueled_momentum: trail('ember'),
  phase_dilation: crown('hourglass'), plague_wake_haze: rise('venom'), wicker_veil: trail('scarecrow'),
  echoing_might: hand('hammer'), slipstream_surge: trail('wind'), cryo_cocoon: shoulder('rimeCocoon'),
  lithic_stone_skin: shoulder('rock'), essential_miasma: rise('mushroom'), gilded_surge: hand('rapier'),
  gilded_retinue: crown('banner'), feral_hangover: trail('wound'), beacon_radiance: crown('sun'),
  beacon_ember: hand('ember'), healing_roots: rise('roots'), soothing_voyage: trail('wave'),
  adrenal_hyperdrive: trail('nerve'), pylon_sync: crown('pylon'), devour_feast: hand('fangs'),
  dawn_haste: trail('sun'), spring_bloom_vitality: rise('flower'), extracted_surge: hand('droplet'),
};

export const CHARGE_LOOKS: Record<string, BuffLook> = {
  fury: hand('fist'), static: hand('lightning'), stealth: trail('hood'), wisp: crown('wisp'),
  verse: crown('note'), riposte: hand('rapier'), magma: hand('magma'), rage: hand('axe'),
  bloodlust: hand('fangs'), soul: crown('ghost'), gyre: trail('spiral'), storm: hand('cloud'),
  frenzy: hand('claws'), brew: rise('kettle'), verdict: crown('gavel'), communion: rise('chalice'),
  flask_life: native('roundFlask'), flask_mana: native('tearFlask'), flask_catalyst: native('twinFlask'),
  flask_quicksilver: native('wingFlask'), flask_stoneskin: native('squareFlask'), flask_antidote: native('longFlask'),
  wakeflame: hand('ember'),
};

const MOD_LOOKS: Record<string, BuffLook> = {
  armor: shoulder('plate'), blockChance: shoulder('buckler'), damageTaken: shoulder('shield'),
  energyShield: shoulder('crystal'), hitImmune: shoulder('dome'), ailmentResist: shoulder('shell'),
  poise: shoulder('pillar'), poiseDamage: hand('hammer'), weight: shoulder('rock'),
  thorns: shoulder('thorns'), blockValue: shoulder('shield'), wardGain: shoulder('dome'),
  minionDamage: hand('claws'), minionLife: rise('paw'), minionMoveSpeed: trail('paw'),
  critMulti: hand('rapier'), reloadSpeed: hand('quiver'), statusChance: crown('runes'),
  detectionRange: crown('eye'), detectability: trail('cloak'), invisible: trail('shroud'),
  evasion: trail('feather'), phasing: trail('ghost'), moveSpeed: trail('boot'),
  attackSpeed: hand('blades'), castSpeed: hand('runes'), damage: hand('sword'),
  critChance: hand('dagger'), accuracy: crown('target'), cooldownRecovery: crown('hourglass'),
  lifeRegen: rise('leaf'), lifeRegenPct: rise('leaf'), healPower: rise('cross'),
  lifeLeech: rise('leech'), manaRegen: rise('droplet'), manaCost: crown('orb'),
  addedPhysical: hand('blade'), addedFire: hand('flame'), addedCold: hand('icicle'),
  addedLightning: hand('lightning'), addedChaos: hand('void'),
};
/** On these stats a reduction is the boon. Mixed grants still describe all
 * lines sharing the active gate, including their costs. */
export const LOWER_BUFF_STATS = new Set(['damageTaken','minionDamageTaken','manaCost','wardDecay','detectability']);
const ELEMENT_LOOKS: Record<string, BuffLook> = {
  fire: hand('flame'), cold: hand('icicle'), lightning: hand('lightning'), chaos: hand('void'), physical: hand('sword'),
};
export function modifierBuffLook(mods: readonly Modifier[]): BuffLook {
  for (const mod of mods) {
    if (mod.stat === 'damage') for (const tag of mod.tags ?? []) if (ELEMENT_LOOKS[tag]) return ELEMENT_LOOKS[tag];
    if (MOD_LOOKS[mod.stat]) return MOD_LOOKS[mod.stat];
  }
  return crown('rune');
}

/** A triggered bonus carries its tree emblem into the hotbar. Explicit buff
 * art takes priority, and the modifiers supply the attachment pose. */
export function procBuffLook(procId: string, buff: { id: string; buffLook?: BuffLook; mods: Modifier[] }): BuffLook | undefined {
  const look = buff.buffLook ?? BUFF_LOOKS[buff.id];
  if (look) return look;
  const symbol = PASSIVE_STAT_SYMBOLS['proc_' + procId];
  if (symbol) return { ...modifierBuffLook(buff.mods), subject: symbol.icon };
}
