import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { mod } from '../src/engine/stats';
import { STATUS_DEFS } from '../src/engine/status';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import { companionBondOf } from '../src/engine/companionSpec';
import { companionCanMimic } from '../src/engine/companionBonds';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { SUPPORTS } from '../src/data/supports';
import { BEAST_FAMILIES, BEAST_FAMILY_BY_ID } from '../src/data/beastFamilies';
import { COMPANION_SKILLS } from '../src/data/companionSkills';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';

let passed = 0, failed = 0;
const check = (name: string, ok: unknown) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); ok ? passed++ : failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.0001;
const left = ['gentle_claim', 'gentle_pour', 'gentle_instinct', 'gentle_return'];
const art = ['gentle_claim', 'focused_claim', 'returning_claim'];
const pack = ['swift_claim', 'swift_instinct', 'swift_pour', 'swift_return'];
function setup(nodes: string[] = []) {
  const w = makeSimWorld('tamer', 74231), p = w.player;
  for (const key of Object.keys(w.meta.baseAttrs) as (keyof typeof w.meta.baseAttrs)[]) w.meta.baseAttrs[key] = 100;
  const inst = makeSkillInstance(SKILLS.tame_beast, 20, 3);
  w.meta.knownSkills.set(inst.def.id, inst); p.skills.fill(null); p.skills[0] = inst;
  for (const id of nodes) w.pickTreeNode(inst.def.id, id);
  w.recalcPlayer();
  p.sheet.setSource('rig', [mod('mana', 'flat', 10000), mod('life', 'flat', 10000), mod('lifeRegen', 'override', 0), mod('accuracy', 'flat', 100000), mod('critChance', 'override', 0)]);
  p.fillResources(); return { w, p, inst };
}
function tick(w: World, seconds: number, ai = false) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) {
    if (ai) for (const a of w.actors) if (a !== w.player) updateAI(a, w, 1 / 60);
    w.update(1 / 60);
  }
}
function body(w: World, id = 'plains_wolf', x = 60) {
  const a = w.createMonster(id, 1, 'enemy');
  a.pos = { x: w.player.pos.x + x, y: w.player.pos.y }; a.tier = w.player.tier;
  a.sheet.setSource('rig', [mod('life', 'flat', 10000), mod('lifeRegen', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('accuracy', 'flat', 100000), mod('critChance', 'override', 0)]);
  w.springAmbush(a, true); a.untargetable = false; a.fillResources(); w.actors.push(a); return a;
}
function pet(s: ReturnType<typeof setup>, id = 'plains_wolf', x = 50) {
  const a = body(s.w, id, x); s.w.tameCompanion(s.p, a, s.inst.def.id); s.w.companionBonds.refresh(); return a;
}
function cast(w: World, a: Actor, inst: SkillInstance, target: Actor) {
  a.casting = null; a.useLock = 0; a.cooldowns.clear();
  const used = w.useSkill(a, inst, target.pos, true);
  for (let i = 0; i < 400 && a.casting; i++) { (a as Actor).casting!.held = true; (a as Actor).casting!.aim = { ...target.pos }; tick(w, 1 / 60); }
  return used;
}
const strike = () => makeSkillInstance({ ...SKILLS.claw, baseDamage: { physical: [100, 100] }, effects: [{ type: 'damage' }] }, 1);
function hit(w: World, a: Actor, target: Actor, inst = strike()) {
  const before = target.life;
  (w as unknown as { resolveHit(a: Actor, s: SkillInstance, t: Actor, m: number, d: number): void }).resolveHit(a, inst, target, 1, 0);
  return before - target.life;
}
function reset(s: ReturnType<typeof setup>) {
  s.w.fonts.push({ pos: { ...s.p.pos } }); s.w.meta.abilityEssences.ability4 = 999;
  return s.w.fontResetTree(s.inst.def.id);
}
const restore = seedGlobalRandom(74231);
try {
  const beasts = Object.values(MONSTERS).filter(m => m.tags?.includes('beast'));
  const members = BEAST_FAMILIES.flatMap(f => f.members);
  check('Every beast species has exactly one explicit family', beasts.every(m => members.filter(id => id === m.id).length === 1));
  check('Every family membership names a real beast', members.every(id => MONSTERS[id]?.tags?.includes('beast')));
  check('All family arts and statuses are registered', BEAST_FAMILIES.every(f => SKILLS[f.skillId]) && Object.values(COMPANION_SKILLS).every(s => s.effects.every(f => f.type !== 'status' || STATUS_DEFS[f.status])));
  {
    const s = setup(['gentle_claim']), a = body(s.w); const random = Math.random; Math.random = () => 0.999;
    cast(s.w, s.p, s.inst, a); Math.random = random;
    check('Sovereign Bond claims ordinary beasts at full life even on worst roll', a.companion);
  }
  for (const fraction of [0.5, 0.51]) {
    const s = setup(['gentle_claim']), a = body(s.w); s.w.promoteMonster(a, 'rare'); a.life = a.maxLife() * fraction;
    const random = Math.random; Math.random = () => 0.999; cast(s.w, s.p, s.inst, a); Math.random = random;
    check(`Rare certainty boundary at ${fraction}`, a.companion === (fraction <= 0.5));
  }
  const boss = beasts.find(m => m.boss)!;
  check('Beast catalog includes capturable boss content', boss);
  for (const [nodes, fraction, expected] of [[['gentle_claim'], 0.05, false], [['gentle_claim', 'focused_claim', 'frugal_claim'], 0.1, true], [['gentle_claim', 'focused_claim', 'frugal_claim'], 0.11, false]] as [string[], number, boolean][]) {
    const s = setup(nodes), a = body(s.w, boss.id); a.life = a.maxLife() * fraction;
    const huntState = s.w as unknown as { huntBeast: Actor | null };
    if (expected) { a.tag = 'hunt_beast'; huntState.huntBeast = a; }
    cast(s.w, s.p, s.inst, a);
    check(`Boss capture gate: apex=${nodes.length > 1}, life=${fraction}`, a.companion === expected);
    if (expected) check('Capturing a hunt boss resolves the live hunt without killing the pet', huntState.huntBeast === null && !a.dead);
  }
  {
    const s = setup(['swift_claim']), a = body(s.w); a.life *= 0.4; cast(s.w, s.p, s.inst, a);
    check('First of two bonds leaves Tame Beast on the bar', s.w.slotFaceOf(s.p, s.inst).id === 'tame_beast');
    s.w.kill(a); a.pos.x += 500; tick(s.w, 19);
    check('Below-cap pet remains down until its passive revival finishes', a.downed && !a.dead);
    tick(s.w, 1.1); check('Below-cap pet revives at full life without Whistle', !a.downed && near(a.life, a.maxLife()));
    const b = body(s.w); b.life *= 0.4; cast(s.w, s.p, s.inst, b);
    check('Filling both bonds converts the actual slot to Whistle', b.companion && s.w.slotFaceOf(s.p, s.inst).id === 'companion_whistle');
    s.w.kill(a); s.w.kill(b); cast(s.w, s.p, s.inst, s.p);
    check('Whistle revives and fully heals the whole litter', [a, b].every(p => !p.downed && near(p.life, p.maxLife())));
    reset(s); check('Cap respec retains extra bonds dormant and prevents revival exploits', b.companionDormant && b.downed && s.w.companionCapOf(s.inst) === 1);
    cast(s.w, s.p, s.inst, s.p); check('Whistle cannot awaken a companion above the current cap', b.downed && b.companionDormant);
    s.w.pickTreeNode(s.inst.def.id, 'swift_claim'); tick(s.w, 20.1);
    check('Restoring capacity makes the remembered extra companion available again', !b.companionDormant && !b.downed);
  }
  {
    const s = setup(left), a = pet(s), target = body(s.w);
    s.inst.sockets.length = 0; s.w.recalcPlayer();
    s.p.gainCharge('fury', 1, 3); tick(s.w, 0.05);
    check('Shared Instinct transfers owner Fury to beast', a.charges.get('fury') === 1);
    a.gainCharge('rage', 1, 3); tick(s.w, 0.05);
    check('Shared Instinct transfers beast Rage to owner exactly once', s.p.charges.get('rage') === 1 && a.charges.get('rage') === 1);
    check('Innate sympathy works on a skill with no support sockets', s.inst.sockets.length === 0);
    const random = Math.random; Math.random = () => 0; hit(s.w, a, target); Math.random = random;
    tick(s.w, 0.05);
    check('Beast attacks generate and share Frenzy', a.charges.get('frenzy') === 1 && s.p.charges.get('frenzy') === 1);
    check('Beast damaging attack can shed a life orb', s.w.orbs.some(o => o.kind === 'life'));
    a.life = a.maxLife() * 0.5; s.p.life = s.p.maxLife() * 0.5;
    const own = s.p.life, animal = a.life; hit(s.w, a, target); const healing = a.life - animal; tick(s.w, 0.05);
    check('Five-percent life leech heals beast and returns half the actual healing', healing > 0 && near(s.p.life - own, healing * 0.5));
    a.life = a.maxLife(); const full = s.p.life; hit(s.w, a, target); tick(s.w, 0.05);
    check('An unwounded beast does not manufacture owner healing from overheal', near(s.p.life, full));
    check('Innate sustain uses no grafted supports', !s.inst.grafts?.length);
    const flask = makeSkillInstance(SKILLS.life_flask, 1); s.p.skills[1] = flask;
    const pour = () => { a.life *= 0.5; s.p.life *= 0.5; a.restoreStreams.length = 0; s.p.restoreStreams.length = 0; s.p.gainCharge('flask_life', 1, 3); cast(s.w, s.p, flask, s.p); tick(s.w, 0.05); return a.restoreStreams[0]?.remaining / s.p.restoreStreams[0]?.remaining; };
    check('Innate Abundant Bond adds full flask sympathy', Math.abs(pour() - 2) < 0.02);
    const alpha = Object.values(SUPPORTS).find(g => g.name === "Alpha's Bond" || g.name === 'Alpha’s Bond')!;
    check('Alpha support exists for deliberate stacking', alpha);
    if (alpha) { s.inst.sockets[0] = { def: alpha, level: 1 }; s.w.recalcPlayer(); check('A real socketed Alpha Bond stacks with innate sympathy', pour() > 2); }
  }
  {
    const s = setup(['swift_claim']), a = pet(s); s.w.kill(a); a.pos.x += 600; tick(s.w, 7);
    const saved = serializeCharacter(s.w), loaded = setup(['swift_claim']);
    loaded.w.restoreCompanions(saved.companions!); const b = loaded.w.actors.find(a => a.companion)!; b.pos.x += 600;
    check('Save and load preserve remaining passive revival time', near(a.companionReviveRemaining!, b.companionReviveRemaining!));
    tick(loaded.w, 12); check('Loading does not prematurely revive a pet', b.downed);
    tick(loaded.w, 1.1); check('Loaded revival finishes on the retained countdown', !b.downed);
  }
  {
    const s = setup(pack), a = pet(s), foreign = body(s.w, 'plains_wolf', 180);
    foreign.team = 'player'; foreign.skills = [makeSkillInstance(SKILLS.tame_beast, 20, 3)]; foreign.skills[0]!.treeNodes = [...pack];
    const b = body(s.w, 'plains_wolf', 200); s.w.tameCompanion(foreign, b, 'tame_beast'); s.w.companionBonds.refresh();
    const foe = body(s.w); hit(s.w, b, foe);
    check('A foreign beast prepares only its own keeper', [...foreign.buffs.keys()].some(k => k.endsWith(':rally')) && ![...s.p.buffs.keys()].some(k => k.endsWith(':rally')));
    s.w.executeSkill(foreign, strike(), foe.pos); reset(s);
    check('Resetting one keeper preserves another keeper’s queued copy', s.w.pendingRepeats.some(r => r.caster === b) && !s.w.pendingRepeats.some(r => r.caster === a));
  }
  {
    const s = setup(pack), a = pet(s), b = pet(s, 'plains_wolf', 75), target = body(s.w);
    const rally = () => [...s.p.buffs.entries()].find(([id]) => id.includes('companion_bond:') && id.endsWith(':rally'))?.[1];
    for (let i = 0; i < 6; i++) hit(s.w, a, target);
    check('Beast attacks cap owner preparation at five with Crescendo', rally()?.stacks === 5);
    const base = hit(s.w, s.p, target), unbuffed = hit(s.w, s.p, target);
    check('Prepared owner hit consumes all stacks and increases real damage', !rally() && base > unbuffed);
    check('Consuming capped owner preparation frenzies both companions and grants Pursuit', [a, b].every(p => [...p.buffs.keys()].some(k => k.endsWith(':frenzy')) && p.skills.some(i => i?.def.id === 'beast_pursuit')));
    for (let i = 0; i < 5; i++) hit(s.w, s.p, target);
    hit(s.w, a, target);
    check('Consuming capped beast preparation frenzies the owner', [...s.p.buffs.keys()].some(k => k.endsWith(':frenzy')));
    tick(s.w, 5.2);
    check('Temporary Pursuit disappears after frenzy ends', [a, b].every(p => !p.skills.some(i => i?.def.id === 'beast_pursuit')));
    const melee = strike(); check('Ordinary melee attack is teachable', companionCanMimic(melee));
    s.w.executeSkill(s.p, melee, target.pos);
    check('One owner melee cast queues one learned copy per beast', s.w.pendingRepeats.filter(r => r.caster.companion).length === 2);
    s.w.executeSkill(s.p, melee, target.pos);
    check('Learned copies respect their independent cooldowns', s.w.pendingRepeats.filter(r => r.caster.companion).length === 2);
    const life = target.life; tick(s.w, 0.2);
    check('Learned melee copies land actual damage', target.life < life);
    tick(s.w, 6); s.w.executeSkill(s.p, melee, target.pos); reset(s);
    check('Respec cancels queued learned copies and removes bond buffs', !s.w.pendingRepeats.some(r => r.caster.companion) && ![s.p, a, b].some(p => [...p.buffs.keys()].some(k => k.startsWith('companion_bond:'))));
  }
  {
    const s = setup(['swift_claim', 'repeat_claim', 'light_claim', 'steady_claim']);
    const pets = [pet(s), pet(s), pet(s)];
    check('Third of the Litter raises capacity to three', s.w.companionCapOf(s.inst) === 3);
    const target = body(s.w); pets[1].pos.x += 600; pets[2].pos.x += 600;
    let life = target.life; tick(s.w, 0.05); const first = life - target.life;
    life = target.life; tick(s.w, 1.01); const second = life - target.life;
    check('Dread exposure ramps real damage on a stationary enemy', first > 0 && second > first);
    target.pos.x += 400; tick(s.w, 0.1); target.pos.x -= 400; life = target.life; tick(s.w, 1.01);
    check('Leaving a beast aura resets its exposure ramp', near(life - target.life, first));
    check('At three bonds the slot displays Rallying Whistle', s.w.slotFaceOf(s.p, s.inst).id === 'beast_rallying_whistle');
    pets.forEach(p => s.w.kill(p)); cast(s.w, s.p, s.inst, target);
    check('Rallying Whistle still revives and heals every beast', pets.every(p => !p.downed && near(p.life, p.maxLife())));
    life = target.life; tick(s.w, 0.1);
    check('Rallying Whistle commands beasts and emits actual damage pulses', target.life < life && pets.every(p => p.aiCommand?.kind === 'assault'));
  }
  {
    const s = setup(art), a = pet(s); s.w.promoteMonster(a, 'rare', 2, { distinctName: 'Remembered Fang' });
    s.w.kill(a); const save = serializeCharacter(s.w); const restored = setup(art);
    restored.w.restoreCompanions(save.companions!); const b = restored.w.actors.find(p => p.companion)!;
    check('Rare companion load preserves exact rarity, name and stacked affixes', b.rarity === a.rarity && b.name === a.name && JSON.stringify(b.sheet.getSourceMods('rarity')) === JSON.stringify(a.sheet.getSourceMods('rarity')) && JSON.stringify(b.sheet.getSourceMods('rarityStack1')) === JSON.stringify(a.sheet.getSourceMods('rarityStack1')));
    check('Saved companion rebuild grants its family art and taunt', b.skills.some(s => s?.def.id === BEAST_FAMILY_BY_ID.get(b.defId!)!.skillId) && b.skills.some(s => s?.def.id === 'beast_defiant_roar'));
    check('Tree save rebuild retains all new companion mechanics', JSON.stringify(companionBondOf(rebuildSkill(save.knownSkills.find(k => k.skillId === 'tame_beast')!)!)) === JSON.stringify(companionBondOf(s.inst)));
    reset(restored); check('Removing Ancestral Art removes the actual granted ability', !b.skills.some(s => s?.def.id.startsWith('beast_')));
  }
  for (const family of BEAST_FAMILIES) {
    const s = setup(art), a = pet(s, family.members[0]), target = body(s.w);
    const special = a.skills.find(i => i?.def.id === family.skillId)!;
    check(`${family.name}: family art is granted to a real beast`, special);
    a.skills = [special]; a.useLock = 0; a.pos = { x: target.pos.x - 45, y: target.pos.y };
    tick(s.w, 2, true);
    check(`${family.name}: companion AI autonomously uses its art`, a.cooldowns.has(family.skillId) || a.casting?.inst === special);
  }
  {
    const s = setup(['claim_practice', 'claim_practice', 'claim_practice', 'claim_practice']), a = pet(s), plain = setup(), b = pet(plain);
    check('Practiced Keeping increases actual companion life and damage', a.maxLife() > b.maxLife() && a.sheet.get('damage') > b.sheet.get('damage'));
    const tank = setup(['gentle_claim', 'focused_claim']), t = pet(tank), foe = body(tank.w);
    check('Guardian Beast doubles real threat generation', near(t.sheet.get('threatGen'), 2));
    cast(tank.w, t, t.skills.find(i => i?.def.id === 'beast_defiant_roar')!, foe);
    check('Defiant Roar actually taunts nearby enemies', foe.statuses.some(st => st.id === 'taunted'));
  }
} finally { restore(); }
console.log(`Tame Beast: ${passed} passed, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
