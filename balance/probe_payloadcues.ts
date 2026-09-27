import { strict as assert } from 'node:assert';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { caromCapacity, payloadCueProfile, payloadCueRows, payloadCueStyle, payloadTransition } from '../src/engine/payloadCues';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { drawPayloadBody, drawPayloadHud, drawPayloadPlacements } from '../src/render/vis/payloadCueLayer';
import { mkdirSync, writeFileSync } from 'node:fs';

seedGlobalRandom(0x21021);
let checks = 0;
function check(name: string, ok: boolean) { assert.ok(ok, name); checks++; console.log('PASS ' + name); }
function rig(ids: string[]) {
  const w = makeSimWorld('warrior', 0x21021), p = w.player;
  w.actors = [p]; w.projectiles = []; w.flashes = []; p.pos = { x: 700, y: 700 };
  p.sheet.setSource('payload-rig', [mod('mana', 'override', 10000), mod('pourPrime', 'flat', 2), mod('critChance', 'override', 0)]);
  p.fillResources(); p.skills = ids.map(id => makeSkillInstance({ ...SKILLS[id], requirements: undefined, useTime: 0 }));
  const texts: string[] = [], original = w.text.bind(w);
  w.text = (...args) => { texts.push(args[1]); return original(...args); };
  const press = (inst: SkillInstance, x = 850, y = 700) => {
    p.casting = null; p.useLock = 0; p.reflexLock = 0; p.cooldowns.clear();
    return w.useSkill(p, inst, { x, y });
  };
  const rows = () => payloadCueRows(p, w);
  return { w, p, press, rows, texts };
}
{
  const { w, p, press, rows, texts } = rig(['life_flask']); const inst = p.skills[0]!;
  p.charges.set('flask_life', 3);
  check('no bank means no invented primed vessel', !rows().some(r => r.kind === 'prime'));
  check('actual drink banks and pays without healing', press(inst) && p.primedPours.length === 1 && !p.restoreStreams.length && p.charges.get('flask_life') === 2);
  check('world and HUD rows contain one corked vessel', rows()[0].count === 1 && payloadCueStyle(rows()[0])?.shape === 'vial');
  check('second paid drink shows two stored vessels', press(inst) && rows()[0].count === 2 && p.charges.get('flask_life') === 1);
  check('full bank refuses without another transition', !press(inst) && w.flashes.filter(f => f.combatCue?.style === 'payload_prime').length === 2);
  p.applyStatus('poison', 5, 1, 'probe'); w.update(0.05);
  check('real wound releases both payloads and clears worn vessels', !rows().some(r => r.kind === 'prime') && p.primedPours.length === 0 && p.restoreStreams.length >= 2);
  check('release has one source-colored gesture per paid drink', w.flashes.filter(f => f.combatCue?.style === 'payload_release').length === 2);
  check('primed and its redundant stream-start captions retired', !texts.some(t => /^(primed|drinking\.\.\.|sipping\.\.\.|charging\.\.\.)$/.test(t)));
  p.statuses = []; p.fillResources(); p.charges.set('flask_life', 3); press(inst); p.skills = [];
  check('unslotted drink cannot advertise a releasable payload', !rows().length);
  (w as unknown as { releasePrimedPours(a: typeof p): void }).releasePrimedPours(p);
  check('unslotted drink dissolves without a release cue', !p.primedPours.length && w.flashes.filter(f => f.combatCue?.style === 'payload_release').length === 2);
}
{
  const { w, p, press, rows, texts } = rig(['scattergun']); const inst = p.skills[0]!;
  const size = p.skillChargeState.size;
  check('charge presentation is a pure read of initially full ammunition', rows()[0].count === 3 && p.skillChargeState.size === size);
  check('real shot consumes one visible chamber', press(inst) && rows()[0].count === 2);
  p.skillChargeBank(inst).count = 0;
  const reload = makeSkillInstance({ ...SKILLS.reload_powder, useTime: 0 }); reload.hostSkillId = inst.def.id;
  check('real host reload fills the same bank', press(reload) && rows()[0].count === 3);
  const events = w.flashes.filter(f => f.combatCue?.style === 'payload_load').length;
  check('successful load has a single chamber-closing gesture', events === 1 && !texts.includes('loaded'));
  press(reload); check('full-bank reload does not fake a loaded round', w.flashes.filter(f => f.combatCue?.style === 'payload_load').length === events);
  inst.def = { ...inst.def, innateMods: [mod('skillCharges', 'flat', 9)] };
  check('capacity investment is reflected without filling unpaid chambers', rows()[0].cap === 12 && rows()[0].count === 3);
  inst.def = { ...inst.def, payloadCues: { ammo: false } }; p.skillChargeBank(inst).count = 0; press(reload);
  check('opt-out preserves actual refill and functional bank read', rows()[0].count === 12 && rows()[0].profile === false && w.flashes.filter(f => f.combatCue?.style === 'payload_load').length === events);
}
{
  const { p, press, rows } = rig(['firebolt']); const inst = p.skills[0]!;
  inst.sockets = [{ def: SUPPORTS.chambered_casting, level: 1 }];
  check('socket-granted ammunition inherits the same chambers', rows()[0].kind === 'ammo' && rows()[0].cap === 3 && rows()[0].profile === 'chamber');
  check('grafted cast spends a real displayed round', press(inst) && rows()[0].count === 2);
  inst.sockets = []; check('removing the ammunition graft removes its supplementary read', !rows().length);
}
{
  const { w, p, press, rows, texts } = rig(['caroms']); const inst = p.skills[0]!;
  inst.extraMods = [mod('projBounce', 'flat', 1)];
  check('instance investment changes the actual and displayed placement count', caromCapacity(p, inst) === 4 && rows()[0].cap === 4);
  press(inst, 800, 650); press(inst, 900, 650); press(inst, 900, 750);
  check('partial route keeps real anchored positions without firing early', rows()[0].points?.length === 3 && rows()[0].points![0].x === 800 && !w.projectiles.length);
  w.time += 2; check('visible window consumes the same four-second allowance', Math.abs(rows()[0].window! - 0.5) < 0.001);
  w.time += 2.01; check('expired points disappear before another press', rows()[0].count === 0);
  press(inst, 780, 620); check('stale route resets through the actual placement gate', rows()[0].count === 1 && inst.state?.anchors?.length === 1);
  press(inst, 900, 620); press(inst, 900, 780); press(inst, 780, 780);
  check('final anchor releases patrol projectiles and empties preparation', w.projectiles.length > 0 && rows()[0].count === 0 && w.projectiles[0].patrol?.points.length === 4);
  check('anchor count captions retired', !texts.some(t => /^anchor \d/.test(t)));
}
{
  const { w, p, press, rows, texts } = rig(['hanging_volley']); const inst = p.skills[0]!;
  for (const [x, y] of [[800, 600], [950, 600], [950, 800]]) press(inst, x, y);
  check('incomplete arrow set has sockets but no invented trigger reach', rows()[0].count === 3 && !rows()[0].ready && rows()[0].points!.every(p => p.radius === 0));
  press(inst, 800, 800);
  check('full set arms exact trigger circles on actual arrows', rows()[0].ready === true && rows()[0].points!.every(p => p.radius === 90) && w.pendingAmbushes.length === 1);
  inst.extraMods = [mod('projBounce', 'flat', 2)];
  check('already-armed set keeps its committed count after capacity investment', rows()[0].cap === 4 && rows()[0].count === 4 && rows()[0].ready === true);
  inst.extraMods = [];
  const originalDef = inst.def;
  inst.def = { ...inst.def, delivery: { type: 'self' } };
  check('changed equipped delivery cannot hide an already-live ambush', rows()[0].ready === true && rows()[0].points?.length === 4);
  inst.def = originalDef;
  const am = w.pendingAmbushes[0], arrow = w.actorById(am.arrowIds[0])!; arrow.pos.x += 30;
  check('moving an arrow moves its real trigger footprint', rows()[0].points![0].x === arrow.pos.x);
  p.skills = []; check('unequipping does not hide an existing live ambush', rows()[0].ready === true); p.skills = [inst];
  const e = w.createMonster('zombie', 1, 'enemy'); e.pos = { x: arrow.pos.x - 90 - e.radius - 0.01, y: arrow.pos.y }; e.tier = p.tier; w.actors.push(e);
  const sweep = () => (w as unknown as { updateAmbushes(): void }).updateAmbushes();
  sweep(); check('outside trigger footprint does not spring the arrows', w.pendingAmbushes.length === 1);
  e.pos.x += 0.02; sweep();
  check('real body overlap at the footprint springs the whole set', !w.pendingAmbushes.length && rows()[0].count === 0 && w.projectiles.length > 0);
  check('armed and arrow-count captions retired', !texts.some(t => t === 'armed' || /^arrow \d/.test(t)));
  w.actors = [p]; w.projectiles = [];
  for (let i = 0; i < 4; i++) press(inst, 820 + i * 40, 500);
  press(inst); check('manual repress releases and clears the same set', !w.pendingAmbushes.length && rows()[0].count === 0 && w.projectiles.length > 0);
  for (let i = 0; i < 4; i++) press(inst, 820 + i * 40, 500);
  w.actorById(w.pendingAmbushes[0].arrowIds[0])!.dead = true;
  check('broken set loses its armed read immediately', !rows().some(r => r.ready)); sweep();
  check('broken set is retired by the real lifecycle', !w.pendingAmbushes.length);
  for (let i = 0; i < 4; i++) press(inst, 820 + i * 40, 500);
  w.time = w.pendingAmbushes[0].deadline;
  check('expired ambush is not displayed as live', !rows().some(r => r.ready)); sweep();
  check('expired arrows actually retire', !w.pendingAmbushes.length && !w.minionsOfSkill(p, inst.def.id).length);
}
{
  const { w, p, press, rows } = rig(['caroms', 'scattergun']); press(p.skills[0]!, 850, 650); press(p.skills[1]!);
  const client = rig([]).w, snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
  check('co-op join receives exact placed points and paid ammunition', JSON.stringify(payloadCueRows(client.player, client)) === JSON.stringify(rows()));
  const hosted = snap.actors.find(a => a.id === p.id)!.payloadCues!;
  client.player.payloadCues![0].points![0].x += 1;
  check('client geometry does not alias the received snapshot', hosted[0].points![0].x === 850);
  p.skills = []; applySnapshot(client, serializeSnapshot(w, 2));
  check('snapshot removal clears reused actors rather than reconstructing stale skills', !payloadCueRows(client.player, client).length && client.player.payloadCues?.length === 0);
  const enemy = w.createMonster('zombie', 1, 'enemy'); enemy.skills = [makeSkillInstance(SKILLS.scattergun), makeSkillInstance(SKILLS.life_flask)];
  enemy.skillChargeBank(enemy.skills[0]!).count = 1; enemy.primedPours = [{ skillId: 'life_flask', chargesSpent: 1 }]; w.actors.push(enemy);
  const enemySnap = serializeSnapshot(w, 3); applySnapshot(client, enemySnap);
  const remote = client.actors[enemySnap.actors.findIndex(a => a.id === enemy.id)];
  check('enemy payloads replicate without client skills or drink simulation', payloadCueRows(remote, client).some(r => r.kind === 'ammo' && r.count === 1) && payloadCueRows(remote, client).some(r => r.kind === 'prime'));
  const inst = makeSkillInstance(SKILLS.caroms); inst.def = { ...inst.def, payloadCues: { carom: 'constructor' } };
  check('unknown/prototype profiles fall back safely', payloadCueProfile(inst, 'carom') === 'anchor');
  inst.def = { ...inst.def, payloadCues: { prime: false } };
  check('false profile suppresses transitions too', payloadTransition(p, inst, 'prime') === undefined);
}
{
  const { w, p, press, rows } = rig(['hanging_volley']); for (let i = 0; i < 4; i++) press(p.skills[0]!, 820 + i * 50, 500);
  let depth = 0; const circles: number[] = [];
  const ctx = new Proxy({ save: () => depth++, restore: () => depth--, arc: (_x: number, _y: number, r: number) => circles.push(r) },
    { get: (o, key) => key in o ? o[key as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;
  drawPayloadPlacements(ctx, rows()); drawPayloadBody(ctx, rows(), p.radius); drawPayloadHud(ctx, rows(), 0, 0, 44);
  check('painter draws four real trigger radii and restores state', circles.length === 4 && circles.every(r => r === 90) && depth === 0);
  circles.length = 0; drawPayloadPlacements(ctx, rows(), () => false);
  check('other-story visibility gate hides footprints and route links', !circles.length && depth === 0);
  p.dead = true; check('dead owner immediately loses all payload cues', !payloadCueRows(p, w).length);
}
console.log(`Completed ${checks} payload cue checks`);
mkdirSync(new URL('./reports/', import.meta.url), { recursive: true });
writeFileSync(new URL('./reports/payload-catalog.json', import.meta.url), JSON.stringify(
  ['life_flask', 'scattergun', 'reload_powder', 'caroms', 'hanging_volley'].map(id => SKILLS[id])));
