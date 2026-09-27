import { strict as assert } from 'node:assert';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { makeSkillInstance, type BuffEffect, type SkillInstance } from '../src/engine/skills';
import type { Actor } from '../src/engine/actor';
import { SKILLS } from '../src/data/skills';
import { PROCS, type ProcDef, type ProcEffect } from '../src/data/procs';
import { STATUS_DEFS } from '../src/engine/status';
import { registerStatusRelay } from '../src/engine/reception';
import { buffProcCue, noteProcCue, procCueRows, procCueStyle } from '../src/engine/procCues';
import { PROC_CUE_CFG, PROC_CUE_STYLES } from '../src/data/procCues';
import { drawProcBody, drawProcHud, drawProcBuff } from '../src/render/vis/procCueLayer';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

seedGlobalRandom(23023);
let checks = 0;
function check(name: string, ok: boolean) { assert.ok(ok, name); checks++; console.log('PASS ' + name); }
function rig() {
  const w = makeSimWorld('warrior', 23023), p = w.player;
  const e = w.createMonster('zombie', 1, 'enemy'); e.pos = { x: 760, y: 700 }; p.pos = { x: 700, y: 700 };
  w.actors = [p, e]; w.flashes = []; w.projectiles = [];
  p.sheet.setSource('proc-cue-rig', [mod('mana', 'override', 10000), mod('critChance', 'override', 0)]);
  e.sheet.setSource('proc-cue-rig', [mod('life', 'override', 100000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
  p.fillResources(); e.fillResources();
  const inst = makeSkillInstance({ ...SKILLS.cleave, requirements: undefined, useTime: 0 });
  const api = w as unknown as {
    executeProc(proc: ProcDef, caster: Actor, inst: SkillInstance | null, target: Actor | null, depth?: number): void;
    fireProcRiders(proc: ProcDef, caster: Actor, inst: SkillInstance | null, target: Actor | null, depth: number): void;
    resolveHit(caster: Actor, inst: SkillInstance, target: Actor, mult: number, depth?: number): void;
    updatePendingBursts(): void;
  };
  const texts: string[] = [], original = w.text.bind(w);
  w.text = (...args) => { texts.push(args[1]); return original(...args); };
  const fire = (fx: ProcEffect, overrides: Partial<ProcDef> = {}) => api.executeProc({
    id: 'probe_cue', name: 'Probe Cue', color: '#987654', trigger: 'hit', effect: fx, ...overrides,
  }, p, inst, e);
  return { w, p, e, inst, api, fire, texts };
}
const loaded: BuffEffect = { type: 'buff', id: 'loaded', duration: 8, maxStacks: 3, stacksOnApply: 3,
  mods: [mod('damage', 'more', 0.2, ['fire'])], consumeOn: { on: 'hit', tags: ['spell'] } };
{
  const { p } = rig(); p.addBuff(loaded);
  const rows = procCueRows(p), before = JSON.stringify([...p.buffs]);
  check('consumable buffs inherit material from mechanics', rows[0].profile === 'fire' && rows[0].count === 3 && rows[0].cap === 3);
  procCueRows(p); check('presentation never mutates the bank', JSON.stringify([...p.buffs]) === before);
  p.spendBuffs('hit', ['melee']);
  check('unmatched trigger spends nothing and creates no release', p.buffs.get('loaded')?.stacks === 3 && !p.procCuePulses.length);
  p.spendBuffs('hit', ['spell']);
  check('matching completed event spends exactly one visible charge', p.buffs.get('loaded')?.stacks === 2 && procCueRows(p)[0].count === 2);
  check('actual consumption carries the same material', p.procCuePulses[0].profile === 'fire' && p.procCuePulses[0].phase === 'release');
  p.spendBuffs('hit', ['spell']); p.spendBuffs('hit', ['spell']);
  check('last charge clears preparation but retains one bounded release', !p.buffs.has('loaded') && procCueRows(p).length === 1);
  p.updateTimers(1); check('release expires on the real actor clock', !procCueRows(p).length);
  p.addBuff({ ...loaded, duration: 0.1 }); p.updateTimers(0.2);
  check('natural expiry never impersonates a consumed payload', !procCueRows(p).length);
  p.addBuff({ ...loaded, storedCue: false }); p.consumeBuffStacks('loaded');
  check('opt-out preserves spend and suppresses supplementary visuals', p.buffs.get('loaded')?.stacks === 2 && !procCueRows(p).length);
  p.addBuff({ ...loaded, storedCue: { profile: 'unknown' } });
  check('unknown profiles inherit a safe shape', procCueStyle(procCueRows(p)[0].profile) === PROC_CUE_STYLES.physical);
  p.dead = true; p.updateTimers(0.1); check('death retires stored and transient visuals', !procCueRows(p).length && !p.procCuePulses.length);
}
{
  const { p, e, fire, texts } = rig();
  fire({ type: 'heal', flat: 20 }); check('full-life proc cannot fake a recovery', !p.procCuePulses.length);
  p.life -= 30; const before = p.life; fire({ type: 'heal', flat: 20 });
  check('actual healing keeps its amount and shows at owner', p.life === before + 20 && p.procCuePulses.length === 1 && !e.procCuePulses.length);
  p.procCuePulses = []; fire({ type: 'restore', resource: 'mana', flat: 10 });
  check('full resource bank has no invented gain', !p.procCuePulses.length);
  p.mana -= 30; fire({ type: 'restore', resource: 'mana', flat: 10 });
  check('actual restored mana gets its source color', p.procCuePulses[0]?.color === '#987654');
  p.procCuePulses = []; fire({ type: 'gainCharge', charge: 'fury', amount: 1, max: 3 });
  check('real gained charges produce a gesture', !!p.procCuePulses.length);
  p.charges.set('fury', 3); p.procCuePulses = []; fire({ type: 'gainCharge', charge: 'fury', amount: 1, max: 3 });
  check('capped charge grants stay quiet', !p.procCuePulses.length);
  fire({ type: 'cooldown', seconds: 1 }); check('empty cooldown set stays quiet', !p.procCuePulses.length);
  p.cooldowns.set('cleave', 3); fire({ type: 'cooldown', seconds: 1 });
  check('cooldown reduction keeps exact mechanics and signals success', p.cooldowns.get('cleave') === 2 && p.procCuePulses.length === 1);
  p.procCuePulses = []; fire({ type: 'ward', flat: 10 }, { procCue: false });
  check('proc override suppresses only decoration', p.ward > 0 && !p.procCuePulses.length);
  fire({ type: 'buff', buff: loaded }, { announceName: false });
  check('combo compatibility opt-out avoids redundant generic cues', !p.procCuePulses.length && !procCueRows(p).length);
  check('proc labels are never emitted', !texts.includes('Probe Cue!'));
}
{
  const { w, p, e, api, inst, texts } = rig();
  api.executeProc(PROCS.hot_streak, p, inst, e);
  check('authored fire readiness uses flames instead of a name', procCueRows(p).find(r => r.id === 'hot_streak')?.profile === 'fire' && !texts.includes('Hot Streak!'));
  p.buffs.clear(); p.procCuePulses = [];
  p.addBuff({ ...loaded, id: 'cold_rider', consumeOn: undefined, mods: [], nextHit: { status: 'chill', tags: ['melee'] } });
  api.resolveHit(p, inst, e, 1);
  check('actual landed rider spends one stack', p.buffs.get('cold_rider')?.stacks === 2);
  check('actual rider applies its status and colors the victim', e.statuses.some(s => s.id === 'chill') && e.procCuePulses.some(c => c.id === 'rider:cold_rider'));
  const shots = w.projectiles.length;
  p.sheet.setSource('proc-cue-rider', [mod('procRider_static_shrapnel', 'flat', 1)]);
  for (let i = 0; i < 10 && w.projectiles.length === shots; i++) api.fireProcRiders(PROCS.thunderstruck, p, inst, e, 0);
  check('proc rider still launches real outward sparks', w.projectiles.length > shots && w.projectiles.slice(shots).every(b => b.hits.has(e.id)));
  check('proc rider emits no name caption', !texts.includes('Static Shrapnel!'));
  const count = w.projectiles.length; api.executeProc({ ...PROCS.thunderstruck, id: 'empty_cast', effect: { type: 'cast', cast: { skillId: 'spark_bolt', count: [0, 0] } } }, p, inst, e);
  check('empty cast payload produces neither projectile nor faux cue', w.projectiles.length === count);
}
{
  const { p } = rig();
  p.applyStatus('hemorrhage', 10, 1, 'first', { casterId: 1 });
  p.applyStatus('hemorrhage', 5, 1, 'second', { casterId: 2 });
  const bank = p.statuses[0].popAcc ?? 0;
  check('reapply banks real damage without announcing it early', bank > 0 && !p.procCuePulses.length);
  const dot = p.updateTimers(0);
  check('pop releases at actual payout and preserves exact bank damage', dot?.physical === bank && p.statuses[0].popAcc === 0 && p.procCuePulses[0]?.phase === 'pop');
  p.procCuePulses = []; p.updateTimers(0);
  check('bank payout is one-shot', !p.procCuePulses.length);
  p.sheet.setSource('immune', [mod('debuffImmunity', 'override', 1)]); p.applyStatus('hemorrhage', 12, 1, 'blocked'); p.updateTimers(0);
  check('immune reapplication cannot fake a pop', !p.procCuePulses.length && !p.statuses[0].popAcc);
  p.sheet.removeSource('immune');
  p.statuses = []; p.applyStatus('hemorrhage', 0, 1, 'empty'); p.applyStatus('hemorrhage', 0, 1, 'empty'); p.updateTimers(0);
  check('empty wounds never produce a pop cue', !p.procCuePulses.length);
  const pop = STATUS_DEFS.hemorrhage.pop!; const saved = pop.procCue; pop.procCue = false;
  try { p.statuses = []; p.applyStatus('hemorrhage', 10, 1, 'opt-out'); p.applyStatus('hemorrhage', 10, 1, 'opt-out'); p.updateTimers(0);
    check('pop opt-out retains its real payout', !p.procCuePulses.length && p.statuses[0].popAcc === 0);
  } finally { pop.procCue = saved; }
}
{
  const { w, p, e } = rig();
  registerStatusRelay({ id: 'cue_probe', status: 'hemorrhage', radius: 100, name: 'Cue probe' });
  p.applyStatus('hemorrhage', 10, 1, 'first');
  p.sheet.setSource('relay', [mod('relayStatus_cue_probe', 'flat', 1)]); p.statusRelay = () => true;
  p.applyStatus('hemorrhage', 10, 1, 'relayed'); p.updateTimers(0);
  check('relayed application leaves no false pop on original body', !p.procCuePulses.length && !p.procPopEvents.length);
  e.life = 1; e.applyStatus('hemorrhage', 100, 1, 'first', { casterId: p.id }); e.applyStatus('hemorrhage', 100, 1, 'second', { casterId: p.id });
  w.update(0.01);
  check('lethal pop retains a world-space afterimage', e.dead && w.flashes.some(f => f.combatCue?.style === 'proc_pop'));
  check('world drains pop events exactly once', !e.procPopEvents.length);
  const client = rig().w; applySnapshot(client, serializeSnapshot(w, 9));
  check('lethal pop afterimage reaches co-op after its victim falls', client.flashes.some(f => f.combatCue?.style === 'proc_pop'));
}
{
  const { w, p, texts } = rig();
  const inv = makeSkillInstance({ ...SKILLS.invocation, requirements: undefined, useTime: 0 }); p.skills = [inv];
  p.runes = ['ember', 'ember', 'ember'];
  check('banked runes produce ordered body rows', procCueRows(p).filter(r => r.id.startsWith('rune:')).length === 3);
  check('real invocation accepts the bank', w.useSkill(p, inv, { x: 850, y: 700 }));
  check('invocation spends all runes and releases their material', !p.runes.length && p.procCuePulses.some(c => c.phase === 'invoke' && c.count === 3 && c.color === '#ff8a4a'));
  check('invocation produces its real field', w.zones.length > 0);
  check('invocation rule name stays in reference surfaces', !texts.includes('Conflagration!'));
}
{
  const { w, p, e } = rig(); p.addBuff(loaded); e.addBuff({ ...loaded, storedCue: { profile: 'lightning' } });
  e.runes = ['rime', 'ember']; e.consumeBuffStacks('loaded');
  const client = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(client, snap);
  const mirror = client.actors[snap.actors.findIndex(a => a.id === e.id)];
  check('co-op receives host player banks without reconstructing buffs', JSON.stringify(procCueRows(client.player)) === JSON.stringify(procCueRows(p)));
  check('enemy banks, rune order and releases travel on the same wire', JSON.stringify(procCueRows(mirror)) === JSON.stringify(procCueRows(e)));
  const row = snap.actors.find(a => a.id === p.id)!.procCues![0]; row.count = 99;
  check('snapshot rows are isolated from host and client', procCueRows(p)[0].count === 3 && procCueRows(client.player)[0].count === 3);
  p.buffs.clear(); e.buffs.clear(); e.runes = []; e.updateTimers(1); applySnapshot(client, serializeSnapshot(w, 2));
  check('empty snapshots clear stale banks and releases', !procCueRows(client.player).length && !procCueRows(mirror).length);
}
{
  const { w, p } = rig(); p.addBuff(loaded); p.consumeBuffStacks('loaded');
  p.applyStatus('hemorrhage', 10, 1, 'first'); p.applyStatus('hemorrhage', 10, 1, 'second'); p.updateTimers(0);
  w.loadZone(w.zone.id);
  check('zone transit clears releases and queued pop afterimages', !p.procCuePulses.length && !p.procPopEvents.length);
  check('zone transit preserves the actual unspent buff bank', procCueRows(p).some(r => r.id === 'loaded' && r.count === 2));
}
{
  let depth = 0, paths = 0, labels = 0;
  const ctx = new Proxy({ globalAlpha: 1, save: () => { depth++; }, restore: () => { depth--; },
    beginPath: () => { paths++; }, fillText: () => { labels++; } },
  { get: (o, key) => key in o ? o[key as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;
  const { p } = rig(); p.addBuff({ ...loaded, maxStacks: 1000, stacksOnApply: 500 });
  const before = paths; drawProcBody(ctx, procCueRows(p), 16); drawProcBuff(ctx, procCueRows(p)[0], 100, 100);
  check('high stack investment stays within shared piece budgets', paths - before <= PROC_CUE_CFG.bodyPips + 1);
  for (const profile of Object.keys(PROC_CUE_STYLES)) {
    noteProcCue(p, { profile }, 'release', profile); drawProcBody(ctx, procCueRows(p), 16); drawProcHud(ctx, procCueRows(p), 100, 100);
    drawProcBuff(ctx, procCueRows(p)[0], 100, 100);
  }
  check('rapid mixed releases have bounded memory', p.procCuePulses.length === PROC_CUE_CFG.pulses);
  check('all materials render without captions or leaking context', paths > 50 && depth === 0 && labels === 0);
  check('next-hit status material is inferred without a skill-name branch', (buffProcCue({ ...loaded, mods: [], nextHit: { status: 'burn' } }) || {}).profile === 'fire');
}
const source = readFileSync(new URL('../src/engine/world.ts', import.meta.url), 'utf8');
check('legacy proc/rider/pop/invocation/sequel emitters stay absent', !source.includes('POPS!') && !/this\.text\([^;]*(?:proc\.name|rider\.name|rule\.label|sdef\.name) \+ '!'/s.test(source));
mkdirSync('balance/reports', { recursive: true });
writeFileSync('balance/reports/proc-catalog.json', JSON.stringify({
  skills: ['cleave', 'firebolt', 'invocation'].map(id => SKILLS[id]),
  procs: ['hot_streak', 'reprisal', 'thunderstruck'].map(id => PROCS[id]),
}));
console.log(`PASS ${checks} proc cue checks`);
