import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { makeSkillInstance, supportFitsInstOrCrew } from '../src/engine/skills';
import { skillDamageBands } from '../src/engine/damage';
import { registerAttributeBequest, bequestStat } from '../src/engine/bequests';
import { SUPPORTS } from '../src/data/supports';
import { MONSTERS } from '../src/data/monsters';

let passed = 0, failed = 0;
const check = (name: string, ok: unknown) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); ok ? passed++ : failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
function setup() {
  const w = makeSimWorld('tamer', 91826);
  w.grantStartingCompanions();
  const p = w.player, pet = w.actors.find(a => a.companion)!;
  const inst = p.skills.find(s => s?.def.id === 'tame_beast')!;
  const refresh = () => w.companionBonds.refresh();
  const step = (sec: number) => { for (let i = 0; i < Math.round(sec * 60); i++) w.update(1 / 60); };
  return { w, p, pet, inst, refresh, step };
}
const restore = seedGlobalRandom(91826);
try {
  {
    const s = setup(), { w, p, pet, inst, refresh, step } = s;
    check('Uninvested starter keeps 45 life and 0.6 regen', near(pet.maxLife(), 45) && near(pet.sheet.get('lifeRegen'), .6));
    check('Companion remains an owned minion without a summon lifecycle', pet.isMinion() && !pet.summonInst && pet.companion);
    check('Vital Bond passes the real socket gate', supportFitsInstOrCrew(SUPPORTS.vital_bond, inst, w.summonCrewSkills(inst)));
    inst.sockets[0] = { def: SUPPORTS.vital_bond, level: 1 }; refresh();
    check('Vital Bond forwards flat and percentage regeneration', near(pet.sheet.get('lifeRegen'), 3.6) && near(pet.sheet.get('lifeRegenPct'), .008));
    pet.life = 10; step(1);
    check('Vital Bond actually heals 3.96 life in one second', near(pet.life, 13.96));
    p.sheet.setSource('probe:regen', [mod('minionRegenRate', 'increased', 1)]); refresh();
    pet.life = 10; step(1);
    check('Owner regeneration rate doubles both native and gem recovery', near(pet.life, 17.92));
    inst.sockets[0] = null; p.sheet.removeSource('probe:regen'); refresh();
    check('Removing grants restores native regen', near(pet.sheet.get('lifeRegen'), .6) && pet.sheet.get('lifeRegenPct') === 0);
    p.sheet.setSource('probe:ownRegen', [mod('lifeRegen', 'flat', 500)]); refresh();
    check('Personal regeneration is not inherited implicitly', near(pet.sheet.get('lifeRegen'), .6));
  }
  {
    const { w, p, pet, inst, refresh } = setup();
    p.sheet.setSource('probe:investment', [
      mod('minionLife', 'increased', .5), mod('minionDamage', 'increased', .4),
      mod('minionDamageTaken', 'more', -.3), mod('minionRegen', 'flat', 4),
      mod('minionRegenPct', 'flat', .02), mod('minionRegenRate', 'increased', .5),
      mod('minionHaste', 'increased', .25), mod('minionMoveSpeed', 'increased', .2),
      mod('minionDetectionRange', 'increased', .4), mod('minionThreat', 'more', .5),
      mod('minionAreaAvoidance', 'flat', .2), mod('minionGuard', 'flat', 1),
      mod('minionSize', 'increased', .5), mod('minionApply_poison', 'flat', 1),
      mod('minionPlies', 'flat', 2),
    ]);
    pet.life = 22.5; refresh();
    check('Life investment keeps the wound fraction', near(pet.maxLife(), 67.5) && near(pet.life, 33.75));
    check('Defense, speed, guard, size, threat and status carry reach the beast',
      near(pet.sheet.get('damageTaken'), .7) && near(pet.sheet.get('attackSpeed'), 1.25)
      && near(pet.sheet.get('castSpeed'), 1.25) && near(pet.sheet.get('moveSpeed'), 292.5)
      && pet.guardMode && near(pet.radius, 18) && near(pet.sheet.get('threatGen'), 1.5)
      && near(pet.sheet.get('targetPriority'), 1.5) && near(pet.sheet.get('areaAvoidance'), .2)
      && pet.sheet.get('apply_poison') === 1);
    check('Owner armor investment creates real plies', pet.pliesMax === 2 && pet.plies === 2);
    const summon = makeSkillInstance({ ...inst.def, concentration: undefined, targeting: undefined,
      delivery: { type: 'summon', monsterId: 'shepherds_hound', count: 1, maxActive: 3, duration: 60 }, effects: [] });
    const ordinary = w['spawnMinion'](p, summon)!;
    for (const stat of ['life', 'damage', 'damageTaken', 'lifeRegen', 'lifeRegenPct', 'moveSpeed',
      'attackSpeed', 'castSpeed', 'detectionRange', 'threatGen', 'targetPriority', 'areaAvoidance', 'apply_poison']) {
      check(`Summon/companion parity: ${stat}`, near(pet.sheet.get(stat), ordinary.sheet.get(stat)));
    }
    pet.plies = 1;
    const life = pet.life;
    for (let i = 0; i < 120; i++) refresh();
    check('Repeated refresh neither heals nor grows nor refills spent armor', near(pet.life, life) && near(pet.radius, 18) && pet.plies === 1);
    check('Inheritance stays attributable to one companion source', !pet.sheet.sourceNames().includes('owner') && !!pet.sheet.getSourceMods('companionBond')?.some(m => m.stat === 'lifeRegen'));
    p.level = 12; refresh();
    check('Growing retains the wound and spent-armor fractions', near(pet.life / pet.maxLife(), .5) && pet.plies === 1 && pet.pliesMax === 2);
    p.sheet.removeSource('probe:investment'); refresh();
    check('Removing investment restores size, defenses, status carry and armor', near(pet.radius, 12) && pet.sheet.get('damageTaken') === 1
      && pet.sheet.get('areaAvoidance') === 0 && pet.sheet.get('apply_poison') === 0 && !pet.guardMode && pet.pliesMax === 0);
  }
  {
    const { w, p, pet, inst, refresh } = setup();
    p.sheet.setSource('probe:scopes', [mod('minionRegen', 'flat', 2, ['minion']),
      mod('minionRegen', 'flat', 3, ['companion']), mod('minionRegen', 'flat', 100, ['summon']),
      mod('minionRegen', 'flat', 4, ['body:shepherds_hound']), mod('minionRegen', 'flat', 200, ['body:zombie']),
      mod('minionAreaAvoidance', 'flat', .3, ['body:shepherds_hound'])]);
    refresh();
    check('Minion/companion/body scopes apply; summon-only and other species do not', near(pet.sheet.get('lifeRegen'), 9.6) && near(pet.sheet.get('areaAvoidance'), .3));
    const other = w.createMonster('shepherds_hound', 1, p.team, p);
    w.actors.push(other); refresh();
    check('A bond-local refresh does not modify unrelated owned bodies', near(other.sheet.get('lifeRegen'), .6));
    inst.extraMods = [mod('damage', 'more', -.25, ['attack'])]; refresh();
    const penalized = skillDamageBands(pet, pet.skills[0]!).total.lo;
    inst.extraMods = []; refresh();
    check('Host damage penalties reach actual companion attacks', near(penalized, skillDamageBands(pet, pet.skills[0]!).total.lo * .75));
    const guest = w.addSeat('inheritance-guest', w.meta.classDef, w.localSeat.input);
    const guestPet = w.actors.find(a => a.companion && a.owner === guest.actor)!;
    refresh();
    check('Owner investment cannot leak into another keeper’s bond', near(guestPet.sheet.get('lifeRegen'), .6));
  }
  {
    const { p, pet, refresh } = setup();
    p.sheet.setSource('probe:trade', [mod('minionLife', 'increased', .9), mod('minionLifePlyTrade', 'flat', .3), mod('minionLifePlyEcho', 'flat', .3)]);
    refresh();
    check('Life trade and echo read one pre-trade baseline', near(pet.maxLife(), 45) && pet.pliesMax === 6);
    p.sheet.removeSource('probe:trade'); refresh();
    check('Removing a life-to-armor trade clears its granted capacity', pet.pliesMax === 0);
  }
  {
    const { w, p, inst } = setup();
    p.sheet.setSource('probe:batch', [mod('minionLife', 'increased', .5), mod('minionRegen', 'flat', 10),
      mod('minionRegenPct', 'flat', .05), mod('minionRegenRate', 'increased', 1),
      mod('minionPlies', 'flat', 2), mod('minionAreaAvoidance', 'flat', .2)]);
    const body = w.createMonster('shepherds_hound', 1, p.team, p);
    w.bakeMinionOwnerStats(body, p, inst, .2);
    check('Batch scaling applies once to life and regeneration investment', near(body.maxLife(), 49.5)
      && near(body.sheet.get('lifeRegen'), 5.2) && near(body.sheet.get('lifeRegenPct'), .02));
    check('Batch scaling does not dilute discrete armor or avoidance', body.pliesMax === 2 && near(body.sheet.get('areaAvoidance'), .2));
  }
  {
    const { p, pet, inst, refresh, step } = setup();
    registerAttributeBequest({ id: 'probe_companioninheritance', name: 'Probe bond vitality', attributes: ['vitality'], recipients: 'companions' });
    inst.extraMods = [mod(bequestStat('probe_companioninheritance'), 'flat', .5)]; refresh();
    const expected = 45 + p.attributeValues!.vitality * .5 * 6;
    check('Socket-local attribute bequest reads the bond context', near(pet.maxLife(), expected));
    step(.1);
    check('World updates do not overwrite the bond’s scoped bequest', near(pet.maxLife(), expected));
    inst.extraMods = []; refresh();
    check('Removing a scoped bequest clears it', near(pet.maxLife(), 45) && !pet.sheet.sourceNames().includes('bequest'));
  }
  {
    const { w, p, pet, inst, refresh, step } = setup();
    inst.treeNodes = ['swift_claim'];
    const extra = w.createMonster('shepherds_hound', 1, 'enemy'); extra.radius = 17; extra.rarity = 'rare';
    extra.sheet.setSource('rarity', [mod('life', 'more', .5)]); extra.name = 'Saved rarity';
    w.actors.push(extra); w.tameCompanion(p, extra, inst.def.id);
    inst.sockets[0] = { def: SUPPORTS.vital_bond, level: 1 };
    p.sheet.setSource('probe:size', [mod('minionSize', 'increased', .5)]); refresh();
    const before = { life: extra.maxLife(), radius: extra.radius };
    const saved = w.companionBonds.saved(extra);
    check('Persistence records rarity size before owner scaling', saved.radius === 17);
    w.actors = w.actors.filter(a => !a.companion); refresh();
    w.restoreCompanions([saved]);
    const loaded = w.actors.find(a => a.companion)!;
    check('Load preserves life, rarity size, name and regeneration without double inheritance', near(loaded.maxLife(), before.life)
      && near(loaded.radius, before.radius) && loaded.name === 'Saved rarity' && near(loaded.sheet.get('lifeRegen'), 3.6));
    w.kill(loaded); loaded.pos.x = p.pos.x + 400; step(1);
    check('Regeneration never revives a downed companion', loaded.downed && loaded.life === 0);
    w.reviveCompanion(loaded); loaded.life = 10; step(1);
    check('A revived companion resumes inherited recovery', loaded.life > 10);
    // A second bond over capacity becomes dormant and loses inherited grants.
    const second = w.createMonster('shepherds_hound', 1, 'enemy'); w.actors.push(second);
    w.tameCompanion(p, second, inst.def.id); inst.treeNodes = []; refresh();
    check('Dormant surplus bond loses regen, size, combat and bequest investment', second.companionDormant && second.downed
      && near(second.sheet.get('lifeRegen'), .6) && near(second.radius, MONSTERS.shepherds_hound.radius));
    inst.treeNodes = ['swift_claim']; refresh();
    check('Restored capacity re-inherits without reviving by refresh', !second.companionDormant && second.downed
      && near(second.sheet.get('lifeRegen'), 3.6) && second.life === 0);
    w.releaseCompanion(second.id); refresh();
    check('Releasing cleans all bond-owned stat sources', !second.sheet.sourceNames().includes('companionBond')
      && !second.sheet.sourceNames().includes('minionCombat') && !second.sheet.sourceNames().includes('bequest'));
    void pet;
  }
} finally { restore(); }
console.log(`\n${passed} pass, ${failed} fail`);
if (failed) process.exitCode = 1;
