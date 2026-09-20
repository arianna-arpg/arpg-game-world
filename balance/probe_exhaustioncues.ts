import { strict as assert } from 'node:assert';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { WIND_PUFF, VENT_GASP } from '../src/data/exhaustionCues';
import { SKILLS } from '../src/data/skills';
import { MOVE_KERNELS, type KernelCtx } from '../src/engine/ai';
import { normalizeBrain } from '../src/engine/brain';
import { makeSkillInstance } from '../src/engine/skills';
import { tellDressOf, tellSpecsOf, resolveTell, tellPortraitDress } from '../src/engine/tells';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';

bootSimEngine(); seedGlobalRandom(0xe7a057);
const w = makeSimWorld('warrior', 0xe7a057);
w.player.invulnerable = true;
const captions: string[] = [], emitText = w.text.bind(w);
w.text = (...args) => { captions.push(args[1]); emitText(...args); };
const tick = (sec: number) => { for (let t = 0; t < sec; t += 1 / 60) w.update(1 / 60); };
const spawn = (id: string) => {
  const a = w.createMonster(id, 6, 'enemy');
  a.pos = vec(w.player.pos.x + 100, w.player.pos.y); w.actors.push(a); return a;
};
const activePuffs = (a: Actor) => tellDressOf(a)?.parts?.filter(p => p.kind === 'breathPuff' && (p.alpha ?? 1) > 0) ?? [];
const check = (name: string, ok: boolean) => { assert.ok(ok, name); console.log(`PASS ${name}`); };

// Real shared retreat gate, at different frame rates. The winded window
// blocks retreat without granting an armor/damage-taken debuff.
for (const hz of [30, 60, 120]) {
  const a = spawn('bandit_matchlock');
  a.aiKiteSpec = { kite: 1, windedFor: [1, 1] };
  const armor = a.sheet.get('armor'), taken = a.sheet.get('damageTaken');
  const retreat = () => {
    const ctx: KernelCtx = { a, world: w, target: w.player, d: 50, dt: 1 / hz,
      spec: { style: 'holdRange', hold: 300 }, tuning: {}, norm: normalizeBrain({}),
      noCast: true, paused: false, goal: w.player.pos, pick: () => null, cast: () => {} };
    MOVE_KERNELS.holdRange(ctx);
  };
  a.aiKiteAcc = 0.85; a.tellNextAt = 0; tick(0.02);
  check(`${hz}Hz: effort is visible before exhaustion`, activePuffs(a).length === 1);
  for (let i = 0; i < hz && a.aiWindedUntil <= w.time; i++) retreat();
  check(`${hz}Hz: actual retreat opens the catch window and resets effort`, a.aiWindedUntil > w.time && a.aiKiteAcc === 0);
  tick(0.02);
  check(`${hz}Hz: gasps survive the reset with forward slump`, activePuffs(a).length === 1 && (tellDressOf(a)?.lean ?? 0) > 0);
  const before = { ...a.pos }; retreat();
  check(`${hz}Hz: catch window really blocks retreat`, a.pos.x === before.x && a.pos.y === before.y);
  check(`${hz}Hz: no invented vulnerability or status`, a.sheet.get('armor') === armor && a.sheet.get('damageTaken') === taken && !a.statuses.some(s => s.id.startsWith('winded')));

  const snap = serializeSnapshot(w, hz), client = makeSimWorld('warrior', hz);
  applySnapshot(client, snap);
  const mirror = client.actors[snap.actors.findIndex(r => r.id === a.id)];
  check(`${hz}Hz: co-op reproduces the same cue without AI clocks`,
    JSON.stringify(tellDressOf(mirror)?.parts) === JSON.stringify(tellDressOf(a)?.parts)
    && tellDressOf(mirror)?.lean === tellDressOf(a)?.lean);
  tick(1.3);
  check(`${hz}Hz: recovery removes gasps and slump`, activePuffs(a).length === 0 && tellDressOf(a)?.lean === 0);
  const recovered = serializeSnapshot(w, hz + 1); applySnapshot(client, recovered);
  const healedMirror = client.actors[recovered.actors.findIndex(r => r.id === a.id)];
  check(`${hz}Hz: a zero-reading snapshot clears the old cue`, activePuffs(healedMirror).length === 0 && tellDressOf(healedMirror)?.lean === 0);
  a.dead = true;
}
check('retreat never emits its old caption', !captions.some(t => /winded!/i.test(t)));

// Infinite budgets and absent clocks do not create decorative fatigue.
const still = spawn('skeleton_archer');
still.aiKiteSpec = { kite: Infinity }; still.aiKiteAcc = 100;
tick(0.2);
check('tireless body has no gasps', activePuffs(still).length === 0);
check('runtime-added definitions inherit the family', tellSpecsOf({})?.every((r, i) => r === WIND_PUFF[i]) === true);
check('body-specific rows replace defaults', tellSpecsOf({ retreatTells: [WIND_PUFF[1]] })?.length === 1);
check('portraits remain rested', tellPortraitDress(WIND_PUFF).parts?.every(p => p.alpha === 0) === true);

// Actual costs, vent skill, custom window, early cure, refill. The status
// cue follows the vulnerability; the bellows separately follow the pool.
const f = spawn('fumelung');
f.reserveSpecs = f.reserveSpecs!.map(r => ({ ...r, vent: { ...r.vent!, forSec: 0.8 } }));
const gout = makeSkillInstance(SKILLS.fume_gout, 6);
for (let i = 0; i < 3; i++) {
  f.useLock = 0; f.casting = null;
  assert.ok(w.useSkill(f, gout, vec(f.pos.x + 100, f.pos.y)));
}
tick(0.2);
const pool = f.reserves!.get('breath')!;
check('real vent has collapsed bellows and paired gasps', pool.cur === 0 && f.statuses.some(s => s.id === 'winded_gasp')
  && activePuffs(f).some(p => p.mirror) && (tellDressOf(f)?.lean ?? 0) > 0);
check('vent still casts its attributable ground effect', w.zones.some(z => z.inst.def.id === 'fume_vent' && z.caster === f));
check('vent caption is retired at its authored source', !MONSTERS.fumelung.reserves![0].vent!.note
  && !captions.includes('out of breath!'));
f.endStatus('winded_gasp'); f.tellNextAt = 0; tick(0.02);
check('early cure removes vulnerability gasps without refilling fuel', activePuffs(f).length === 0 && pool.cur === 0);
f.applyStatus('winded_gasp', 0, 0.12, 'probe'); f.tellNextAt = 0; tick(0.02);
check('reapplied vulnerability immediately resumes its cue', activePuffs(f).length > 0);
tick(1);
check('custom vent duration refills lungs and clears vulnerability', pool.cur === pool.max && !f.statuses.some(s => s.id === 'winded_gasp') && activePuffs(f).length === 0);
still.applyStatus('winded', 0, 1, 'probe');
check('brief Winded is a separate mechanic and does not borrow vent gasps', VENT_GASP.every(r => resolveTell(r, still, w) === 0));
console.log('ALL PASS');
