import { strict as assert } from 'node:assert';
import { makeSimWorld } from '../src/sim/arena';
import { mod } from '../src/engine/stats';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { COMBO_CFG } from '../src/engine/sequence';
import { comboConditionRows } from '../src/engine/comboConditions';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { drawComboConditions } from '../src/render/vis/comboConditionLayer';

let checks = 0;
const check = (name: string, ok: boolean) => { assert.ok(ok, name); checks++; console.log('PASS ' + name); };
const w = makeSimWorld('sorcerer', 85085), p = w.player;
w.actors = [p]; p.skills = []; p.pos = { x: 500, y: 500 };
const rows = () => comboConditionRows(p, w.time);
const varied = () => rows().find(r => r.id === 'comboVaried')!;
const repeated = () => rows().find(r => r.id === 'comboRepeated')!;
const tick = (dt: number) => { w.time += dt; p.updateTimers(dt); };
const cast = (id: string, repeat = false) => {
  assert.ok(w.executeSkill(p, makeSkillInstance(SKILLS[id]), { x: 900, y: 500 }, { noRepeat: repeat }));
  p.updateTimers(0);
};
check('uninvested build has no condition readout', rows().length === 0);
p.sheet.setSource('conditional-build', [
  mod('damage', 'increased', .14, undefined, 'comboVaried'),
  mod('castSpeed', 'increased', .08, undefined, 'comboRepeated'),
]);
check('a live modifier equips both native conditions before any cast', rows().length === 2 && varied().lit === 0 && repeated().lit === 0);
cast('spark'); tick(.3); cast('frost_nova');
check('two distinct native casts show progress without a paid bonus', varied().lit === 2 && varied().remaining === 0 && !p.sheet.hasCondition('comboVaried'));
cast('frost_nova');
check('duplicate breaks variety but advances repetition', varied().lit === 1 && repeated().lit === 2);
cast('frost_nova');
check('third repeat shows exactly the engine condition clock', repeated().remaining === COMBO_CFG.conditionWindow && p.sheet.hasCondition('comboRepeated'));
const seq = p.castSeq; cast('spark', true);
check('triggered repeat cannot change condition or history', p.castSeq === seq && repeated().remaining === COMBO_CFG.conditionWindow);
tick(7);
check('native expiry leaves both readouts inactive and partial history empty', rows().every(r => r.lit === 0 && r.remaining === 0));
cast('spark'); tick(2); cast('frost_nova'); tick(2); cast('fireball');
check('third different cast activates actual damage modifier', varied().remaining === COMBO_CFG.conditionWindow && Math.abs(p.sheet.get('damage') - 1.14) < 1e-8);
tick(3);
check('active clock survives the oldest cast leaving its window', varied().lit === 2 && varied().remaining === 3 && p.sheet.hasCondition('comboVaried'));
p.sheet.setSource('wide-window', [mod('comboWindow', 'more', 10)]);
check('starter progress does not inherit the separate grammar window multiplier', varied().lit === 2);
const before = JSON.stringify([w.time, p.castRing, p.comboCondLeft, p.comboCondBits, p.sheet.get('damage')]);
for (let i = 0; i < 10; i++) rows();
check('readout never changes gameplay state', before === JSON.stringify([w.time, p.castRing, p.comboCondLeft, p.comboCondBits, p.sheet.get('damage')]));
const client = makeSimWorld('sorcerer', 44);
applySnapshot(client, serializeSnapshot(w, 1));
check('wire carries true remaining time without client history', client.player.castRing === null && comboConditionRows(client.player, client.time).find(r => r.id === 'comboVaried')?.remaining === 3);
cast('fireball');
check('a breaking real cast immediately removes the active varied condition', varied().remaining === 0 && !p.sheet.hasCondition('comboVaried'));
p.sheet.removeSource('conditional-build');
check('respec removes readouts immediately despite cached watcher', rows().length === 0);
applySnapshot(client, serializeSnapshot(w, 2));
check('absent rows explicitly clear reused network mirrors', client.player.comboConditionHud?.length === 0 && !comboConditionRows(client.player, client.time).length);
const skill = makeSkillInstance({ ...SKILLS.spark, innateMods: [mod('damage', 'increased', .3, undefined, 'comboVaried')] });
p.skills = [skill];
check('skill-local modifier equips the condition without a sheet grant', rows().length === 1 && varied().remaining === 0);
p.downed = true; check('downed character has no active readout', rows().length === 0);
p.downed = false; p.dead = true; check('dead character has no active readout', rows().length === 0);
p.dead = false; p.skills = [];
check('unequipping the local skill removes its readout', rows().length === 0);
let depth = 0;
const labels: { text: string; x: number; y: number; width: number }[] = [];
const ctx = new Proxy({ globalAlpha: .8, save: () => { depth++; }, restore: () => { depth--; },
  fillText: (text: string, x: number, y: number, width: number) => labels.push({ text, x, y, width }) },
  { get: (o, key) => key in o ? o[key as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;
drawComboConditions(ctx, 120, 200, 220, [
  { id: 'comboVaried', lit: 2, len: 3, remaining: 0 },
  { id: 'comboRepeated', lit: 3, len: 3, remaining: 4.2 },
]);
check('bounded separate rows label partial and actual active state', depth === 0 && labels.length === 2
  && labels[0].text === 'Varied casts · 2/3' && labels[1].text === 'Repeated casts · active 4.2s'
  && labels[0].y - labels[1].y === 20 && labels.every(r => r.width === 208));
console.log('PASS ' + checks + ' native combo condition checks');
