import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { mod } from '../src/engine/stats';
import { SIM_TAP } from '../src/engine/tap';
import { instanceTrigger, instanceTriggerArmed, instanceMods, skillContextTags, skillCooldownSeconds, makeSkillInstance, supportFitsInst } from '../src/engine/skills';
import { previewSkill } from '../src/engine/skillPreview';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
let failures = 0;
const check = (name: string, ok: boolean) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failures++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.00001;
function rig(nodes = ['readied_cleave']) {
  const w = makeSimWorld('warrior', 812), p = w.player;
  for (const attr of ['strength', 'dexterity', 'intelligence', 'willpower'] as const) w.meta.baseAttrs[attr] = 100;
  w.recalcPlayer();
  const cleave = makeSkillInstance(SKILLS.cleave, 20, 3);
  w.meta.knownSkills.set('cleave', cleave); p.skills.fill(null); p.skills[0] = cleave;
  for (const node of nodes) w.pickTreeNode('cleave', node);
  p.sheet.setSource('cleave-rig', [mod('mana', 'flat', 10000), mod('accuracy', 'flat', 100000), mod('critChance', 'override', 0), mod('lifeRegen', 'override', 0)]);
  p.fillResources();
  const target = w.createMonster('zombie', 1, 'enemy'); target.skills = [];
  target.pos = { x: p.pos.x + 35, y: p.pos.y }; target.tier = p.tier;
  target.sheet.setSource('cleave-rig', [mod('life', 'flat', 100000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('moveSpeed', 'override', 0)]);
  target.fillResources(); w.actors.push(target);
  const strike = makeSkillInstance({ ...SKILLS.backstab, id: 'cleave_probe_strike', useTime: 0, cooldown: 0, manaCost: 0,
    tree: undefined, tags: ['attack', 'melee', 'physical'], baseDamage: { physical: [10, 10] }, effects: [{ type: 'damage' }] });
  let releases = 0;
  const execute = w.executeSkill.bind(w);
  w.executeSkill = (...args: Parameters<typeof w.executeSkill>) => { if (args[1] === cleave) releases++; return execute(...args); };
  const hit = () => w.executeSkill(p, strike, target.pos);
  const toggle = () => w.useSkill(p, cleave, target.pos, true);
  const ready = () => { w.time += 3; p.cooldowns.delete('cleave'); };
  return { w, p, cleave, target, strike, hit, toggle, ready, count: () => releases };
}
const restore = seedGlobalRandom(812);
try {
  {
    const r = rig(), { w, p, cleave, strike, target } = r;
    check('native tree resolves a deterministic melee trigger starting off', instanceTrigger(cleave)?.on === 'meleeHit' && !instanceTriggerArmed(cleave));
    r.hit(); check('unarmed attacks do not release Cleave', r.count() === 0);
    const mana = p.mana, cost = p.skillCost(cleave).mana;
    check('press arms without casting, paying, or starting a cooldown', r.toggle() && instanceTriggerArmed(cleave) && p.mana === mana && !p.cooldowns.has('cleave') && r.count() === 0);
    const cast = p.casting; r.hit();
    check('landed strike releases once, pays its own price, preserves the carrier cast', r.count() === 1 && near(mana - p.mana, cost) && p.casting === cast);
    check('release remains armed and stamps the ordinary recovery clock', instanceTriggerArmed(cleave) && near(p.cooldowns.get('cleave')!, skillCooldownSeconds(p, cleave)));
    r.hit(); check('cooldown prevents additional releases', r.count() === 1);
    check('disarm works during cooldown without resetting it', r.toggle() && !instanceTriggerArmed(cleave) && p.cooldowns.has('cleave'));
    r.toggle(); r.hit(); check('off/on cannot bypass cooldown', r.count() === 1);
    r.ready(); p.mana = 0; r.hit(); check('unaffordable release stays armed without spending its ready state', r.count() === 1 && !p.cooldowns.has('cleave') && instanceTriggerArmed(cleave));
    p.fillResources(); r.hit(); check('funded next strike releases without rearming', r.count() === 2);
    r.ready();
    w.executeSkill(p, makeSkillInstance({ ...strike.def, tags: ['spell', 'physical'] }), target.pos);
    check('non-melee spell hits cannot release Cleave', r.count() === 2);
    strike.procChainDepth = 1; r.hit(); strike.procChainDepth = undefined;
    check('proc descendants cannot release Cleave', r.count() === 2);
    (strike.state ??= {}).trigDepth = 1; r.hit(); strike.state.trigDepth = 0;
    check('trigger descendants cannot release Cleave', r.count() === 2);
    const original = { ...target.pos }; target.pos.x += 1000; r.hit(); target.pos = original;
    check('a whiff leaves Cleave ready', r.count() === 2 && !p.cooldowns.has('cleave'));
    r.hit(); check('recovery followed by a new strike produces another release', r.count() === 3);
    const preview = previewSkill(p, cleave).rows;
    check('preview shows release and imposed cooldown, with no manual attack time', preview.some(x => x.key === 'trigger') && preview.some(x => x.key === 'cooldown') && !preview.some(x => x.key === 'castTime'));
    const saved = serializeCharacter(w).knownSkills.find(x => x.skillId === 'cleave')!;
    const rebuilt = rebuildSkill(saved)!;
    check('save restores the tree but requires deliberately rearming', instanceTrigger(rebuilt)?.on === 'meleeHit' && !instanceTriggerArmed(rebuilt));
    const other = rig(); applySeatMeta(other.w, other.w.localSeat, serializeSeatMeta(w.localSeat));
    check('co-op rebuild preserves armed state and tree', instanceTriggerArmed(other.w.meta.knownSkills.get('cleave')!));
    r.toggle(); applySeatMeta(other.w, other.w.localSeat, serializeSeatMeta(w.localSeat));
    check('co-op rebuild preserves disarmed state', !instanceTriggerArmed(other.w.meta.knownSkills.get('cleave')!));
    w.fonts.push({ pos: { ...p.pos } }); w.meta.abilityEssences.ability4 = 999;
    check('respec removes the trigger and transient armed state', w.fontResetTree('cleave') && !instanceTrigger(cleave) && cleave.state?.triggerOff === undefined);
    p.cooldowns.clear(); p.useLock = 0;
    check('respec restores ordinary manual Cleave', w.useSkill(p, cleave, target.pos, true) && !!p.casting);
  }
  {
    const base = rig(), rhythm = rig(['readied_cleave', 'steady_cuts']);
    check('Ready Rhythm scales the actual release cooldown', near(skillCooldownSeconds(rhythm.p, rhythm.cleave), skillCooldownSeconds(base.p, base.cleave) / 1.5));
    const recovery = Object.values(SUPPORTS).find(s => s.requiresMechanisms?.includes('cooldown'));
    if (recovery) check('tree-imposed cooldown admits a cooldown support', supportFitsInst(recovery, rhythm.cleave));
    const wound = rig(['readied_cleave', 'deep_notches', 'barbed_edge']);
    check('wound route owns its impale and bleed investment', wound.p.sheet.get('impalePower', skillContextTags(wound.cleave), instanceMods(wound.cleave)) >= 0.3 && wound.p.sheet.get('apply_bleed', skillContextTags(wound.cleave), instanceMods(wound.cleave)) >= 1);
    wound.toggle(); wound.hit(); check('wound route releases through a real strike', wound.count() === 1 && wound.target.statuses.some(s => s.id === 'bleed'));
  }
  {
    const r = rig(); r.toggle();
    for (let i = 0; i < 40; i++) { r.ready(); r.hit(); }
    check('every affordable eligible strike releases, without the random trigger cap', r.count() === 40);
    const borrowed = makeSkillInstance({ ...SKILLS.cleave, id: 'other_native_trigger', tree: undefined, trigger: { on: 'meleeHit', guaranteed: true, maxUseTime: 0.7 } });
    r.p.skills[1] = borrowed; r.ready(); r.hit();
    check('second native trigger uses shared round-robin arbitration', r.count() === 40 && r.p.triggerRR.get('meleeHit') === 1);
    r.ready(); r.hit(); check('trigger descendants cannot chain into the other melee trigger', r.count() === 41 && r.p.triggerRR.get('meleeHit') === 0);
  }
  {
    const sample = (supported: boolean) => {
      const r = rig();
      if (supported) r.cleave.sockets[0] = { def: SUPPORTS.brutality, level: 1 };
      const hits: { name: string; damage: number }[] = [];
      const previous = SIM_TAP.current, rng = seedGlobalRandom(912);
      SIM_TAP.current = { onHit: (a, _b, result, packet) => {
        if (a === r.p) hits.push({ name: packet.sourceName, damage: result.total });
      } };
      try { r.toggle(); r.hit(); } finally { SIM_TAP.current = previous; rng(); }
      return hits;
    };
    const plain = sample(false), supported = sample(true);
    check('damage records distinguish carrier and Cleave in resolution order', plain.length === 2 && plain[0].name === 'Backstab' && plain[1].name === 'Cleave');
    check('Cleave supports scale its release without scaling the carrier', near(plain[0].damage, supported[0].damage) && supported[1].damage > plain[1].damage);
  }
  {
    const r = rig();
    const second = r.w.createMonster('zombie', 1, 'enemy');
    second.skills = []; second.pos = { x: r.target.pos.x, y: r.target.pos.y + 5 }; second.tier = r.p.tier;
    second.sheet.setSource('rig', [mod('life', 'flat', 100000), mod('blockChance', 'override', 0), mod('evasion', 'override', 0)]);
    second.fillResources(); r.w.actors.push(second);
    r.toggle(); const mana = r.p.mana; r.hit();
    check('multi-target carrier pays for one Cleave release', r.count() === 1 && near(mana - r.p.mana, r.p.skillCost(r.cleave).mana) && second.life < second.maxLife());
  }
  {
    const r = rig(); r.toggle(); r.target.invulnerable = true; r.hit();
    check('immune contact does not spend a readied release', r.count() === 0 && !r.p.cooldowns.has('cleave'));
    r.target.invulnerable = false;
    r.p.skills[0] = null; r.hit();
    check('an unseated trigger cannot release', r.count() === 0);
    r.p.skills[0] = r.cleave; r.p.dead = true; r.hit();
    check('dead owners cannot release a readied skill', r.count() === 0);
  }
  {
    const r = rig();
    const input = (edge: boolean) => r.w.applyInputs(new Map([[r.w.localSeat.id,
      { dx: 0, dy: 0, aim: r.target.pos, held: [true], edge: [edge] }]]), 1 / 60);
    input(true);
    for (let i = 0; i < 60; i++) input(false);
    check('holding the slot arms once instead of toggling each frame', instanceTriggerArmed(r.cleave));
    r.p.useLock = 0.9; input(true);
    check('a second press disarms without shortening existing action recovery', !instanceTriggerArmed(r.cleave) && r.p.useLock === 0.9);
  }
} finally { restore(); }
console.log(`Cleave: ${failures} failures`);
if (failures) process.exitCode = 1;
