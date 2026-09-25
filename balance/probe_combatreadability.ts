import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import { applyDot } from '../src/engine/damage';
import { reactiveCueOf, wardCueActive, wardGuardians, volatileCueStyle, wardCueStyle } from '../src/engine/combatReadability';
import { runAIActions } from '../src/engine/aiActions';
import { updateAI } from '../src/engine/ai';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { drawReactiveCue, drawWardBody, drawWardLinks, drawWardBar, drawGaspSpark } from '../src/render/vis/combatReadabilityLayer';
import { combatCueFlash } from '../src/engine/combatCues';
import { drawEffectVoice } from '../src/render/vis/effectVoice';
import '../src/render/vis/combatCueLayer';
import { SIM_TAP } from '../src/engine/tap';

seedGlobalRandom(0x22035);
let checks = 0;
const check = (name: string, value: boolean) => { assert.ok(value, name); checks++; console.log('PASS ' + name); };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
function rig() {
  const w = makeSimWorld('warrior', 0x22035), p = w.player, e = w.createMonster('zombie', 1, 'enemy');
  w.actors = [p, e]; p.pos = { x: 500, y: 500 }; e.pos = { x: 580, y: 500 };
  for (const a of w.actors) {
    a.skills = []; a.casting = null; a.statuses = []; a.aiCooldown = 9999;
    a.sheet.setSource('readability-rig', [mod('life', 'override', 1000), mod('mana', 'override', 10000),
      mod('accuracy', 'override', 100000), mod('damage', 'override', 1), mod('damageTaken', 'override', 1),
      ...['armor','evasion','blockChance','critChance','lifeRegen','energyShield','endurance','poise','fireRes'].map(s => mod(s, 'override', 0))]);
    a.fillResources(); a.tier = p.tier;
  }
  const inner = w as unknown as {
    resolveHit(c: Actor, i: SkillInstance, t: Actor): void;
    burstDamage(pos: { x: number; y: number }, r: number, damage: number, type: string, color: string, team: string, tier?: number, source?: Actor): void;
    sweepTalentEvents(a: Actor): void;
  };
  const hit = makeSkillInstance({ ...SKILLS.fireball, requirements: undefined, manaCost: 0,
    baseDamage: { fire: [40, 40] }, innateMods: [], effects: [{ type: 'damage' }] });
  return { w, p, e, inner, hit };
}
const has = (w: World, style: string) => w.flashes.some(f => f.combatCue?.style === style);
{
  const { w, p, e, inner, hit } = rig();
  check('ordinary actor has no invented readiness', !reactiveCueOf(e, w.time));
  e.sheet.setSource('cap', [mod('hitCap', 'override', 10)]);
  check('real hit ceiling has a sustained open bracket', reactiveCueOf(e, w.time)?.cap === true);
  inner.resolveHit(p, hit, e);
  check('capped direct hit shows flattening with unchanged life cut', near(e.life, 990) && has(w, 'hit_cap'));
  check('cap cue faces the real incoming wound', w.flashes.find(f => f.combatCue?.style === 'hit_cap')!.combatCue!.facing === 0);
  w.flashes = []; inner.burstDamage(e.pos, 40, 80, 'fire', '#fff', 'player');
  check('casterless area cap shares the same outcome', near(e.life, 980) && has(w, 'hit_cap'));
  const before = e.life; applyDot(e, 50);
  check('DoT retains full work through the hit ceiling', near(before - e.life, 50));
  e.sheet.removeSource('cap'); check('removing the ceiling removes its body bracket', !reactiveCueOf(e, w.time));
  w.flashes = []; inner.resolveHit(p, hit, e); check('unclamped hit does not invent flattening', !has(w, 'hit_cap'));
}
for (const lane of ['direct','area'] as const) {
  const { w, p, e, inner, hit } = rig();
  p.sheet.setSource('cull', [mod('cullThreshold', 'override', 0.2)]); e.life = 150;
  let credited = false; const prev = SIM_TAP.current;
  SIM_TAP.current = { onDeath: (victim, killer) => { if (victim === e) credited = killer === p; } };
  try {
    if (lane === 'direct') inner.resolveHit(p, hit, e);
    else inner.burstDamage(e.pos, 40, 40, 'fire', '#fff', 'player', p.tier, p);
  } finally { SIM_TAP.current = prev; }
  check(lane + ' execution has its own severing cue and original kill credit', e.dead && credited && has(w, 'culled'));
}
{
  const { w, p, e, inner, hit } = rig();
  e.volatile = { skillId: 'spark_bolt', chance: 1, icd: 2 };
  check('volatile body is visibly ready before the provoking hit', reactiveCueOf(e, w.time)?.volatile?.ready === 1);
  inner.resolveHit(p, hit, e);
  check('real retaliation emits its release and still casts from the struck body', has(w, 'volatile_release') && w.projectiles.some(x => x.caster === e));
  check('release empties visible readiness on the actual ICD', reactiveCueOf(e, w.time)?.volatile?.ready === 0 && near(e.volatileReadyAt - w.time, 2));
  w.flashes = []; inner.resolveHit(p, hit, e); check('cooldown prevents duplicate release', !has(w, 'volatile_release'));
  check('half elapsed ICD is half visible readiness', reactiveCueOf(e, w.time + 1)?.volatile?.ready === 0.5);
  e.volatile.cue = '__proto__'; check('unknown volatile profile has a safe fallback', volatileCueStyle('__proto__') === volatileCueStyle('vents'));
  e.volatile.cue = false; check('content can opt out of inherited volatile presentation', !reactiveCueOf(e, w.time)?.volatile);
  e.volatile.cue = undefined; e.untargetable = true; check('unavailable volatile bodies do not suggest an armed retaliation', !reactiveCueOf(e, w.time)?.volatile);
  e.untargetable = false; e.volatileReadyAt = 0; e.life = 1; w.flashes = [];
  inner.resolveHit(p, hit, e); check('killing blow never gets a volatile release', e.dead && !has(w, 'volatile_release') && !reactiveCueOf(e, w.time));
}
{
  const { w, p, inner } = rig();
  p.sheet.setSource('gasp', [mod('lastGasp', 'override', 1), mod('lastGaspLife', 'override', 0.2), mod('lastGaspCooldown', 'override', 8)]);
  check('invested rescue starts with an available spark', reactiveCueOf(p, w.time)?.gasp === 1);
  p.life = 50; applyDot(p, 1000); inner.sweepTalentEvents(p);
  check('actual lethal wound spends the spark and preserves authored rescue life', p.life === 200 && p.lastGaspCd === 8 && has(w, 'last_gasp') && reactiveCueOf(p, w.time)?.gasp === 0);
  w.flashes = []; inner.sweepTalentEvents(p); check('consumed rescue edge cannot replay', !has(w, 'last_gasp'));
  p.updateTimers(4); check('cooldown recovers from the original span', near(reactiveCueOf(p, w.time)!.gasp!, 0.5));
  p.sheet.setSource('later-cooldown', [mod('lastGaspCooldown', 'override', 100)]);
  check('changing future cooldown does not falsify current recovery', reactiveCueOf(p, w.time)?.gasp === 0.5);
  applyDot(p, 1000); check('spent rescue implies no invulnerability window', p.life <= 0 && !reactiveCueOf(p, w.time));
}
{
  const { w, p, e } = rig();
  const guards = [w.createMonster('zombie', 1, 'enemy'), w.createMonster('zombie', 1, 'enemy')];
  guards.forEach((g, i) => { g.tag = 'qa_ward'; g.pos = { x: 610 + i * 40, y: 520 }; g.tier = e.tier; w.actors.push(g); });
  runAIActions(w, e, [{ do: 'ward', tag: 'qa_ward', announce: 'old ward caption', cue: '__proto__' }]);
  check('actual ward action closes its body and emits formation', wardCueActive(e) && has(w, 'ward_form') && wardGuardians(e, w.actors).length === 2);
  check('unknown ward profile falls back safely', wardCueStyle('__proto__') === wardCueStyle('lattice'));
  guards[0].downed = true;
  check('visible sources match watcher membership even for downed guardians', wardGuardians(e, w.actors).length === 2);
  guards[0].dead = true; updateAI(e, w, 0.01);
  check('one remaining source keeps the actual ward intact', e.untargetable && wardGuardians(e, w.actors).length === 1);
  // Join mid-ward; source IDs must be resolved to pooled client actors.
  p.sheet.setSource('gasp', [mod('lastGasp', 'override', 1)]);
  e.volatile = { skillId: 'spark_bolt', chance: 1, icd: 2 };
  const client = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
  const mirror = client.actors[snap.actors.findIndex(a => a.id === e.id)];
  const guardMirror = client.actors[snap.actors.findIndex(a => a.id === guards[1].id)];
  check('co-op ward links resolve real local source actors', wardCueActive(mirror) && wardGuardians(mirror, client.actors)[0] === guardMirror);
  check('co-op owning player reads the same rescue readiness', reactiveCueOf(client.player, client.time)?.gasp === 1);
  check('co-op carries the formation outcome', has(client, 'ward_form'));
  guards[1].dead = true; w.flashes = []; updateAI(e, w, 0.01);
  check('last source loss opens the boss and creates one breakup', !e.untargetable && !e.aiWardTag && has(w, 'ward_break'));
  check('legacy ward announcement no longer appears', !w.texts.some(t => t.text === 'old ward caption'));
  applySnapshot(client, serializeSnapshot(w, 2));
  check('co-op clears stale source links and delivers breakup', !wardCueActive(mirror) && mirror.wardCueSources === undefined && has(client, 'ward_break'));
  check('co-op restores available retaliation after ward opens', reactiveCueOf(mirror, client.time)?.volatile?.ready === 1);
  e.untargetable = true; check('unrelated untargetability invents no ward source links', !wardCueActive(e) && !wardGuardians(e, w.actors).length);
}
{
  const { w, p, e } = rig(); e.volatile = { skillId: 'spark_bolt', chance: 1 }; e.sheet.setSource('cap', [mod('hitCap','override',10)]);
  const before = JSON.stringify({ life:e.life,statuses:e.statuses,ready:e.volatileReadyAt });
  let depth = 0, paths = 0;
  const ctx = new Proxy({save:()=>{depth++;},restore:()=>{depth--;},beginPath:()=>{paths++;}},
    {get:(o,k)=>k in o?o[k as keyof typeof o]:()=>{}}) as unknown as CanvasRenderingContext2D;
  drawReactiveCue(ctx,e.radius,reactiveCueOf(e,w.time),w.time);
  drawGaspSpark(ctx,0,0,9,0.4); drawWardBody(ctx,20); drawWardBar(ctx,0,0,200,14);
  e.aiWardTag='qa';e.untargetable=true;p.tag='qa';drawWardLinks(ctx,w.actors,p,w.time);
  for (const style of ['culled','hit_cap','volatile_release','last_gasp','ward_form','ward_break'])
    for (const phase of [0.95,0.5,0.05]) drawEffectVoice(ctx,'combatCue',combatCueFlash(e.pos,style,30,0,'#888888'),phase);
  check('all world and HUD shapes draw without depending on hue and restore canvas state', paths > 30 && depth === 0);
  check('readiness derivation never changes gameplay state', before === JSON.stringify({life:e.life,statuses:e.statuses,ready:e.volatileReadyAt}));
}
const world = readFileSync('src/engine/world.ts','utf8'), renderer = readFileSync('src/render/renderer.ts','utf8');
check('all five retired caption literals stay absent', ["'CULLED!'","'capped'","'volatile!'","'LAST GASP!'","'DOOM!'"].every(s=>!world.includes(s)));
check('boss identity no longer includes a ward caption', !renderer.includes('— WARDED'));
console.log(`PASS ${checks} combat readability checks`);
