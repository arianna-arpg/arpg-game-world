import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { STATUS_DEFS, statusRuptureRadius } from '../src/engine/status';
import { statusVoiceOf } from '../src/engine/statusVoice';
import { armedCueProfile, armedCueStyle, armedStatusCues } from '../src/engine/armedCues';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { SIM_TAP } from '../src/engine/tap';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { drawArmedCues } from '../src/render/vis/armedCueLayer';
import { drawEffectVoice } from '../src/render/vis/effectVoice';
import { combatCueFlash } from '../src/engine/combatCues';
import '../src/render/vis/combatCueLayer';

seedGlobalRandom(0xd00c);
let count = 0;
const check = (name: string, ok: boolean) => { assert.ok(ok, name); count++; console.log('PASS ' + name); };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-7;
function rig() {
  const w = makeSimWorld('warrior', 0xd00c), p = w.player;
  const e = w.createMonster('zombie', 1, 'enemy');
  w.actors = [p, e]; p.pos = { x: 500, y: 500 }; e.pos = { x: 580, y: 500 };
  for (const a of [p, e]) {
    a.skills = []; a.casting = null; a.statuses = [];
    a.sheet.setSource('doom-cue-rig', [mod('life', 'override', 1000), mod('mana', 'override', 10000), mod('accuracy', 'override', 100000),
      mod('damage', 'override', 1), mod('damageTaken', 'override', 1),
      ...['armor', 'evasion', 'blockChance', 'critChance', 'lifeRegen', 'chaosRes', 'energyShield', 'doomDot'].map(s => mod(s, 'override', 0))]);
    a.fillResources(); a.tier = p.tier;
  }
  const captions: string[] = [], emit = w.text.bind(w);
  w.text = (...args) => { captions.push(args[1]); emit(...args); };
  const hit = makeSkillInstance({ ...SKILLS.word_of_doom, requirements: undefined, manaCost: 0, useTime: 0,
    baseDamage: { chaos: [1, 1] }, innateMods: [], effects: [{ type: 'damage' }] });
  const arm = (amount = 200, scale = 1, radius = 90) => e.applyStatus('doom', 0, scale, p.name,
    { rupture: amount, ruptureType: 'chaos', ruptureRadius: radius, casterId: p.id });
  return { w, p, e, hit, arm, captions };
}

{
  const { e, arm } = rig();
  check('unafflicted body is quiet', !armedStatusCues(e).length);
  arm(0); check('unarmed Doom has no invented payload warning', !armedStatusCues(e).length); e.endStatus('doom');
  arm(120, 2, 130); const s = e.statuses[0];
  let cue = armedStatusCues(e)[0];
  check('initial bank reads current life, full original fuse and actual radius', near(cue.charge, 0.12) && cue.fuse === 0 && cue.radius === 130);
  s.remaining = 6; cue = armedStatusCues(e)[0];
  check('scaled fixed fuse reaches halfway at six of twelve seconds', cue.fuse === 0.5);
  arm(80); cue = armedStatusCues(e)[0];
  check('reapplication tightens bank without restarting original fuse', near(cue.charge, 0.2) && cue.fuse === 0.5 && s.remaining === 6 && s.total === 12);
  e.life = 400; check('lost life tightens the same iris', armedStatusCues(e)[0].charge === 0.5);
  e.life = 800; check('healing loosens the same iris', armedStatusCues(e)[0].charge === 0.25);
  const before = JSON.stringify({ statuses: e.statuses, life: e.life, es: e.es });
  for (let i = 0; i < 10; i++) armedStatusCues(e);
  check('presentation cannot spend damage or advance clocks', before === JSON.stringify({ statuses: e.statuses, life: e.life, es: e.es }));
  check('Doom no longer gets an unrelated generic blessing wink', statusVoiceOf(STATUS_DEFS.doom) === false);
  e.endStatus('doom'); e.applyStatus('impaled', 0, 1, 'probe', { rupture: 100 });
  check('Impale banks keep their own steel identity', !armedStatusCues(e).length);
  check('rupture radius preserves the legacy default and explicit zero', statusRuptureRadius({}) === 90 && statusRuptureRadius({ ruptureRadius: 0 }) === 0);
}
{
  const { w, p, e } = rig();
  p.sheet.setSource('doom-cue-area', [mod('aoeRadius', 'override', 1.5)]);
  const word = makeSkillInstance({ ...SKILLS.word_of_doom, requirements: undefined, manaCost: 0, useTime: 0, baseDamage: { chaos: [10, 10] } });
  w.executeSkill(p, word, e.pos, { targetInfo: { actor: e, pos: { ...e.pos } } });
  const s = e.statuses.find(s => s.id === 'doom')!;
  check('real Word of Doom creates an attributable armed cue', !!s && s.casterId === p.id && armedStatusCues(e).length === 1);
  check('real area investment reaches the warning boundary', armedStatusCues(e)[0].radius === s.ruptureRadius && s.ruptureRadius === 135);
  s.remaining -= 1; const bank = s.rupture!, fuse = armedStatusCues(e)[0].fuse;
  w.executeSkill(p, word, e.pos, { targetInfo: { actor: e, pos: { ...e.pos } } });
  check('real repeated Word adds payload on the fixed fuse', s.rupture! > bank && armedStatusCues(e)[0].fuse === fuse);
}
{
  const { e, arm } = rig(), id = 'probe_doomcue_custom';
  STATUS_DEFS[id] = { label: 'Custom cull', duration: 4, color: STATUS_DEFS.doom.color, cullsAtLethal: true };
  try {
    arm(200); e.applyStatus(id, 0, 1, 'probe', { rupture: 100 });
    check('custom cull status inherits the universal cue and shares the mechanical threshold', armedStatusCues(e).length === 1 && near(armedStatusCues(e)[0].charge, 0.3));
    const before = JSON.stringify(armedStatusCues(e)); e.statuses.reverse();
    check('status ordering cannot shuffle cue composition', JSON.stringify(armedStatusCues(e)) === before);
    STATUS_DEFS[id].armedCue = '__proto__';
    check('unknown profile names retain the safe fallback', armedCueStyle(armedCueProfile(STATUS_DEFS[id])!) === armedCueStyle('doom'));
    STATUS_DEFS[id].armedCue = false;
    check('opt-out suppresses its picture without falsifying the shared cull threshold', armedStatusCues(e).length === 1 && near(armedStatusCues(e)[0].charge, 0.3));
    e.endStatus('doom'); check('opted-out custom status paints no inherited cue', !armedStatusCues(e).length);
  } finally { delete STATUS_DEFS[id]; }
}
{
  const { w, p, e, hit, arm, captions } = rig();
  const kin = w.createMonster('zombie', 1, 'enemy'), far = w.createMonster('zombie', 1, 'enemy');
  for (const [a, gap] of [[kin, -1], [far, 1]] as const) {
    a.radius = 10; a.pos = { x: e.pos.x + 90 + a.radius + gap, y: e.pos.y }; a.tier = e.tier;
    a.sheet.setSource('doom-cue-rig', [mod('life', 'override', 1000), mod('chaosRes', 'override', 0), mod('damageTaken', 'override', 1)]);
    a.fillResources(); a.skills = []; w.actors.push(a);
  }
  arm(400); e.life = 350;
  let credited = false; const previous = SIM_TAP.current;
  SIM_TAP.current = { onDeath: (a, killer) => { if (a === e) credited = killer === p; } };
  try { w.executeSkill(p, hit, e.pos, { targetInfo: { actor: e, pos: { ...e.pos } } }); } finally { SIM_TAP.current = previous; }
  const flash = w.flashes.find(f => f.combatCue?.style === 'doom_rupture');
  check('real early detonation kills with the original caster credit', e.dead && credited);
  check('Doom outcome freezes the actual origin, radius and status color', !!flash && flash.pos.x === e.pos.x && flash.radius === 90 && flash.color === STATUS_DEFS.doom.color);
  check('actual overlap boundary and damage are unchanged', near(kin.life, 600) && far.life === 1000 && p.life === 1000);
  check('spent/dead bank drops its sustained warning', !armedStatusCues(e).length && !e.statuses.some(s => s.id === 'doom'));
  check('early detonation no longer emits the DOOM caption', !captions.includes('DOOM!'));
  const pos = flash!.pos.x; e.pos.x += 100; check('outcome stays at resolved origin after victim movement', flash!.pos.x === pos);
}
for (const event of ['expiry', 'death', 'cleanse', 'downed'] as const) {
  const { w, p, e, arm } = rig(); arm(100, event === 'expiry' ? 0.001 : 1);
  if (event === 'expiry') w.update(0.02);
  if (event === 'death') w.kill(e, false, p);
  if (event === 'cleanse') e.endStatus('doom');
  if (event === 'downed') e.downed = true;
  check(event + ' clears worn Doom geometry', !armedStatusCues(e).length);
  check(event + ' creates a rupture only when mechanically due', w.flashes.some(f => f.combatCue?.style === 'doom_rupture') === (event === 'expiry' || event === 'death'));
  if (event === 'expiry') check('expiry preserves the bank damage', near(e.life, 900));
}
{
  const { w, p, e, arm } = rig(); arm(250, 2, 140); e.statuses[0].remaining = 3;
  p.applyStatus('doom', 0, 1, 'probe', { rupture: 50, ruptureRadius: 75 });
  const client = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
  const mirror = client.actors[snap.actors.findIndex(a => a.id === e.id)];
  check('co-op receives exact enemy charge, fixed-fuse progress and radius without bank simulation', JSON.stringify(armedStatusCues(mirror)) === JSON.stringify(armedStatusCues(e)) && mirror.statuses[0].rupture === undefined);
  check('co-op player body also receives its own armed state', JSON.stringify(armedStatusCues(client.player)) === JSON.stringify(armedStatusCues(p)));
  w.flashes.push(combatCueFlash(e.pos, 'doom_rupture', 140)); applySnapshot(client, serializeSnapshot(w, 2));
  check('co-op carries the resolved rupture style and radius', client.flashes.some(f => f.combatCue?.style === 'doom_rupture' && f.radius === 140));
  e.endStatus('doom'); p.endStatus('doom'); w.flashes = []; applySnapshot(client, serializeSnapshot(w, 3));
  check('snapshot replacement clears cured warnings and spent flashes', !armedStatusCues(mirror).length && !armedStatusCues(client.player).length && !mirror.armedCues && !client.flashes.length);
}
{
  let depth = 0, paths = 0; const radii: number[] = [];
  const ctx = new Proxy({ save: () => { depth++; }, restore: () => { depth--; }, beginPath: () => { paths++; }, arc: (_x: number, _y: number, r: number) => { radii.push(r); } },
    { get: (o, key) => key in o ? o[key as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;
  drawArmedCues(ctx, 16, [{ profile: 'doom', color: '#888888', charge: 0.8, fuse: 0.6, radius: 140 }], 2);
  check('monochrome warning draws its real boundary and restores canvas state', paths > 0 && radii.includes(140) && depth === 0);
  for (const remaining of [1, 0.7, 0.1]) drawEffectVoice(ctx, 'combatCue', combatCueFlash({ x: 0, y: 0 }, 'doom_rupture', 140, 0, '#888888'), remaining);
  check('all rupture phases balance canvas state', depth === 0 && paths > 30);
}
check('retired Doom emitter stays absent', !readFileSync(new URL('../src/engine/world.ts', import.meta.url), 'utf8').includes("'DOOM!'"));
console.log(`PASS ${count} Doom cue checks`);
