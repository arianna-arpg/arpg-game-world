import { obscuredPassiveConnections } from './passive-route-clearance';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { PASSIVE_NODES as N, PASSIVE_ADJACENCY as A } from '../src/data/passives';
import { PASSIVE_EXPANSION_CLUSTERS as CLUSTERS, EXPANSION_PROCS } from '../src/data/passiveExpansion';
import { passiveNodeMeaning } from '../src/data/passiveNodeSymbols';
import { auditPassiveRoutes } from '../src/data/passiveTopology';
import { validatePassiveLayout } from '../src/data/validatePassiveLayout';
import { STAT_DEFS, CONDITION_IDS, StatSheet, mod, type SkillTag, type Modifier } from '../src/engine/stats';
import { victimConditionKnown } from '../src/engine/victim';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import type { Actor } from '../src/engine/actor';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import { applyConversion, applyDot, rollSkillDamage } from '../src/engine/damage';

let checks = 0;
let failures = 0;
function check(label: string, ok: boolean, detail = ''): void {
  checks++;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ' — ' + detail : ''}`);
}
const near = (a: number, b: number, eps = 1e-4): boolean => Math.abs(a - b) <= eps;

seedGlobalRandom(4242);
bootSimEngine();

// 1. Census & structural integrity of all 324 expansion wheels (Passes 1-19)
const expNodes = Object.values(N).filter(n => n.id.startsWith('exp_'));
const expectedCount = CLUSTERS.reduce((s, c) => s + c.nodes.length, 0);
const keystones = expNodes.filter(n => n.kind === 'keystone');
check('324 expansion clusters expose 1698 nodes, 121 keystones and 91 bounded procs',
  CLUSTERS.length === 324 && expNodes.length === expectedCount && expectedCount === 1698 &&
  keystones.length === 121 && EXPANSION_PROCS.length === 91 && EXPANSION_PROCS.every(p => (p.icd ?? p.every ?? 0) > 0),
  `${CLUSTERS.length} clusters, ${expNodes.length} nodes, ${keystones.length} keystones, ${EXPANSION_PROCS.length} procs`);

check('every expansion row matches authored payloads, icons and registered endpoints',
  CLUSTERS.every(c => c.nodes.every(spec => {
    const id = spec.suffix ? `${c.id}_${spec.suffix}` : c.id;
    const node = N[id];
    if (!node) return false;
    if (node.name !== spec.name || node.description !== spec.description || node.kind !== spec.kind) return false;
    if (JSON.stringify(node.mods) !== JSON.stringify(spec.mods)) return false;
    if (node.name.toLowerCase().includes('dockside')) return false;
    if (passiveNodeMeaning(node).source === 'fallback') return false;
    return (node.mods ?? []).every(m =>
      !!STAT_DEFS[m.stat] &&
      (!m.fromStat || !!STAT_DEFS[m.fromStat]) &&
      (!m.when || CONDITION_IDS.includes(m.when)) &&
      (!m.unless || CONDITION_IDS.includes(m.unless)) &&
      (m.tags ?? []).every(t => !t.startsWith('vs:') || victimConditionKnown(t.slice(3))),
    );
  })));

const geo: string[] = [];
validatePassiveLayout(s => geo.push(s));
check('whole expanded tree passes geometry validation', geo.length === 0, geo.slice(0, 5).join('; '));
for (const menus of [false, true]) {
  const audit = auditPassiveRoutes(N, menus);
  check(`whole expanded tree has zero corridors and zero unreachables (menus=${menus})`,
    audit.corridors.length === 0 && audit.unreachable.length === 0,
    `${audit.nodes} nodes, ${audit.corridors.length} corridors`);
}
const obscured = obscuredPassiveConnections(expNodes);
check('expansion edges never obscure another node disc', obscured.length === 0, obscured.slice(0, 4).join('; '));

// 2. Real allocation through every single cluster's entry -> capstone -> trailing leaves + save/co-op round-trip
{
  const w = makeSimWorld('warrior', 4242);
  let allWalked = true;
  for (const c of CLUSTERS) {
    const entryId = `${c.id}_entry`;
    const anchor = A[entryId].find(id => !id.startsWith(`${c.id}_`) && id !== c.id)!;
    const ids = c.nodes.map(s => s.suffix ? `${c.id}_${s.suffix}` : c.id);
    w.meta.allocated = new Set(['str_start', anchor]);
    w.meta.choices = {};
    w.meta.passivePoints = ids.length;
    w.recalcSeat(w.localSeat);
    // BFS allocate every node in this cluster
    const queue = [entryId];
    const visited = new Set([entryId]);
    for (let i = 0; i < queue.length; i++) {
      const cur = queue[i];
      if (!w.allocateNode(cur)) { allWalked = false; break; }
      for (const nb of A[cur]) {
        if (ids.includes(nb) && !visited.has(nb)) { visited.add(nb); queue.push(nb); }
      }
    }
    if (visited.size !== ids.length || w.meta.passivePoints !== 0) { allWalked = false; break; }
  }
  check('all 324 expansion wheels allocate cleanly through shared game gates', allWalked);

  // Save + co-op round-trip with Passes 1-19 expansion nodes allocated
  const roundTripIds = [
    'exp_int_epiphany', 'exp_str_unerring', 'exp_for_elem_plate', 'exp_cha_pack_echo',
    'exp_wil_ashen_vessel', 'exp_wis_spiritual_aid', 'exp_wis_spiritual_aid_tail', 'exp_for_solitary',
    'exp_wis_grave_bloom_volatile', 'exp_p15_cha_long_memory_tail', 'exp_p15_fin_short_memory_tail',
    'exp_p16_str_virtuose_stance', 'exp_p16_dex_blessed_silver', 'exp_p16_fin_waltzing_smoke',
    'exp_p16_int_elem_destabilization', 'exp_p16_wis_undertaker_harvest', 'exp_p16_cha_beacon_lost',
    'exp_p17_str_blistering_embrace', 'exp_p17_prw_lifes_first_movement', 'exp_p17_dex_wintry_hail',
    'exp_p17_fin_intravenous_spark', 'exp_p17_int_residual_energy', 'exp_p17_wis_dawn_consecration',
    'exp_p17_cha_chrono_siphon',
    'exp_p18_str_cryo_cocoon', 'exp_p18_for_stone_fissure', 'exp_p18_prw_fueled_frenzy',
    'exp_p18_dex_windburn_gale', 'exp_p18_fin_plane_shift', 'exp_p18_int_tractor_beams',
    'exp_p18_wil_plasma_overflow', 'exp_p18_wis_spring_bloom', 'exp_p18_cha_healing_roots',
    'exp_p19_str_lava_puddle', 'exp_p19_for_block_integration', 'exp_p19_prw_critical_blast',
    'exp_p19_dex_recycling_charges', 'exp_p19_fin_transfusion_bleed', 'exp_p19_int_hypothermia_shatter',
    'exp_p19_wil_acid_armor_melt', 'exp_p19_wis_turret_blink', 'exp_p19_cha_energy_extractor',
    'exp_p3_fin_slorm_apex', 'exp_p3_for_hit_cap', 'exp_p4_str_after_warcry',
    'exp_p5_fin_poison_bleed_tailB', 'exp_p5_int_chill_shock_tailB',
    'exp_p7_str_overkill_tail', 'exp_p7_fin_graze_tail',
    'exp_p7_cha_hourglass_tail', 'exp_p7_int_deferred_tail',
    'exp_p8_str_poise_implode_tail', 'exp_p8_str_overleech_tail',
    'exp_p8_prw_riven_duelist_tail', 'exp_p8_dex_inertia_pendulum_tail',
    'exp_p8_fin_alchemical_reap_tail', 'exp_p8_int_harmony_prism_tail',
    'exp_p8_wis_pyre_covenant_tail', 'exp_p8_cha_stagger_ward_tail',
    'exp_p9_dex_acc_spells_tail', 'exp_p9_wis_trauma_host_tail', 'exp_p9_cha_harmony_host_tail',
  ];
  w.meta.allocated = new Set(['str_start', ...roundTripIds]);
  w.recalcSeat(w.localSeat);
  const saved = serializeCharacter(w);
  const loaded = makeSimWorld('warrior', 4243);
  applySavedCharacter(loaded, saved);
  const wire = serializeSeatMeta(w.localSeat);
  const remote = makeSimWorld('warrior', 4244);
  applySeatMeta(remote, remote.localSeat, wire);
  remote.recalcSeat(remote.localSeat);
  check('expansion allocations survive save and co-op reconstruction',
    roundTripIds.every(id => loaded.meta.allocated.has(id) && remote.meta.allocated.has(id)));
}

// 3. Pillar 1 Engine Primitives — live combat & stat proofs
type HitRuntime = {
  resolveHit(a: Actor, i: SkillInstance, t: Actor, mult?: number, depth?: number): void;
  rollStatusProcs(a: Actor, i: SkillInstance, t: Actor, s: string, tags: Set<SkillTag>, mods: Modifier[], depth: number): void;
  rollGainProcs(a: Actor, ev: { kind: 'buff'; id: string; depth: number; buff?: unknown }): void;
};

// 3a. Reworked Thermal Memory + takenAs_fire_cold lead-ins
{
  const w = makeSimWorld('warrior', 4245), p = w.player, rt = w as unknown as HitRuntime;
  w.meta.allocated.add('weave_martyr_thermal_memory_entry');
  w.meta.allocated.add('weave_martyr_thermal_memory_a');
  w.meta.allocated.add('weave_martyr_thermal_memory');
  w.recalcSeat(w.localSeat);
  check('Thermal Memory wheel stacks 24% fire taken as cold', near(p.sheet.get('takenAs_fire_cold'), 0.24));
  p.sheet.setSource('rig', [mod('life', 'override', 10000), mod('evasion', 'override', 0), mod('fireRes', 'override', 0), mod('coldRes', 'override', 0.75)]);
  p.life = p.maxLife();
  const attacker = w.createMonster('zombie', 1, 'enemy');
  attacker.brain = undefined;
  attacker.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
  w.actors.push(attacker);
  const fireHit = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_fire_hit', tags: ['spell', 'fire'], baseDamage: { fire: [100, 100] }, effects: [{ type: 'damage' }] });
  seedGlobalRandom(1234);
  rt.resolveHit(attacker, fireHit, p);
  // 76 fire (0% res -> 76) + 24 cold (75% res -> 6) = 82 life lost instead of 100, AND Thermal Memory buff fires!
  const lost = 10000 - p.life;
  check('Thermal Memory converts 24% fire hit to cold and triggers +12% coldRes/+2% coldResMax buff',
    near(lost, 82, 0.5) && p.buffs.has('weave_thermal_memory') && near(p.sheet.get('coldResMax'), 0.77));
}

// 3b. gainAs_<from>_<to> (pre-conversion extra damage)
{
  const w = makeSimWorld('warrior', 42455), p = w.player;
  p.sheet.setSource('gain', [mod('convert_physical_fire', 'flat', 0.5), mod('gainAs_physical_lightning', 'flat', 0.25)]);
  const out: Partial<Record<'physical' | 'fire' | 'cold' | 'lightning' | 'chaos', number>> = { physical: 100 };
  applyConversion(p, out, new Set<SkillTag>(['attack']));
  check('gainAs adds pre-conversion extra elemental damage without reducing source',
    near(out.physical ?? 0, 50) && near(out.fire ?? 0, 50) && near(out.lightning ?? 0, 25));
}

// 3c. linkIncMod (increased-pool stat link with minFrom floor)
{
  const sheet = new StatSheet();
  sheet.setSource('base', [mod('mana', 'override', 500)]);
  sheet.setSource('lens', N['route_int_school_graft_refraction'].mods!);
  const dmg = sheet.get('damage', new Set<SkillTag>(['spell']));
  check('The Mana Lens (linkIncMod) grants +40% increased spell damage at 500 mana', near(dmg, 1.4));
}

// 3d. attr10:* and overcap5:* derived gauges
{
  const w = makeSimWorld('warrior', 4246), p = w.player;
  w.meta.allocated.add('exp_int_scholar');
  w.meta.allocated.add('exp_int_overcap_cold');
  w.meta.baseAttrs.intelligence = 120;
  w.recalcSeat(w.localSeat);
  p.sheet.setSource('overcap', [mod('coldRes', 'flat', 1.0)]); // 100% + 15% from node = 115% vs 75% cap -> 40% overcap -> 8 steps
  for (let i = 0; i < 8; i++) w.update(0.05);
  const intGauge = p.sheet.gauge('attr10:intelligence');
  const coldGauge = p.sheet.gauge('overcap5:cold');
  check('attr10:intelligence and overcap5:cold gauges sample and scale live stats',
    intGauge === 12 && coldGauge === 8 && near(p.sheet.get('coldPen'), 0.04),
    `intG=${intGauge}, coldG=${coldGauge}, coldPen=${p.sheet.get('coldPen')}`);
}

// 3e. cannotMiss (Unerring Might)
{
  const w = makeSimWorld('warrior', 4247), p = w.player, rt = w as unknown as HitRuntime;
  w.meta.allocated.add('exp_str_unerring');
  w.recalcSeat(w.localSeat);
  const dodgeTarget = w.createMonster('zombie', 1, 'enemy');
  dodgeTarget.brain = undefined;
  dodgeTarget.sheet.setSource('rig', [mod('life', 'override', 10000), mod('evasion', 'override', 100000), mod('armor', 'override', 0)]);
  dodgeTarget.life = dodgeTarget.maxLife();
  w.actors.push(dodgeTarget);
  const atk = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_unerring_hit', tags: ['attack', 'melee'], baseDamage: { physical: [50, 50] }, effects: [{ type: 'damage' }] });
  let hits = 0;
  for (let i = 0; i < 5; i++) {
    const before = dodgeTarget.life;
    rt.resolveHit(p, atk, dodgeTarget);
    if (dodgeTarget.life < before) hits++;
  }
  check('Unerring Might (cannotMiss) hits 5/5 against 100k evasion and overrides critChance to 0',
    hits === 5 && near(p.sheet.get('critChance'), 0));
}

// 3f. critIgnoreRes (Piercing Epiphany)
{
  const w = makeSimWorld('warrior', 4248), p = w.player, rt = w as unknown as HitRuntime;
  w.meta.allocated.add('exp_int_epiphany');
  w.recalcSeat(w.localSeat);
  const fireSpell = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_epiphany_hit', tags: ['spell', 'fire'], baseDamage: { fire: [100, 100] }, effects: [{ type: 'damage' }] });
  const target = w.createMonster('zombie', 1, 'enemy');
  target.brain = undefined;
  target.sheet.setSource('rig', [mod('life', 'override', 10000), mod('fireRes', 'override', 0.75), mod('evasion', 'override', 0)]);
  target.life = target.maxLife();
  w.actors.push(target);
  // Non-crit -> mitigated by 75% fire res -> 25 damage
  p.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
  rt.resolveHit(p, fireSpell, target);
  const nonCritLost = 10000 - target.life;
  // Crit -> ignores 75% fire res! (100 * 1.5 = 150 damage vs 37.5 if res applied)
  p.sheet.setSource('rig', [mod('critChance', 'override', 0.95), mod('critMulti', 'override', 1.5), mod('damage', 'override', 1)]);
  seedGlobalRandom(42);
  let critLost = 0;
  for (let i = 0; i < 5; i++) {
    target.life = 10000;
    rt.resolveHit(p, fireSpell, target);
    const lost = 10000 - target.life;
    if (lost > 100) { critLost = lost; break; }
  }
  check('Piercing Epiphany (critIgnoreRes) bypasses 75% fire res on crits only',
    near(nonCritLost, 25, 0.5) && near(critLost, 150, 1),
    `nonCrit=${nonCritLost.toFixed(1)}, crit=${critLost.toFixed(1)}`);
}

// 3g. doubleDamageChance
{
  const w = makeSimWorld('warrior', 4249), p = w.player;
  const hit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_dd', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
  p.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
  const baseRoll = rollSkillDamage(p, hit).amounts.physical ?? 0;
  p.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('doubleDamageChance', 'flat', 0.5)]);
  seedGlobalRandom(999);
  let doubled = 0, normal = 0;
  for (let i = 0; i < 40; i++) {
    const r = rollSkillDamage(p, hit);
    if (near(r.amounts.physical ?? 0, baseRoll * 2)) doubled++;
    else if (near(r.amounts.physical ?? 0, baseRoll)) normal++;
  }
  check('doubleDamageChance deals exact 2x rolls at capped 50% rate', doubled > 5 && normal > 5 && doubled + normal === 40, `base=${baseRoll}, 2x=${doubled}, 1x=${normal}`);
}

// 3h. armorAppliesToElemental (Transcendent Iron)
{
  const w = makeSimWorld('warrior', 4250), p = w.player, rt = w as unknown as HitRuntime;
  const attacker = w.createMonster('zombie', 1, 'enemy');
  attacker.brain = undefined;
  attacker.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
  w.actors.push(attacker);
  const fireHit = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_elem_armor', tags: ['spell', 'fire'], baseDamage: { fire: [100, 100] }, effects: [{ type: 'damage' }] });
  p.sheet.setSource('rig', [mod('life', 'override', 10000), mod('evasion', 'override', 0), mod('armor', 'override', 3000), mod('fireRes', 'override', 0)]);
  p.life = 10000;
  rt.resolveHit(attacker, fireHit, p);
  const baseLost = 10000 - p.life;
  w.meta.allocated.add('exp_for_elem_plate');
  w.recalcSeat(w.localSeat);
  p.life = 10000;
  rt.resolveHit(attacker, fireHit, p);
  const ironLost = 10000 - p.life;
  check('Transcendent Iron (armorAppliesToElemental) mitigates elemental hit damage with armor',
    near(baseLost, 100, 0.5) && ironLost < 70,
    `base=${baseLost.toFixed(1)}, withTranscendentIron=${ironLost.toFixed(1)}`);
}

// 3i. Tagged hit damageTaken (Arrow-Catching Plate: projectile vs melee)
{
  const w = makeSimWorld('warrior', 4251), p = w.player, rt = w as unknown as HitRuntime;
  w.meta.allocated.add('exp_dex_iron_reflex_tailB'); // -10% projectile damage taken
  w.recalcSeat(w.localSeat);
  const attacker = w.createMonster('zombie', 1, 'enemy');
  attacker.brain = undefined;
  attacker.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
  w.actors.push(attacker);
  p.sheet.setSource('rig', [mod('life', 'override', 10000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('armor', 'override', 0)]);
  const projHit = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_proj', tags: ['attack', 'projectile'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
  const meleeHit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_melee', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
  p.life = 10000; rt.resolveHit(attacker, projHit, p); const projLost = 10000 - p.life;
  p.life = 10000; rt.resolveHit(attacker, meleeHit, p); const meleeLost = 10000 - p.life;
  check('tagged damageTaken reduces incoming projectile hits without altering melee hits',
    near(projLost, 90, 0.5) && near(meleeLost, 100, 0.5),
    `proj=${projLost.toFixed(1)}, melee=${meleeLost.toFixed(1)}`);
}

// 3j. wardBreak live trigger + unless: 'lowMana' + new conditions (hasWard, hasEndurance, channeling)
{
  const w = makeSimWorld('warrior', 4252), p = w.player, rt = w as unknown as HitRuntime;
  w.meta.allocated.add('exp_int_ward_bridge'); // wardBreak -> restore ES
  w.meta.allocated.add('route_int_accent_reserve_ward'); // unless: 'lowMana' -> +18% wardGain
  w.recalcSeat(w.localSeat);
  p.sheet.setSource('rig', [mod('life', 'override', 1000), mod('mana', 'override', 100), mod('manaRegen', 'override', 0), mod('energyShield', 'override', 200), mod('evasion', 'override', 0), mod('armor', 'override', 0)]);
  p.mana = 80; p.es = 50; p.ward = 30;
  w.update(0.01);
  const highManaWardGain = p.sheet.get('wardGain');
  const hadWardCond = p.sheet.hasCondition('hasWard');
  p.mana = 10;
  w.update(0.01);
  const lowManaWardGain = p.sheet.get('wardGain');
  check('unless: lowMana toggles off on low mana and hasWard reflects active ward',
    highManaWardGain > lowManaWardGain && hadWardCond);

  // Break ward via real hit and step world to sweep wardBreak proc
  p.mana = 80; p.ward = 25; p.es = 50;
  const attacker = w.createMonster('zombie', 1, 'enemy');
  attacker.brain = undefined;
  attacker.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
  w.actors.push(attacker);
  const hit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_wb', tags: ['attack', 'melee'], baseDamage: { physical: [40, 40] }, effects: [{ type: 'damage' }] });
  seedGlobalRandom(1234);
  rt.resolveHit(attacker, hit, p);
  const esAfterHit = p.es;
  w.update(0.05);
  check('wardBreak trigger fires through real combat soak and restores ES',
    p.ward === 0 && p.es > esAfterHit && p.procReadyAt.has('exp_ward_shatter'),
    `esAfterHit=${esAfterHit.toFixed(1)}, esAfterSweep=${p.es.toFixed(1)}`);

  // Endurance condition
  p.sheet.setSource('endRig', [mod('endurance', 'override', 100), mod('enduranceRegenPct', 'override', 0)]);
  p.endurance = 40;
  w.update(0.01);
  const hasEnd = p.sheet.hasCondition('hasEndurance');
  p.endurance = 0;
  w.update(0.01);
  const noEnd = !p.sheet.hasCondition('hasEndurance');
  check('hasEndurance condition toggles cleanly with endurance pool', hasEnd && noEnd);
}

// 3k. Pass 2 Engine Primitives: fromOffset cross-links, lifeToEs trade, heftBlow, fellingChance, flatHitReduction, farShotDamage, lifeLeechToEs, solitary gauge
{
  // fromOffset + tag-scoped de-bundling + one-way Keystone translation (Sympathetic Edge/Verse -> Voice of the Horde -> Usurped Host)
  const edgeSheet = new StatSheet();
  edgeSheet.setSource('minions', [mod('minionDamage', 'increased', 1.0)]);
  edgeSheet.setSource('edge', N['exp_wis_spiritual_aid_midA'].mods!);
  check('Sympathetic Edge forwards 15% minionDamage scaling to attacks only',
    near(edgeSheet.get('damage', new Set<SkillTag>(['attack'])), 1.15) &&
    near(edgeSheet.get('damage', new Set<SkillTag>(['spell'])), 1.0));

  const verseSheet = new StatSheet();
  verseSheet.setSource('minions', [mod('minionDamage', 'increased', 1.0)]);
  verseSheet.setSource('verse', N['exp_wis_spiritual_aid_midB'].mods!);
  check('Sympathetic Verse forwards 15% minionDamage scaling to spells only',
    near(verseSheet.get('damage', new Set<SkillTag>(['spell'])), 1.15) &&
    near(verseSheet.get('damage', new Set<SkillTag>(['attack'])), 1.0));

  const voiceSheet = new StatSheet();
  voiceSheet.setSource('minions', [mod('minionDamage', 'increased', 1.0)]);
  voiceSheet.setSource('voice', N['exp_wis_spiritual_aid'].mods!);
  check('Voice of the Horde (notable) forwards 30% of minionDamage scaling to all own skills without bundled minionDamage',
    N['exp_wis_spiritual_aid'].kind === 'notable' &&
    near(voiceSheet.get('damage'), 1.30) && near(voiceSheet.get('minionDamage'), 2.0),
    `damage=${voiceSheet.get('damage')}, minionDamage=${voiceSheet.get('minionDamage')}`);

  const usurpedSheet = new StatSheet();
  usurpedSheet.setSource('minions', [mod('minionDamage', 'increased', 1.0)]);
  usurpedSheet.setSource('usurped', N['exp_wis_spiritual_aid_tail'].mods!);
  check('Usurped Host (one-way keystone) translates 90% of minionDamage scaling to self while stripping minion scaling to 1.0',
    N['exp_wis_spiritual_aid_tail'].kind === 'keystone' &&
    near(usurpedSheet.get('damage'), 1.90) && near(usurpedSheet.get('minionDamage'), 1.0),
    `damage=${usurpedSheet.get('damage')}, minionDamage=${usurpedSheet.get('minionDamage')}`);

  // lifeToEs / lifeForgone trade: Ashen Vessel
  const esSheet = new StatSheet();
  esSheet.setSource('base', [mod('life', 'flat', 200)]); // baseline life = 220
  esSheet.setSource('vessel', N['exp_wil_ashen_vessel'].mods!); // lifeToEs: 1.10, lifeForgone: 0.60
  check('Ashen Vessel (lifeToEs/lifeForgone) converts 110% of life baseline to ES and forgoes 60% life',
    near(esSheet.get('energyShield'), 242, 0.5) && near(esSheet.get('life'), 88, 0.5),
    `es=${esSheet.get('energyShield')}, life=${esSheet.get('life')}`);

  // heftBlowChance / heftBlowScale (Crushing Heft)
  const wHeft = makeSimWorld('warrior', 4270), pH = wHeft.player;
  const hitH = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_heft', tags: ['attack', 'melee'], baseDamage: { physical: [50, 50] }, effects: [{ type: 'damage' }] });
  pH.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('life', 'override', 400), mod('endurance', 'override', 100), mod('energyShield', 'override', 100)]);
  pH.life = 400; pH.endurance = 100; pH.es = 100; // pool = 600; 25% default scale -> +150 bonus
  const baseH = rollSkillDamage(pH, hitH).amounts.physical ?? 0;
  pH.sheet.setSource('heft', [mod('heftBlowChance', 'flat', 0.4), mod('heftBlowScale', 'flat', 0.25)]); // total scale = 0.50 -> +300
  seedGlobalRandom(77);
  let hefty = 0;
  for (let i = 0; i < 30; i++) {
    const r = rollSkillDamage(pH, hitH).amounts.physical ?? 0;
    if (near(r, baseH + 300, 1)) hefty++;
  }
  check('Crushing Heft (heftBlowChance) adds current Life+Endurance+ES bonus damage', hefty > 2, `hefty=${hefty}/30`);

  // fellingChance (D2 Crushing Blow shear)
  const wFell = makeSimWorld('warrior', 4271), pF = wFell.player, rtF = wFell as unknown as HitRuntime;
  pF.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('fellingChance', 'flat', 0.5)]);
  const boss = wFell.createMonster('zombie', 1, 'enemy');
  boss.brain = undefined;
  boss.sheet.setSource('rig', [mod('life', 'override', 10000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
  boss.life = 10000;
  wFell.actors.push(boss);
  const atkF = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_fell', tags: ['attack', 'melee'], baseDamage: { physical: [10, 10] }, effects: [{ type: 'damage' }] });
  seedGlobalRandom(99);
  let sheared = false;
  for (let i = 0; i < 10; i++) {
    boss.life = 10000;
    rtF.resolveHit(pF, atkF, boss);
    if (10000 - boss.life > 500) { sheared = true; break; }
  }
  check('Felling Strike (fellingChance) shears 8% of victim remaining life on attack hits', sheared);

  // flatHitReduction (Impervious Hide)
  const wFlat = makeSimWorld('warrior', 4272), pFl = wFlat.player, rtFl = wFlat as unknown as HitRuntime;
  const foe = wFlat.createMonster('zombie', 1, 'enemy');
  foe.brain = undefined;
  foe.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
  wFlat.actors.push(foe);
  pFl.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0), mod('flatHitReduction', 'flat', 22)]);
  pFl.life = 1000;
  const chip = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_chip', tags: ['attack', 'melee'], baseDamage: { physical: [30, 30] }, effects: [{ type: 'damage' }] });
  rtFl.resolveHit(foe, chip, pFl);
  check('flatHitReduction shaves flat integer damage off incoming hits', near(1000 - pFl.life, 8, 0.5), `lost=${(1000 - pFl.life).toFixed(1)}`);

  // farShotDamage (Horizon Draw)
  const wFar = makeSimWorld('warrior', 4273), pFa = wFar.player, rtFa = wFar as unknown as HitRuntime;
  pFa.pos = { x: 0, y: 0 };
  pFa.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('farShotDamage', 'flat', 0.40)]);
  const farTgt = wFar.createMonster('zombie', 1, 'enemy');
  farTgt.brain = undefined;
  farTgt.sheet.setSource('rig', [mod('life', 'override', 10000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
  wFar.actors.push(farTgt);
  const shot = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_far', tags: ['spell', 'projectile'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
  farTgt.pos = { x: 100, y: 0 }; farTgt.life = 10000; rtFa.resolveHit(pFa, shot, farTgt); const closeLost = 10000 - farTgt.life;
  farTgt.pos = { x: 500, y: 0 }; farTgt.life = 10000; rtFa.resolveHit(pFa, shot, farTgt); const farLost = 10000 - farTgt.life;
  check('farShotDamage ramps damage up to +40% at long range', near(closeLost, 100, 0.5) && near(farLost, 140, 0.5), `close=${closeLost.toFixed(1)}, far=${farLost.toFixed(1)}`);

  // lifeLeechToEs (Siphon Lattice)
  const wGr = makeSimWorld('warrior', 4274), pGr = wGr.player, rtGr = wGr as unknown as HitRuntime;
  pGr.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('life', 'override', 500), mod('energyShield', 'override', 500), mod('lifeLeech', 'flat', 0.10), mod('lifeLeechToEs', 'flat', 0.80)]);
  pGr.life = 100; pGr.es = 100;
  const dummy = wGr.createMonster('zombie', 1, 'enemy');
  dummy.brain = undefined; dummy.sheet.setSource('rig', [mod('life', 'override', 10000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]); dummy.life = 10000;
  wGr.actors.push(dummy);
  const spell = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_gr', tags: ['spell'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
  rtGr.resolveHit(pGr, spell, dummy);
  check('lifeLeechToEs redirects 80% of life leech into Energy Shield',
    near(pGr.life, 102, 0.2) && near(pGr.es, 108, 0.2), `life=${pGr.life.toFixed(1)}, es=${pGr.es.toFixed(1)}`);

  // solitary gauge (Oath of the Unaccompanied)
  const wSol = makeSimWorld('warrior', 4275), pSol = wSol.player;
  wSol.meta.allocated.add('exp_for_solitary');
  wSol.recalcSeat(wSol.localSeat);
  for (let i = 0; i < 8; i++) wSol.update(0.05);
  const soloOn = pSol.sheet.gauge('solitary') === 1 && pSol.sheet.get('damage') > 1.1;
  const pet = wSol.createMonster('zombie', 1, 'player', pSol);
  wSol.actors.push(pet);
  for (let i = 0; i < 8; i++) wSol.update(0.05);
  const soloOff = pSol.sheet.gauge('solitary') === 0;
  check('solitary gauge activates with 0 minions and deactivates when a minion is alive', soloOn && soloOff);
}

// 3l. Passes 3-5 Engine & Synergy Proofs: overcritChance/Multi (Apex Verdict), hitCap link (Stone Threshold), Pass 5 status cascades
{
  // Apex Strike (overcritChance / overcritMulti)
  const wAp = makeSimWorld('warrior', 4280), pAp = wAp.player;
  const hitAp = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_apex', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
  pAp.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
  const baseAp = rollSkillDamage(pAp, hitAp).amounts.physical ?? 0;
  pAp.sheet.setSource('rig', [mod('critChance', 'override', 0.95), mod('critMulti', 'override', 2.0), mod('damage', 'override', 1), mod('overcritChance', 'flat', 0.5), mod('overcritMulti', 'flat', 0.5)]);
  // overcritMulti base 1.5 + 0.5 = 2.0 -> normal crit = 2x base, apex crit = 4x base
  seedGlobalRandom(313);
  let apexHits = 0, normalCrits = 0;
  for (let i = 0; i < 40; i++) {
    const r = rollSkillDamage(pAp, hitAp);
    if (r.crit) {
      if (near(r.amounts.physical ?? 0, baseAp * 4, 1)) apexHits++;
      else if (near(r.amounts.physical ?? 0, baseAp * 2, 1)) normalCrits++;
    }
  }
  check('Apex Strike (overcritChance/overcritMulti) multiplies critical hits by overcritMulti',
    apexHits > 5 && normalCrits > 5, `base=${baseAp.toFixed(1)}, apex=${apexHits}, normalCrit=${normalCrits}`);

  // Stone Threshold (burstStaggerPct: 55% of excess > 30% maxLife into Stagger; composes cleanly with The Tolling Frame hitCap!)
  const wCap = makeSimWorld('warrior', 4281), pCap = wCap.player, rtCap = wCap as unknown as HitRuntime;
  wCap.meta.allocated.add('exp_p3_for_hit_cap');
  wCap.recalcSeat(wCap.localSeat);
  pCap.sheet.setSource('rig', [mod('life', 'override', 400), mod('armor', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
  pCap.life = 400;
  const crusher = wCap.createMonster('zombie', 1, 'enemy');
  crusher.brain = undefined;
  crusher.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
  wCap.actors.push(crusher);
  const slam = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_cap_slam', tags: ['attack', 'melee'], baseDamage: { physical: [300, 300] }, effects: [{ type: 'damage' }] });
  rtCap.resolveHit(crusher, slam, pCap);
  const soloImmediate = 400 - pCap.life;
  const soloStaggered = pCap.stagger?.amount ?? 0;
  // Now ALSO allocate The Tolling Frame (cl_crag_bell, cap 20+5*lvl; at lvl 28 -> 160 cap):
  // 500 hit -> hitCap clamps to 160 -> Stone Threshold diverts (160 - 120) * 0.55 = 22 into Stagger -> 138 immediate + 22 staggered!
  wCap.meta.allocated.add('cl_crag_bell');
  pCap.level = 28;
  wCap.recalcSeat(wCap.localSeat);
  pCap.refreshConditions();
  pCap.life = 400; pCap.stagger = undefined;
  const megaSlam = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_mega_slam', tags: ['attack', 'melee'], baseDamage: { physical: [500, 500] }, effects: [{ type: 'damage' }] });
  rtCap.resolveHit(crusher, megaSlam, pCap);
  const comboImmediate = 400 - pCap.life;
  const comboStaggered = (pCap as Actor).stagger?.amount ?? 0;
  check('Stone Threshold diverts 55% of hit damage above 30% maxLife into Stagger and composes strictly beneficially with The Tolling Frame',
    near(soloImmediate, 201, 1.5) && near(soloStaggered, 99, 1.5) &&
    near(comboImmediate, 138, 1.5) && near(comboStaggered, 22, 1.5) &&
    near(comboImmediate + comboStaggered, 160, 1.5),
    `solo=${soloImmediate.toFixed(1)}+${soloStaggered.toFixed(1)}, combo=${comboImmediate.toFixed(1)}+${comboStaggered.toFixed(1)}`);

  // Pass 5 status cascade: Venomous Exsanguination (bleed -> poison) and Thermoelectric Cascade (chill -> shock)
  const wSyn = makeSimWorld('warrior', 4282), pSyn = wSyn.player, rtSyn = wSyn as unknown as HitRuntime;
  wSyn.meta.allocated.add('exp_p5_fin_poison_bleed_tailB');
  wSyn.meta.allocated.add('exp_p5_int_chill_shock_tailB');
  wSyn.recalcSeat(wSyn.localSeat);
  const dummy = wSyn.createMonster('zombie', 1, 'enemy');
  dummy.brain = undefined; dummy.sheet.setSource('rig', [mod('life', 'override', 5000)]); dummy.life = 5000;
  wSyn.actors.push(dummy);
  const inst = makeSkillInstance(SKILLS.cleave);
  seedGlobalRandom(88);
  rtSyn.rollStatusProcs(pSyn, inst, dummy, 'bleed', new Set<SkillTag>(['attack', 'melee']), [], 0);
  rtSyn.rollStatusProcs(pSyn, inst, dummy, 'chill', new Set<SkillTag>(['spell', 'cold']), [], 0);
  check('Pass 5 cross-ailment cascades auto-apply poison on bleed and shock on chill',
    dummy.statuses.some(s => s.id === 'poison') && dummy.statuses.some(s => s.id === 'shock'));
}

// 3m. Pass 7 Dynamic Level-Scaling Framework & Multi-Avenue Obscure Build-Around Engines
{
  // (1) 'level' gauge dynamic scaling: Impervious Hide & The Tolling Frame scale smoothly from Lv 1 to Lv 50
  const wLvl = makeSimWorld('warrior', 4290), pL = wLvl.player;
  wLvl.meta.allocated.add('exp_for_stone_skin');
  wLvl.meta.allocated.add('cl_crag_bell');
  pL.level = 1;
  wLvl.recalcSeat(wLvl.localSeat);
  const fhr1 = pL.sheet.get('flatHitReduction');
  const cap1 = pL.sheet.get('hitCap');
  pL.level = 50;
  wLvl.recalcSeat(wLvl.localSeat);
  const fhr50 = pL.sheet.get('flatHitReduction');
  const cap50 = pL.sheet.get('hitCap');
  check('Pass 7 level-scaling framework scales Impervious Hide & The Tolling Frame smoothly from Lv 1 to Lv 50',
    near(fhr1, 3.55, 0.05) && near(cap1, 25, 0.5) && near(fhr50, 30.5, 0.1) && near(cap50, 270, 0.5),
    `Lv1(fhr=${fhr1.toFixed(2)}, cap=${cap1.toFixed(1)}) -> Lv50(fhr=${fhr50.toFixed(2)}, cap=${cap50.toFixed(1)})`);

  // (2) Overkill Cascade (overkillCarry / overkillRadius) — killing blow excess bursts onto nearby hostiles non-recursively
  const wOk = makeSimWorld('warrior', 4291), pOk = wOk.player, rtOk = wOk as unknown as HitRuntime;
  pOk.sheet.setSource('rig', [
    mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1),
    mod('overkillCarry', 'flat', 0.50), mod('overkillRadius', 'override', 180),
  ]);
  const weak = wOk.createMonster('zombie', 1, 'enemy');
  weak.brain = undefined; weak.pos = { x: pOk.pos.x + 60, y: pOk.pos.y };
  weak.sheet.setSource('rig', [mod('life', 'override', 40), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
  weak.life = 40;
  const bystander = wOk.createMonster('zombie', 1, 'enemy');
  bystander.brain = undefined; bystander.pos = { x: pOk.pos.x + 120, y: pOk.pos.y };
  bystander.sheet.setSource('rig', [mod('life', 'override', 500), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
  bystander.life = 500;
  wOk.actors.push(weak, bystander);
  const guillotine = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_overkill', tags: ['spell'], baseDamage: { physical: [140, 140] }, effects: [{ type: 'damage' }] });
  rtOk.resolveHit(pOk, guillotine, weak);
  const carryDealt = 500 - bystander.life;
  check('Overkill Cascade (overkillCarry) bursts excess killing damage onto nearby hostiles',
    weak.life <= 0 && near(carryDealt, 50, 0.5),
    `weakLife=${weak.life}, bystanderLost=${carryDealt.toFixed(1)}`);

  // (3) Graze Deflection + Ward-on-Graze (grazeChance / grazeMitigation / grazeWard)
  const wGz = makeSimWorld('warrior', 4292), pGz = wGz.player, rtGz = wGz as unknown as HitRuntime;
  const foeGz = wGz.createMonster('zombie', 1, 'enemy');
  foeGz.brain = undefined; foeGz.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
  wGz.actors.push(foeGz);
  pGz.sheet.setSource('rig', [
    mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0),
    mod('grazeChance', 'flat', 1.0), mod('grazeMitigation', 'flat', 0.15), mod('grazeWard', 'flat', 0.50),
    mod('wardGain', 'override', 1), mod('wardDecay', 'override', 0),
  ]);
  pGz.life = 1000; pGz.ward = 0;
  const nukeGz = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_graze', tags: ['spell', 'fire'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
  rtGz.resolveHit(foeGz, nukeGz, pGz);
  check('Graze Deflection halves incoming hit at 50% mitigation and converts 50% prevented damage to Ward',
    near(1000 - pGz.life, 50, 0.5) && near(pGz.ward, 25, 0.5),
    `lost=${(1000 - pGz.life).toFixed(1)}, ward=${pGz.ward.toFixed(1)}`);

  // (4) Trauma & Self-Wound Engine (traumaCost + 'wounds' gauge)
  const wTr = makeSimWorld('warrior', 4293), pTr = wTr.player;
  wTr.meta.allocated.add('exp_p7_str_trauma_entry'); // +2% increased melee damage per recent wound
  wTr.recalcSeat(wTr.localSeat);
  pTr.sheet.setSource('rig', [mod('life', 'override', 500), mod('mana', 'override', 200), mod('traumaCost', 'flat', 0.04)]);
  pTr.life = 500; pTr.mana = 200;
  const meleeTags = new Set<SkillTag>(['melee']);
  const dmgBefore = pTr.sheet.get('damage', meleeTags);
  const swing = makeSkillInstance(SKILLS.cleave);
  wTr.executeSkill(pTr, swing, pTr.pos, { paidCost: { life: 0, mana: 10 } });
  const dmgAfter = pTr.sheet.get('damage', meleeTags);
  check('Trauma Cost self-wounds caster on cast, increments wounds gauge and scales wound passives immediately',
    near(500 - pTr.life, 20, 0.5) && pTr.woundStacks === 1 && pTr.sheet.gauge('wounds') === 1 && near(dmgAfter - dmgBefore, 0.02, 1e-4),
    `lifeLost=${(500 - pTr.life).toFixed(1)}, wounds=${pTr.woundStacks}, dmg=${dmgBefore.toFixed(3)}->${dmgAfter.toFixed(3)}`);

  // (5) Excess Accuracy ('accOver' gauge)
  const wAcc = makeSimWorld('warrior', 4294), pAcc = wAcc.player;
  wAcc.meta.allocated.add('exp_p7_dex_acc_overflow_b'); // +1.5% critMulti per 50 excess accuracy
  pAcc.level = 1;
  wAcc.recalcSeat(wAcc.localSeat);
  const cmBase = pAcc.sheet.get('critMulti');
  pAcc.sheet.setSource('rig', [mod('accuracy', 'override', 465)]); // baseline 150 + 15*1 = 165 -> excess 300 -> 6 steps -> +0.09 critMulti
  for (let i = 0; i < 8; i++) wAcc.update(0.05);
  check('Excess Accuracy (accOver) samples excess accuracy above level baseline and scales stats',
    pAcc.sheet.gauge('accOver') === 6 && near(pAcc.sheet.get('critMulti') - cmBase, 0.09, 1e-3),
    `accOver=${pAcc.sheet.gauge('accOver')}, critMulti=${cmBase.toFixed(3)}->${pAcc.sheet.get('critMulti').toFixed(3)}`);

  // (6) Cooldown-Weight Scaling (cooldownPower)
  const wCd = makeSimWorld('warrior', 4295), pCd = wCd.player;
  const cdSkill = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_cdpow', cooldown: 4, tags: ['spell', 'fire'], baseDamage: { fire: [100, 100] }, effects: [{ type: 'damage' }] });
  pCd.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
  const cdBase = rollSkillDamage(pCd, cdSkill).amounts.fire ?? 0;
  pCd.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('cooldownPower', 'flat', 0.20)]);
  const cdWeighted = rollSkillDamage(pCd, cdSkill).amounts.fire ?? 0;
  check('Cooldown-Weight (cooldownPower) scales skill damage multiplicatively with effective cooldown',
    near(cdWeighted, cdBase * 1.8, 0.5),
    `base=${cdBase.toFixed(1)}, weighted=${cdWeighted.toFixed(1)}`);

  // (7) Temporal Debt (hitEchoFrac / hitEchoDelay / hitEchoAoe) — banks damage and detonates with AoE splash after window
  const wTd = makeSimWorld('warrior', 4296), pTd = wTd.player, rtTd = wTd as unknown as HitRuntime;
  pTd.sheet.setSource('rig', [
    mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1),
    mod('hitEchoFrac', 'flat', 0.50), mod('hitEchoDelay', 'override', 1.0), mod('hitEchoAoe', 'flat', 140),
  ]);
  const debtTgt = wTd.createMonster('zombie', 1, 'enemy');
  debtTgt.brain = undefined; debtTgt.pos = { x: pTd.pos.x + 60, y: pTd.pos.y };
  debtTgt.sheet.setSource('rig', [mod('life', 'override', 1000), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
  debtTgt.life = 1000;
  const debtNear = wTd.createMonster('zombie', 1, 'enemy');
  debtNear.brain = undefined; debtNear.pos = { x: pTd.pos.x + 120, y: pTd.pos.y };
  debtNear.sheet.setSource('rig', [mod('life', 'override', 1000), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
  debtNear.life = 1000;
  wTd.actors.push(debtTgt, debtNear);
  const debtHit = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_debt', tags: ['spell'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
  rtTd.resolveHit(pTd, debtHit, debtTgt);
  const bankedOk = near(debtTgt.life, 900, 0.5) && near(debtTgt.echoDebt?.stored ?? 0, 50, 0.5) && near(debtNear.life, 1000, 0.5);
  for (let i = 0; i < 24; i++) wTd.update(0.05); // 1.2s elapsed > 1.0s echo window
  const detonatedOk = !debtTgt.echoDebt && near(debtTgt.life, 850, 0.5) && near(debtNear.life, 975, 0.5);
  check('Temporal Debt (hitEchoFrac) banks landed damage and detonates with AoE splash when window expires',
    bankedOk && detonatedOk,
    `targetLife=${debtTgt.life.toFixed(1)}, nearLife=${debtNear.life.toFixed(1)}`);
}

// 3q-3z. Ashen Flock Rework + Pass 8 & Pass 9 Build-Around Engine Live Proofs
{
  type ExecRuntime = {
    explodeActor(dead: Actor, frac: number, opts?: { type?: 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos'; color?: string; radius?: number }): void;
  };

  // (1) Ashen Flock Rework: missing-life extra fire + quadratic decay without early kill, and NO explode-on-death (distinct from Martyrdom)
  const wAf = makeSimWorld('warrior', 4301), pAf = wAf.player;
  wAf.meta.allocated.add('exp_wis_ashen_flock');
  wAf.recalcSeat(wAf.localSeat);
  const afNodeDistinct = !N['exp_wis_ashen_flock'].mods!.some(m => m.stat === 'minionExplodeDeath')
    && N['exp_wis_ashen_flock'].mods!.some(m => m.stat === 'minionMissingLifeFire')
    && N['exp_wis_ashen_flock'].mods!.some(m => m.stat === 'minionDecayQuad');
  const mAf = wAf.createMonster('skeleton_warrior', 1, 'player');
  mAf.brain = undefined; mAf.owner = pAf;
  mAf.sheet.setSource('rig', [mod('life', 'override', 200), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
  mAf.life = 200;
  mAf.lifespan = 6; mAf.lifespanTotal = 6;
  wAf.actors.push(mAf);
  const mHit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_af_hit', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
  const fullFire = rollSkillDamage(mAf, mHit).amounts.fire ?? 0;
  mAf.life = 100; // 50% missing life -> 0.50 * 0.40 = 20.0 extra fire
  const halfFire = rollSkillDamage(mAf, mHit).amounts.fire ?? 0;
  // Advance 2s + 2s (out of 6s lifespan) -> prove TRUE quadratic acceleration (second half burns much faster) while clamped >= 1 until lifespan expires!
  const life0 = mAf.life;
  for (let i = 0; i < 40; i++) wAf.update(0.05); // 0..2.0s
  const drop1 = life0 - mAf.life;
  const lifeMid = mAf.life;
  for (let i = 0; i < 40; i++) wAf.update(0.05); // 2.0..4.0s (still 2s before expiry!)
  const drop2 = lifeMid - mAf.life;
  const quadDroppedAlive = !mAf.dead && drop1 > 2 && drop2 > drop1 * 3 && mAf.life >= 1;
  check('Ashen Flock rework grants missing-life extra fire, quadratic decay burn without early expiry, and leaves explode-on-death to Martyrdom',
    afNodeDistinct && near(fullFire, 0, 0.01) && near(halfFire, 20.0, 0.5) && quadDroppedAlive,
    `fullFire=${fullFire.toFixed(1)}, halfFire=${halfFire.toFixed(1)}, drop1=${drop1.toFixed(1)}, drop2=${drop2.toFixed(1)}, life=${mAf.life.toFixed(1)}, dead=${mAf.dead}`);

  // (2) Kindled Bones (moved to Pyre-Born Covenant wheel!) & Volatile Corpse (1% explode + death-effect power)
  const wKb = makeSimWorld('warrior', 4302), pKb = wKb.player, erKb = wKb as unknown as ExecRuntime;
  wKb.meta.allocated.add('exp_p8_wis_pyre_covenant_midA'); // Kindled Bones (4 + 1.0/lvl burn, 15% extra fire)
  pKb.level = 1;
  wKb.recalcSeat(wKb.localSeat);
  const kbLvl1 = pKb.sheet.get('minionKindleBurn');
  pKb.level = 40;
  wKb.recalcSeat(wKb.localSeat);
  const kbLvl40 = pKb.sheet.get('minionKindleBurn');
  const mKb = wKb.createMonster('skeleton_warrior', 1, 'player');
  mKb.brain = undefined; mKb.owner = pKb;
  mKb.sheet.setSource('rig', [mod('life', 'override', 500), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
  mKb.life = 500;
  mKb.kindledLeft = 4.0; mKb.kindledBurnDps = kbLvl40;
  wKb.actors.push(mKb);
  const fireWhileKindled = rollSkillDamage(mKb, mHit).amounts.fire ?? 0;
  for (let i = 0; i < 20; i++) wKb.update(0.05); // 1.0s elapsed -> ~44 burn damage taken
  const burnedLife = 500 - mKb.life;
  mKb.kindledLeft = 0;
  const fireAfterKindled = rollSkillDamage(mKb, mHit).amounts.fire ?? 0;
  check('Kindled Bones scales self-burn with level, ticks minion HP safely, and grants 15% extra fire only while kindled',
    near(kbLvl1, 5.0, 0.05) && near(kbLvl40, 44.0, 0.1) && near(fireWhileKindled, 15, 0.5) && burnedLife > 35 && near(fireAfterKindled, 0, 0.01),
    `lvl1=${kbLvl1.toFixed(1)}, lvl40=${kbLvl40.toFixed(1)}, kindledFire=${fireWhileKindled.toFixed(1)}, burned=${burnedLife.toFixed(1)}`);

  // Volatile Corpse + Ossuary Amplification -> minionDeathEffectPower boosts explodeActor & minionDeathHeal
  const foeVc = wKb.createMonster('zombie', 1, 'enemy');
  foeVc.brain = undefined; foeVc.pos = { x: mKb.pos.x + 20, y: mKb.pos.y };
  foeVc.sheet.setSource('rig', [mod('life', 'override', 1000), mod('fireRes', 'override', 0), mod('armor', 'override', 0)]);
  foeVc.life = 1000;
  wKb.actors.push(foeVc);
  erKb.explodeActor(mKb, 0.10, { type: 'fire' }); // base 10% of 500 = 50 fire
  const baseExplode = 1000 - foeVc.life;
  wKb.meta.allocated.add('exp_wis_ashen_flock_b2'); // Volatile Corpse (+12% death effect power, 1% explode)
  wKb.meta.allocated.add('exp_p8_wis_death_ossuary'); // Ossuary Amplification (+22% death effect power)
  wKb.recalcSeat(wKb.localSeat);
  foeVc.life = 1000;
  erKb.explodeActor(mKb, 0.10, { type: 'fire' }); // boosted by 1.34x -> 67.0 fire
  const boostedExplode = 1000 - foeVc.life;
  check('Volatile Corpse & minionDeathEffectPower amplify minion death bursts across the tree',
    near(pKb.sheet.get('minionExplodeDeath'), 0.01) && near(baseExplode, 50, 1) && near(boostedExplode, 67.0, 1.5),
    `base=${baseExplode.toFixed(1)}, boosted=${boostedExplode.toFixed(1)}`);

  // (3) Kinetic Inertia ('inertia' gauge + inertiaGain + inertiaDischarge)
  const wIn = makeSimWorld('warrior', 4303), pIn = wIn.player;
  wIn.meta.allocated.add('exp_p8_dex_inertia_pendulum_b'); // references 'inertia' gauge
  wIn.meta.allocated.add('exp_p8_dex_inertia_pendulum_tail'); // +150% inertiaGain, +7% discharge/stack
  wIn.recalcSeat(wIn.localSeat);
  pIn.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
  pIn.inertiaStacks = 10; pIn.inertiaDecay = 3.5;
  pIn.refreshConditions();
  const inertiaGaugeVal = pIn.sheet.gauge('inertia');
  const inertiaHit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_inertia', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
  const discharged = rollSkillDamage(pIn, inertiaHit).amounts.physical ?? 0; // base * (1 + 10 * 0.07) = 1.70x and stacks consumed to 0!
  const postDischarge = rollSkillDamage(pIn, inertiaHit).amounts.physical ?? 0;
  check('Kinetic Inertia publishes inertia gauge, amplifies hit via inertiaDischarge, and consumes stacks on non-movement hit',
    inertiaGaugeVal === 10 && near(discharged, postDischarge * 1.7, 1) && pIn.inertiaStacks === 0 && postDischarge > 95,
    `gauge=${inertiaGaugeVal}, discharged=${discharged.toFixed(1)}, post=${postDischarge.toFixed(1)}, remStacks=${pIn.inertiaStacks}`);

  // (4) Riven Fractures (rivenChance + rivenPower armor & resistance shred)
  const wRv = makeSimWorld('warrior', 4304), pRv = wRv.player, rtRv = wRv as unknown as HitRuntime;
  wRv.meta.allocated.add('exp_p8_prw_riven_duelist_tail'); // +150% rivenChance, +2% res shred/stack, critChance=0
  wRv.recalcSeat(wRv.localSeat);
  pRv.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('damage', 'override', 1)]);
  const rvTgt = wRv.createMonster('zombie', 1, 'enemy');
  rvTgt.brain = undefined;
  rvTgt.sheet.setSource('rig', [mod('life', 'override', 2000), mod('fireRes', 'override', 0.50), mod('armor', 'override', 0), mod('evasion', 'override', 0), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0)]);
  rvTgt.life = 2000;
  wRv.actors.push(rvTgt);
  const rvSpell = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_riven', tags: ['spell', 'fire'], baseDamage: { fire: [100, 100] }, effects: [{ type: 'damage' }] });
  rtRv.resolveHit(pRv, rvSpell, rvTgt); // 0 riven stacks before hit -> 50 dmg, applies >= 1 riven stack!
  const hit1Dmg = 2000 - rvTgt.life;
  const stacksAfter1 = rvTgt.rivenStacks;
  rvTgt.rivenStacks = 10; // 10 * 2% = 20% fire res shred -> 30% fire res -> 70 dmg
  rvTgt.life = 2000;
  rtRv.resolveHit(pRv, rvSpell, rvTgt);
  const hitAt10Dmg = 2000 - rvTgt.life;
  check('Riven Fractures stack on hit, disable crits on Fractured Architecture, and shred target resistances via rivenPower',
    near(pRv.sheet.get('critChance'), 0) && stacksAfter1 >= 1 && near(hit1Dmg, 50, 0.5) && near(hitAt10Dmg, 70, 0.5),
    `stacks=${stacksAfter1}, hit1=${hit1Dmg.toFixed(1)}, hitAt10=${hitAt10Dmg.toFixed(1)}`);

  // (5) Harmonic Pitch ('harmony' gauge + harmonyPower + alternating climb / repeat reset + live minion sync)
  const wHm = makeSimWorld('warrior', 4305), pHm = wHm.player;
  wHm.meta.allocated.add('exp_p8_int_harmony_prism_tail'); // +6% more damage/stack
  wHm.recalcSeat(wHm.localSeat);
  pHm.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('mana', 'override', 500)]);
  pHm.mana = 500;
  const paid = { paidCost: { life: 0, mana: 5, endurance: 0, insight: 0 } };
  const fireCast = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_hm_fire', tags: ['spell', 'fire'], baseDamage: { fire: [100, 100] }, effects: [{ type: 'damage' }] });
  const coldCast = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_hm_cold', tags: ['spell', 'cold'], baseDamage: { cold: [100, 100] }, effects: [{ type: 'damage' }] });
  wHm.executeSkill(pHm, fireCast, pHm.pos, paid);
  const hm1 = pHm.harmonyStacks;
  wHm.executeSkill(pHm, coldCast, pHm.pos, paid);
  const hm2 = pHm.harmonyStacks;
  const dmgAt2 = rollSkillDamage(pHm, fireCast).amounts.fire ?? 0; // 100 * (1 + 2 * 0.06) = 112
  wHm.executeSkill(pHm, coldCast, pHm.pos, paid); // repeat cold -> resets to 0!
  const hmReset = pHm.harmonyStacks;
  // Live minion harmony sync check (Symphonic Retinue)
  wHm.meta.allocated.add('exp_p9_cha_harmony_host_tail');
  wHm.recalcSeat(wHm.localSeat);
  const mHm = wHm.createMonster('skeleton_warrior', 1, 'player');
  mHm.brain = undefined; mHm.owner = pHm; mHm.summonInst = makeSkillInstance(SKILLS.summon_skeleton);
  wHm.actors.push(mHm);
  pHm.harmonyStacks = 0; pHm.refreshConditions(); wHm.update(0.05);
  const mDmg0 = mHm.sheet.get('damage');
  pHm.harmonyStacks = 5; pHm.harmonyDecay = 6; pHm.refreshConditions(); wHm.update(0.05);
  const mDmg5 = mHm.sheet.get('damage');
  check('Harmonic Pitch climbs on alternating types, scales damage, resets on repeat, and syncs live to Symphonic Retinue minions',
    hm1 === 1 && hm2 === 2 && near(dmgAt2, 112, 1) && hmReset === 0 && mDmg5 > mDmg0 * 1.15,
    `hm=${hm1}->${hm2}->${hmReset}, dmgAt2=${dmgAt2.toFixed(1)}, minionDmg=${mDmg0.toFixed(2)}->${mDmg5.toFixed(2)}`);

  // (6) Sanguine Over-Leech (overleechWard + overleechPersist)
  const wOl = makeSimWorld('warrior', 4306), pOl = wOl.player, rtOl = wOl as unknown as HitRuntime;
  wOl.meta.allocated.add('exp_p8_str_overleech_tail'); // +75% persist, +35% ward, lifeRegen=0
  wOl.recalcSeat(wOl.localSeat);
  pOl.sheet.setSource('rig', [
    mod('life', 'override', 500), mod('lifeLeech', 'flat', 0.20), mod('accuracy', 'flat', 1e6),
    mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('wardGain', 'override', 1), mod('wardDecay', 'override', 0),
  ]);
  pOl.life = 500; pOl.ward = 0;
  const olTgt = wOl.createMonster('zombie', 1, 'enemy');
  olTgt.brain = undefined; olTgt.sheet.setSource('rig', [mod('life', 'override', 2000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
  olTgt.life = 2000; wOl.actors.push(olTgt);
  const olHit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_ol', tags: ['attack', 'melee'], baseDamage: { physical: [500, 500] }, effects: [{ type: 'damage' }] });
  rtOl.resolveHit(pOl, olHit, olTgt); // 500 dmg * 20% leech = 100 excess leech -> 35 Ward + 75 persist stream!
  check('Sanguine Over-Leech (Brimming Chalice) zeroes regen, converts excess leech to Ward, and banks lingering recovery stream',
    near(pOl.sheet.get('lifeRegen'), 0) && near(pOl.ward, 35, 1) && pOl.restoreStreams.length >= 1,
    `regen=${pOl.sheet.get('lifeRegen')}, ward=${pOl.ward.toFixed(1)}, streams=${pOl.restoreStreams.length}`);

  // (7) Alchemical Reap (ailmentReap) — crit consumes active damaging DoT for instantaneous burst
  const wAr = makeSimWorld('warrior', 4307), pAr = wAr.player, rtAr = wAr as unknown as HitRuntime;
  wAr.meta.allocated.add('exp_p8_fin_alchemical_reap_tail'); // +125% reap, -30% statusMag
  wAr.recalcSeat(wAr.localSeat);
  pAr.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 1.0), mod('critMulti', 'override', 1.0), mod('damage', 'override', 1)]);
  const arTgt = wAr.createMonster('zombie', 1, 'enemy');
  arTgt.brain = undefined;
  arTgt.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0), mod('chaosRes', 'override', 0), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0)]);
  arTgt.life = 1000; wAr.actors.push(arTgt);
  arTgt.applyStatus('poison', 50, 1, 'probe');
  const pSt = arTgt.statuses.find(s => s.id === 'poison')!;
  const expectedReap = pSt.dps * pSt.remaining * pSt.stacks * 1.25;
  const arHit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_reap', tags: ['attack', 'melee'], baseDamage: { physical: [50, 50] }, effects: [{ type: 'damage' }] });
  rtAr.resolveHit(pAr, arHit, arTgt); // 50 hit + expectedReap burst; poison consumed!
  const poisonCleared = !arTgt.statuses.some(s => s.id === 'poison' && s.stacks > 0);
  check('Alchemical Reap (Bitter Harvest) consumes active damaging DoTs on crit for instantaneous burst damage',
    poisonCleared && near(1000 - arTgt.life, 50 + expectedReap, 5),
    `lost=${(1000 - arTgt.life).toFixed(1)}, expected=${(50 + expectedReap).toFixed(1)}, poisonCleared=${poisonCleared}`);

  // (8) Poise-Break Implosion (poiseOverflow + inward pull)
  const wPo = makeSimWorld('warrior', 4308), pPo = wPo.player, rtPo = wPo as unknown as HitRuntime;
  wPo.meta.allocated.add('exp_p8_str_poise_implode_tail'); // +85% poiseOverflow + inward pull
  wPo.recalcSeat(wPo.localSeat);
  pPo.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('poiseDamage', 'override', 10)]);
  const poTgt = wPo.createMonster('zombie', 1, 'enemy');
  poTgt.brain = undefined; poTgt.pos = { x: pPo.pos.x + 60, y: pPo.pos.y };
  poTgt.sheet.setSource('rig', [mod('life', 'override', 1000), mod('poise', 'override', 100), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
  poTgt.life = 1000; poTgt.poise = 10;
  const poNear = wPo.createMonster('zombie', 1, 'enemy');
  poNear.brain = undefined; poNear.pos = { x: pPo.pos.x + 140, y: pPo.pos.y }; // 80px right of poTgt -> pull vx should be negative!
  poNear.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
  poNear.life = 1000;
  wPo.actors.push(poTgt, poNear);
  const poHit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_po', tags: ['attack', 'melee'], baseDamage: { physical: [50, 50] }, effects: [{ type: 'damage' }] });
  rtPo.resolveHit(pPo, poHit, poTgt);
  check('Poise-Break Implosion (Collapse of Bearing) deals max-poise shockwave and pulls nearby foes inward',
    poTgt.poiseBroken && poNear.life < 950 && (poNear.push?.vx ?? 0) < -50,
    `poiseBroken=${poTgt.poiseBroken}, nearLife=${poNear.life.toFixed(1)}, pullVx=${poNear.push?.vx?.toFixed(1)}`);

  // (9) Borrowed Seconds Stagger Purge & Ward Conversion (staggerPurge + staggerToWard)
  const wSp = makeSimWorld('warrior', 4309), pSp = wSp.player;
  wSp.meta.allocated.add('exp_p8_cha_stagger_ward_tail'); // staggerPurge 0.45, staggerToWard 0.50, armor=0
  wSp.recalcSeat(wSp.localSeat);
  pSp.sheet.setSource('rig', [mod('wardGain', 'override', 1), mod('wardDecay', 'override', 0), mod('mana', 'override', 500)]);
  pSp.mana = 500; pSp.ward = 0; pSp.staggerDamage(200);
  const cdCast = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_sp_cd', cooldown: 4, tags: ['spell', 'fire'], baseDamage: { fire: [20, 20] }, effects: [{ type: 'damage' }] });
  wSp.executeSkill(pSp, cdCast, pSp.pos, { paidCost: { life: 0, mana: 10 } }); // purges 45% of 200 = 90 -> 45 Ward!
  check('Stagger Purge (Unwritten Ledger) zeroes armor, clears 45% of stagger pool on cooldown cast, and converts 50% of purged stagger to Ward',
    near(pSp.sheet.get('armor'), 0) && near(pSp.stagger?.amount ?? 0, 110, 1) && near(pSp.ward, 45, 1),
    `armor=${pSp.sheet.get('armor')}, stagger=${(pSp.stagger?.amount ?? 0).toFixed(1)}, ward=${pSp.ward.toFixed(1)}`);

  // (10) Minion-Owner Conduits (ownerWoundsToMinion + minionLeechToOwner)
  const wMc = makeSimWorld('warrior', 4310), pMc = wMc.player, rtMc = wMc as unknown as HitRuntime;
  wMc.meta.allocated.add('exp_p9_wis_trauma_host_tail'); // +1.5% more minion dmg/owner wound, 5% minion leech to owner
  wMc.recalcSeat(wMc.localSeat);
  pMc.sheet.setSource('rig', [mod('life', 'override', 1000), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0)]);
  pMc.life = 500;
  pMc.woundStacks = 10; // +15% more minion hit damage -> 100 becomes 115!
  const mMc = wMc.createMonster('skeleton_warrior', 1, 'player');
  mMc.brain = undefined; mMc.owner = pMc;
  mMc.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
  const foeMc = wMc.createMonster('zombie', 1, 'enemy');
  foeMc.brain = undefined;
  foeMc.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
  foeMc.life = 1000;
  wMc.actors.push(mMc, foeMc);
  const mcHit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_mc', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
  rtMc.resolveHit(mMc, mcHit, foeMc); // 115 damage dealt -> 5% = 5.75 life leeched to owner!
  check('Scar-Bound Shepherd scales minion damage by owner wounds and leeches minion hit damage directly to owner',
    near(1000 - foeMc.life, 115, 1) && near(pMc.life - 500, 5.75, 0.5),
    `minionDealt=${(1000 - foeMc.life).toFixed(1)}, ownerHealed=${(pMc.life - 500).toFixed(2)}`);

  // (11) Funeral Pyre Bridge (minionPyreTether): recently summoned minions tether & burn enemies in between, scaled as minion fire!
  const wPt = makeSimWorld('warrior', 4311), pPt = wPt.player;
  pPt.level = 10; // 8 + 2.5*10 = 33 base DPS; Ash-Swollen Flock adds +10% minion fire -> 36.3 DPS (x0.25s = ~9.08/tick)
  wPt.meta.allocated.add('exp_p9_wis_kindled_martyr_tail'); // Funeral Pyre Bridge
  wPt.meta.allocated.add('exp_p9_wis_kindled_martyr_a');    // Ash-Swollen Flock (+10% minion fire damage)
  wPt.recalcSeat(wPt.localSeat);
  const pm1 = wPt.createMonster('skeleton_warrior', 1, 'player');
  pm1.brain = undefined; pm1.owner = pPt; pm1.pos = { x: 0, y: 0 }; pm1.recentSummonLeft = 6.0;
  const pm2 = wPt.createMonster('skeleton_warrior', 1, 'player');
  pm2.brain = undefined; pm2.owner = pPt; pm2.pos = { x: 160, y: 0 }; pm2.recentSummonLeft = 6.0;
  const foeBetween = wPt.createMonster('zombie', 1, 'enemy');
  foeBetween.brain = undefined; foeBetween.pos = { x: 80, y: 0 };
  foeBetween.sheet.setSource('rig', [mod('life', 'override', 1000), mod('fireRes', 'override', 0), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0)]);
  foeBetween.life = 1000;
  const foeFar = wPt.createMonster('zombie', 1, 'enemy');
  foeFar.brain = undefined; foeFar.pos = { x: 80, y: 120 };
  foeFar.sheet.setSource('rig', [mod('life', 'override', 1000), mod('fireRes', 'override', 0), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0)]);
  foeFar.life = 1000;
  wPt.actors.push(pm1, pm2, foeBetween, foeFar);
  for (let i = 0; i < 6; i++) wPt.update(0.05); // 0.30s -> 1 tether burn tick!
  const tetherLost = 1000 - foeBetween.life;
  const farLost = 1000 - foeFar.life;
  // Once recentSummonLeft expires, tether stops burning
  pm2.recentSummonLeft = 0;
  const lifeBeforeExpire = foeBetween.life;
  for (let i = 0; i < 8; i++) wPt.update(0.05);
  const stoppedAfterExpiry = near(foeBetween.life, lifeBeforeExpire, 0.01);
  check('Funeral Pyre Bridge tethers recently summoned minions, burns enemies between them scaled by minion fire, and stops once recent window expires',
    tetherLost > 7 && near(farLost, 0, 0.01) && stoppedAfterExpiry,
    `betweenLost=${tetherLost.toFixed(2)}, farLost=${farLost.toFixed(2)}, stoppedAfterExpiry=${stoppedAfterExpiry}`);

  // (12) Ember-Fed Rupture (minionStruckFirePulse): struck minions pulse fire on ONE shared 0.6s ICD across ALL minions!
  const wEf = makeSimWorld('warrior', 4312), pEf = wEf.player, rtEf = wEf as unknown as HitRuntime;
  pEf.level = 10; // 10 + 2.5*10 = 35 fire pulse
  wEf.meta.allocated.add('exp_p9_wis_kindled_martyr'); // Ember-Fed Rupture
  wEf.recalcSeat(wEf.localSeat);
  const em1 = wEf.createMonster('skeleton_warrior', 1, 'player');
  em1.brain = undefined; em1.owner = pEf; em1.pos = { x: 50, y: 0 };
  em1.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]); em1.life = 1000;
  const em2 = wEf.createMonster('skeleton_warrior', 1, 'player');
  em2.brain = undefined; em2.owner = pEf; em2.pos = { x: 50, y: 0 };
  em2.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]); em2.life = 1000;
  const foeEf = wEf.createMonster('zombie', 1, 'enemy');
  foeEf.brain = undefined; foeEf.pos = { x: 80, y: 0 };
  foeEf.sheet.setSource('rig', [mod('life', 'override', 1000), mod('fireRes', 'override', 0), mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0)]);
  foeEf.life = 1000;
  wEf.actors.push(em1, em2, foeEf);
  const foeSwing = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_ef_hit', tags: ['attack', 'melee'], baseDamage: { physical: [10, 10] }, effects: [{ type: 'damage' }] });
  rtEf.resolveHit(foeEf, foeSwing, em1); // First minion struck -> fires fire pulse!
  const pulse1Lost = 1000 - foeEf.life;
  rtEf.resolveHit(foeEf, foeSwing, em2); // Second minion struck immediately -> shared ICD blocks second pulse!
  const pulse2Blocked = near(1000 - foeEf.life, pulse1Lost, 0.01);
  wEf.time += 0.65;
  rtEf.resolveHit(foeEf, foeSwing, em2); // After shared 0.6s ICD -> pulse fires again!
  const pulse3Fired = (1000 - foeEf.life) > pulse1Lost * 1.8;
  check('Ember-Fed Rupture pulses minion-scaled fire when any minion is struck on one shared 0.6s ICD across all minions',
    pulse1Lost > 30 && pulse2Blocked && pulse3Fired,
    `pulse1=${pulse1Lost.toFixed(1)}, blockedImmediate=${pulse2Blocked}, afterIcdTotal=${(1000 - foeEf.life).toFixed(1)}`);

  // (13) Structural proof of 3-way minion-fire separation + Kindled Bones adjacency to Brazier-Born Host & Pyre-Born Covenant
  const kbAdj = A['exp_p8_wis_pyre_covenant_midA'] ?? [];
  check('Three minion-fire clusters stay distinct and Kindled Bones links directly to Brazier-Born Host and Pyre-Born Covenant',
    N['exp_wis_ashen_flock_mid'].name === 'Fiery Arrival' &&
    N['exp_p8_wis_pyre_covenant_midA'].name === 'Kindled Bones' &&
    kbAdj.includes('exp_p8_wis_pyre_covenant_midB') &&
    kbAdj.includes('exp_p8_wis_pyre_covenant_tail') &&
    !N['exp_p8_wis_pyre_covenant_tail'].mods!.some(m => m.stat === 'minionMissingLifeFire') &&
    N['exp_p9_wis_kindled_martyr_a'].name === 'Ash-Swollen Flock' &&
    N['exp_p9_wis_kindled_martyr_a'].mods!.length === 1 &&
    N['exp_p9_wis_kindled_martyr'].name === 'Ember-Fed Rupture' &&
    N['exp_p9_wis_kindled_martyr'].kind === 'notable' &&
    N['exp_p9_wis_kindled_martyr_tail'].name === 'Funeral Pyre Bridge');
}

// 3o. Passes 10–12 Live Combat Engine Proofs (Spliced Grafts, Elemental Arsenal, Class Masteries)
{
  const paid = { paidCost: { life: 0, mana: 10, endurance: 0, insight: 0 } };

  // (1) Pass 10 STR — Hemorrhagic Severance (bleedCullThreshold + bleedNonBleedLess)
  {
    const w = makeSimWorld('warrior', 4401), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p10_str_marrow_cull_tail'); // Crimson Severance: 24% bleed cull, 35% less vs non-bleeding
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('apply_bleed', 'override', 0)]);
    const f1 = w.createMonster('zombie', 1, 'enemy'), f2 = w.createMonster('zombie', 1, 'enemy');
    f1.brain = undefined; f2.brain = undefined;
    f1.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    f2.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    f1.life = 1000; f2.life = 220; // 22% < 24% threshold
    f2.applyStatus('bleed', 1, 1, 'probe');
    w.actors.push(f1, f2);
    const hit = makeSkillInstance({ ...SKILLS.cleave, id: 'p10_cull', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    const baseRoll = rollSkillDamage(p, hit).amounts.physical ?? 100;
    rt.resolveHit(p, hit, f1); // non-bleeding -> 35% less!
    rt.resolveHit(p, hit, f2); // bleeding <= 24% -> instant cull!
    check('Pass 10 Crimson Severance reduces hit damage vs non-bleeding foes and culls bleeding foes <= 24%',
      near(1000 - f1.life, baseRoll * 0.65, 1.5) && f2.life <= 0, `nonBleedDealt=${(1000 - f1.life).toFixed(1)}, exp=${(baseRoll * 0.65).toFixed(1)}, bleedLife=${f2.life}`);
  }

  // (2) Pass 10 FOR — Shedding Colossus (10 Chitin stacks -> Molt physical shrapnel + 10% max-life heal)
  {
    const w = makeSimWorld('warrior', 4402), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p10_for_chitin_molt_tail');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 500), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0)]);
    p.life = 500;
    const foe = w.createMonster('zombie', 1, 'enemy');
    foe.brain = undefined; foe.pos = { x: p.pos.x + 50, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    foe.life = 1000;
    w.actors.push(foe);
    const poke = makeSkillInstance({ ...SKILLS.cleave, id: 'p10_poke', tags: ['attack', 'melee'], baseDamage: { physical: [60, 60] }, effects: [{ type: 'damage' }] });
    for (let i = 0; i < 9; i++) rt.resolveHit(foe, poke, p);
    const stacksAt9 = p.moltStacks;
    const lifeBeforeMolt = p.life;
    rt.resolveHit(foe, poke, p); // 10th hit -> Molt!
    check('Pass 10 Shedding Colossus hardens 9 Chitin stacks and Molts at 10 for shrapnel + heal',
      stacksAt9 === 9 && p.moltStacks === 0 && (1000 - foe.life) > 50 && p.life > lifeBeforeMolt + 50,
      `stacks9=${stacksAt9}, after=${p.moltStacks}, shrapnel=${(1000 - foe.life).toFixed(1)}, healed=${(p.life - lifeBeforeMolt).toFixed(1)}`);
  }

  // (3) Pass 10 PRW — Chimeric Graft (ailmentCrossSplice + multiAilmentMore)
  {
    const w = makeSimWorld('warrior', 4403), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p10_prw_cross_splice_tail'); // 100% cross-splice + 8% more/ailment
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('damage', 'override', 1)]);
    const foe = w.createMonster('zombie', 1, 'enemy');
    foe.brain = undefined;
    foe.sheet.setSource('rig', [mod('life', 'override', 2000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    foe.life = 2000;
    w.actors.push(foe);
    const inst = makeSkillInstance({ ...SKILLS.cleave, id: 'p10_chimera', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    const baseRoll = rollSkillDamage(p, inst).amounts.physical ?? 100;
    rt.rollStatusProcs(p, inst, foe, 'bleed', new Set<SkillTag>(['attack', 'melee']), [], 0);
    const gotChill = foe.statuses.some(s => s.id === 'chill');
    foe.applyStatus('bleed', 1, 1, 'probe'); foe.applyStatus('poison', 1, 1, 'probe'); // 3 distinct ailments -> +24% more!
    rt.resolveHit(p, inst, foe);
    check('Pass 10 Chimeric Graft cross-splices Bleed->Chill and scales hit damage per distinct ailment',
      gotChill && near(2000 - foe.life, baseRoll * 1.24, 1.5), `gotChill=${gotChill}, dealt=${(2000 - foe.life).toFixed(1)}, exp=${(baseRoll * 1.24).toFixed(1)}`);
  }

  // (4) Pass 10 DEX — Neural Lattice (synapticLinkDmg relays damage across tagged targets)
  {
    const w = makeSimWorld('warrior', 4404), p = w.player, rt = w as unknown as HitRuntime;
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('synapticLinkDmg', 'flat', 0.25)]);
    const f1 = w.createMonster('zombie', 1, 'enemy'), f2 = w.createMonster('zombie', 1, 'enemy');
    f1.brain = undefined; f2.brain = undefined;
    f1.pos = { x: 0, y: 0 }; f2.pos = { x: 100, y: 0 };
    f1.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('lightningRes', 'override', 0), mod('evasion', 'override', 0)]);
    f2.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('lightningRes', 'override', 0), mod('evasion', 'override', 0)]);
    f1.life = 1000; f2.life = 1000;
    w.actors.push(f1, f2);
    const zap = makeSkillInstance({ ...SKILLS.fireball, id: 'p10_syn', tags: ['spell'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(p, zap, f1); // tags f1
    rt.resolveHit(p, zap, f2); // tags f2 and relays 25% of 100 = 25 to f1!
    check('Pass 10 Synaptic Lattice relays hit damage to other tagged targets within 280px',
      near(1000 - f1.life, 125, 1), `f1Lost=${(1000 - f1.life).toFixed(1)}, f2Lost=${(1000 - f2.life).toFixed(1)}`);
  }

  // (5) Pass 10 FIN — Catalytic Venom (statusAmplifyOnCrit boosts active DoT DPS & duration)
  {
    const w = makeSimWorld('warrior', 4405), p = w.player, rt = w as unknown as HitRuntime;
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 1), mod('damage', 'override', 1), mod('statusAmplifyOnCrit', 'flat', 0.25)]);
    const foe = w.createMonster('zombie', 1, 'enemy');
    foe.brain = undefined;
    foe.sheet.setSource('rig', [mod('life', 'override', 2000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    foe.life = 2000;
    foe.applyStatus('poison', 20, 1, 'probe');
    const st = foe.statuses.find(s => s.id === 'poison')!;
    const dps0 = st.dps, rem0 = st.remaining;
    w.actors.push(foe);
    const stab = makeSkillInstance({ ...SKILLS.cleave, id: 'p10_mut', tags: ['attack', 'melee'], baseDamage: { physical: [50, 50] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(p, stab, foe);
    check('Pass 10 Catalytic Venom mutates active damaging ailments on crit (+DPS and +1.2s duration)',
      st.dps > dps0 * 1.15 && st.remaining > rem0 + 1.0, `dps=${dps0.toFixed(1)}->${st.dps.toFixed(1)}, rem=${rem0.toFixed(2)}->${st.remaining.toFixed(2)}`);
  }

  // (6) Pass 10 INT — Polychrome Helix ('prism' gauge + single-type penalty)
  {
    const w = makeSimWorld('warrior', 4406), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p10_int_polychrome_surge_tail');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    const foe = w.createMonster('zombie', 1, 'enemy');
    foe.brain = undefined; foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('fireRes', 'override', 0), mod('coldRes', 'override', 0), mod('lightningRes', 'override', 0)]);
    foe.life = 5000;
    w.actors.push(foe);
    const mono = makeSkillInstance({ ...SKILLS.fireball, id: 'p10_mono', tags: ['spell', 'fire'], baseDamage: { fire: [100, 100] }, effects: [{ type: 'damage' }] });
    const tri = makeSkillInstance({ ...SKILLS.fireball, id: 'p10_tri', tags: ['spell', 'fire', 'cold', 'lightning'], baseDamage: { fire: [34, 34], cold: [33, 33], lightning: [33, 33] }, effects: [{ type: 'damage' }] });
    const d1 = rollSkillDamage(p, mono).amounts.fire ?? 0; // prism=0 -> 30% less!
    rt.resolveHit(p, tri, foe); // deals 3 distinct types -> prism=3!
    const d3 = rollSkillDamage(p, mono).amounts.fire ?? 0; // prism=3 -> +21% more, no penalty!
    check('Pass 10 Polychrome Helix penalizes mono-type and scales strongly with prism gauge',
      p.prismCount === 3 && d3 > d1 * 1.5, `prism=${p.prismCount}, mono=${d1.toFixed(1)}, triBoosted=${d3.toFixed(1)}`);
  }

  // (7) Pass 10 WIL — Relentless Evolution (attritionRamp + attritionFirstPenalty)
  {
    const w = makeSimWorld('warrior', 4407), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p10_wil_abyssal_adaptation_tail');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const foe = w.createMonster('zombie', 1, 'enemy');
    foe.brain = undefined; foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    foe.life = 5000; w.actors.push(foe);
    const bolt = makeSkillInstance({ ...SKILLS.fireball, id: 'p10_att', tags: ['spell'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(p, bolt, foe);
    const hit1 = 5000 - foe.life; // 30% less -> 70
    for (let i = 0; i < 9; i++) rt.resolveHit(p, bolt, foe);
    const before11 = foe.life;
    rt.resolveHit(p, bolt, foe); // 10 stacks -> +35% more -> 135!
    const hit11 = before11 - foe.life;
    check('Pass 10 Relentless Evolution penalizes opening hit and escalates consecutive hits on same foe',
      near(hit1, 70, 1) && near(hit11, 135, 1.5), `hit1=${hit1.toFixed(1)}, hit11=${hit11.toFixed(1)}`);
  }

  // (8) Pass 10 WIS — Grafted Bloodline (minionInheritStatus) & Fission Husk (minionSplitOnLowLife)
  {
    const w = makeSimWorld('necromancer', 4408), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p10_wis_brood_splice');       // 35% inherit
    w.meta.allocated.add('exp_p10_wis_brood_splice_tailB'); // 75% low-life fission
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('apply_poison', 'flat', 0.40), mod('critChance', 'flat', 0.20), mod('minionSplitOnLowLife', 'override', 1)]);
    const skel = w.createMonster('skeleton_warrior', 1, 'player');
    skel.brain = undefined; skel.owner = p; skel.summonInst = makeSkillInstance(SKILLS.summon_skeleton);
    w.bakeMinionOwnerStats(skel, p, skel.summonInst);
    const inheritedPoison = skel.sheet.get('apply_poison');
    skel.sheet.setSource('rig', [mod('life', 'override', 100), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    skel.life = 100;
    const foe = w.createMonster('zombie', 1, 'enemy');
    foe.brain = undefined; foe.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    w.actors.push(skel, foe);
    const beforeCount = w.actors.length;
    const chop = makeSkillInstance({ ...SKILLS.cleave, id: 'p10_fis', tags: ['attack', 'melee'], baseDamage: { physical: [75, 75] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(foe, chop, skel); // drops skel to 25% < 35% -> spawns Fission Husk!
    check('Pass 10 Grafted Lineage inherits owner status/crit to minions and Fission Husk splits below 35% life',
      inheritedPoison >= 0.13 && w.actors.length === beforeCount + 1 && skel.splitDone,
      `inheritedPoison=${inheritedPoison.toFixed(3)}, actors=${beforeCount}->${w.actors.length}`);
  }

  // (9) Pass 11 STR/FOR/PRW — Rolling Monolith, Ossuary Retribution, Beast of the Alembic
  {
    const w = makeSimWorld('warrior', 4409), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p11_str_juggernaut_roll_tail');
    w.meta.allocated.add('exp_p11_for_ossuary_aegis_tail');
    w.meta.allocated.add('exp_p11_prw_alchemical_hyde_tail');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('armor', 'override', 200), mod('blockChance', 'override', 1), mod('blockValue', 'override', 1000)]);
    p.life = p.maxLife() * 0.5;
    const foe = w.createMonster('zombie', 1, 'enemy');
    foe.brain = undefined; foe.pos = { x: p.pos.x + 25, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0), mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    foe.life = 5000; w.actors.push(foe);
    // Rolling Monolith trample on movement
    (w as unknown as { moveActor(a: Actor, dx: number, dy: number, dt: number): void }).moveActor(p, 1, 0, 0.1);
    const trampleDealt = 5000 - foe.life;
    // Ossuary Retribution: block banks Bone-Shield Charge, attack hit unleashes vampiric wave
    const poke = makeSkillInstance({ ...SKILLS.cleave, id: 'p11_blk', tags: ['attack', 'melee'], baseDamage: { physical: [20, 20] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(foe, poke, p);
    const chargesAfterBlock = p.aegisCharges;
    const lifeBeforeWave = p.life;
    rt.resolveHit(p, poke, foe);
    const waveHealed = p.life > lifeBeforeWave;
    // Beast of the Alembic: drinking Flask activates Feral Draught
    const flaskInst = makeSkillInstance({ ...SKILLS.life_flask, id: 'p11_flask', tags: ['flask'] });
    w.executeSkill(p, flaskInst, p.pos, paid);
    check('Pass 11 Rolling Monolith tramples, Ossuary Retribution discharges block cleave + heal, and Flask activates Feral Draught',
      trampleDealt > 30 && chargesAfterBlock === 1 && p.aegisCharges === 0 && waveHealed && p.buffs.has('feral_draught'),
      `trample=${trampleDealt.toFixed(1)}, blkCharges=${chargesAfterBlock}->${p.aegisCharges}, waveHealed=${waveHealed}, beast=${p.buffs.has('feral_draught')}`);
  }

  // (10) Pass 11 FIN/INT/WIS/CHA — Wicker Decoy, Prismatic Pillar Refraction, Channel Effigies, Squall Cloud
  {
    const w = makeSimWorld('sorcerer', 4410), p = w.player;
    p.level = 10;
    w.meta.allocated.add('exp_p11_fin_wicker_decoy');
    w.meta.allocated.add('exp_p11_int_prism_refract_tail'); // +2 prism bolts through construct
    w.meta.allocated.add('exp_p11_wis_effigy_swarm_tail');
    w.meta.allocated.add('exp_p11_cha_tempest_rain');
    w.recalcSeat(w.localSeat);
    p.life = p.maxLife() * 0.5;
    const foe = w.createMonster('zombie', 1, 'enemy');
    foe.brain = undefined; foe.pos = { x: p.pos.x + 120, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 2000), mod('armor', 'override', 0), mod('coldRes', 'override', 0), mod('lightningRes', 'override', 0), mod('chaosRes', 'override', 0)]);
    foe.life = 2000;
    const totem = w.createMonster('zombie', 1, 'player');
    totem.brain = undefined; totem.owner = p; totem.pos = { x: p.pos.x + 25, y: p.pos.y };
    totem.construct = { kind: 'totem', life: 10, maxLife: 10 } as unknown as Actor['construct'];
    w.actors.push(foe, totem);
    // Movement spawns Wicker Decoy + concealment; cold cast spawns Squall Cloud
    const dashInst = makeSkillInstance(SKILLS.dash);
    const coldInst = makeSkillInstance({ ...SKILLS.dash, id: 'p11_cold', tags: ['spell', 'cold'], delivery: { type: 'self' }, effects: [] });
    w.executeSkill(p, dashInst, p.pos, paid);
    w.executeSkill(p, coldInst, p.pos, paid);
    const hasVeil = p.buffs.has('wicker_veil');
    // Spawn a projectile heading straight through our own construct -> refracts into +2 prism bolts!
    const projInst = makeSkillInstance(SKILLS.fireball);
    (w as unknown as { spawnProjectile(a: Actor, i: SkillInstance, pos: { x: number; y: number }, dir: number): void })
      .spawnProjectile(p, projInst, { x: p.pos.x + 18, y: p.pos.y }, 0);
    const projBefore = w.projectiles.length;
    w.update(0.03);
    const refractedCount = w.projectiles.length;
    // Advance 1.6s so Wicker Decoy bursts and Squall Cloud ticks (zapping foe + mending player!)
    const pLifeMid = p.life;
    for (let i = 0; i < 32; i++) w.update(0.05);
    check('Pass 11 Prismatic Pillar refracts projectiles through constructs, Wicker Decoy detonates, and Squall Cloud zaps foes + mends allies',
      hasVeil && refractedCount >= projBefore + 2 && foe.life < 1950 && p.life > pLifeMid,
      `veil=${hasVeil}, proj=${projBefore}->${refractedCount}, foeLost=${(2000 - foe.life).toFixed(1)}, mended=${(p.life - pLifeMid).toFixed(1)}`);
  }

  // (11) Pass 12 STR/FOR/PRW/DEX — Sanguine Reprisal, Vow of Reprisal, Gale-Flurry, Rime-Glass Shatter
  {
    const w = makeSimWorld('warrior', 4411), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p12_str_blood_debt_tail');
    w.meta.allocated.add('exp_p12_for_penance_vow_tail');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('wardGain', 'override', 1), mod('wardDecay', 'override', 0)]);
    p.life = 1000;
    const foe = w.createMonster('zombie', 1, 'enemy');
    foe.brain = undefined; foe.pos = { x: p.pos.x + 40, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 2000), mod('armor', 'override', 0), mod('evasion', 'override', 0), mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    foe.life = 2000; w.actors.push(foe);
    const swing = makeSkillInstance({ ...SKILLS.cleave, id: 'p12_sw', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(p, swing, foe); // marks foe with Penance Vow
    const foeAfterMark = foe.life;
    rt.resolveHit(foe, swing, p); // p takes 100 -> redirects 65% = 65 onto foe!
    const karmaDealt = foeAfterMark - foe.life;
    const pLifeBeforeHeal = p.life;
    rt.resolveHit(p, swing, foe); // melee hit heals 38% of 100 = 38!
    const reprisalHealed = p.life - pLifeBeforeHeal;
    check('Pass 12 Vow of Reprisal redirects taken damage to marked nemesis and Sanguine Reprisal heals 38% of recent 5s damage',
      near(karmaDealt, 65, 2) && near(reprisalHealed, 38, 2),
      `karmaDealt=${karmaDealt.toFixed(1)}, reprisalHealed=${reprisalHealed.toFixed(1)}`);
  }

  // (12) Pass 12 INT/WIL/WIS/CHA — Runic Overcharge, Abyssal Trance, Rupture Seed, Atonement Hymn, Solstice Pendulum
  {
    const w = makeSimWorld('sorcerer', 4412), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p12_int_overload_runes_tail');
    w.meta.allocated.add('exp_p12_wil_abyssal_trance_tail');
    w.meta.allocated.add('exp_p12_wil_rupture_seed');
    w.meta.allocated.add('exp_p12_wis_atonement_hymn_tail');
    w.meta.allocated.add('exp_p12_cha_solstice_pendulum_tail');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('mana', 'override', 500), mod('energyShield', 'override', 200), mod('manaRegen', 'override', 0), mod('manaRegenPct', 'override', 0)]);
    p.mana = 200; p.es = 200;
    const ally = w.createMonster('skeleton_warrior', 1, 'player');
    ally.brain = undefined; ally.owner = p; ally.pos = { x: p.pos.x + 50, y: p.pos.y };
    ally.sheet.setSource('rig', [mod('life', 'override', 500), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0)]);
    ally.life = 200;
    const foe1 = w.createMonster('zombie', 1, 'enemy'), foe2 = w.createMonster('zombie', 1, 'enemy');
    foe1.brain = undefined; foe2.brain = undefined;
    foe1.pos = { x: p.pos.x + 60, y: p.pos.y }; foe2.pos = { x: p.pos.x + 110, y: p.pos.y };
    foe1.sheet.setSource('rig', [mod('life', 'override', 300), mod('fireRes', 'override', 0), mod('chaosRes', 'override', 0), mod('armor', 'override', 0)]);
    foe2.sheet.setSource('rig', [mod('life', 'override', 1000), mod('fireRes', 'override', 0), mod('chaosRes', 'override', 0), mod('armor', 'override', 0)]);
    foe1.life = 300; foe2.life = 1000;
    w.actors.push(ally, foe1, foe2);
    const fireCast = makeSkillInstance({ ...SKILLS.dash, id: 'p12_fire_c', tags: ['spell', 'fire'], delivery: { type: 'self' }, effects: [] });
    const fireSp = makeSkillInstance({ ...SKILLS.fireball, id: 'p12_fire', tags: ['spell', 'fire'], baseDamage: { fire: [100, 100] }, effects: [{ type: 'damage' }] });
    const chaosSp = makeSkillInstance({ ...SKILLS.dash, id: 'p12_chaos', tags: ['spell', 'chaos'], delivery: { type: 'self' }, effects: [] });
    const nonSpell = makeSkillInstance({ ...SKILLS.dash, id: 'p12_melee', tags: ['attack', 'melee'], delivery: { type: 'self' }, effects: [] });
    // 3 Fire spell casts -> Overload Runes = 3 + Lunar Zenith buff!
    w.executeSkill(p, fireCast, p.pos, paid);
    w.executeSkill(p, fireCast, p.pos, paid);
    w.executeSkill(p, fireCast, p.pos, paid);
    const gotLunar = p.buffs.has('lunar_zenith');
    const runesAt3 = p.overloadStacks;
    // Non-spell discharges all 3 Overload Runes -> refunds 24% of 500 = 120 mana!
    const manaBeforeRefund = p.mana;
    w.executeSkill(p, nonSpell, p.pos, paid);
    const runesAfterDischarge = p.overloadStacks;
    const manaRefunded = p.mana - manaBeforeRefund;
    // Chaos spell activates Abyssal Trance -> climbs & drains over 1.2s
    w.executeSkill(p, chaosSp, p.pos, paid);
    for (let i = 0; i < 24; i++) w.update(0.05);
    const tranceClimbed = p.tranceStacks >= 2;
    // Plant Rupture Seed via status apply, then blast foe1 with spell -> Atonement heals ally AND seed pops onto foe2!
    foe1.applyStatus('poison', 15, 1, 'probe');
    rt.rollStatusProcs(p, chaosSp, foe1, 'poison', new Set<SkillTag>(['spell', 'chaos']), [], 0);
    rt.resolveHit(p, fireSp, foe1); // >25% of 300 max life -> detonates seed onto foe2 + heals ally via Atonement!
    check('Pass 12 Runic Overcharge refunds mana, Solstice triggers Lunar Zenith, Abyssal Trance climbs, Rupture Seed pops & spreads DoTs, and Atonement heals minions',
      runesAt3 === 3 && runesAfterDischarge === 0 && manaRefunded >= 115 && gotLunar && tranceClimbed
      && ally.life > 220 && foe2.life < 980 && foe2.statuses.some(s => s.id === 'poison'),
      `runes=${runesAt3}->${runesAfterDischarge}, refund=${manaRefunded.toFixed(1)}, lunar=${gotLunar}, trance=${p.tranceStacks}, allyLife=${ally.life.toFixed(1)}, foe2Lost=${(1000 - foe2.life).toFixed(1)}, foe2Poison=${foe2.statuses.some(s => s.id === 'poison')}`);
  }

  // (13) Pass 12 PRW/DEX/FIN — Gale-Flurry twin strikes, Rime-Glass Shatter crit doubling + splinters, Loaded Bones Fate's Lots
  {
    const w = makeSimWorld('warrior', 4413), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p12_prw_gale_flurry_tail');
    w.meta.allocated.add('exp_p12_dex_rime_shatter_tail');
    w.meta.allocated.add('exp_p12_fin_cast_lots_tail');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0.50)]);
    const f1 = w.createMonster('zombie', 1, 'enemy'), f2 = w.createMonster('zombie', 1, 'enemy');
    f1.brain = undefined; f2.brain = undefined;
    f1.pos = { x: p.pos.x + 40, y: p.pos.y }; f2.pos = { x: p.pos.x + 90, y: p.pos.y };
    f1.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('coldRes', 'override', 0), mod('evasion', 'override', 0)]);
    f2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('coldRes', 'override', 0), mod('evasion', 'override', 0)]);
    f1.life = 5000; f2.life = 5000;
    f1.applyStatus('chill', 0, 1, 'probe');
    w.actors.push(f1, f2);
    // Against Chilled f1, critChance=0.50 with shatterCritMult=1.00 => 100% crit! + splinters cold onto f2 + Gale-Flurry twin follow-up strikes!
    const atk = makeSkillInstance({ ...SKILLS.cleave, id: 'p12_shat', tags: ['attack', 'melee', 'cold'], baseDamage: { cold: [100, 100] }, effects: [{ type: 'damage' }] });
    let maxSingleSwing = 0;
    for (let i = 0; i < 10; i++) {
      w.time += 1.2;
      const before = f1.life;
      rt.resolveHit(p, atk, f1);
      maxSingleSwing = Math.max(maxSingleSwing, before - f1.life);
    }
    const f2Splintered = 5000 - f2.life;
    // Loaded Bones: casting Dash rolls >= 2 simultaneous Fate's Lots boons!
    const dashInst = makeSkillInstance(SKILLS.dash);
    w.executeSkill(p, dashInst, p.pos, paid);
    const fateBoons = ['fate_broadside', 'fate_true_bearing', 'fate_sharpened_edge', 'fate_swift_tide'].filter(b => p.buffs.has(b)).length;
    check('Pass 12 Rime-Glass Shatter guarantees crit & splinters vs Chilled, Gale-Flurry fires twin follow-ups, and Loaded Bones rolls >=2 Fate boons',
      maxSingleSwing > 280 && f2Splintered > 300 && fateBoons >= 2,
      `maxSwing=${maxSingleSwing.toFixed(1)}, f2Splinter=${f2Splintered.toFixed(1)}, fateBoons=${fateBoons}`);
  }

  // (14) Pass 13 STR/FOR/PRW — Oath of Bare Iron material lock, Aegis of Tyranny block->damage, Brimming Frenzy high-vs-low mana
  {
    const w = makeSimWorld('warrior', 4414), p = w.player;
    const hybrid = makeSkillInstance({ ...SKILLS.cleave, id: 'p13_hyb', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100], fire: [100, 100] }, effects: [{ type: 'damage' }] });
    p.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const baseRoll = rollSkillDamage(p, hybrid);
    w.meta.allocated.add('exp_p13_str_mortal_steel'); // materialOnlyMore = 0.32
    w.recalcSeat(w.localSeat);
    const bareRoll = rollSkillDamage(p, hybrid);
    check('Pass 13 Oath of Bare Iron amplifies physical hit damage (+32%) and zeroes non-material hit damage',
      near(bareRoll.amounts.physical ?? 0, (baseRoll.amounts.physical ?? 0) * 1.32, 0.5) && (bareRoll.amounts.fire ?? 0) === 0,
      `phys=${(baseRoll.amounts.physical ?? 0).toFixed(1)}->${(bareRoll.amounts.physical ?? 0).toFixed(1)}, fire=${(bareRoll.amounts.fire ?? 0).toFixed(1)}`);

    const w2 = makeSimWorld('warrior', 4415), p2 = w2.player;
    w2.meta.allocated.add('exp_p13_for_bulwark_reckoning'); // blockToDamage = 0.45
    w2.meta.allocated.add('exp_p13_prw_surplus_frenzy'); // surplusHitMore = 0.28, lowManaHitLess = 0.18
    w2.recalcSeat(w2.localSeat);
    p2.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('blockChance', 'override', 0.60), mod('mana', 'override', 100)]);
    const strike = makeSkillInstance({ ...SKILLS.cleave, id: 'p13_blk', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    p2.mana = 60; // mid band (50..74%): only Aegis of Tyranny (+27%) applies
    const midDmg = rollSkillDamage(p2, strike).amounts.physical ?? 0;
    p2.mana = 90; // >=75%: +28% MORE over midDmg
    const hiDmg = rollSkillDamage(p2, strike).amounts.physical ?? 0;
    p2.mana = 20; // <50%: -18% LESS vs midDmg
    const loDmg = rollSkillDamage(p2, strike).amounts.physical ?? 0;
    check('Pass 13 Aegis of Tyranny scales hit damage from Block Chance and Brimming Frenzy rewards high mana vs penalizing low mana',
      near(midDmg, (baseRoll.amounts.physical ?? 0) * 1.27, 1.0) && near(hiDmg, midDmg * 1.28, 1.0) && near(loDmg, midDmg * 0.82, 1.0),
      `mid=${midDmg.toFixed(1)}, hiMana=${hiDmg.toFixed(1)}, loMana=${loDmg.toFixed(1)}`);
  }

  // (15) Pass 13 FIN/INT/WIL/WIS/CHA — Wraith's Reflex Slipstream dodge, Crystalline Bastion fullEsDR, Twin-Blight dual ailment & multi-DoT, Undying Offering, Covenant of Dawn overheal-to-Ward
  {
    const w = makeSimWorld('warrior', 4416), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p13_fin_phantom_reflex'); // evadeSurgeOnHurt = 0.60
    w.meta.allocated.add('exp_p13_int_purified_shell'); // fullEsDR = 0.22
    w.meta.allocated.add('exp_p13_cha_sacred_oath'); // overhealToWard = 0.50
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [
      mod('life', 'override', 1000), mod('energyShield', 'override', 500), mod('armor', 'override', 0),
      mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('wardGain', 'override', 1), mod('wardDecay', 'override', 0),
    ]);
    p.life = 1000; p.es = 500; p.ward = 0;
    // Overheal past full life -> converts 50% into Ward!
    p.healBy(100);
    const wardFromOverheal = p.ward;
    // Full ES >= 75% takes 22% less hit damage + triggers Slipstream guaranteed dodge on next attack!
    p.ward = 0;
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined;
    foe.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    w.actors.push(foe);
    const atk = makeSkillInstance({ ...SKILLS.cleave, id: 'p13_in', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(foe, atk, p);
    const esLost1 = 500 - p.es; // 100 * (1 - 0.22) = 78
    const hasSlipstream = p.buffs.has('slipstream_surge') && p.slipstreamDodgeLeft > 0;
    const esBefore2 = p.es;
    rt.resolveHit(foe, atk, p); // guaranteed Slipstream dodge!
    const dodgedSecond = near(p.es, esBefore2, 0.01) && p.slipstreamDodgeLeft === 0;
    check('Pass 13 Covenant of Dawn converts overheal to Ward, Crystalline Bastion cuts full-ES damage by 22%, and Wraith\'s Reflex dodges the next attack',
      near(wardFromOverheal, 50, 0.5) && near(esLost1, 78, 1.0) && hasSlipstream && dodgedSecond,
      `overhealWard=${wardFromOverheal.toFixed(1)}, esLost1=${esLost1.toFixed(1)}, slip=${hasSlipstream}, dodged2=${dodgedSecond}`);

    // Twin-Blight dual ailment + Undying Offering kill stack
    const w3 = makeSimWorld('warrior', 4417), p3 = w3.player, rt3 = w3 as unknown as HitRuntime;
    w3.meta.allocated.add('exp_p13_wil_grievous_blight'); // dualAilmentApply = 1
    w3.meta.allocated.add('exp_p13_wil_grievous_blight_tailB'); // ailmentMultiDot = 0.18
    w3.meta.allocated.add('exp_p13_wis_immortal_offering_mid'); // offeringPower = 0.02
    w3.recalcSeat(w3.localSeat);
    const prey = w3.createMonster('zombie', 1, 'enemy'); prey.brain = undefined; prey.life = 500;
    w3.actors.push(prey);
    const spell = makeSkillInstance(SKILLS.fireball);
    prey.applyStatus('burn', 10, 1, 'probe', { casterId: p3.id });
    rt3.rollStatusProcs(p3, spell, prey, 'burn', new Set<SkillTag>(['spell', 'fire']), [], 0);
    const gotDual = prey.statuses.length >= 2 && near(prey.multiDotBonus, 0.18, 1e-4);
    w3.kill(prey, false, p3);
    check('Pass 13 Twin-Blight inflicts a second distinct ailment & stamps multi-DoT vulnerability, and Undying Offering harvests afflicted kill stacks',
      gotDual && p3.offeringStacks === 1,
      `statuses=${prey.statuses.map(s => s.id).join(',')}, multiDot=${prey.multiDotBonus}, offering=${p3.offeringStacks}`);
  }

  // (16) Pass 14 STR/FOR/PRW/DEX/FIN/INT/WIL/WIS/CHA — Fractured Hourglass, Bastion's Reprisal, Static Transferral, Captured Velocity, Opening Gambit, Triune Tempest, Pact of the Scourged, Undying Miasma, Astral Canticle
  {
    // Fractured Hourglass (direDeferral) + Bastion's Reprisal (armorThornsScale)
    const w = makeSimWorld('warrior', 4418), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p14_str_dire_juncture'); // direDeferral = 0.65
    w.meta.allocated.add('exp_p14_for_siege_vanguard'); // armorThornsScale = 0.18
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [
      mod('life', 'override', 1000), mod('armor', 'override', 400), mod('evasion', 'override', 0), mod('blockChance', 'override', 0),
    ]);
    p.life = 1000;
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 50, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    foe.life = 1000; w.actors.push(foe);
    const meleeIn = makeSkillInstance({ ...SKILLS.cleave, id: 'p14_m', tags: ['attack', 'melee'], baseDamage: { fire: [200, 200] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(foe, meleeIn, p);
    const immLost = 1000 - p.life; // 200 * (1 - 0.65) = 70 immediate; 130 * 1.12 = 145.6 deferred!
    const foeRetaliated = 1000 - foe.life; // armor 400 * 0.18 = 72 shockwave!
    check('Pass 14 Fractured Hourglass defers 65% of hit damage with surcharge and Bastion\'s Reprisal fires armor shockwave on melee hit',
      near(immLost, 70, 2.0) && (p.stagger?.amount ?? 0) > 140 && foeRetaliated > 50,
      `immLost=${immLost.toFixed(1)}, staggerPool=${(p.stagger?.amount ?? 0).toFixed(1)}, foeRetal=${foeRetaliated.toFixed(1)}`);

    // Static Transferral charge -> discharge + Captured Velocity + Opening Gambit + Triune Tempest + Astral Canticle + Undying Miasma
    const w2 = makeSimWorld('warrior', 4419), p2 = w2.player, rt2 = w2 as unknown as HitRuntime;
    w2.meta.allocated.add('exp_p14_prw_static_weave_mid'); // staticDischargeMore = 0.09
    w2.meta.allocated.add('exp_p14_dex_chrono_velocity'); // chronoVsSlowMore = 0.20
    w2.meta.allocated.add('exp_p14_fin_duelist_tempo'); // ambushBurstMore = 0.35, ambushLowLifeLess = 0.18
    w2.meta.allocated.add('exp_p14_int_omnitempest'); // omniElemCascade = 18 + 3.2/lvl
    w2.meta.allocated.add('exp_p14_wis_plague_trail'); // plagueWakeDps = 12 + 2.2/lvl
    w2.meta.allocated.add('exp_p14_cha_celestial_choir'); // astralEchoBuff = 0.50
    w2.recalcSeat(w2.localSeat);
    p2.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const t1 = w2.createMonster('zombie', 1, 'enemy'), t2 = w2.createMonster('zombie', 1, 'enemy');
    t1.brain = undefined; t2.brain = undefined;
    t1.pos = { x: p2.pos.x + 40, y: p2.pos.y }; t2.pos = { x: p2.pos.x + 80, y: p2.pos.y };
    t1.sheet.setSource('rig', [mod('life', 'override', 2000), mod('armor', 'override', 0), mod('fireRes', 'override', 0), mod('coldRes', 'override', 0), mod('chaosRes', 'override', 0), mod('evasion', 'override', 0)]);
    t2.sheet.setSource('rig', [mod('life', 'override', 2000), mod('armor', 'override', 0), mod('fireRes', 'override', 0), mod('coldRes', 'override', 0), mod('chaosRes', 'override', 0), mod('evasion', 'override', 0)]);
    t1.life = 2000; t2.life = 2000;
    t1.applyStatus('chill', 0, 1, 'probe');
    w2.actors.push(t1, t2);
    const basicFire = makeSkillInstance({ ...SKILLS.cleave, id: 'p14_bf', cooldown: 0, manaCost: 0, tags: ['attack', 'melee', 'fire'], baseDamage: { fire: [100, 100] }, effects: [{ type: 'damage' }] });
    rt2.resolveHit(p2, basicFire, t1);
    const t1Hit = 2000 - t1.life; // 100 * 1.20 (Captured Velocity) * 1.35 (Opening Gambit) + Cold Cascade!
    const t2Cascaded = 2000 - t2.life; // Triune Tempest Fire -> Cold burst hit bystander t2!
    const bankedStatic = p2.staticCharges;
    const spender = makeSkillInstance({ ...SKILLS.fireball, id: 'p14_sp', cooldown: 3, manaCost: 12, tags: ['spell', 'fire'] });
    w2.executeSkill(p2, spender, p2.pos, { paidCost: { life: 0, mana: 12 } });
    const dischargedBuff = p2.buffs.has('static_discharge') && p2.staticCharges === 0;
    // Astral Canticle extends buffs & pulses Ward on Song/Warcry cast
    const prevRem = p2.buffs.get('static_discharge')?.remaining ?? 0;
    const songSkill = makeSkillInstance({ ...SKILLS.cleave, id: 'p14_song', tags: ['song'], effects: [] });
    p2.ward = 0;
    w2.executeSkill(p2, songSkill, p2.pos, paid);
    const extendedOk = (p2.buffs.get('static_discharge')?.remaining ?? 0) > prevRem + 1.0 && p2.ward > 10 && p2.buffs.has('astral_cadence');
    // Undying Miasma pulses while moving
    const t2BeforeMove = t2.life;
    p2.vel = { x: 100, y: 0 };
    w2.update(0.8);
    const miasmaHit = t2.life < t2BeforeMove && t2.statuses.some(s => s.id === 'poison');
    check('Pass 14 Static Transferral, Captured Velocity, Opening Gambit, Triune Tempest, Astral Canticle & Undying Miasma all fire live',
      t1Hit > 160 && t2Cascaded > 15 && bankedStatic === 1 && dischargedBuff && extendedOk && miasmaHit,
      `t1Hit=${t1Hit.toFixed(1)}, cascade=${t2Cascaded.toFixed(1)}, static=${bankedStatic}->${dischargedBuff}, astral=${extendedOk}, miasma=${miasmaHit}`);

    // Pact of the Scourged (fatalPactPower): self-ailments amplify damage & 3+ purge in chaos nova
    const w3 = makeSimWorld('warrior', 4420), p3 = w3.player, rt3 = w3 as unknown as HitRuntime;
    w3.meta.allocated.add('exp_p14_wil_fatal_pact'); // fatalPactPower = 0.10
    w3.recalcSeat(w3.localSeat);
    p3.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const bolt = makeSkillInstance({ ...SKILLS.fireball, id: 'p14_fp', tags: ['spell', 'chaos'], baseDamage: { chaos: [100, 100] }, effects: [{ type: 'damage' }] });
    const fp0 = rollSkillDamage(p3, bolt).amounts.chaos ?? 0;
    p3.applyStatus('burn', 1, 1, 'self');
    p3.applyStatus('bleed', 1, 1, 'self');
    const fp2 = rollSkillDamage(p3, bolt).amounts.chaos ?? 0; // 2 self-ailments -> +20% MORE
    const nearby = w3.createMonster('zombie', 1, 'enemy'); nearby.brain = undefined; nearby.pos = { x: p3.pos.x + 60, y: p3.pos.y };
    nearby.sheet.setSource('rig', [mod('life', 'override', 1000), mod('chaosRes', 'override', 0)]); nearby.life = 1000;
    w3.actors.push(nearby);
    // Repeated status procs mirror a 3rd ailment (poison) and purge all 3 into a chaos nova hitting `nearby`!
    for (let k = 0; k < 25 && nearby.life === 1000; k++) {
      rt3.rollStatusProcs(p3, bolt, nearby, 'poison', new Set<SkillTag>(['spell', 'chaos']), [], 0);
    }
    check('Pass 14 Pact of the Scourged scales hit damage per self-ailment (+20% at 2) and purges 3+ into a chaos nova',
      near(fp2, fp0 * 1.20, 0.5) && nearby.life < 980,
      `fp0=${fp0.toFixed(1)}->fp2=${fp2.toFixed(1)}, nearbyLost=${(1000 - nearby.life).toFixed(1)}`);
  }
}

// 4. Pillar 2 Reworked Powers spot verification
{
  check('Keeper\'s Echo grants minion sustain & healed rally (no longer tiny thorns)',
    N['weave_commander_keeper_echo'].mods!.some(m => m.stat === 'minionRegenPct') &&
    N['weave_commander_keeper_echo'].mods!.some(m => m.stat === 'minionDamage' && m.when === 'recentlyHealed') &&
    !N['weave_commander_keeper_echo'].mods!.some(m => m.stat === 'thorns'));
  check('Drawn Bow of Bone, Mass Behind the Shield and Trample the Weeds carry honest magnitudes',
    near(N['route_str_school_graft_trebuchet_arm'].mods![0].value, 4) &&
    near(N['route_str_accent_weight_guard'].mods![0].value, 0.12) &&
    near(N['weave_explorer_trample_weeds'].mods![0].value, 1.5));
  const summonCountNodes = expNodes.filter(n => n.mods?.some(m => m.stat === 'summonCount'));
  const minionBloomNodes = expNodes.filter(n => n.mods?.some(m => m.stat === 'minionBloom'));
  check('Pass 6 Corpse-Sacrifice & summonCount parity: Sacrificial Harvest leads its wheel cleanly, minionBloom stays Gravebloom-unique, and Cascading Muster is the sole +1 summonCount keystone',
    N['exp_wis_grave_bloom'].name === 'Sacrificial Harvest' &&
    N['exp_wis_grave_bloom'].mods!.some(m => m.stat === 'sacrificeMinions') &&
    N['exp_wis_grave_bloom_entry'].mods!.some(m => m.tags?.includes('corpse')) &&
    minionBloomNodes.length === 0 &&
    summonCountNodes.length === 1 &&
    summonCountNodes[0].id === 'exp_p3_wis_swarm_sequence' &&
    summonCountNodes[0].kind === 'keystone' &&
    summonCountNodes[0].mods!.some(m => m.stat === 'manaCost' && m.kind === 'more' && m.value > 0) &&
    !N['exp_p3_dex_firing_line_mid'].mods!.some(m => m.stat === 'fireSalvo'));

  // 4b. Pass 15 — Modifiable "Recently" Window, Volatile Offering topology & live combat, Fresh Offering gauge, Defensive Phalanx + Close Formation composability, and anti-overlap engines
  // (1) Modifiable "Recently" Window (Eternal Moment +2.5s vs Fleet Amnesia -1.8s)
  {
    const wR = makeSimWorld('warrior', 4501), pR = wR.player;
    pR.noteRecent('kill'); pR.noteRecent('hurt');
    pR.updateTimers(4.5); pR.refreshConditions();
    const baseKillOff = !pR.sheet.hasCondition('recentlyKilled');
    const baseSafeOn = pR.sheet.hasCondition('notHurtRecently');

    // Eternal Moment (+2.5s -> 6.5s window): at t=5.5s recentlyKilled is STILL ON; at t=6.8s it flips OFF!
    wR.meta.allocated.add('exp_p15_cha_long_memory_tail');
    wR.recalcSeat(wR.localSeat);
    pR.noteRecent('kill');
    pR.updateTimers(5.5); pR.refreshConditions();
    const eternalStillOn = pR.sheet.hasCondition('recentlyKilled') && near(pR.recentWindowFor(), 6.5, 0.01);
    pR.updateTimers(1.3); pR.refreshConditions();
    const eternalExpired = !pR.sheet.hasCondition('recentlyKilled');

    // Fleet Amnesia (-1.8s -> 2.2s window): at t=2.4s notHurtRecently is ALREADY back ON and grants +25% more esRechargeRate!
    wR.meta.allocated.delete('exp_p15_cha_long_memory_tail');
    wR.meta.allocated.add('exp_p15_fin_short_memory_tail');
    wR.recalcSeat(wR.localSeat);
    pR.noteRecent('hurt');
    pR.updateTimers(1.5); pR.refreshConditions();
    const fleetHurtAt15 = !pR.sheet.hasCondition('notHurtRecently');
    const esRateHurt = pR.sheet.get('esRechargeRate');
    pR.updateTimers(0.9); pR.refreshConditions();
    const fleetSafeAt24 = pR.sheet.hasCondition('notHurtRecently');
    const esRateSafe = pR.sheet.get('esRechargeRate');
    check('Pass 15 recentlyWindow: Eternal Moment stretches recency to 6.5s and Fleet Amnesia compresses notHurtRecently to 2.2s',
      baseKillOff && baseSafeOn && eternalStillOn && eternalExpired && fleetHurtAt15 && fleetSafeAt24 && esRateSafe > esRateHurt * 1.2,
      `win=${pR.recentWindowFor().toFixed(2)}, esRate=${esRateHurt.toFixed(3)}->${esRateSafe.toFixed(3)}`);
  }

  // (2) Volatile Offering exact topology + live anchored-immobile & recent-invulnerable combat proof
  {
    const ovLinks = A['exp_wis_grave_bloom_b'] ?? [];
    const voLinks = A['exp_wis_grave_bloom_volatile'] ?? [];
    const boLinks = A['exp_wis_grave_bloom_tailB'] ?? [];
    const shLinks = A['exp_wis_grave_bloom'] ?? [];
    const topoOk = ovLinks.includes('exp_wis_grave_bloom_volatile')
      && voLinks.includes('exp_wis_grave_bloom_b') && voLinks.includes('exp_wis_grave_bloom_tailB')
      && boLinks.length === 1 && boLinks[0] === 'exp_wis_grave_bloom_volatile'
      && !shLinks.includes('exp_wis_grave_bloom_tailB')
      && N['exp_wis_grave_bloom_volatile'].kind === 'keystone'
      && N['exp_wis_grave_bloom_volatile'].name === 'Volatile Offering';

    const wV = makeSimWorld('necromancer', 4502), pV = wV.player, rtV = wV as unknown as HitRuntime & {
      spawnMinion(caster: Actor, inst: SkillInstance, overrides?: unknown): Actor | null;
    };
    wV.meta.allocated.add('exp_wis_grave_bloom_volatile');
    wV.meta.allocated.add('exp_p15_cha_long_memory_tail'); // +2.5s -> 6.5s recent invuln!
    wV.recalcSeat(wV.localSeat);
    const tempInst = makeSkillInstance({
      ...SKILLS.summon_skeleton,
      id: 'probe_temp_skel',
      delivery: { ...(SKILLS.summon_skeleton.delivery as Extract<typeof SKILLS.summon_skeleton.delivery, { type: 'summon' }>), duration: 15, persistent: undefined },
    });
    const mTemp = rtV.spawnMinion(pV, tempInst);
    let combatOk = false;
    if (mTemp) {
      const spawnX = mTemp.pos.x, spawnY = mTemp.pos.y;
      const startLife = mTemp.life;
      const foeV = wV.createMonster('zombie', 1, 'enemy');
      foeV.pos = { x: spawnX + 220, y: spawnY };
      foeV.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
      wV.actors.push(foeV);
      // Step world: anchored temporary minion must NOT move toward foe or owner!
      wV.update(0.4);
      const stayedStill = Math.hypot(mTemp.pos.x - spawnX, mTemp.pos.y - spawnY) < 0.01;
      const invulnHit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_vo_hit', tags: ['attack', 'melee'], baseDamage: { physical: [80, 80] }, effects: [{ type: 'damage' }] });
      rtV.resolveHit(foeV, invulnHit, mTemp);
      const dotWhileInvuln = applyDot(mTemp, 40, 'fire');
      const immuneWhileRecent = near(mTemp.life, startLife, 0.01) && dotWhileInvuln === 0 && mTemp.recentInvulnLeft > 5.5;
      // Advance past 6.5s recentlyWindow -> invuln expires, still immobile, now takes damage!
      mTemp.updateTimers(6.6);
      rtV.resolveHit(foeV, invulnHit, mTemp);
      const damagedAfter = mTemp.life < startLife - 10 && mTemp.anchoredImmobile;
      combatOk = mTemp.anchoredImmobile && stayedStill && immuneWhileRecent && damagedAfter;
    }
    check('Volatile Offering sits behind Offering Vessels leading to Beckoned Offering, and anchors temporary minions immobile & invulnerable for recentlyWindow',
      topoOk && combatOk, `topo=${topoOk}, combat=${combatOk}`);
  }

  // (3) Fresh Offering + Lingering Dirge + Necrotic Dynamo (recentMinionDeaths gauge scaled by recentlyWindow)
  {
    const wF = makeSimWorld('necromancer', 4503), pF = wF.player;
    wF.meta.allocated.add('exp_wis_death_bridge_a');       // Fresh Offering: +2% minionDamage / recent minion death
    wF.meta.allocated.add('exp_wis_death_bridge_tailA');   // Lingering Dirge: +0.8s recentlyWindow, +1.5% castSpeed, +2% manaRegen / death
    wF.meta.allocated.add('exp_p5_wis_death_spell_tailB'); // Necrotic Dynamo: +2.5% more spell dmg / death
    wF.recalcSeat(wF.localSeat);
    const md0 = pF.sheet.get('minionDamage');
    const cs0 = pF.sheet.get('castSpeed');
    const sp0 = pF.sheet.get('damage', new Set<SkillTag>(['spell']));
    for (let i = 0; i < 3; i++) {
      const sk = wF.createMonster('zombie', 1, 'player', pF);
      sk.brain = undefined;
      wF.actors.push(sk);
      wF.kill(sk, false);
    }
    const md3 = pF.sheet.get('minionDamage');
    const cs3 = pF.sheet.get('castSpeed');
    const sp3 = pF.sheet.get('damage', new Set<SkillTag>(['spell']));
    // Window is 4.8s (Lingering Dirge +0.8s): at 4.3s still 3 deaths; at 5.0s decays to 0!
    pF.updateTimers(4.3); pF.refreshConditions();
    const stillHeldAt43 = pF.recentMinionDeaths === 3;
    pF.updateTimers(0.7); pF.refreshConditions();
    const decayedAt50 = pF.recentMinionDeaths === 0 && near(pF.sheet.get('minionDamage'), md0);
    check('Fresh Offering, Lingering Dirge, and Necrotic Dynamo scale off live recentMinionDeaths gauge and expire on recentlyWindow',
      near(md3 - md0, 0.06, 0.005) && near(cs3 - cs0, 0.045, 0.005) && sp3 > sp0 * 1.07 && stillHeldAt43 && decayedAt50,
      `md=${md0.toFixed(3)}->${md3.toFixed(3)}, cs=${cs0.toFixed(3)}->${cs3.toFixed(3)}, sp=${sp0.toFixed(3)}->${sp3.toFixed(3)}`);
  }

  // (4) Defensive Phalanx (minionSquad) + Close Formation (minionGuard) true composability + Sanctified Arrival (summonWard)
  {
    const wSq = makeSimWorld('necromancer', 4504), pSq = wSq.player, rtSq = wSq as unknown as HitRuntime & {
      spawnMinion(caster: Actor, inst: SkillInstance, overrides?: unknown): Actor | null;
    };
    wSq.meta.allocated.add('exp_wis_undying_guard_tailA'); // Defensive Phalanx (minionSquad)
    wSq.meta.allocated.add('exp_wis_undying_guard_tailB'); // Sanctified Arrival (summonWard)
    wSq.recalcSeat(wSq.localSeat);
    pSq.ward = 0;
    const skInst = makeSkillInstance(SKILLS.summon_skeleton);
    pSq.skills[0] = skInst;
    const m1 = rtSq.spawnMinion(pSq, skInst, { pos: { x: 100, y: 100 } });
    const m2 = rtSq.spawnMinion(pSq, skInst, { pos: { x: 140, y: 100 } });
    const m3 = rtSq.spawnMinion(pSq, skInst, { pos: { x: 120, y: 130 } });
    const wardGranted = pSq.ward > 5 && (m1?.ward ?? 0) > 5;
    if (m1 && m2 && m3) {
      m1.brain = undefined; m2.brain = undefined; m3.brain = undefined;
      m1.ward = 0; m1.plies = 0; m1.pliesMax = 0;
      m1.sheet.setSource('rig', [mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
      m1.life = 1000;
      wSq.update(0.05);
      const squadOnlyFlags = m1.squadMode && !m1.guardMode && m1.squadAllies === 2;
      const foeSq = wSq.createMonster('zombie', 1, 'enemy'); foeSq.brain = undefined;
      foeSq.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
      wSq.actors.push(foeSq);
      const hitSq = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_sq_hit', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
      rtSq.resolveHit(foeSq, hitSq, m1);
      const squadOnlyDmg = 1000 - m1.life; // 10% minionDamageTaken (Sanctified Arrival) * (1 - 0.06 squad DR) = ~84.6
      // Now ALSO allocate Close Formation (minionGuard + 12% less minionDamageTaken) — BOTH flags must coexist and stack!
      wSq.meta.allocated.add('weave_commander_close_formation');
      wSq.recalcSeat(wSq.localSeat);
      wSq.bakeMinionOwnerStats(m1, pSq, skInst);
      m1.life = 1000; m1.ward = 0; m1.plies = 0; m1.pliesMax = 0;
      wSq.update(0.05);
      const bothFlags = m1.squadMode && m1.guardMode && m1.squadAllies === 2;
      rtSq.resolveHit(foeSq, hitSq, m1);
      const bothDmg = 1000 - m1.life;
      check('Defensive Phalanx (minionSquad) and Close Formation (minionGuard) compose cleanly with zero overwrite, and Sanctified Arrival grants Ward on summon',
        wardGranted && squadOnlyFlags && bothFlags && squadOnlyDmg < 86 && bothDmg < squadOnlyDmg - 5,
        `ward=${pSq.ward.toFixed(1)}, allies=${m1.squadAllies}, squadOnly=${squadOnlyDmg.toFixed(1)}, both=${bothDmg.toFixed(1)}`);
    } else {
      check('Defensive Phalanx (minionSquad) and Close Formation (minionGuard) compose cleanly with zero overwrite, and Sanctified Arrival grants Ward on summon', false, 'failed to spawn test skeletons');
    }
  }

  // (5) Soul Battery + Covenant of Recovery (lifeRegenToEs > 100% composability), Living Current (fieldCarryMore), Loaded Tempest (highRollShockChain), Wrist-Bound Fount (flaskBlockCharge)
  {
    // lifeRegenToEs > 100%
    const wEs = makeSimWorld('sorcerer', 4505), pEs = wEs.player;
    wEs.meta.allocated.add('sum_es1'); // 100% lifeRegenToEs
    wEs.recalcSeat(wEs.localSeat);
    pEs.sheet.setSource('rig', [mod('life', 'override', 1000), mod('lifeRegen', 'override', 100), mod('lifeRegenPct', 'override', 0), mod('energyShield', 'override', 1000), mod('esRechargeRate', 'override', 0)]);
    pEs.life = 500; pEs.es = 0; pEs.esDelay = 10;
    pEs.updateTimers(1.0);
    const esSolo = pEs.es;
    wEs.meta.allocated.add('exp_for_zeal_oath'); // +50% lifeRegenToEs -> 150% total!
    wEs.recalcSeat(wEs.localSeat);
    pEs.life = 500; pEs.es = 0; pEs.esDelay = 10;
    pEs.updateTimers(1.0);
    const esCombo = pEs.es;
    check('Soul Battery + Covenant of Recovery compose past 100% lifeRegenToEs (150% ES regen trickle instead of silent 100% clamp)',
      near(esSolo, 100, 1) && near(esCombo, 150, 1) && near(pEs.life, 500, 1),
      `solo=${esSolo.toFixed(1)}, combo=${esCombo.toFixed(1)}`);

    // Loaded Tempest (highRollShockChain)
    const wLt = makeSimWorld('sorcerer', 4506), pLt = wLt.player, rtLt = wLt as unknown as HitRuntime;
    wLt.meta.allocated.add('exp_int_tempest_dice');
    wLt.recalcSeat(wLt.localSeat);
    pLt.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    const lt1 = wLt.createMonster('zombie', 1, 'enemy'); lt1.brain = undefined; lt1.pos = { x: 100, y: 100 }; lt1.sheet.setSource('rig', [mod('life', 'override', 5000), mod('lightningRes', 'override', 0)]); lt1.life = 5000;
    const lt2 = wLt.createMonster('zombie', 1, 'enemy'); lt2.brain = undefined; lt2.pos = { x: 200, y: 100 }; lt2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('lightningRes', 'override', 0)]); lt2.life = 5000;
    wLt.actors.push(lt1, lt2);
    const ltHit = makeSkillInstance({ ...SKILLS.fireball, id: 'probe_lt', tags: ['spell', 'lightning'], baseDamage: { lightning: [10, 100] }, effects: [{ type: 'damage' }] });
    seedGlobalRandom(4506);
    for (let i = 0; i < 20 && lt2.life === 5000; i++) {
      wLt.time += 0.5;
      rtLt.resolveHit(pLt, ltHit, lt1);
    }
    check('Loaded Tempest high-roll hits shock and chain lightning to a nearby enemy',
      lt2.life < 5000 && lt2.statuses.some(s => s.id === 'shock'), `lt2Life=${lt2.life.toFixed(1)}`);

    // Wrist-Bound Fount (flaskBlockCharge)
    const wFb = makeSimWorld('warrior', 4507), pFb = wFb.player, rtFb = wFb as unknown as HitRuntime;
    wFb.meta.allocated.add('exp_p3_for_primed_fount');
    wFb.recalcSeat(wFb.localSeat);
    const flaskDef = Object.values(SKILLS).find(s => s.tags.includes('flask') && s.chargeCost)!;
    const flaskInst = makeSkillInstance(flaskDef);
    pFb.skills[0] = flaskInst;
    const fCharge = flaskDef.chargeCost!.charge;
    pFb.charges.set(fCharge, 0);
    pFb.sheet.setSource('rig', [mod('blockChance', 'override', 1), mod('blockValue', 'override', 500), mod('evasion', 'override', 0), mod('flaskBlockCharge', 'flat', 1)]);
    const fbAttacker = wFb.createMonster('zombie', 1, 'enemy'); fbAttacker.brain = undefined;
    fbAttacker.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    wFb.actors.push(fbAttacker);
    const fbHit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_fb', tags: ['attack', 'melee'], baseDamage: { physical: [20, 20] }, effects: [{ type: 'damage' }] });
    rtFb.resolveHit(fbAttacker, fbHit, pFb);
    check('Wrist-Bound Fount restores +1 flask charge when blocking a hit',
      (pFb.charges.get(fCharge) ?? 0) === 1, `charges=${pFb.charges.get(fCharge) ?? 0}`);

    // Living Current (fieldCarryMore)
    const wLc = makeSimWorld('sorcerer', 4508), pLc = wLc.player;
    wLc.meta.allocated.add('exp_cha_conduction');
    wLc.recalcSeat(wLc.localSeat);
    check('Living Current grants +22% fieldCarryMore without duplicating Conduction or Suffusion booleans',
      near(pLc.sheet.get('fieldCarryMore'), 0.22) && pLc.sheet.get('conduction') === 0 && pLc.sheet.get('suffusion') === 0 && near(pLc.recentWindowFor(), 4.5, 0.01));
  }
}

// 3r. Passes 16–17 Live Combat Engine Proofs (Wolcen Gate of Fates Deep-Dive — all 18 mechanics)
{
  const paid = { paidCost: { life: 0, mana: 10, endurance: 0, insight: 0 } };

  // (1) Pass 16 STR — Virtuose Stance (movement skill toggles Probing Weakness <-> Stalwart Resolve, full composability)
  {
    const w = makeSimWorld('warrior', 4601), p = w.player;
    w.meta.allocated.add('exp_p16_str_virtuose_stance');
    w.meta.allocated.add('exp_p16_str_virtuose_stance_tailA'); // +0.35
    w.meta.allocated.add('exp_p16_str_virtuose_stance_tailB'); // +0.30 -> 1.65 total!
    w.recalcSeat(w.localSeat);
    const fullStack = near(p.sheet.get('virtuoseStance'), 1.65, 0.01);
    const dash = makeSkillInstance(SKILLS.dash);
    w.time = 10;
    w.executeSkill(p, dash, p.pos, paid); // toggles from 'probing' -> 'stalwart'
    const inStalwart = p.virtuoseMode === 'stalwart' && p.buffs.has('virtuose_stalwart') && !p.buffs.has('virtuose_probing');
    w.time += 0.6;
    w.executeSkill(p, dash, p.pos, paid); // toggles back to 'probing'
    const inProbing = p.virtuoseMode === 'probing' && p.buffs.has('virtuose_probing') && !p.buffs.has('virtuose_stalwart');
    check('Pass 16 Virtuose Stance composes both tails without clamp and toggles Probing Weakness <-> Stalwart Resolve on movement skills',
      fullStack && inStalwart && inProbing, `val=${p.sheet.get('virtuoseStance').toFixed(2)}, stalwart=${inStalwart}, probing=${inProbing}`);
  }

  // (2) Pass 16 PRW — Pugilist's Cadence (4th hit triggers melee AoE shockwave / spell mana rebound)
  {
    const w = makeSimWorld('warrior', 4602), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p16_prw_pugilist_cadence');
    w.meta.allocated.add('exp_p16_prw_pugilist_cadence_tailA');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const f1 = w.createMonster('zombie', 1, 'enemy'), f2 = w.createMonster('zombie', 1, 'enemy');
    f1.brain = undefined; f2.brain = undefined;
    f1.pos = { x: 100, y: 0 }; f2.pos = { x: 150, y: 0 };
    f1.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    f2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    f1.life = 5000; f2.life = 5000; w.actors.push(f1, f2);
    const jab = makeSkillInstance({ ...SKILLS.cleave, id: 'p16_jab', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    for (let i = 0; i < 3; i++) { w.time += 0.2; rt.resolveHit(p, jab, f1); }
    const count3 = p.cadenceHits;
    const f2Before4 = f2.life;
    w.time += 0.2;
    rt.resolveHit(p, jab, f1); // 4th hit -> resets to 0 & shocks nearby f2!
    check('Pass 16 Pugilist\'s Cadence banks 3 hits and fires 4th-hit melee AoE shockwave onto nearby foes',
      count3 === 3 && p.cadenceHits === 0 && f2.life < f2Before4 - 40, `count3=${count3}, after=${p.cadenceHits}, splash=${(f2Before4 - f2.life).toFixed(1)}`);
  }

  // (3) Pass 16 FOR — Salvatory Counter (blocking launches immediate weapon-scaled counter-strike + bleed + Endurance)
  {
    const w = makeSimWorld('warrior', 4603), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p16_for_salvatory_counter');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('blockChance', 'flat', 0.6), mod('blockValue', 'override', 1000), mod('evasion', 'override', 0), mod('endurance', 'override', 100)]);
    p.endurance = 20;
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 50, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 2000), mod('armor', 'override', 0), mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    foe.life = 2000; w.actors.push(foe);
    const swing = makeSkillInstance({ ...SKILLS.cleave, id: 'p16_blk', tags: ['attack', 'melee'], baseDamage: { physical: [40, 40] }, effects: [{ type: 'damage' }] });
    w.time = 10;
    let endBeforeBlock = p.endurance;
    for (let i = 0; i < 12 && foe.life === 2000; i++) {
      endBeforeBlock = p.endurance;
      w.time += 0.6;
      rt.resolveHit(foe, swing, p);
    }
    check('Pass 16 Salvatory Counter retaliates on block with weapon-scaled physical hit, Bleed, and Endurance restore',
      foe.life < 2000 - 40 && foe.statuses.some(s => s.id === 'bleed') && p.endurance > endBeforeBlock + 5,
      `counterDmg=${(2000 - foe.life).toFixed(1)}, end=${endBeforeBlock.toFixed(1)}->${p.endurance.toFixed(1)}`);
  }

  // (4) Pass 16 DEX — Blessed Silver (5 loaded rounds boost Projectiles; spent rounds boost Melee; movement reloads)
  {
    const w = makeSimWorld('ranger', 4604), p = w.player;
    w.meta.allocated.add('exp_p16_dex_blessed_silver'); // 8% per round
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const proj = makeSkillInstance({ ...SKILLS.fireball, id: 'p16_shot', tags: ['attack', 'projectile'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    const slash = makeSkillInstance({ ...SKILLS.cleave, id: 'p16_slash', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    p.silverAmmo = 5;
    const projFull = rollSkillDamage(p, proj).amounts.physical ?? 0; // +40%
    const meleeFull = rollSkillDamage(p, slash).amounts.physical ?? 0; // +0%
    p.silverAmmo = 0;
    const projEmpty = rollSkillDamage(p, proj).amounts.physical ?? 0; // +0%
    const meleeEmpty = rollSkillDamage(p, slash).amounts.physical ?? 0; // +40%
    w.executeSkill(p, makeSkillInstance(SKILLS.dash), p.pos, paid);
    check('Pass 16 Blessed Silver scales Projectiles with loaded rounds, Melee with spent rounds, and reloads on movement',
      near(projFull, projEmpty * 1.4, 1) && near(meleeEmpty, meleeFull * 1.4, 1) && p.silverAmmo === 5,
      `proj=${projFull.toFixed(1)}/${projEmpty.toFixed(1)}, melee=${meleeFull.toFixed(1)}/${meleeEmpty.toFixed(1)}, reloaded=${p.silverAmmo}`);
  }

  // (5) Pass 16 FIN — Waltzing Smoke (movement grants Phantom Invisibility; next hit breaks veil for burst + guaranteed crit + bleed/poison)
  {
    const w = makeSimWorld('warrior', 4605), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p16_fin_waltzing_smoke'); // 45% more + guaranteed crit
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('critMulti', 'override', 2), mod('damage', 'override', 1), mod('apply_bleed', 'override', 0), mod('apply_poison', 'override', 0)]);
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined;
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    foe.life = 5000; w.actors.push(foe);
    const stab = makeSkillInstance({ ...SKILLS.cleave, id: 'p16_ambush', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    const baseRoll = rollSkillDamage(p, stab).amounts.physical ?? 100;
    w.time = 10;
    w.executeSkill(p, makeSkillInstance(SKILLS.dash), p.pos, paid);
    const veiled = p.smokeVeilLeft > 0 && p.sheet.get('invisible') >= 1;
    p.smokeCastSeq++;
    rt.resolveHit(p, stab, foe); // baseRoll * 1.45 * 2 (guaranteed crit) * stealth ambush + bleed & poison!
    check('Pass 16 Waltzing Smoke cloaks on movement and breaks veil on next hit for burst crit + Bleed and Poison',
      veiled && p.smokeVeilLeft === 0 && (5000 - foe.life) >= baseRoll * 1.45 * 2 - 2 && foe.statuses.some(s => s.id === 'bleed') && foe.statuses.some(s => s.id === 'poison'),
      `veiled=${veiled}, base=${baseRoll.toFixed(1)}, dealt=${(5000 - foe.life).toFixed(1)}`);
  }

  // (6) Pass 16 INT — Elementary Destabilization (casting below 35% Mana blasts Life+ES tri-elemental cataclysm & rebounds Mana)
  {
    const w = makeSimWorld('sorcerer', 4606), p = w.player;
    p.level = 10;
    w.meta.allocated.add('exp_p16_int_elem_destabilization');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('life', 'override', 400), mod('energyShield', 'override', 400), mod('mana', 'override', 200)]);
    p.mana = 40; // 20% < 35%
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 60, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('fireRes', 'override', 0), mod('coldRes', 'override', 0), mod('lightningRes', 'override', 0)]);
    foe.life = 5000; w.actors.push(foe);
    w.time = 10;
    w.executeSkill(p, makeSkillInstance(SKILLS.dash), foe.pos, paid);
    check('Pass 16 Elementary Destabilization unleashes tri-elemental blast below 35% Mana, applies all 3 ailments, and rebounds Mana',
      foe.life < 5000 - 100 && foe.statuses.some(s => s.id === 'burn') && foe.statuses.some(s => s.id === 'chill') && foe.statuses.some(s => s.id === 'shock') && p.mana >= 75,
      `dmg=${(5000 - foe.life).toFixed(1)}, manaAfter=${p.mana.toFixed(1)}`);
  }

  // (7) Pass 16 WIL — Occult Escalation (scales hit AND DoT damage per total active ailment stack, cap 20)
  {
    const w = makeSimWorld('sorcerer', 4607), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p16_wil_occult_escalation'); // 2.2% per stack
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined;
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('chaosRes', 'override', 0), mod('evasion', 'override', 0)]);
    foe.life = 5000; w.actors.push(foe);
    foe.applyStatus('poison', 10, 1, 'probe', { stacksBonus: 10 });
    const st = foe.statuses.find(s => s.id === 'poison')!; st.stacks = 10; // 10 stacks -> +22% more!
    const bolt = makeSkillInstance({ ...SKILLS.fireball, id: 'p16_occ', tags: ['spell'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    rt.rollStatusProcs(p, bolt, foe, 'poison', new Set<SkillTag>(['spell']), [], 0);
    rt.resolveHit(p, bolt, foe);
    const hitDealt = 5000 - foe.life;
    const dotLanded = applyDot(foe, 100, 'chaos');
    check('Pass 16 Occult Escalation scales hit damage (+22% at 10 stacks) and DoT damage per total active ailment stack',
      near(hitDealt, 122, 1.5) && dotLanded > 110, `hit=${hitDealt.toFixed(1)}, dot=${dotLanded.toFixed(1)}`);
  }

  // (8) Pass 16 WIS — Undertaker's Harvest (deaths spawn Bile Globes harvested on proximity for heal + stacking MORE damage)
  {
    const w = makeSimWorld('necromancer', 4608), p = w.player;
    w.meta.allocated.add('exp_p16_wis_undertaker_harvest'); // 6% more per stack
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('life', 'override', 1000)]);
    p.life = 700;
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 40, y: p.pos.y };
    w.actors.push(foe);
    const baseHit = makeSkillInstance({ ...SKILLS.fireball, id: 'p16_ut', tags: ['spell'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    const dmg0 = rollSkillDamage(p, baseHit).amounts.physical ?? 0;
    w.kill(foe, false, p); // drops Bile Globe within 110px!
    w.update(0.05); // harvests globe!
    const dmg1 = rollSkillDamage(p, baseHit).amounts.physical ?? 0;
    check('Pass 16 Undertaker\'s Harvest drops a Bile Globe on kill that heals and grants stacking MORE damage on pickup',
      p.harvestStacks === 1 && p.life > 720 && near(dmg1, dmg0 * 1.06, 1),
      `stacks=${p.harvestStacks}, life=${p.life.toFixed(1)}, dmg=${dmg0.toFixed(1)}->${dmg1.toFixed(1)}`);
  }

  // (9) Pass 16 CHA — Beacon for the Lost (>=50% ES empowers Spells; <50% ES empowers Attacks + ES leech)
  {
    const w = makeSimWorld('sorcerer', 4609), p = w.player;
    w.meta.allocated.add('exp_p16_cha_beacon_lost'); // 32% polarity
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1), mod('energyShield', 'override', 200)]);
    const sp = makeSkillInstance({ ...SKILLS.fireball, id: 'p16_bsp', tags: ['spell'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    const atk = makeSkillInstance({ ...SKILLS.cleave, id: 'p16_batk', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    p.es = 150; p.ward = 0; // high shield
    const spHi = rollSkillDamage(p, sp).amounts.physical ?? 0;
    const atkHi = rollSkillDamage(p, atk).amounts.physical ?? 0;
    p.es = 20; p.ward = 0; // low shield
    const spLo = rollSkillDamage(p, sp).amounts.physical ?? 0;
    const atkLo = rollSkillDamage(p, atk).amounts.physical ?? 0;
    check('Pass 16 Beacon for the Lost empowers Spells at >=50% ES and Attacks below 50% ES',
      near(spHi, 132, 1) && near(atkHi, 100, 1) && near(spLo, 100, 1) && near(atkLo, 132, 1),
      `hi=${spHi.toFixed(0)}/${atkHi.toFixed(0)}, lo=${spLo.toFixed(0)}/${atkLo.toFixed(0)}`);
  }

  // (10) Pass 17 STR — Blistering Embrace (hitting >=4 Burn stacks consumes half for Fire Nova & ignites nearby foe)
  {
    const w = makeSimWorld('warrior', 4701), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p17_str_blistering_embrace');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const f1 = w.createMonster('zombie', 1, 'enemy'), f2 = w.createMonster('zombie', 1, 'enemy');
    f1.brain = undefined; f2.brain = undefined; f1.pos = { x: 100, y: 0 }; f2.pos = { x: 170, y: 0 };
    f1.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('fireRes', 'override', 0), mod('evasion', 'override', 0)]);
    f2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('fireRes', 'override', 0), mod('evasion', 'override', 0)]);
    f1.life = 5000; f2.life = 5000; w.actors.push(f1, f2);
    f1.applyStatus('burn', 40, 1, 'probe', { stacksBonus: 6 });
    const bSt = f1.statuses.find(s => s.id === 'burn')!; bSt.stacks = 6;
    const hit = makeSkillInstance({ ...SKILLS.cleave, id: 'p17_burn', tags: ['attack', 'melee'], baseDamage: { physical: [50, 50] }, effects: [{ type: 'damage' }] });
    w.time = 10;
    rt.resolveHit(p, hit, f1); // consumes 3 of 6 stacks -> blasts f1 & f2 + burns f2!
    check('Pass 17 Blistering Embrace consumes half of >=4 Burn stacks to detonate a Fire Nova and ignite nearby foes',
      bSt.stacks === 3 && f2.life < 5000 - 50 && f2.statuses.some(s => s.id === 'burn'),
      `burnLeft=${bSt.stacks}, splash=${(5000 - f2.life).toFixed(1)}`);
  }

  // (11) Pass 17 PRW — Life's First Movement (Attacks bank Lure of Darkness -> empowers Spells; Spells bank Lure of Light -> empowers Attacks)
  {
    const w = makeSimWorld('warrior', 4702), p = w.player;
    w.meta.allocated.add('exp_p17_prw_lifes_first_movement'); // 0.25 -> 1.35x + cross bonus
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const atk = makeSkillInstance({ ...SKILLS.cleave, id: 'p17_la', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    const sp = makeSkillInstance({ ...SKILLS.fireball, id: 'p17_ls', tags: ['spell'], baseDamage: { fire: [100, 100] }, effects: [{ type: 'damage' }] });
    const spBase = rollSkillDamage(p, sp).amounts.fire ?? 0;
    w.executeSkill(p, atk, p.pos, paid); // banks lureSpell=1
    const bankedSpell = p.lureSpell === 1;
    const spBoosted = rollSkillDamage(p, sp).amounts.fire ?? 0; // consumes lureSpell -> 1.35x!
    check('Pass 17 Life\'s First Movement banks Lure charges on Attack and consumes them to empower Spell damage',
      bankedSpell && p.lureSpell === 0 && near(spBoosted, spBase * 1.35, 1.5),
      `base=${spBase.toFixed(1)}, boosted=${spBoosted.toFixed(1)}`);
  }

  // (12) Pass 17 FOR — Academic Fieldwork (elite/boss kills & every 8th boss hit stack Trophy 0..5 with MORE damage + armor/res buff)
  {
    const w = makeSimWorld('warrior', 4703), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p17_for_academic_fieldwork'); // 8%/stack
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const boss = w.createMonster('zombie', 1, 'enemy'); boss.brain = undefined; boss.rarity = 'rare';
    boss.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    boss.life = 5000; w.actors.push(boss);
    const poke = makeSkillInstance({ ...SKILLS.cleave, id: 'p17_tr', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(p, poke, boss);
    const hit1 = 5000 - boss.life;
    for (let i = 0; i < 7; i++) rt.resolveHit(p, poke, boss); // 8th hit grants Trophy 1!
    const gotBossStack = p.trophyStacks === 1 && p.buffs.has('academic_trophy');
    const before9 = boss.life;
    rt.resolveHit(p, poke, boss); // hit1 * 1.08 vs rare!
    check('Pass 17 Academic Fieldwork banks Trophy stacks on every 8th elite/boss hit, boosting damage and armor/res',
      gotBossStack && near(before9 - boss.life, hit1 * 1.08, 1.5), `stacks=${p.trophyStacks}, hit1=${hit1.toFixed(1)}, hit9=${(before9 - boss.life).toFixed(1)}`);
  }

  // (13) Pass 17 DEX — Wintry Hail (projectiles hitting Chilled foes ricochet cold shards + chill onto nearby foe)
  {
    const w = makeSimWorld('ranger', 4704), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p17_dex_wintry_hail');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const f1 = w.createMonster('zombie', 1, 'enemy'), f2 = w.createMonster('zombie', 1, 'enemy');
    f1.brain = undefined; f2.brain = undefined; f1.pos = { x: 100, y: 0 }; f2.pos = { x: 180, y: 0 };
    f1.sheet.setSource('rig', [mod('life', 'override', 5000), mod('coldRes', 'override', 0), mod('evasion', 'override', 0)]);
    f2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('coldRes', 'override', 0), mod('evasion', 'override', 0)]);
    f1.life = 5000; f2.life = 5000; f1.applyStatus('chill', 0, 1, 'probe');
    w.actors.push(f1, f2);
    const arrow = makeSkillInstance({ ...SKILLS.fireball, id: 'p17_wh', tags: ['attack', 'projectile', 'cold'], baseDamage: { cold: [100, 100] }, effects: [{ type: 'damage' }] });
    w.time = 10;
    rt.resolveHit(p, arrow, f1);
    check('Pass 17 Wintry Hail ricochets cold shards and Chill onto nearby foes when projectiles hit Chilled targets',
      f2.life < 5000 - 40 && f2.statuses.some(s => s.id === 'chill'), `ricochetDmg=${(5000 - f2.life).toFixed(1)}`);
  }

  // (14) Pass 17 FIN — Intravenous Spark (5 crits stack Neural Surge and discharge a chained Lightning Arc + Shock)
  {
    const w = makeSimWorld('warrior', 4705), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p17_fin_intravenous_spark');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 1), mod('damage', 'override', 1)]);
    const f1 = w.createMonster('zombie', 1, 'enemy'), f2 = w.createMonster('zombie', 1, 'enemy');
    f1.brain = undefined; f2.brain = undefined; f1.pos = { x: 100, y: 0 }; f2.pos = { x: 180, y: 0 };
    f1.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('lightningRes', 'override', 0), mod('evasion', 'override', 0)]);
    f2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('lightningRes', 'override', 0), mod('evasion', 'override', 0)]);
    f1.life = 5000; f2.life = 5000; w.actors.push(f1, f2);
    const critHit = makeSkillInstance({ ...SKILLS.cleave, id: 'p17_ns', tags: ['attack', 'melee'], baseDamage: { physical: [50, 50] }, effects: [{ type: 'damage' }] });
    for (let i = 0; i < 12 && p.neuralSurgeStacks < 4; i++) { w.time += 0.25; rt.resolveHit(p, critHit, f1); }
    const at4 = p.neuralSurgeStacks;
    for (let i = 0; i < 8 && p.neuralSurgeStacks > 0; i++) { w.time += 0.25; rt.resolveHit(p, critHit, f1); } // 5th crit -> discharges onto f2 & resets!
    check('Pass 17 Intravenous Spark stacks Neural Surge on crits and discharges a Shocking Lightning Arc at 5 stacks',
      at4 === 4 && p.neuralSurgeStacks === 0 && f2.life < 5000 - 40 && f2.statuses.some(s => s.id === 'shock'),
      `at4=${at4}, after=${p.neuralSurgeStacks}, arcDmg=${(5000 - f2.life).toFixed(1)}`);
  }

  // (15) Pass 17 INT — Residual Energy (Spell imprints its element onto next 2 Attacks; Attack imprints Physical onto next Spell)
  {
    const w = makeSimWorld('sorcerer', 4706), p = w.player;
    w.meta.allocated.add('exp_p17_int_residual_energy'); // 40% imprint
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const fireSp = makeSkillInstance({ ...SKILLS.fireball, id: 'p17_rf', tags: ['spell', 'fire'], baseDamage: { fire: [100, 100] }, effects: [{ type: 'damage' }] });
    const physAtk = makeSkillInstance({ ...SKILLS.cleave, id: 'p17_ra', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    w.executeSkill(p, fireSp, p.pos, paid); // imprints fire x2
    const roll1 = rollSkillDamage(p, physAtk); // +40 fire!
    const roll2 = rollSkillDamage(p, physAtk); // +40 fire!
    const roll3 = rollSkillDamage(p, physAtk); // 0 fire!
    check('Pass 17 Residual Energy imprints a Spell\'s element onto the next 2 Attacks as extra typed damage',
      near(roll1.amounts.fire ?? 0, 40, 1) && near(roll2.amounts.fire ?? 0, 40, 1) && near(roll3.amounts.fire ?? 0, 0, 0.1),
      `fire1=${(roll1.amounts.fire ?? 0).toFixed(1)}, fire2=${(roll2.amounts.fire ?? 0).toFixed(1)}, fire3=${(roll3.amounts.fire ?? 0).toFixed(1)}`);
  }

  // (16) Pass 17 WIL — Essential Measure (inflicting damaging ailment pulses victim-centered chaos & refreshes nearby DoTs)
  {
    const w = makeSimWorld('sorcerer', 4707), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p17_wil_essential_measure');
    w.recalcSeat(w.localSeat);
    const f1 = w.createMonster('zombie', 1, 'enemy'), f2 = w.createMonster('zombie', 1, 'enemy');
    f1.brain = undefined; f2.brain = undefined; f1.pos = { x: 100, y: 0 }; f2.pos = { x: 170, y: 0 };
    f1.sheet.setSource('rig', [mod('life', 'override', 5000), mod('chaosRes', 'override', 0)]);
    f2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('chaosRes', 'override', 0)]);
    f1.life = 5000; f2.life = 5000; f2.applyStatus('poison', 10, 1, 'probe');
    const rem0 = f2.statuses.find(s => s.id === 'poison')!.remaining;
    w.actors.push(f1, f2);
    const inst = makeSkillInstance({ ...SKILLS.fireball, id: 'p17_em', tags: ['spell', 'chaos'], baseDamage: { chaos: [50, 50] }, effects: [{ type: 'damage' }] });
    w.time = 10;
    rt.rollStatusProcs(p, inst, f1, 'poison', new Set<SkillTag>(['spell', 'chaos']), [], 0);
    const rem1 = f2.statuses.find(s => s.id === 'poison')!.remaining;
    check('Pass 17 Essential Measure emits victim-centered chaos pulse on ailment apply and extends nearby foes\' DoTs',
      f2.life < 5000 - 25 && rem1 > rem0 + 0.5, `pulseDmg=${(5000 - f2.life).toFixed(1)}, rem=${rem0.toFixed(2)}->${rem1.toFixed(2)}`);
  }

  // (17) Pass 17 WIS — Dawn Consecration (real heal or Ward lays 4s Consecrated Ground scorching foes & hasting allies)
  {
    const w = makeSimWorld('necromancer', 4708), p = w.player;
    p.level = 10;
    w.meta.allocated.add('exp_p17_wis_dawn_consecration');
    w.recalcSeat(w.localSeat);
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 60, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('fireRes', 'override', 0)]);
    foe.life = 1500; // 30% < 40% -> +40% scorch bonus!
    w.actors.push(foe);
    w.time = 10;
    p.gainWard(30); // raises dawnConsecratePending!
    w.update(0.1); // spawns ground & ticks first scorch/haste pulse!
    check('Pass 17 Dawn Consecration spawns Consecrated Ground on Ward/heal that scorches foes and hastes allies',
      foe.life < 1500 - 35 && p.buffs.has('dawn_haste'), `scorch=${(1500 - foe.life).toFixed(1)}, haste=${p.buffs.has('dawn_haste')}`);
  }

  // (18) Pass 17 CHA — Temporal Siphon (hitting impaired foes shaves active cooldowns & extends active buffs)
  {
    const w = makeSimWorld('sorcerer', 4709), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p17_cha_chrono_siphon'); // 0.85 -> 0.2975s CD shave & 0.2125s buff extend
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    p.cooldowns.set('dash', 5.0);
    p.addBuff({ type: 'buff', id: 'probe_cs_buff', duration: 4.0, mods: [mod('moveSpeed', 'increased', 0.1)] });
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined;
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    foe.life = 5000; foe.applyStatus('chill', 0, 1, 'probe');
    w.actors.push(foe);
    const tap = makeSkillInstance({ ...SKILLS.fireball, id: 'p17_cs', tags: ['spell'], baseDamage: { physical: [50, 50] }, effects: [{ type: 'damage' }] });
    w.time = 10;
    rt.resolveHit(p, tap, foe);
    const cdAfter = p.cooldowns.get('dash') ?? 5.0;
    const buffAfter = p.buffs.get('probe_cs_buff')?.remaining ?? 4.0;
    check('Pass 17 Temporal Siphon shaves active cooldowns and extends active buffs when hitting impaired foes',
      cdAfter < 4.75 && buffAfter > 4.18, `cd=5.0->${cdAfter.toFixed(3)}, buff=4.0->${buffAfter.toFixed(3)}`);
  }
}

// 3s. Passes 18–19 Live Combat Engine Proofs (Voidling Bound Perks Deep-Dive — all 18 mechanics)
{
  const exec = (w: ReturnType<typeof makeSimWorld>) =>
    w as unknown as {
      spawnMinion(caster: Actor, inst: SkillInstance, overrides?: unknown): Actor | null;
      lavaPuddles: unknown[];
    };
  const paid = { paidCost: { life: 0, mana: 10, endurance: 0, insight: 0 } };

  // (1) Pass 18 STR — Rime Cocoon (<35% life 2s invulnerable healing ice stasis -> 210px Cold/Stun shatter)
  {
    const w = makeSimWorld('warrior', 4801), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p18_str_cryo_cocoon');
    w.meta.allocated.add('exp_p18_str_cryo_cocoon_tailA'); // 1.40 total!
    w.recalcSeat(w.localSeat);
    const stacked = near(p.sheet.get('cryoCocoonPower'), 1.40, 0.01);
    p.sheet.setSource('rig', [
      mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0),
      mod('blockChance', 'override', 0), mod('lifeRegen', 'override', 0),
    ]);
    p.life = 450; p.ward = 0; p.es = 0;
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 80, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('coldRes', 'override', 0), mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    foe.life = 5000; w.actors.push(foe);
    const blow = makeSkillInstance({ ...SKILLS.cleave, id: 'p18_cryo_in', tags: ['attack', 'melee'], baseDamage: { physical: [200, 200] }, effects: [{ type: 'damage' }] });
    w.time = 10;
    rt.resolveHit(foe, blow, p); // 450 -> 250 <= 350 -> Rime Cocoon triggers!
    const encased = p.cryoCocoonLeft > 1.9 && p.buffs.has('cryo_cocoon') && p.sheet.get('damageImmunity') >= 1;
    const lifeAtTrigger = p.life;
    rt.resolveHit(foe, blow, p); // invulnerable during cocoon!
    const immune = near(p.life, lifeAtTrigger, 0.1);
    for (let i = 0; i < 22; i++) w.update(0.1); // 2.2s -> heals during stasis & shatters onto foe!
    check('Pass 18 Rime Cocoon encases player in 2s invulnerable healing ice below 35% life and shatters to damage, chill & stun foes',
      stacked && encased && immune && p.life > lifeAtTrigger + 100 && foe.life < 5000 - 150 && foe.statuses.some(s => s.id === 'chill') && foe.statuses.some(s => s.id === 'stun'),
      `val=${p.sheet.get('cryoCocoonPower').toFixed(2)}, encased=${encased}, immune=${immune}, life=${lifeAtTrigger.toFixed(0)}->${p.life.toFixed(0)}, shatter=${(5000 - foe.life).toFixed(1)}`);
  }

  // (2) Pass 18 FOR — Lithic Shellburst (<40% life armor-scaled physical shockwave + Endurance refill + Stone Skin)
  {
    const w = makeSimWorld('warrior', 4802), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p18_for_stone_fissure');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [
      mod('life', 'override', 1000), mod('armor', 'override', 600), mod('chaosRes', 'override', 0),
      mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('endurance', 'override', 100),
    ]);
    p.life = 450; p.endurance = 10; p.ward = 0; p.es = 0;
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 80, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    foe.life = 5000; w.actors.push(foe);
    const hit = makeSkillInstance({ ...SKILLS.fireball, id: 'p18_lith_in', tags: ['spell', 'chaos'], baseDamage: { chaos: [200, 200] }, effects: [{ type: 'damage' }] });
    w.time = 10;
    rt.resolveHit(foe, hit, p); // incoming hit spends 10 Endurance & drops life to 250 <= 400 -> erupts & refills 30% max Endurance (=30)!
    check('Pass 18 Lithic Shellburst erupts an armor-scaled shockwave below 40% life, refills Endurance, and grants Stone Skin',
      foe.life < 5000 - 100 && p.endurance >= 29.5 && p.buffs.has('lithic_stone_skin'),
      `erupt=${(5000 - foe.life).toFixed(1)}, end=10->${p.endurance.toFixed(1)}, skin=${p.buffs.has('lithic_stone_skin')}`);
  }

  // (3) Pass 18 PRW — Fueled Momentum (kill & 4th rare/boss hit stack Fueled; casting grants Frenzied Stride)
  {
    const w = makeSimWorld('warrior', 4803), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p18_prw_fueled_frenzy');
    w.meta.allocated.add('exp_p18_prw_fueled_frenzy_a');
    w.meta.allocated.add('exp_p18_prw_fueled_frenzy_tailA'); // 0.065/stack
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    const f1 = w.createMonster('zombie', 1, 'enemy'); f1.brain = undefined; f1.sheet.setSource('rig', [mod('life', 'override', 20), mod('armor', 'override', 0)]); f1.life = 20;
    const boss = w.createMonster('zombie', 1, 'enemy'); boss.brain = undefined; boss.rarity = 'rare'; boss.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0)]); boss.life = 5000;
    w.actors.push(f1, boss);
    const tap = makeSkillInstance({ ...SKILLS.cleave, id: 'p18_fuel', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(p, tap, f1); // lethal kill -> stack 1
    const afterKill = p.fueledStacks;
    for (let i = 0; i < 4; i++) rt.resolveHit(p, tap, boss); // 4th rare hit -> stack 2
    const afterBoss4 = p.fueledStacks;
    w.executeSkill(p, makeSkillInstance(SKILLS.cleave), p.pos, paid);
    check('Pass 18 Fueled Momentum stacks on kills and every 4th rare/boss hit and grants Frenzied Stride on cast',
      afterKill === 1 && afterBoss4 === 2 && p.buffs.has('fueled_momentum') && p.buffs.has('frenzied_stride'),
      `kill=${afterKill}, boss4=${afterBoss4}, fueled=${p.buffs.has('fueled_momentum')}, stride=${p.buffs.has('frenzied_stride')}`);
  }

  // (4) Pass 18 DEX — Windburn Slipstream (moving launches homing Fire+Cold bolts; movement/reload emits Overflow whirlpool)
  {
    const w = makeSimWorld('ranger', 4804), p = w.player;
    p.level = 10;
    w.meta.allocated.add('exp_p18_dex_windburn_gale');
    w.recalcSeat(w.localSeat);
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 110, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('fireRes', 'override', 0), mod('coldRes', 'override', 0)]);
    foe.life = 5000; w.actors.push(foe);
    w.time = 10;
    for (let i = 0; i < 10; i++) {
      p.vel = { x: 120, y: 0 };
      w.update(0.1);
    }
    const boltLanded = foe.life < 5000 - 15 && foe.statuses.some(s => s.id === 'burn') && foe.statuses.some(s => s.id === 'chill');
    const lifeBeforeOverflow = foe.life;
    const distBeforeOverflow = Math.hypot(foe.pos.x - p.pos.x, foe.pos.y - p.pos.y);
    w.executeSkill(p, makeSkillInstance(SKILLS.dash), p.pos, paid); // triggers Overflow whirlpool!
    const distAfterOverflow = Math.hypot(foe.pos.x - p.pos.x, foe.pos.y - p.pos.y);
    check('Pass 18 Windburn Slipstream fires moving Fire+Cold bolts and emits a chilling knockback Overflow whirlpool on movement cast',
      boltLanded && foe.life < lifeBeforeOverflow - 15 && distAfterOverflow > distBeforeOverflow + 30,
      `bolt=${boltLanded}, overflowDmg=${(lifeBeforeOverflow - foe.life).toFixed(1)}, dist=${distBeforeOverflow.toFixed(0)}->${distAfterOverflow.toFixed(0)}`);
  }

  // (5) Pass 18 FIN — Phase Stasis (concealment >=40% emits Phase Dilation; hitting dilated foe triggers Night Bite bleed + heal)
  {
    const w = makeSimWorld('warrior', 4805), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p18_fin_plane_shift');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [
      mod('life', 'override', 1000), mod('concealment', 'flat', 0.50),
      mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('apply_bleed', 'override', 0),
    ]);
    p.life = 500;
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 120, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    foe.life = 5000; w.actors.push(foe);
    w.time = 10;
    w.update(0.05); // concealment >= 0.40 triggers Phase Dilation!
    const dilated = foe.phaseDilatedLeft > 2.0 && foe.statuses.some(s => s.id === 'chill') && foe.buffs.has('phase_dilation');
    const lifeBeforeBite = p.life;
    const stab = makeSkillInstance({ ...SKILLS.cleave, id: 'p18_nb', tags: ['attack', 'melee'], baseDamage: { physical: [80, 80] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(p, stab, foe); // Night Bite: 2 Bleed + 3.5% max life heal!
    const bleedStacks = foe.statuses.find(s => s.id === 'bleed')?.stacks ?? 0;
    check('Pass 18 Phase Stasis emits Phase Dilation at >=40% concealment and triggers Night Bite (2 Bleed + heal) vs dilated foes',
      dilated && bleedStacks >= 2 && p.life > lifeBeforeBite + 25,
      `dilated=${dilated}, bleed=${bleedStacks}, heal=${(p.life - lifeBeforeBite).toFixed(1)}`);
  }

  // (6) Pass 18 INT — Tractor Tethers (0.6s links deal Lightning dmg, pull non-bosses inward, and siphon Mana & ES)
  {
    const w = makeSimWorld('sorcerer', 4806), p = w.player;
    p.level = 10;
    w.meta.allocated.add('exp_p18_int_tractor_beams');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [
      mod('mana', 'override', 200), mod('energyShield', 'override', 200),
      mod('manaRegen', 'override', 0), mod('esRechargeRate', 'override', 0),
    ]);
    p.mana = 50; p.es = 50; p.esDelay = 10;
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 180, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('lightningRes', 'override', 0)]);
    foe.life = 5000; w.actors.push(foe);
    const d0 = Math.hypot(foe.pos.x - p.pos.x, foe.pos.y - p.pos.y);
    for (let i = 0; i < 7; i++) w.update(0.1); // 0.7s >= 0.6s pulse
    const d1 = Math.hypot(foe.pos.x - p.pos.x, foe.pos.y - p.pos.y);
    check('Pass 18 Tractor Tethers damages, pulls non-bosses inward, and siphons Mana & Energy Shield',
      foe.life < 5000 - 10 && d1 < d0 - 12 && p.mana >= 54.5 && p.es >= 54.5,
      `dmg=${(5000 - foe.life).toFixed(1)}, dist=${d0.toFixed(0)}->${d1.toFixed(0)}, mana=${p.mana.toFixed(1)}, es=${p.es.toFixed(1)}`);
  }

  // (7) Pass 18 WIL — Plasma Disintegration (>=4 stacks Deadly Weakness +25%; 6th stack detonates Chaos+Lightning Overflow & shreds Armor/Res)
  {
    const w = makeSimWorld('sorcerer', 4807), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p18_wil_plasma_overflow');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const f1 = w.createMonster('zombie', 1, 'enemy'), f2 = w.createMonster('zombie', 1, 'enemy');
    f1.brain = undefined; f2.brain = undefined;
    f1.pos = { x: 100, y: 0 }; f2.pos = { x: 160, y: 0 };
    f1.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0), mod('chaosRes', 'override', 0), mod('lightningRes', 'override', 0)]);
    f2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0), mod('chaosRes', 'override', 0), mod('lightningRes', 'override', 0)]);
    f1.life = 5000; f2.life = 5000; w.actors.push(f1, f2);
    const bolt = makeSkillInstance({ ...SKILLS.fireball, id: 'p18_pd', tags: ['spell'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    w.time = 10;
    const before1 = f1.life; rt.resolveHit(p, bolt, f1); const dmg1 = before1 - f1.life; // stack 0 -> 1
    for (let i = 0; i < 3; i++) { w.time += 0.25; rt.resolveHit(p, bolt, f1); } // stacks -> 4
    w.time += 0.25;
    const before5 = f1.life; rt.resolveHit(p, bolt, f1); const dmg5 = before5 - f1.life; // >=4 stacks: +25% Deadly Weakness! -> 5
    w.time += 0.25;
    rt.resolveHit(p, bolt, f1); // 6th stack -> resets to 0, shreds Armor/Res, detonates onto f2!
    check('Pass 18 Plasma Disintegration amplifies hits at >=4 stacks and detonates Chaos+Lightning Overflow & shred on the 6th stack',
      near(dmg5, dmg1 * 1.25, 2) && f1.disintStacks === 0 && f1.plasmaShredLeft > 3.5 && f2.life < 5000 - 40,
      `dmg1=${dmg1.toFixed(1)}, dmg5=${dmg5.toFixed(1)}, stacks=${f1.disintStacks}, shred=${f1.plasmaShredLeft.toFixed(1)}, splash=${(5000 - f2.life).toFixed(1)}`);
  }

  // (8) Pass 18 WIS — Spring Bloom (Summon/Cooldown >=3s scatters 2 empowering Bloom Flowers pulsing buff + Life/Mana)
  {
    const w = makeSimWorld('necromancer', 4808), p = w.player;
    w.meta.allocated.add('exp_p18_wis_spring_bloom');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [
      mod('life', 'override', 500), mod('mana', 'override', 200),
      mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0), mod('manaRegen', 'override', 0),
    ]);
    p.life = 250; p.mana = 50;
    w.time = 10;
    w.executeSkill(p, makeSkillInstance(SKILLS.summon_skeleton), p.pos, paid);
    w.update(0.1); // tick <= 0 fires first Bloom Flower pulse!
    check('Pass 18 Spring Bloom scatters empowering Bloom Flowers pulsing vitality buff and Life/Mana recovery',
      p.buffs.has('spring_bloom_vitality') && p.life > 260 && p.mana > 55,
      `buff=${p.buffs.has('spring_bloom_vitality')}, life=250->${p.life.toFixed(1)}, mana=50->${p.mana.toFixed(1)}`);
  }

  // (9) Pass 18 CHA — Living Tides (stationary 2s blooms Healing Roots; untouched movement >=1.5s ramps Soothing Voyage)
  {
    const w = makeSimWorld('sorcerer', 4809), p = w.player;
    w.meta.allocated.add('exp_p18_cha_healing_roots');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [
      mod('life', 'override', 500), mod('mana', 'override', 200), mod('energyShield', 'override', 200),
      mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0), mod('manaRegen', 'override', 0), mod('esRechargeRate', 'override', 0),
    ]);
    p.life = 250; p.mana = 50; p.es = 50; p.esDelay = 10; p.idleFor = 2.5; p.vel = { x: 0, y: 0 };
    for (let i = 0; i < 11; i++) w.update(0.1); // 1.1s >= 1.0s Healing Roots pulse
    const rootedOk = p.buffs.has('healing_roots') && p.life > 265 && p.mana > 55 && p.es > 55;
    p.life = 250; p.idleFor = 0; p.voyageTime = 1.6; p.vel = { x: 120, y: 0 };
    w.update(0.1);
    const voyageOk = p.buffs.has('soothing_voyage') && p.life > 251;
    check('Pass 18 Living Tides alternates between stationary Healing Roots sanctuary and untouched-movement Soothing Voyage healing',
      rootedOk && voyageOk, `rooted=${rootedOk}, voyage=${voyageOk}, voyageLife=${p.life.toFixed(1)}`);
  }

  // (10) Pass 19 STR — Pyroclastic Feast (Burn ticks heal applier + hits spawn Lava Puddles)
  {
    const w = makeSimWorld('warrior', 4810), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p19_str_lava_puddle');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [
      mod('life', 'override', 1000), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0),
      mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0),
    ]);
    p.life = 500;
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 50, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('fireRes', 'override', 0), mod('armor', 'override', 0)]);
    foe.life = 5000; w.actors.push(foe);
    foe.applyStatus('burn', 300, 2, 'probe', { casterId: p.id });
    w.time = 10;
    w.update(0.25); // Burn DoT tick heals p via triggerBurnFeastHeal!
    const healedByBurn = p.life > 505;
    const smash = makeSkillInstance({ ...SKILLS.cleave, id: 'p19_lava', tags: ['attack', 'fire'], baseDamage: { fire: [50, 50] }, effects: [{ type: 'damage' }] });
    seedGlobalRandom(4810);
    for (let i = 0; i < 20 && exec(w).lavaPuddles.length === 0; i++) {
      p.lavaPuddleReadyAt = 0;
      rt.resolveHit(p, smash, foe);
    }
    check('Pass 19 Pyroclastic Feast heals from Burn DoT ticks and spawns molten Lava Puddles on hit',
      healedByBurn && exec(w).lavaPuddles.length > 0, `life=500->${p.life.toFixed(1)}, puddles=${exec(w).lavaPuddles.length}`);
  }

  // (11) Pass 19 FOR — Carapace Integration (Warcry/Guard/CD>=2s banks Block Charges; incoming hit spends charge to cut dmg, grant Ward & reflect)
  {
    const w = makeSimWorld('warrior', 4811), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p19_for_block_integration');
    w.recalcSeat(w.localSeat);
    const cry = makeSkillInstance({ ...SKILLS.cleave, id: 'p19_cry', tags: ['warcry'], cooldown: 4, effects: [] });
    w.time = 10;
    w.executeSkill(p, cry, p.pos, paid);
    const banked = p.blockCharges === 1;
    p.sheet.setSource('rig', [
      mod('life', 'override', 1000), mod('armor', 'override', 0), mod('evasion', 'override', 0),
      mod('blockChance', 'override', 0), mod('wardDecay', 'override', 0),
    ]);
    p.life = 1000; p.ward = 0; p.es = 0;
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 50, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 2000), mod('armor', 'override', 0), mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    foe.life = 2000; w.actors.push(foe);
    const hit = makeSkillInstance({ ...SKILLS.cleave, id: 'p19_bi_in', tags: ['attack', 'melee'], baseDamage: { physical: [200, 200] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(foe, hit, p); // spends 1 block charge -> 35% cut (130), grants 50 Ward which soaks 50 more (only 80 life lost!), reflects 28 onto foe!
    const taken = 1000 - p.life;
    const reflected = 2000 - foe.life;
    // Second test with a small 20-dmg hit confirms leftover Ward survives on pool!
    w.time += 2.5;
    w.executeSkill(p, cry, p.pos, paid);
    const tiny = makeSkillInstance({ ...SKILLS.cleave, id: 'p19_bi_tiny', tags: ['attack', 'melee'], baseDamage: { physical: [20, 20] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(foe, tiny, p); // 20 -> 13 soaked by 50 Ward -> 37 Ward leftover!
    check('Pass 19 Carapace Integration banks Block Charges on warcry/guard casts and spends them on hit to cut damage, grant Ward & reflect',
      banked && p.blockCharges === 0 && taken <= 82 && p.ward >= 35 && reflected >= 25,
      `banked=${banked}, taken=${taken.toFixed(1)}, leftoverWard=${p.ward.toFixed(1)}, reflected=${reflected.toFixed(1)}`);
  }

  // (12) Pass 19 PRW — Critical Detonator (3rd crit detonates 175px Physical+Fire concussive blast stunning non-bosses)
  {
    const w = makeSimWorld('warrior', 4812), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p19_prw_critical_blast');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'flat', 0.95)]);
    const f1 = w.createMonster('zombie', 1, 'enemy'), f2 = w.createMonster('zombie', 1, 'enemy');
    f1.brain = undefined; f2.brain = undefined;
    f1.pos = { x: 100, y: 0 }; f2.pos = { x: 160, y: 0 };
    f1.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('fireRes', 'override', 0), mod('evasion', 'override', 0)]);
    f2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('fireRes', 'override', 0), mod('evasion', 'override', 0)]);
    f1.life = 5000; f2.life = 5000; w.actors.push(f1, f2);
    const strike = makeSkillInstance({ ...SKILLS.cleave, id: 'p19_cb', tags: ['attack', 'melee'], baseDamage: { physical: [80, 80] }, effects: [{ type: 'damage' }] });
    w.time = 10;
    seedGlobalRandom(4812);
    for (let i = 0; i < 10 && f2.life === 5000; i++) {
      w.time += 0.30;
      rt.resolveHit(p, strike, f1);
    }
    check('Pass 19 Critical Detonator blasts nearby enemies and stuns non-bosses on every 3rd critical strike',
      p.critChargeCount === 0 && f2.life < 5000 - 40 && f2.statuses.some(s => s.id === 'stun'),
      `chargesAfter=${p.critChargeCount}, blast=${(5000 - f2.life).toFixed(1)}, stunned=${f2.statuses.some(s => s.id === 'stun')}`);
  }

  // (13) Pass 19 DEX — Bio-Recycling (kill refunds +1 charge & shaves longest CD; flask/reload emits Cold nova + Chill)
  {
    const w = makeSimWorld('ranger', 4813), p = w.player, rt = w as unknown as HitRuntime;
    p.level = 10;
    w.meta.allocated.add('exp_p19_dex_recycling_charges');
    w.recalcSeat(w.localSeat);
    const flaskDef = Object.values(SKILLS).find(s => s.tags.includes('flask') && s.chargeCost)!;
    const flaskInst = makeSkillInstance(flaskDef);
    p.skills[0] = flaskInst;
    const fCharge = flaskDef.chargeCost!.charge;
    p.charges.set(fCharge, 0);
    p.cooldowns.set('dash', 5.0);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0)]);
    const f1 = w.createMonster('zombie', 1, 'enemy'); f1.brain = undefined; f1.sheet.setSource('rig', [mod('life', 'override', 10), mod('armor', 'override', 0)]); f1.life = 10;
    const f2 = w.createMonster('zombie', 1, 'enemy'); f2.brain = undefined; f2.pos = { x: p.pos.x + 80, y: p.pos.y }; f2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('coldRes', 'override', 0)]); f2.life = 5000;
    w.actors.push(f1, f2);
    const lethal = makeSkillInstance({ ...SKILLS.cleave, id: 'p19_rec', tags: ['attack', 'melee'], baseDamage: { physical: [50, 50] }, effects: [{ type: 'damage' }] });
    w.time = 10;
    rt.resolveHit(p, lethal, f1); // kills f1 -> refunds +1 flask charge & shaves 0.6s off dash!
    const chargeAfterKill = p.charges.get(fCharge) ?? 0;
    const cdAfterKill = p.cooldowns.get('dash') ?? 5.0;
    w.executeSkill(p, flaskInst, p.pos, paid); // Heat Absorption Cold nova onto f2!
    check('Pass 19 Bio-Recycling refunds a skill charge & shaves longest CD on kill and fires Heat Absorption Cold nova on flask/reload',
      chargeAfterKill === 1 && cdAfterKill < 4.5 && f2.life < 5000 - 20 && f2.statuses.some(s => s.id === 'chill'),
      `charge=${chargeAfterKill}, cd=5.0->${cdAfterKill.toFixed(2)}, nova=${(5000 - f2.life).toFixed(1)}`);
  }

  // (14) Pass 19 FIN — Hematic Transfusion (hits vs Bleeding foes heal & overflow 40% to Ward; Low Life triggers Adrenal Hyperdrive)
  {
    const w = makeSimWorld('warrior', 4814), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p19_fin_transfusion_bleed');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [
      mod('life', 'override', 1000), mod('lifeRegen', 'override', 0), mod('lifeRegenPct', 'override', 0),
      mod('wardDecay', 'override', 0), mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0),
    ]);
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined;
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    foe.life = 5000; foe.applyStatus('bleed', 10, 1, 'probe');
    w.actors.push(foe);
    const slice = makeSkillInstance({ ...SKILLS.cleave, id: 'p19_bt', tags: ['attack', 'melee'], baseDamage: { physical: [200, 200] }, effects: [{ type: 'damage' }] });
    p.life = 500;
    rt.resolveHit(p, slice, foe);
    const healed = p.life - 500;
    p.life = 1000; p.ward = 0;
    rt.resolveHit(p, slice, foe);
    const overhealWard = p.ward;
    p.life = 200; // low life
    w.update(0.05);
    check('Pass 19 Hematic Transfusion siphons life & overheal Ward vs Bleeding foes and triggers Adrenal Hyperdrive on Low Life',
      healed >= 20 && overhealWard >= 8 && p.buffs.has('adrenal_hyperdrive'),
      `healed=${healed.toFixed(1)}, ward=${overhealWard.toFixed(1)}, hyperdrive=${p.buffs.has('adrenal_hyperdrive')}`);
  }

  // (15) Pass 19 INT — Cryo-Execution (60% more hit damage vs Frozen/Stunned/Poise-Broken foes)
  {
    const w = makeSimWorld('sorcerer', 4815), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p19_int_hypothermia_shatter'); // hypothermiaPower = 0.60, damage more -0.12
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const fNorm = w.createMonster('zombie', 1, 'enemy'), fStun = w.createMonster('zombie', 1, 'enemy');
    fNorm.brain = undefined; fStun.brain = undefined;
    fNorm.sheet.setSource('rig', [mod('life', 'override', 5000), mod('coldRes', 'override', 0), mod('evasion', 'override', 0)]);
    fStun.sheet.setSource('rig', [mod('life', 'override', 5000), mod('coldRes', 'override', 0), mod('evasion', 'override', 0)]);
    fNorm.life = 5000; fStun.life = 5000; fStun.applyStatus('stun', 0, 2, 'probe');
    w.actors.push(fNorm, fStun);
    const shard = makeSkillInstance({ ...SKILLS.fireball, id: 'p19_hypo', tags: ['spell', 'cold'], baseDamage: { cold: [100, 100] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(p, shard, fNorm);
    rt.resolveHit(p, shard, fStun);
    const dNorm = 5000 - fNorm.life, dStun = 5000 - fStun.life;
    check('Pass 19 Cryo-Execution deals 60% more hit damage against Stunned/Frozen/Poise-Broken enemies',
      dNorm > 0 && near(dStun, dNorm * 1.6, 2), `normal=${dNorm.toFixed(1)}, stunned=${dStun.toFixed(1)}`);
  }

  // (16) Pass 19 WIL — Corrosive Dissolution (each active Poison stack melts target Armor & Phys/Chaos defense)
  {
    const w = makeSimWorld('sorcerer', 4816), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p19_wil_acid_armor_melt'); // 0.04
    w.meta.allocated.add('exp_p19_wil_acid_armor_melt_tailA'); // +0.025 = 0.065/stack!
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const fPlain = w.createMonster('zombie', 1, 'enemy'), fMelt = w.createMonster('zombie', 1, 'enemy');
    fPlain.brain = undefined; fMelt.brain = undefined;
    fPlain.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 1200), mod('evasion', 'override', 0)]);
    fMelt.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 1200), mod('evasion', 'override', 0)]);
    fPlain.life = 5000; fMelt.life = 5000;
    w.actors.push(fPlain, fMelt);
    const stab = makeSkillInstance({ ...SKILLS.cleave, id: 'p19_melt', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    for (let s = 0; s < 10; s++) fMelt.applyStatus('poison', 5, 1, 'probe', { casterId: p.id }); // 10 active Poison stacks!
    rt.rollStatusProcs(p, stab, fMelt, 'poison', new Set<SkillTag>(['attack', 'chaos']), [], 0); // stamps poisonMeltPerStack = 0.065!
    rt.resolveHit(p, stab, fPlain);
    rt.resolveHit(p, stab, fMelt);
    const dPlain = 5000 - fPlain.life, dMelt = 5000 - fMelt.life;
    check('Pass 19 Corrosive Dissolution melts enemy Armor & Physical/Chaos defense per active Poison stack',
      near(fMelt.poisonMeltPerStack, 0.065, 0.001) && dMelt > dPlain * 1.45,
      `meltRate=${fMelt.poisonMeltPerStack.toFixed(3)}, plain=${dPlain.toFixed(1)}, melted=${dMelt.toFixed(1)}`);
  }

  // (17) Pass 19 WIS — Pylon Resonance (proximity to Construct/Minion restores Mana & ES + sync haste; movement skill overcharges minion burst)
  {
    const w = makeSimWorld('necromancer', 4817), p = w.player;
    p.level = 10;
    w.meta.allocated.add('exp_p19_wis_turret_blink');
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [
      mod('mana', 'override', 200), mod('energyShield', 'override', 200),
      mod('manaRegen', 'override', 0), mod('esRechargeRate', 'override', 0),
    ]);
    p.mana = 50; p.es = 50; p.esDelay = 10;
    const skInst = makeSkillInstance(SKILLS.summon_skeleton);
    p.skills[0] = skInst;
    const m = exec(w).spawnMinion(p, skInst, { pos: { x: p.pos.x + 60, y: p.pos.y } });
    if (m) m.brain = undefined;
    for (let i = 0; i < 6; i++) w.update(0.1); // 0.6s >= 0.5s proximity sync
    const syncOk = p.mana >= 53 && p.es >= 53 && p.buffs.has('pylon_sync');
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 110, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 5000), mod('lightningRes', 'override', 0), mod('chaosRes', 'override', 0)]);
    foe.life = 5000; w.actors.push(foe);
    w.time = 10;
    w.executeSkill(p, makeSkillInstance(SKILLS.dash), p.pos, paid); // movement overcharges minion onto foe!
    check('Pass 19 Pylon Resonance restores Mana/ES & sync haste near Constructs/Minions and overcharges them on movement cast',
      !!m && syncOk && foe.life < 5000 - 30, `sync=${syncOk}, mana=${p.mana.toFixed(1)}, burst=${(5000 - foe.life).toFixed(1)}`);
  }

  // (18) Pass 19 CHA — Power Extractor (kill drops collectable Power Blob restoring Mana, shaving CDs, feeding Ultimate gauge & Haste)
  {
    const w = makeSimWorld('warrior', 4818), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p19_cha_energy_extractor');
    w.recalcSeat(w.localSeat);
    const ultDef = Object.values(SKILLS).find(s => !!s.gauge)!;
    const ultInst = makeSkillInstance(ultDef);
    p.skills[0] = ultInst;
    p.sheet.setSource('rig', [
      mod('mana', 'override', 200), mod('manaRegen', 'override', 0),
      mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0),
    ]);
    p.mana = 50;
    p.cooldowns.set('dash', 5.0);
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.pos = { x: p.pos.x + 40, y: p.pos.y };
    foe.sheet.setSource('rig', [mod('life', 'override', 10), mod('armor', 'override', 0)]);
    foe.life = 10; w.actors.push(foe);
    const killBlow = makeSkillInstance({ ...SKILLS.cleave, id: 'p19_ee', tags: ['attack', 'melee'], baseDamage: { physical: [50, 50] }, effects: [{ type: 'damage' }] });
    w.time = 10;
    rt.resolveHit(p, killBlow, foe); // spawns Power Blob within pickup range (40px <= 120px)
    w.update(0.05); // collects Power Blob!
    check('Pass 19 Power Extractor drops Power Blobs restoring Mana, shaving CDs, feeding Ultimate gauge, and granting Haste',
      p.mana >= 69 && (p.cooldowns.get('dash') ?? 5) < 4.0 && (ultInst.state?.gauge ?? 0) > 0 && p.buffs.has('extracted_surge'),
      `mana=50->${p.mana.toFixed(1)}, cd=5.0->${(p.cooldowns.get('dash') ?? 5).toFixed(2)}, ultGauge=${(ultInst.state?.gauge ?? 0).toFixed(1)}, surge=${p.buffs.has('extracted_surge')}`);
  }
}

// 3t. Pre-Merge 100% Integration, Bugfix & Refund Proofs (closes all 6 remaining stats to 148/148 + proves all fixed bugs & refunds)
{
  const exec = (w: ReturnType<typeof makeSimWorld>) =>
    w as unknown as {
      spawnMinion(caster: Actor, inst: SkillInstance, overrides?: unknown): Actor | null;
      spawnProjectile(a: Actor, i: SkillInstance, pos: { x: number; y: number }, dir: number): void;
      moveBlast(caster: Actor, inst: SkillInstance, at: { x: number; y: number }, phase?: 'depart' | 'arrive'): void;
    };

  // (1) Pass 11 DEX — bounceDamageScale + bounceFirstPenalty (live flying projectiles at 0 vs 2 caroms)
  {
    const w = makeSimWorld('ranger', 4901), p = w.player;
    w.meta.allocated.add('exp_p11_dex_ricochet_vault_tail'); // bounceDamageScale +0.22, bounceFirstPenalty +0.25
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const f0 = w.createMonster('zombie', 1, 'enemy'), f2 = w.createMonster('zombie', 1, 'enemy');
    f0.brain = undefined; f2.brain = undefined;
    f0.pos = { x: p.pos.x + 55, y: p.pos.y }; f2.pos = { x: p.pos.x + 55, y: p.pos.y + 200 };
    f0.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('fireRes', 'override', 0), mod('evasion', 'override', 0)]);
    f2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('fireRes', 'override', 0), mod('evasion', 'override', 0)]);
    f0.life = 5000; f2.life = 5000; w.actors.push(f0, f2);
    const bolt = makeSkillInstance({ ...SKILLS.fireball, id: 'p11_carom', tags: ['spell', 'projectile', 'fire'], baseDamage: { fire: [100, 100] }, effects: [{ type: 'damage' }] });
    exec(w).spawnProjectile(p, bolt, { x: p.pos.x + 25, y: p.pos.y }, 0);
    exec(w).spawnProjectile(p, bolt, { x: p.pos.x + 25, y: p.pos.y + 200 }, 0);
    (w.projectiles[w.projectiles.length - 1] as unknown as { caromCount?: number }).caromCount = 2; // 2 bounces -> +44% more vs -25% pre-carom!
    for (let i = 0; i < 15 && (f0.life === 5000 || f2.life === 5000); i++) w.update(0.03);
    const d0 = 5000 - f0.life, d2 = 5000 - f2.life;
    check('Pass 11 Carom Sovereign penalizes pre-carom projectiles (-25%) and amplifies post-carom hits (+44% at 2 bounces)',
      d0 > 0 && d2 > 0 && near(d0, 75, 2) && near(d2, 144, 3), `carom0=${d0.toFixed(1)}, carom2=${d2.toFixed(1)}`);
  }

  // (2) Pass 10 CHA — goldenProcAmplify (triggered passive proc grants gilded_surge + ally Ward & gilded_retinue)
  {
    const w = makeSimWorld('necromancer', 4902), p = w.player;
    w.meta.allocated.add('exp_p10_cha_golden_mutation'); // Sovereign Strain: goldenProcAmplify = 0.20
    w.meta.allocated.add('exp_p4_str_after_attack'); // real proc on attack cast
    w.recalcSeat(w.localSeat);
    const skInst = makeSkillInstance(SKILLS.summon_skeleton);
    p.skills[0] = skInst;
    const m = exec(w).spawnMinion(p, skInst, { pos: { x: p.pos.x + 60, y: p.pos.y } });
    if (m) { m.brain = undefined; m.ward = 0; }
    w.time = 10;
    const atk = makeSkillInstance(SKILLS.cleave);
    w.rollOwnProcs(p, 'cast', { inst: atk, tags: new Set<SkillTag>(['attack', 'melee']), depth: 0 });
    check('Pass 10 Gilded Strain (goldenProcAmplify) triggers gilded_surge and pulses Ward + gilded_retinue onto allies when any proc fires',
      p.buffs.has('gilded_surge') && !!m && m.ward > 0 && m.buffs.has('gilded_retinue'),
      `surge=${p.buffs.has('gilded_surge')}, minionWard=${(m?.ward ?? 0).toFixed(1)}, retinue=${m?.buffs.has('gilded_retinue')}`);
  }

  // (3) Pass 13 FIN — nonCritLess (Merciless Execution cuts non-crit hit damage by 14% while granting +38% crit multi)
  {
    const w = makeSimWorld('warrior', 4903), p = w.player;
    w.meta.allocated.add('exp_p13_fin_phantom_reflex_tailA'); // +38% critMulti, nonCritLess = 0.14
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const hit = makeSkillInstance({ ...SKILLS.cleave, id: 'p13_ncl', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    const withPenalty = rollSkillDamage(p, hit).amounts.physical ?? 0;
    w.meta.allocated.delete('exp_p13_fin_phantom_reflex_tailA');
    w.recalcSeat(w.localSeat);
    const baseline = rollSkillDamage(p, hit).amounts.physical ?? 0;
    check('Pass 13 Merciless Execution (nonCritLess) reduces non-critical hit damage by exact 14%',
      baseline > 0 && near(withPenalty, baseline * 0.86, 1), `base=${baseline.toFixed(1)}, nonCrit=${withPenalty.toFixed(1)}`);
  }

  // (4) Pass 11 WIL — phoenixBlinkNova (departure & arrival fire novas damage/burn foes and refund 25% CD when both hit)
  {
    const w = makeSimWorld('sorcerer', 4904), p = w.player;
    p.level = 10;
    w.meta.allocated.add('exp_p11_wil_phoenix_wake'); // Twin-Pyre Arrival: phoenixBlinkNova = 14 + 3.5/lvl
    w.recalcSeat(w.localSeat);
    const fDep = w.createMonster('zombie', 1, 'enemy'), fArr = w.createMonster('zombie', 1, 'enemy');
    fDep.brain = undefined; fArr.brain = undefined;
    fDep.pos = { x: p.pos.x + 40, y: p.pos.y }; fArr.pos = { x: p.pos.x + 220, y: p.pos.y };
    fDep.sheet.setSource('rig', [mod('life', 'override', 5000), mod('fireRes', 'override', 0)]);
    fArr.sheet.setSource('rig', [mod('life', 'override', 5000), mod('fireRes', 'override', 0)]);
    fDep.life = 5000; fArr.life = 5000; w.actors.push(fDep, fArr);
    const dash = makeSkillInstance(SKILLS.dash);
    p.cooldowns.set(dash.def.id, 4.0);
    exec(w).moveBlast(p, dash, { x: p.pos.x, y: p.pos.y }, 'depart');
    exec(w).moveBlast(p, dash, { x: p.pos.x + 200, y: p.pos.y }, 'arrive');
    const cdAfter = p.cooldowns.get(dash.def.id) ?? 4.0;
    check('Pass 11 Phoenix Wake (phoenixBlinkNova) blasts & burns enemies at departure and arrival and refunds 25% movement CD',
      fDep.life < 5000 - 40 && fArr.life < 5000 - 40 && fDep.statuses.some(s => s.id === 'burn') && fArr.statuses.some(s => s.id === 'burn') && cdAfter <= 3.05,
      `depDmg=${(5000 - fDep.life).toFixed(1)}, arrDmg=${(5000 - fArr.life).toFixed(1)}, cd=4.0->${cdAfter.toFixed(2)}`);
  }

  // (5) Pass 13 DEX — pierceDecay (Through-and-Through: 2nd pierced target takes 12% less damage than 1st target)
  {
    const w = makeSimWorld('ranger', 4905), p = w.player;
    w.meta.allocated.add('exp_p13_dex_unerring_salvo_tailA'); // +8 pierce, +16% proj dmg, pierceDecay = 0.12
    w.recalcSeat(w.localSeat);
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const f1 = w.createMonster('zombie', 1, 'enemy'), f2 = w.createMonster('zombie', 1, 'enemy');
    f1.brain = undefined; f2.brain = undefined;
    f1.pos = { x: p.pos.x + 50, y: p.pos.y }; f2.pos = { x: p.pos.x + 115, y: p.pos.y };
    f1.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    f2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    f1.life = 5000; f2.life = 5000; w.actors.push(f1, f2);
    const arrow = makeSkillInstance({ ...SKILLS.fireball, id: 'p13_pierce', tags: ['attack', 'projectile'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    exec(w).spawnProjectile(p, arrow, { x: p.pos.x + 18, y: p.pos.y }, 0);
    for (let i = 0; i < 20 && (f1.life === 5000 || f2.life === 5000); i++) w.update(0.03);
    const d1 = 5000 - f1.life, d2 = 5000 - f2.life;
    check('Pass 13 Through-and-Through (pierceDecay) pierces lined-up targets and reduces 2nd-target hit by exact 12%',
      d1 > 0 && d2 > 0 && near(d2, d1 * 0.88, 2), `hit1=${d1.toFixed(1)}, hit2=${d2.toFixed(1)}`);
  }

  // (6) Element-tagged minionDamage inheritance fix (minionInheritance.ts) — plain Skeleton gets Fire & Chaos scaling without double-counting Fire Golem!
  {
    const w = makeSimWorld('necromancer', 4906), p = w.player;
    const baseMinDmg = p.sheet.get('minionDamage');
    w.meta.allocated.add('exp_wis_ashen_flock_entry'); // +8% minionDamage ['fire']
    w.meta.allocated.add('exp_p19_wil_acid_armor_melt_b'); // +8% minionDamage ['chaos']
    w.recalcSeat(w.localSeat);
    const skInst = makeSkillInstance(SKILLS.summon_skeleton);
    p.skills[0] = skInst;
    const sk = exec(w).spawnMinion(p, skInst, { pos: { x: p.pos.x + 60, y: p.pos.y } })!;
    const skPhys = sk.sheet.get('damage', new Set<SkillTag>(['physical']));
    const skFire = sk.sheet.get('damage', new Set<SkillTag>(['fire']));
    const skChaos = sk.sheet.get('damage', new Set<SkillTag>(['chaos']));
    const fgDef = Object.values(SKILLS).find(s => s.tags.includes('summon') && s.tags.includes('fire'));
    let fgNoDouble = true;
    if (fgDef) {
      const fgInst = makeSkillInstance(fgDef);
      const fg = exec(w).spawnMinion(p, fgInst, { pos: { x: p.pos.x + 90, y: p.pos.y } });
      if (fg) fgNoDouble = near(fg.sheet.get('damage', new Set<SkillTag>(['fire'])), baseMinDmg + 0.08, 0.02);
    }
    check('Element-tagged minionDamage (fire/chaos) forwards onto plain minions without altering physical or double-counting fire summons',
      near(skPhys, baseMinDmg, 0.01) && near(skFire, baseMinDmg + 0.08, 0.01) && near(skChaos, baseMinDmg + 0.08, 0.01) && fgNoDouble,
      `base=${baseMinDmg.toFixed(2)}, skPhys=${skPhys.toFixed(2)}, skFire=${skFire.toFixed(2)}, skChaos=${skChaos.toFixed(2)}, fgNoDouble=${fgNoDouble}`);
  }

  // (7) Fixed zero-base, tag, unit, clamp & sign-inversion mods across Passes 1–19 + Weave
  {
    const w = makeSimWorld('warrior', 4907), p = w.player, rt = w as unknown as HitRuntime;
    w.meta.allocated.add('exp_p3_str_spark_release_entry'); // +10% damage ['cast:held']
    w.meta.allocated.add('exp_p3_str_spark_release_b2');    // +10% damage ['cast:held']
    w.meta.allocated.add('exp_p3_str_battering_physics_entry'); // +25 flat knockback
    w.meta.allocated.add('exp_p3_str_battering_physics_a');     // +0.14 flat gripPower
    w.meta.allocated.add('exp_p3_str_battering_physics_b');     // +0.12 increased weight
    w.meta.allocated.add('exp_p3_str_battering_physics_tailA'); // +0.22 flat gripPower
    w.meta.allocated.add('exp_p3_str_battering_physics_tailB'); // +50 flat knockback, +0.25 increased weight
    w.meta.allocated.add('weave_explorer_trample_weeds');       // +40 flat knockback
    w.meta.allocated.add('exp_p3_fin_jinx_gambler_a');          // +0.10 flat damageVs_jinxed
    w.meta.allocated.add('exp_p3_fin_jinx_gambler');            // +0.18 flat damageVs_jinxed
    w.meta.allocated.add('exp_p3_cha_bound_tithe');             // +0.25 flat costWardCap (=0.55)
    w.meta.allocated.add('exp_p11_wis_effigy_swarm_b');         // +0.08 flat channelMobility
    w.meta.allocated.add('exp_p13_for_bulwark_reckoning_b');    // +0.08 increased guardStrength
    w.meta.allocated.add('exp_p4_for_after_melee_b');           // +0.08 increased guardStrength
    w.meta.allocated.add('exp_p19_wis_turret_blink_a');         // -0.10 more totemPlaceTime (=1.80)
    w.recalcSeat(w.localSeat);
    const heldDmg = p.sheet.get('damage', new Set<SkillTag>(['cast:held']));
    const kb = p.sheet.get('knockback');
    const grip = p.sheet.get('gripPower');
    const wt = p.sheet.get('weight');
    const cwc = p.sheet.get('costWardCap');
    const cm = p.sheet.get('channelMobility');
    const gs = p.sheet.get('guardStrength');
    const tpt = p.sheet.get('totemPlaceTime');
    // Live hit against Jinxed enemy must deal +28% MORE damage!
    p.sheet.setSource('rig', [mod('accuracy', 'flat', 1e6), mod('critChance', 'override', 0), mod('damage', 'override', 1)]);
    const fPlain = w.createMonster('zombie', 1, 'enemy'), fJinx = w.createMonster('zombie', 1, 'enemy');
    fPlain.brain = undefined; fJinx.brain = undefined;
    fPlain.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    fJinx.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]);
    fPlain.life = 5000; fJinx.life = 5000; fJinx.applyStatus('jinxed', 0, 1, 'probe');
    w.actors.push(fPlain, fJinx);
    const jab = makeSkillInstance({ ...SKILLS.cleave, id: 'p3_jinx', tags: ['attack', 'melee'], baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] });
    rt.resolveHit(p, jab, fPlain); rt.resolveHit(p, jab, fJinx);
    const dPlain = 5000 - fPlain.life, dJinx = 5000 - fJinx.life;
    check('All fixed modifier math, tags, units & signs deliver real live effects (cast:held, knockback, grip, weight, jinxed, costWardCap, channelMobility, guardStrength, totemPlaceTime)',
      near(heldDmg, 1.20, 0.01) && near(kb, 115, 0.1) && near(grip, 0.36, 0.001) && wt > 1.3 && wt < 1.6
      && near(cwc, 0.55, 0.001) && near(cm, 0.08, 0.001) && near(gs, 1.16, 0.01) && near(tpt, 1.80, 0.01) && near(dJinx, dPlain * 1.28, 2),
      `held=${heldDmg.toFixed(2)}, kb=${kb}, grip=${grip.toFixed(2)}, wt=${wt.toFixed(2)}, cwc=${cwc.toFixed(2)}, cm=${cm.toFixed(2)}, gs=${gs.toFixed(2)}, tpt=${tpt.toFixed(2)}, jinx=${dPlain.toFixed(0)}->${dJinx.toFixed(0)}`);
  }

  // (8) Full-wheel non-clipping + ailmentCrossSplice > 1.0 double-stack overflow
  {
    const w = makeSimWorld('warrior', 4908), p = w.player, rt = w as unknown as HitRuntime;
    for (const id of ['exp_p10_prw_cross_splice_entry', 'exp_p10_prw_cross_splice_a', 'exp_p10_prw_cross_splice_b', 'exp_p10_prw_cross_splice_midA', 'exp_p10_prw_cross_splice_midB', 'exp_p10_prw_cross_splice_tail']) {
      w.meta.allocated.add(id);
    }
    for (const id of ['exp_p12_dex_rime_shatter_entry', 'exp_p12_dex_rime_shatter_a', 'exp_p12_dex_rime_shatter_b', 'exp_p12_dex_rime_shatter', 'exp_p12_dex_rime_shatter_tail']) {
      w.meta.allocated.add(id);
    }
    w.recalcSeat(w.localSeat);
    const sp = p.sheet.get('ailmentCrossSplice');
    const scm = p.sheet.get('shatterCritMult');
    const ssp = p.sheet.get('shatterSplinter');
    const foe = w.createMonster('zombie', 1, 'enemy'); foe.brain = undefined; foe.life = 5000; w.actors.push(foe);
    const stab = makeSkillInstance(SKILLS.cleave);
    w.time = 10;
    rt.rollStatusProcs(p, stab, foe, 'bleed', new Set<SkillTag>(['attack', 'melee']), [], 0);
    const chillStacks = foe.statuses.find(s => s.id === 'chill')?.stacks ?? 0;
    check('Full Pass 10 & Pass 12 wheels allocate without clamp clipping and >100% ailmentCrossSplice applies 2 paired stacks',
      near(sp, 2.05, 0.01) && near(scm, 1.71, 0.01) && near(ssp, 0.60, 0.01) && chillStacks >= 2,
      `splice=${sp.toFixed(2)} (chillStacks=${chillStacks}), shatterCrit=${scm.toFixed(2)}, splinter=${ssp.toFixed(2)}`);
  }

  // (9) Live refund cleanup across Pass 18–19 Keystones + 100% StatSheet registration check for all 1,698 expansion nodes
  {
    const w = makeSimWorld('warrior', 4909), p = w.player;
    const ksIds = ['exp_p18_str_cryo_cocoon', 'exp_p19_for_block_integration', 'exp_p19_cha_energy_extractor'];
    for (const id of ksIds) w.meta.allocated.add(id);
    w.recalcSeat(w.localSeat);
    const activeOk = p.sheet.get('cryoCocoonPower') === 1 && p.sheet.get('blockIntegratePower') === 1 && p.sheet.get('energyExtractPower') === 1;
    for (const id of ksIds) w.meta.allocated.delete(id);
    w.recalcSeat(w.localSeat);
    const cleanedOk = p.sheet.get('cryoCocoonPower') === 0 && p.sheet.get('blockIntegratePower') === 0 && p.sheet.get('energyExtractPower') === 0;
    // Verify EVERY SINGLE ONE of the 1,698 expansion nodes registers all its modifiers cleanly into player.sheet
    let regFails = 0;
    const baseMods = (N['str_start'].mods ?? []).length;
    for (const node of expNodes) {
      w.meta.allocated = new Set(['str_start', node.id]);
      w.recalcSeat(w.localSeat);
      const installed = (p.sheet as unknown as { sources: Map<string, Modifier[]> }).sources.get('passives')?.length ?? 0;
      if (installed !== baseMods + (node.mods ?? []).length) regFails++;
    }
    check('Pass 18–19 keystones clean up completely on refund and all 1,698 expansion nodes register live into player StatSheet',
      activeOk && cleanedOk && regFails === 0, `active=${activeOk}, cleaned=${cleanedOk}, regFails=${regFails}`);
  }
}

// 5. All 91 EXPANSION_PROCS live execution, gate refusal, ICD, depth cap & refund removal
for (const proc of EXPANSION_PROCS) {
  const sim = makeSimWorld('warrior', 4260), p = sim.player, rt = sim as unknown as HitRuntime;
  const node = expNodes.find(n => n.mods?.some(m => m.stat === `proc_${proc.id}`))!;
  sim.meta.allocated = new Set(['str_start', node.id]);
  sim.recalcSeat(sim.localSeat);
  p.sheet.setSource('fixture', [
    mod('life', 'override', 200),
    mod('mana', 'override', 100),
    mod('energyShield', 'override', 100),
    mod('poise', 'override', 100),
    mod('endurance', 'override', 100),
    mod('wardGain', 'override', 1),
    mod('manaRegen', 'override', 0),
    mod('esRechargeRate', 'override', 0),
    mod('poiseRegenPct', 'override', 0),
    mod('enduranceRegenPct', 'override', 0),
    mod('wardDecay', 'override', 0),
    mod('accuracy', 'flat', 1e6),
  ]);
  p.life = proc.when === 'lowLife' ? 30 : 100;
  p.mana = 20; p.es = 20; p.poise = 20; p.endurance = 0; p.ward = 0;
  if (proc.when) (p as unknown as { refreshConditions(): void }).refreshConditions();
  const t1 = sim.createMonster('zombie', 1, 'enemy'); t1.brain = undefined; t1.pos = { x: p.pos.x + 50, y: p.pos.y }; t1.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]); t1.life = 5000; sim.actors.push(t1);
  const t2 = sim.createMonster('zombie', 1, 'enemy'); t2.brain = undefined; t2.pos = { x: p.pos.x + 110, y: p.pos.y }; t2.sheet.setSource('rig', [mod('life', 'override', 5000), mod('armor', 'override', 0), mod('evasion', 'override', 0)]); t2.life = 5000; sim.actors.push(t2);
  if (proc.vs?.includes('lowLife')) t1.life = 1000; // 20% < 35% lowLife line
  if (proc.vs?.includes('afflicted') || proc.vs?.includes('burn')) t1.applyStatus('burn', 0, 1, 'fixture');
  if (proc.vs?.includes('chill')) t1.applyStatus('chill', 0, 1, 'fixture');
  const t1Start = t1.life;
  const matchingDef = Object.values(SKILLS).find(s => proc.tags?.every(t => s.tags.includes(t)));
  const fallbackDmg: { lightning: [number, number] } = { lightning: [50, 50] };
  const instDef = matchingDef
    ? { ...matchingDef, baseDamage: matchingDef.baseDamage ?? fallbackDmg }
    : { ...SKILLS.cleave, tags: proc.tags ? [...proc.tags] : SKILLS.cleave.tags, baseDamage: fallbackDmg };
  const inst = makeSkillInstance(instDef);
  const dash = makeSkillInstance(SKILLS.dash);
  p.skills = [inst, dash];
  p.cooldowns.set('dash', 10);
  const opts = {
    inst,
    tags: new Set<SkillTag>(inst.def.tags),
    target: t1,
    crit: !!proc.crit,
    condition: proc.condition,
  };
  const snap = () => proc.trigger === 'pulse'
    ? JSON.stringify([p.ward, [...p.buffs.keys()], p.procReadyAt.get(proc.id) ?? null])
    : JSON.stringify([p.mana, p.es, p.poise, p.endurance, p.ward, [...p.buffs.keys()], [...p.cooldowns], t1.life, t2.life, t1.push, t1.statuses.map(s => `${s.id}:${s.stacks}`), sim.flashes.length]);
  const fire = (depth = 0) => {
    if (proc.trigger === 'statusApply') {
      const st = typeof proc.status === 'string' ? proc.status : 'poison';
      rt.rollStatusProcs(p, inst, t1, st, opts.tags, [], depth);
    } else if (proc.trigger === 'buffGain') {
      rt.rollGainProcs(p, { kind: 'buff', id: 'probe_dummy_buff', depth });
    } else if (proc.trigger === 'pulse') {
      if (depth === 0) sim.update(0.01);
      else sim.rollOwnProcs(p, proc.trigger, { ...opts, depth });
    } else {
      sim.rollOwnProcs(p, proc.trigger, { ...opts, depth });
    }
  };
  if (proc.tags) {
    const before = snap();
    sim.rollOwnProcs(p, proc.trigger, { ...opts, inst: undefined, tags: new Set() });
    check(`${proc.name}: absent skill context refuses`, snap() === before);
  }
  if (proc.crit) {
    const before = snap();
    sim.rollOwnProcs(p, proc.trigger, { ...opts, crit: false });
    check(`${proc.name}: non-critical hit refuses`, snap() === before);
  }
  if (proc.rollTop !== undefined) {
    // Fixed-damage hit (no live range -> packet.rollT === undefined) refuses the rollTop jackpot gate on resolveHit
    const flatHit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_flat_rolltop', tags: ['attack', 'melee'], baseDamage: { physical: [50, 50] }, effects: [{ type: 'damage' }] });
    p.buffs.clear();
    rt.resolveHit(p, flatHit, t1);
    const refusedFlat = !p.buffs.has(proc.effect.type === 'buff' ? proc.effect.buff.id : '');
    // Wide-range hit eventually hits the top roll window and triggers Marked Deck
    const rangedHit = makeSkillInstance({ ...SKILLS.cleave, id: 'probe_ranged_rolltop', tags: ['attack', 'melee'], baseDamage: { physical: [10, 100] }, effects: [{ type: 'damage' }] });
    seedGlobalRandom(9001);
    let hitJackpot = false;
    for (let i = 0; i < 30 && !hitJackpot; i++) {
      rt.resolveHit(p, rangedHit, t1);
      if (proc.effect.type === 'buff' && p.buffs.has(proc.effect.buff.id)) hitJackpot = true;
    }
    p.buffs.clear();
    p.procReadyAt.delete(proc.id);
    t1.life = t1Start;
    check(`${proc.name}: rollTop refuses non-ranged hits and triggers on live top-window rolls`, refusedFlat && hitJackpot);
  }
  if (proc.vs) {
    const before = snap();
    sim.rollOwnProcs(p, proc.trigger, { ...opts, target: undefined });
    check(`${proc.name}: absent victim refuses`, snap() === before);
  }
  if (proc.condition) {
    const before = snap();
    sim.rollOwnProcs(p, proc.trigger, { ...opts, condition: 'fullLife' });
    check(`${proc.name}: wrong condition edge refuses`, snap() === before);
  }
  {
    const before = snap();
    fire(99);
    check(`${proc.name}: recursive depth is bounded`, snap() === before);
  }
  seedGlobalRandom(1234);
  fire(0);
  const fx = proc.effect;
  const landed =
    fx.type === 'buff' ? p.buffs.has(fx.buff.id) :
    fx.type === 'restore' ? near(p[fx.resource], 20 + 100 * fx.pctMax!) :
    fx.type === 'ward' ? near(p.ward, 200 * fx.pctMaxLife!) :
    fx.type === 'fortify' ? near(p.endurance, 200 * fx.pctMaxLife!) :
    fx.type === 'cooldown' ? near(p.cooldowns.get('dash')!, 10 - fx.seconds!) :
    fx.type === 'status' ? t1.statuses.some(s => s.id === fx.status) :
    fx.type === 'burst' ? t1.life < t1Start :
    fx.type === 'arc' ? t2.life < 5000 :
    fx.type === 'extraHit' ? t1.life < t1Start :
    fx.type === 'explosion' ? t2.life < 5000 :
    fx.type === 'displace' ? (t1.push?.vx ?? 0) < 0 :
    fx.type === 'delayedBurst' ? sim.flashes.length > 0 : false;
  check(`${proc.name}: live effect executes`, landed, snap());
  {
    const after = snap();
    const wardAfter = p.ward;
    const readyAfter = p.procReadyAt.get(proc.id);
    fire(0);
    const noRepeat = proc.trigger === 'pulse'
      ? p.ward <= wardAfter + 1e-6 && p.procReadyAt.get(proc.id) === readyAfter && p.buffs.size <= (fx.type === 'buff' ? 1 : 0)
      : snap() === after;
    check(`${proc.name}: ICD prevents immediate repeat`, noRepeat);
  }
  sim.time += (proc.icd ?? proc.every ?? 1) + 0.05;
  sim.meta.allocated.delete(node.id);
  sim.recalcSeat(sim.localSeat);
  {
    const removed = snap();
    const wardRemoved = p.ward;
    const readyRemoved = p.procReadyAt.get(proc.id);
    fire(0);
    const stopped = proc.trigger === 'pulse'
      ? p.ward <= wardRemoved + 1e-6 && p.procReadyAt.get(proc.id) === readyRemoved
      : snap() === removed;
    check(`${proc.name}: refunding passive stops future triggers`, stopped);
  }
}

console.log(`Passive expansion: ${checks} checks, ${failures} failures.`);
if (failures) process.exitCode = 1;
