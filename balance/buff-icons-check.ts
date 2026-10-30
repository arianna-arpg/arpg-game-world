import { strict as assert } from 'node:assert';
import { makeSimWorld } from '../src/sim/arena';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance, type BuffEffect, type SkillInstance } from '../src/engine/skills';
import { buffWithSource } from '../src/engine/buffSource';
import { buffExpiryFraction, buffIconRect, buffAuxiliaryLift } from '../src/render/vis/buffIcons';
import { buffReadoutLines } from '../src/render/vis/buffReadout';
import { skillIconKey } from '../src/render/skillIcons';
import { VIS_CFG } from '../src/render/vis/visConfig';
import type { Actor } from '../src/engine/actor';

const w = makeSimWorld('warrior', 12345), p = w.player;
const cast = (id: string) => {
  const inst = makeSkillInstance({ ...SKILLS[id], requirements: undefined, useTime: 0, manaCost: 0 });
  p.casting = null; p.useLock = 0; p.cooldowns.clear();
  assert.ok(w.useSkill(p, inst, p.pos, true), id + ' cast succeeds');
  return inst;
};
const warCry = cast('war_cry');
let buff = p.buffs.get('war_cry')!;
assert.equal(buff.def.sourceSkill?.id, 'war_cry');
assert.equal(skillIconKey(buff.def.sourceSkill!), skillIconKey(warCry.def));
assert.equal((SKILLS.war_cry.effects![0] as BuffEffect).sourceSkill, undefined, 'registry remains untouched');
assert.deepEqual(buffReadoutLines('war_cry', buff), buffReadoutLines('war_cry', { ...buff, def: SKILLS.war_cry.effects![0] as BuffEffect }));
assert.equal(buffExpiryFraction(buff), 0);
p.updateTimers(3.5);
assert.equal(buffExpiryFraction(buff), .5, 'six second buff is half gray at 2.5 seconds');
cast('war_cry'); buff = p.buffs.get('war_cry')!;
assert.equal(buffExpiryFraction(buff), 0, 'refresh restores color');
assert.equal(buff.remaining, 6, 'presentation never changes duration');
p.updateTimers(6.1);
assert.ok(!p.buffs.has('war_cry'), 'native expiry removes the icon source');

const api = w as unknown as { applyBuffEffect(a: Actor, inst: SkillInstance, fx: BuffEffect, durScale: number, power: number): void };
const ally = w.createMonster('zombie', 1, p.team); ally.pos = { ...p.pos }; ally.tier = p.tier; w.actors.push(ally);
const custom = makeSkillInstance({ ...SKILLS.war_cry, id: 'mod_blessing', name: 'Mod Blessing', icon: 'heal', color: '#21e467' });
const effect: BuffEffect = { type: 'buff', id: 'shared_blessing', label: 'Shared blessing', duration: 4, mods: [], affects: 'allies', radius: 100 };
api.applyBuffEffect(p, custom, effect, 2, 1);
assert.equal(ally.buffs.get(effect.id)?.def.sourceSkill?.id, custom.def.id, 'ally receives actual source without owning skill');
assert.equal(ally.buffs.get(effect.id)?.remaining, 8);
assert.equal(effect.sourceSkill, undefined);
const shared = p.buffs.get(effect.id)!;
assert.equal(skillIconKey(shared.def.sourceSkill!), 'heal', 'runtime-authored icon survives without registration');
const relay = w.createMonster('zombie', 1, p.team);
relay.addBuff([...p.gainEvents].reverse().find(e => e.kind === 'buff' && e.id === effect.id)!.buff!);
assert.equal(relay.buffs.get(effect.id)?.def.sourceSkill?.id, custom.def.id, 'buff gain replay keeps source');
api.applyBuffEffect(p, warCry, effect, 1, 1);
assert.equal(p.buffs.get(effect.id)?.def.sourceSkill?.id, 'war_cry', 'shared refresh adopts its new source');
assert.equal(shared.def.sourceSkill?.id, 'war_cry');

const child = makeSkillInstance({ ...SKILLS.cloak, id: 'derived_payload' }); child.followUpHost = custom;
assert.equal(buffWithSource(effect, child).sourceSkill?.id, custom.def.id);
custom.followUpHost = child;
assert.ok(buffWithSource(effect, child).sourceSkill, 'cyclic authoring cannot hang presentation');
custom.followUpHost = undefined;
assert.equal(buffWithSource(effect), effect, 'unattributed effects remain unattributed');

const independent: BuffEffect = { ...effect, id: 'independent', affects: 'caster', stackTimers: 'independent', maxStacks: 3 };
p.addBuff(buffWithSource(independent, custom)); p.updateTimers(3); p.addBuff(buffWithSource(independent, custom));
buff = p.buffs.get('independent')!;
assert.ok(Math.abs(buffExpiryFraction(buff) - .2) < 1e-10, 'independent stacks use last expiry like hover');
p.updateTimers(1.5);
assert.equal(buff.stacks, 1); assert.equal(buffExpiryFraction(buff), .5);
for (const remaining of [Infinity, NaN, 999999, 5, 10]) assert.equal(buffExpiryFraction({ ...buff, expiries: undefined, remaining }), 0);
assert.equal(buffExpiryFraction({ ...buff, expiries: undefined, remaining: 0 }), 1);
assert.equal(buffExpiryFraction(buff, 0), 0, 'config can disable warning');
assert.equal(buffExpiryFraction({ ...buff, expiries: undefined, remaining: 1 }, 2), .5);

for (const width of [108, 210, 420]) {
  const rectangles = Array.from({ length: 35 }, (_, i) => buffIconRect(i, 50, 300, width));
  for (const [i, r] of rectangles.entries()) {
    assert.ok(r.x >= 50 && r.x + r.w <= 50 + width);
    for (const s of rectangles.slice(i + 1)) assert.ok(r.x + r.w <= s.x || s.x + s.w <= r.x || r.y + r.h <= s.y || s.y + s.h <= r.y);
  }
  const top = buffIconRect(34, 0, -VIS_CFG.buffIcons.barClearance, width).y;
  assert.ok(-46 - buffAuxiliaryLift(35, width) < top, 'auxiliary lane clears wrapped buffs');
}
console.log('PASS native cast, source refresh, allied and relayed buffs, runtime icons, hover parity, real expiry, independent stacks and bounded layout');
