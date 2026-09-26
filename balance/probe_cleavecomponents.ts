/** Melee component support contracts: admission AND observable effects. */
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { mod } from '../src/engine/stats';
import { makeSkillInstance, supportFitsInst, hostSockets, instanceMods, skillContextTags } from '../src/engine/skills';
import { attackSequenceSweepInstances } from '../src/engine/attackSequenceSpec';
import { SIM_TAP } from '../src/engine/tap';

let failures = 0;
const check = (name: string, ok: boolean) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failures++; };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
function rig(gems: string[] = [], leaf = 'tempered_wave') {
  const w = makeSimWorld('warrior', 914), p = w.player;
  const cleave = makeSkillInstance(SKILLS.cleave, 20, 4);
  cleave.treeNodes = ['unbound_cleave', 'heavy_wave', leaf];
  cleave.sockets = gems.map(id => ({ def: SUPPORTS[id], level: 1 }));
  p.skills.fill(null); p.skills[0] = cleave; w.meta.knownSkills.set('cleave', cleave);
  p.sheet.setSource('component-qa', [mod('mana', 'flat', 10000), mod('accuracy', 'override', 100000),
    mod('critChance', 'override', 0), mod('manaRegen', 'override', 0)]); p.fillResources();
  const enemy = (x: number, y = 0) => {
    const a = w.createMonster('zombie', 1, 'enemy'); a.skills = []; a.brain = undefined;
    a.pos = { x: p.pos.x + x, y: p.pos.y + y }; a.tier = p.tier; a.anchored = true;
    a.sheet.setSource('component-qa', [mod('life', 'flat', 100000), mod('evasion', 'override', 0),
      mod('blockChance', 'override', 0), mod('moveSpeed', 'override', 0)]); a.fillResources(); w.actors.push(a); return a;
  };
  const target = enemy(45);
  const step = (seconds: number) => { for (let t = 0; t < seconds - 1e-8; t += 0.02) w.update(0.02); };
  // Exercise the actual component entry point, without an axe masking effects.
  const fire = () => { w.attackSequences.opening(p, cleave, target.pos, 1); if (leaf === 'razor_horizon') step(0.3); };
  const component = () => attackSequenceSweepInstances(cleave)[0];
  return { w, p, cleave, target, enemy, step, fire, component };
}
const restore = seedGlobalRandom(914);
try {
  const melee = Object.values(SUPPORTS).filter(s => s.requiresTags?.includes('melee'));
  for (const leaf of ['tempered_wave', 'razor_horizon']) for (const gem of melee) {
    const r = rig([gem.id], leaf);
    check(`${leaf}: ${gem.name} admits and reaches the melee component`, supportFitsInst(gem, r.cleave)
      && hostSockets(r.component()).some(s => s.def === gem));
  }
  for (const [gem, status] of [['serrated_edge', 'bleed'], ['grasping_tendrils', 'ensnared'], ['hallowed_flames', 'scorch']]) {
    const r = rig([gem]);
    for (let i = 0; i < 20; i++) r.fire();
    check(`${SUPPORTS[gem].name} applies ${status} on wave hits`, r.target.statuses.some(s => s.id === status && s.casterId === r.p.id));
  }
  {
    const r = rig(['stunning', 'serrated_edge']), c = r.component();
    check('Stunning Blows raises component damage and ailment chance', r.p.sheet.get('statusChance', skillContextTags(c), instanceMods(c)) >= 0.2
      && instanceMods(c).some(m => m.stat === 'damage' && m.tags?.includes('melee')));
    const before = r.target.life, reset = seedGlobalRandom(782); r.fire(); reset();
    const plain = rig(['serrated_edge']), life = plain.target.life, resetPlain = seedGlobalRandom(782); plain.fire(); resetPlain();
    check('Stunning Blows increases actual landed wave damage', before - r.target.life > life - plain.target.life);
  }
  {
    const r = rig(['battering_ram']); r.target.anchored = false; r.fire();
    check('Battering Ram imparts a real wave knockback with component provenance', !!r.target.push?.inst?.sequenceHost);
  }
  {
    const r = rig(['crushing_impact']);
    const before = r.target.life;
    for (let i = 0; i < 6; i++) (r.w as any).rollCollisionProcs(r.p, r.component(), r.target);
    check('Crushing Impact resolves collision damage with the melee component', r.target.life < before);
  }
  {
    const r = rig(['brutal_strikes']); let hits = 0;
    SIM_TAP.current = { onHit: (a, b) => { if (a === r.p && b === r.target) hits++; } };
    for (let i = 0; i < 20; i++) r.fire();
    SIM_TAP.current = null;
    check('Brutal Strikes produces extra hits from wave contacts', hits > 20 && hits <= 40);
  }
  {
    const r = rig(['answered_dodge']);
    r.p.sheet.setSource('miss-qa', [mod('accuracy', 'override', 0)]);
    r.target.sheet.setSource('miss-qa', [mod('evasion', 'override', 100000)]);
    for (let i = 0; i < 20; i++) r.fire();
    check('Answered Dodge grants Overpower when a wave is evaded', r.p.buffs.has('overpower'));
  }
  {
    const r = rig(['skewering_blows']); r.fire();
    check('Shared attack supports can lodge impales from the melee component', r.target.statuses.some(s => s.id === 'impaled' && (s.rupture ?? 0) > 0));
  }
  for (const leaf of ['tempered_wave', 'razor_horizon']) {
    const r = rig(['faultfinder', 'volcanic_heart'], leaf);
    check(`${leaf}: Faultfinder opens fissure-specific support composition`, supportFitsInst(SUPPORTS.volcanic_heart, r.cleave));
    for (let i = 0; i < 20; i++) r.fire();
    check(`${leaf}: Faultfinder creates real fissures`, r.w.zones.some(z => z.inst.sequenceHost === r.cleave));
    const a = rig(['ancestral_call'], leaf); a.fire();
    check(`${leaf}: Ancestral Call produces a melee ghost`, a.w.actors.some(x => x.owner === a.p && !!x.construct?.echo));
    const f = rig(['reapers_encore'], leaf); let queued = false;
    for (let i = 0; i < 20; i++) { f.fire(); queued ||= f.w.pendingFollowUps.length > 0; }
    check(`${leaf}: Reaper's Encore queues a follow-through`, queued);
  }
  {
    const r = rig(['reapers_encore']);
    for (let i = 0; i < 20 && !r.w.pendingFollowUps.length; i++) r.fire();
    check('Component follow-throughs inherit the invested skill level', r.w.pendingFollowUps.some(f => f.inst.level === r.cleave.level));
    let followed = false;
    SIM_TAP.current = { onCast: (a, inst) => { if (a === r.p && inst.def.id === 'follow_sweep') followed = true; } };
    r.step(0.5); SIM_TAP.current = null;
    check('Queued follow-throughs actually execute after their beat', followed);
  }
  {
    const r = rig(['ancestral_call', 'multistrike', 'reapers_encore', 'faultfinder']);
    r.cleave.treeNodes!.push('razor_horizon');
    let ghosts = 0, axes = 0, followUps = 0;
    SIM_TAP.current = { onCast: (a, inst) => {
      if (a.owner === r.p && a.construct?.echo) ghosts++;
      if (a === r.p && inst.def.delivery.type === 'projectile' && inst.sequenceRole === 'primary') axes++;
      if (a === r.p && inst.def.id === 'follow_sweep') followUps++;
    } };
    const mana = r.p.mana, cost = r.p.skillCost(r.cleave).mana;
    check('Combined melee supports start a real paid Cleave', r.w.useSkill(r.p, r.cleave, r.target.pos, true));
    r.step(1.4); SIM_TAP.current = null;
    check('Multistrike does not recursively multiply ancestor ghosts or follow-throughs', ghosts === 2 && followUps <= 2);
    check('Combined supports preserve one axe and one host payment', axes === 1 && near(mana - r.p.mana, cost));
    check('Combined component jobs finish without a recursive repeat train', !r.w.pendingRepeats.length && !r.w.pendingFollowUps.length);
  }
  {
    const r = rig(['alternating_strikes']); r.fire();
    check('Alternating Strikes schedules its opposite-side beat', r.w.pendingSteps.length === 1);
    r.w.attackSequences.clear(r.p, r.cleave);
    check('Respec cancels component aim-sequence beats', r.w.pendingSteps.length === 0);
  }
  {
    const r = rig(['reverberation']), other = r.enemy(-100); const before = other.life; r.fire();
    check('Reverberation reaches a target outside the wave footprint', other.life < before);
  }
  {
    const r = rig(['splash']), other = r.enemy(100); const before = other.life; r.fire();
    check('Splintering Impact splashes from a landed wave', other.life < before);
  }
  {
    const r = rig(['sweeping_blow']); r.fire();
    check('Sweeping Blow converts the component into a traveling surface', r.w.zones.some(z => z.drift && z.inst.sequenceHost === r.cleave));
    const c = r.p.skillCost(r.cleave).mana;
    r.cleave.sockets = [];
    r.cleave.extraMods = [mod('manaCost', 'more', 0.35)];
    check('Sweeping Blow charges the parent once', near(c, r.p.skillCost(r.cleave).mana));
  }
  {
    const r = rig(['bristling_riposte']); r.p.sheet.setSource('thorns-qa', [mod('thorns', 'flat', 100)]);
    const before = r.target.life; r.fire();
    check('Bristling Riposte adds the caster thorns to wave damage', before - r.target.life > 50);
  }
  {
    const r = rig(['reckless_breadth']), base = rig(); r.fire(); base.fire();
    const changed = r.w.flashes.find(f => f.fx === 'serratedSweep'), plain = base.w.flashes.find(f => f.fx === 'serratedSweep');
    check('Reckless Breadth changes the actual wave footprint', !!changed && !!plain && !near(changed.radius, plain.radius));
  }
  {
    const r = rig(['assassins_angle']); r.target.facing = 0;
    const before = r.target.life; const resetRng = seedGlobalRandom(818); r.fire(); resetRng();
    const supported = before - r.target.life;
    const plain = rig(); plain.target.facing = 0; const life = plain.target.life;
    const resetPlain = seedGlobalRandom(818); plain.fire(); resetPlain();
    check("Assassin's Angle increases wave damage from behind", supported > (life - plain.target.life) * 1.3);
  }
  {
    const r = rig(['faultfinder', 'ancestral_call', 'reapers_encore']);
    for (let i = 0; i < 20; i++) r.fire();
    r.w.attackSequences.clear(r.p, r.cleave);
    check('Respec retires support-generated ghosts and follow-ups', !r.w.pendingFollowUps.length
      && !r.w.actors.some(a => !a.dead && a.owner === r.p && a.construct?.echo));
  }
  {
    const r = rig(['brutal_strikes']); r.cleave.procChainDepth = 1;
    check('A proc-origin parent cannot launder its depth through an authored wave', r.component().procChainDepth === 1);
  }
} finally { SIM_TAP.current = null; restore(); }
console.log(`Cleave component supports: ${failures} failures`);
if (failures) process.exitCode = 1;
