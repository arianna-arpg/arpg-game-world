import { strict as assert } from 'node:assert';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { makeSkillInstance, type RestoreOverTimeEffect, type SkillInstance } from '../src/engine/skills';
import type { Actor } from '../src/engine/actor';
import { updateAI } from '../src/engine/ai';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { feedingCueState, feedingCueFlash, feedingMaterial, noteRestoreGain } from '../src/engine/feedingCues';
import { FEEDING_CUE_CFG, FEEDING_CUE_STYLES } from '../src/data/feedingCues';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { drawFeedingBody, drawFeedingTransfer, drawRestoreHud } from '../src/render/vis/feedingCueLayer';
import { SIM_TAP } from '../src/engine/tap';

seedGlobalRandom(25025);
let checks = 0;
function check(label: string, ok: boolean) { assert.ok(ok, label); checks++; console.log('PASS ' + label); }
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
function rig() {
  const w = makeSimWorld('necromancer', 25025), p = w.player;
  w.actors = [p]; w.corpses = []; w.flashes = []; w.projectiles = [];
  p.pos = { x: 700, y: 700 };
  p.sheet.setSource('feeding-rig', [mod('life', 'override', 1000), mod('mana', 'override', 1000), mod('energyShield', 'override', 200),
    mod('lifeRegen', 'override', 0), mod('manaRegen', 'override', 0), mod('critChance', 'override', 0),
    mod('restorePower', 'override', 1), mod('effectDuration', 'override', 1), mod('healTaken', 'override', 1)]);
  p.fillResources(); p.esDelay = 99;
  const api = w as unknown as {
    startRestoreStream(target: Actor, caster: Actor, inst: SkillInstance, fx: RestoreOverTimeEffect, charges: number, crit?: number): void;
    updateMinionMeta(dt: number): void;
  };
  const stream = (resource: 'life' | 'mana' | 'es', cue?: RestoreOverTimeEffect['feedingCue'], amount = 100) => api.startRestoreStream(p, p,
    makeSkillInstance(SKILLS.expose_weakness), { type: 'restoreOverTime', resource, amount, duration: 1, feedingCue: cue }, 0, 1);
  const minion = (x = 740) => { const a = w.createMonster('skeleton_warrior', 1, 'player', p); a.pos = { x, y: 700 }; a.anchored = true; w.actors.push(a); return a; };
  return { w, p, api, stream, minion };
}
{
  const { p, stream } = rig(); p.life = 400; p.mana = 400; p.es = 0;
  for (const r of ['life', 'mana', 'es'] as const) stream(r);
  check('opening streams does not invent a landed gain', !feedingCueState(p).gains.length);
  p.updateTimers(0.1);
  check('all three actual resource ticks produce matching cues', ['life', 'mana', 'es'].every(r => feedingCueState(p).gains.some(g => g.resource === r)));
  check(`stream amounts remain unchanged (${p.life}, ${p.mana}, ${p.es})`, near(p.life, 410) && near(p.mana, 410) && near(p.es, 10));
  const before = JSON.stringify(p.restoreStreams); feedingCueState(p);
  check('render read never spends the remaining stream', JSON.stringify(p.restoreStreams) === before);
  p.updateTimers(2);
  check('large final tick spends only the remaining bank', near(p.life, 500) && near(p.mana, 500) && near(p.es, 100) && !p.restoreStreams.length);
  p.updateTimers(0.3);
  check('completed pours leave no continuing flow', !feedingCueState(p).gains.length);
}
{
  const { p, stream } = rig(); stream('life'); stream('mana'); stream('es'); p.updateTimers(0.1);
  check('full pools create no refill effect', !feedingCueState(p).gains.length);
  p.sheet.setSource('overmend', [mod('overheal', 'override', 1)]); p.updateTimers(0.1);
  check('real overmend creates shield gain without pretending life rose', p.absorb > 0 && p.restoreGains.some(g => g.resource === 'absorb') && !p.restoreGains.some(g => g.resource === 'life'));
  p.restoreGains = []; p.absorb = p.maxLife() * 0.5; p.updateTimers(0.1);
  check('a capped overmend shield creates no false gain', !p.restoreGains.length);
  p.sheet.setSource('noheal', [mod('healTaken', 'override', 0)]); p.life = 500; p.absorb = 0; p.updateTimers(0.1);
  check('blocked healing creates neither life nor shield cue', !p.restoreGains.length && p.absorb === 0);
}
{
  const { p, stream } = rig(); p.mana = 990; stream('mana', { profile: 'ritual', color: '#123456' }, 1000); p.updateTimers(0.1);
  check('custom stream material follows the capped actual gain', near(p.mana, 1000) && p.restoreGains[0].profile === 'ritual' && p.restoreGains[0].color === '#123456');
  p.restoreGains = []; p.life = 400; stream('life', false); p.updateTimers(0.1);
  check('opt-out silences presentation without removing recovery', p.life > 400 && !p.restoreGains.length);
  for (let i = 0; i < 100; i++) noteRestoreGain(p, 'life', 1);
  check('many simultaneous ticks coalesce into one resource voice', p.restoreGains.length === 1);
  for (let i = 0; i < 50; i++) noteRestoreGain(p, 'mana', 1, { color: '#' + i.toString(16).padStart(6, '0') });
  check('mixed custom streams have bounded cue storage', p.restoreGains.length === FEEDING_CUE_CFG.gainRows);
  check('unknown profiles safely inherit the resource material', feedingMaterial({ profile: 'missing' }, 'mana').profile === 'mana');
  p.downed = true; p.updateTimers(0); noteRestoreGain(p, 'life', 10);
  check('downed bodies show no new refill effects', !feedingCueState(p).gains.length);
}
{
  const { w, p } = rig();
  const skill = makeSkillInstance({ ...SKILLS.corpse_feast, useTime: 0, requirements: undefined }); p.skills = [skill];
  const corpse = { pos: { x: 790, y: 700 }, defId: 'zombie', level: 1, maxLife: 200, remaining: 60, tier: 0 };
  w.corpses = [corpse]; p.life = 400; p.mana = 400;
  check('real Corpse Feast consumes its selected body', w.useSkill(p, skill, corpse.pos) && !w.corpses.length);
  const flash = w.flashes.find(f => f.feedingCue);
  check('feast carries material from the consumed corpse to its caster', !!flash && flash.pos.x === corpse.pos.x && flash.feedingCue!.to.x === p.pos.x);
  check('feast records actual restored resources', p.life > 400 && p.restoreGains.some(g => g.resource === 'life'));
  w.flashes = []; p.cooldowns.clear(); p.useLock = 0; w.useSkill(p, skill, corpse.pos);
  check('an empty graveyard invents no meal', !w.flashes.some(f => f.feedingCue));
}
{
  const { w, p, minion, api } = rig(), eater = minion(760), meal = minion(790);
  eater.sourceSkillId = '__proc:eater'; meal.sourceSkillId = '__proc:food'; eater.life *= 0.2;
  eater.devour = { next: 0, spec: { interval: 3, radius: 100, heal: 0.2, mods: [mod('damage', 'increased', 0.1)] } };
  let killer = false; SIM_TAP.current = { onDeath: (a, k) => { if (a === meal) killer = k === eater; } };
  try { api.updateMinionMeta(1); } finally { SIM_TAP.current = null; }
  check('devouring preserves actual death attribution and feast buff', meal.dead && killer && eater.buffs.has('devour_feast'));
  check('devouring emits both a source transfer and measured recovery', w.flashes.some(f => f.feedingCue?.to.x === eater.pos.x) && eater.restoreGains.some(g => g.resource === 'life'));
  const n = w.flashes.length; w.time += 4; api.updateMinionMeta(1);
  check('no meal means no invented devour transaction', w.flashes.length === n);
  const client = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
  const mirror = client.actors[snap.actors.findIndex(a => a.id === eater.id)];
  check('summon recovery and source transfers reach co-op', feedingCueState(mirror).gains.length > 0 && client.flashes.some(f => f.feedingCue));
  snap.flashes.find(f => f.feedingCue)!.feedingCue!.to.x = -100;
  check('wire endpoints cannot mutate the host or client', w.flashes.some(f => f.feedingCue?.to.x === eater.pos.x) && client.flashes.some(f => f.feedingCue?.to.x === eater.pos.x));
  p.restoreGains = []; eater.restoreGains = []; w.flashes = []; applySnapshot(client, serializeSnapshot(w, 2));
  check('empty snapshots clear stale meals and refill voices', !feedingCueState(mirror).gains.length && !client.flashes.length);
}
{
  const { w, p, minion } = rig(), skill = makeSkillInstance({ ...SKILLS.the_amalgam, requirements: undefined }); p.skills = [skill];
  const meals = [minion(730), minion(760)];
  check('Amalgam starts its real channel', w.useSkill(p, skill, p.pos));
  for (let i = 0; i < 120 && (p.casting?.amalgamFed ?? 0) < 2; i++) { p.casting!.held = true; w.update(1 / 60); }
  check('channel mass follows bodies really consumed', meals.every(m => m.dead) && feedingCueState(p).mass?.count === 2);
  check('Amalgam consumption uses the ritual transfer profile', w.flashes.some(f => f.feedingCue?.profile === 'ritual'));
  const client = rig().w; applySnapshot(client, serializeSnapshot(w, 1));
  check('co-op carries accumulated channel mass', feedingCueState(client.player).mass?.count === 2);
  p.casting!.held = false; w.update(1 / 60);
  check('release clears preparation and creates the real amalgam', !feedingCueState(p).mass && w.actors.some(a => a.owner === p && a.defId === 'amalgam_horror' && !a.dead));
}
{
  const { w, p } = rig(); p.pos = { x: 1400, y: 1400 };
  const a = w.createMonster('charnel_glutton', 1, 'enemy'); a.pos = { x: 700, y: 700 }; a.drives.set('gorge', 0); w.actors.push(a);
  const corpse = { pos: { x: 710, y: 700 }, defId: 'zombie', level: 1, maxLife: 100, remaining: 60 };
  w.corpses = [corpse];
  updateAI(a, w, 0.1);
  check('scavenger chewing is tied to a reachable real corpse', !!a.feedingMeal && a.feedingMeal.from.x === corpse.pos.x && a.feedingMeal.progress > 0);
  check('preparation does not pretend the corpse was consumed', w.corpses.length === 1 && !w.flashes.some(f => f.feedingCue));
  a.carrionEatT = (MONSTERS.charnel_glutton.carrion!.time ?? 2.2) - 0.01; updateAI(a, w, 0.02);
  check('completed chewing consumes the real corpse and fills the drive', !w.corpses.length && (a.drives.get('gorge') ?? 0) > 0);
  check('completed meal closes posture and emits its source transfer', !a.feedingMeal && w.flashes.some(f => f.feedingCue?.profile === 'carrion'));
  a.feedingMeal = { from: corpse.pos, progress: 0.5, profile: 'carrion', color: '#abc' }; a.dead = true; updateAI(a, w, 0.1);
  check('early AI refusal clears stale chewing posture', !a.feedingMeal);
}
{
  const { w, p } = rig(); noteRestoreGain(p, 'mana', 10); w.loadZone(w.zone.id);
  check('zone transit clears old refill afterimages', !p.restoreGains.length);
  let depth = 0, paths = 0, labels = 0;
  const ctx = new Proxy({ globalAlpha: 1, save: () => { depth++; }, restore: () => { depth--; }, beginPath: () => { paths++; }, fillText: () => { labels++; } },
    { get: (o, k) => k in o ? o[k as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;
  for (const profile of Object.keys(FEEDING_CUE_STYLES)) {
    noteRestoreGain(p, 'life', 10, { profile });
    const f = feedingCueFlash({ x: 10, y: 20 }, p, { profile })!; f.life *= 0.5; drawFeedingTransfer(ctx, f);
  }
  drawFeedingBody(ctx, { ...feedingCueState(p), meal: { from: { x: 50, y: 0 }, progress: 0.5, profile: 'carrion', color: '#abc' },
    mass: { count: 2, cap: 5, profile: 'ritual', color: '#abc' } }, 20, { x: 0, y: 0 }, 1);
  drawRestoreHud(ctx, feedingCueState(p).gains, 'life', 100, 100, 30, 1);
  check('all profiles draw without captions or leaked context', paths > 30 && depth === 0 && labels === 0);
  check('transfer opt-out emits nothing', feedingCueFlash(p.pos, p, false) === undefined);
}
const worldSource = readFileSync(new URL('../src/engine/world.ts', import.meta.url), 'utf8');
check('ordinary stream and consumption captions are retired', !['drinking...', 'sipping...', 'charging...', "'devours'", '`fed ${cs2.amalgamFed}', "'consumed!'"].some(s => worldSource.includes(s)));
mkdirSync('balance/reports', { recursive: true });
writeFileSync('balance/reports/feeding-catalog.json', JSON.stringify({ skills: ['corpse_feast', 'the_amalgam', 'life_flask', 'mana_flask'].map(id => SKILLS[id]).filter(Boolean) }));
console.log(`PASS ${checks} feeding cue checks`);
