// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE AGENT + THE DIRECTOR'S CAMERA (src/agent/,
// src/director/camera.ts; docs/engine/agent.md, docs/engine/director.md).
// The agent is a PlayerInputSource: it reaches the world only through
// World.applyInputs, the same artery a keyboard uses. Pins:
//   A. THE KIT READ: every catalog skill reads without throwing into a known
//      role / play / aim; summons read 'summon', ultimates 'ultimate', melee
//      'strike', novas 'nova' aimed at self (or the corpse / ally their
//      targeting names); damaging pressable slots aimed away from the body
//      have a positive reach.
//   B. THE ORDERS: a 'move' order walks the seat to its mark (an offset is
//      measured from where the order started) through the input artery and
//      empties the queue; a 'wait' order holds still.
//   C. THE CAST ORDER: 'cast' presses only what the engine accepts and
//      completes after the asked number of casts.
//   D. THE TEMPERAMENT: an empty queue fights — a warrior left alone beside
//      three dummies swings at them and lands damage.
//   E. THE TUNE: per-agent profile overrides replace single fields and leave
//      the rest of the profile intact.
//   F. THE CAMERA: zoom keys ease between their values and hold at the ends;
//      the spring closes on a moved subject at its half-life.
// Run: npx tsx balance/probe_agent.ts
// ---------------------------------------------------------------------------

const bootWarns: string[] = [];
const origWarn = console.warn;
console.warn = (...a: unknown[]) => { bootWarns.push(a.map(String).join(' ')); origWarn(...a); };

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { setSimTap } from '../src/engine/tap';
import { updateAI } from '../src/engine/ai';
import type { PlayerInput } from '../src/net/intent';
import { SKILLS } from '../src/data/skills';
import { AGENT_PROFILES } from '../src/data/agent';
import { HeroAgent } from '../src/agent/agent';
import { readSlot } from '../src/agent/kit';
import { CinematicCamera, sampleKeys } from '../src/director/camera';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
console.warn = origWarn;

const DT = 1 / 30;
/** One host frame, verbatim (sim/runner.ts): poll → applyInputs → AI → update. */
const frame = (w: World, agent: HeroAgent): void => {
  const inputs = new Map<string, PlayerInput>();
  const p = w.player;
  const intent = agent.poll(p, w, DT);
  if (intent) inputs.set(w.localSeat.id, intent);
  w.applyInputs(inputs, DT);
  for (const a of w.actors) updateAI(a, w, DT);
  w.update(DT);
};
const run = (w: World, agent: HeroAgent, secs: number, until?: () => boolean): number => {
  let t = 0;
  for (; t < secs; t += DT) { frame(w, agent); if (until?.()) break; }
  return t;
};
const rig = (classId: string, seed: number): { w: World; p: Actor } => {
  seedGlobalRandom(seed);
  const w = makeSimWorld(classId, seed);
  const p = w.player;
  p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
  for (const a of w.actors) if (a !== p && a.team !== p.team) a.dead = true;
  w.update(DT);
  return { w, p };
};
const dummy = (w: World, x: number, y: number, life = 2000): Actor => {
  const z = w.createMonster('zombie', 3, 'enemy');
  z.pos = vec(x, y);
  z.sheet.setSource('probe', [mod('evasion', 'flat', -1e6)]);
  z.sheet.setBase('life', life);
  z.life = life;
  z.brain = undefined; // the dummy stands; the agent is the only actor here
  w.actors.push(z);
  return z;
};

// === A. THE KIT READ ===========================================================
{
  const roles = new Set(['strike', 'shot', 'area', 'nova', 'summon', 'aura', 'buff', 'heal', 'move', 'construct', 'ultimate']);
  const plays = new Set(['tap', 'hold', 'charge', 'toggle', 'timing']);
  const aims = new Set(['foe', 'cluster', 'self', 'corpse', 'ally', 'travel']);
  let read = 0, threw = '', bad = '', reachless = '';
  const byRole = new Map<string, string[]>();
  for (const def of Object.values(SKILLS)) {
    if (!def.delivery) continue;
    try {
      const k = readSlot(0, makeSkillInstance(def, 1, 0));
      read++;
      if (!roles.has(k.role) || !plays.has(k.play) || !aims.has(k.aim)) bad ||= `${def.id}:${k.role}/${k.play}/${k.aim}`;
      if (k.damaging && !k.passive && k.aim !== 'self' && k.role !== 'buff' && !(k.reach > 0)) reachless ||= def.id;
      byRole.set(k.role, [...(byRole.get(k.role) ?? []), def.id]);
      if (def.ultimate && k.role !== 'ultimate') bad ||= `${def.id}: ultimate read as ${k.role}`;
      if (!def.ultimate && def.delivery.type === 'summon' && k.role !== 'summon') bad ||= `${def.id}: summon read as ${k.role}`;
      if (!def.ultimate && def.delivery.type === 'nova' && (k.role !== 'nova' || (k.aim !== 'self' && k.aim !== 'corpse' && k.aim !== 'ally'))) bad ||= `${def.id}: nova read as ${k.role}/${k.aim}`;
    } catch (e) { threw ||= `${def.id}: ${(e as Error).message}`; }
  }
  check('A1 every catalog skill reads without throwing', !threw && read > 100, threw || `${read} read`);
  check('A2 every read lands in the known role / play / aim vocabulary (ultimates, summons, novas by their delivery)', !bad, bad);
  check('A3 damaging pressable slots aimed away from the body carry a positive reach', !reachless, reachless);
  const cleave = readSlot(0, makeSkillInstance(SKILLS.cleave, 1, 0));
  check('A4 cleave (melee) reads as a strike aimed at a foe', cleave.role === 'strike' && cleave.aim === 'foe' && cleave.play === 'tap',
    `${cleave.role}/${cleave.aim}/${cleave.play}`);
  check('A5 the catalog exercises most roles', byRole.size >= 8, [...byRole.keys()].join(','));
}

// === B. THE ORDERS =============================================================
{
  const { w, p } = rig('warrior', 11);
  const start = { x: p.pos.x, y: p.pos.y };
  const agent = new HeroAgent(p, { profile: 'brawler', rooted: true, directives: [{ do: 'move', to: { offset: { x: 160, y: 0 } } }] });
  const t = run(w, agent, 4, () => !agent.busy);
  const moved = Math.hypot(p.pos.x - (start.x + 160), p.pos.y - start.y);
  check('B1 a move order walks the seat to its mark through applyInputs and empties the queue', !agent.busy && moved < 30,
    `${t.toFixed(2)}s, ${moved.toFixed(1)} from the mark`);
  const before = { x: p.pos.x, y: p.pos.y };
  agent.order({ do: 'wait', sec: 0.6 });
  run(w, agent, 0.5);
  check('B2 a wait order holds still', Math.hypot(p.pos.x - before.x, p.pos.y - before.y) < 2 && agent.busy);
}

// === C. THE CAST ORDER =========================================================
{
  const { w, p } = rig('warrior', 12);
  dummy(w, p.pos.x + 60, p.pos.y);
  const slot = p.skills.findIndex(s => s?.def.id === 'cleave');
  let casts = 0;
  setSimTap({ onCast: (caster, inst, repeat) => { if (!repeat && caster === p && inst.def.id === 'cleave') casts++; } });
  const agent = new HeroAgent(p, { profile: 'brawler', rooted: true, directives: [{ do: 'cast', skill: 'cleave', at: 'nearest', times: 2, gap: 0.1 }] });
  run(w, agent, 6, () => !agent.busy);
  setSimTap(null);
  check('C1 the cast order presses cleave and completes after two accepted casts', slot >= 0 && !agent.busy && casts >= 2,
    `slot ${slot}, casts ${casts}, busy ${agent.busy}`);
}

// === D. THE TEMPERAMENT ========================================================
{
  const { w, p } = rig('warrior', 13);
  const ds = [dummy(w, p.pos.x + 90, p.pos.y), dummy(w, p.pos.x + 110, p.pos.y + 40), dummy(w, p.pos.x + 100, p.pos.y - 40)];
  const agent = new HeroAgent(p, { profile: 'brawler' });
  run(w, agent, 5, () => ds.some(d => d.life < d.maxLife()));
  const hurt = ds.filter(d => d.dead || d.life < d.maxLife()).length;
  check('D1 an empty queue fights: the warrior closes on the dummies and lands damage', hurt >= 1, `${hurt} of 3 struck`);
}

// === E. THE TUNE ===============================================================
{
  const { p } = rig('warrior', 14);
  const a = new HeroAgent(p, { profile: 'brawler', tune: { dodge: false, band: 123 } });
  const prof = (a as unknown as { profile: typeof AGENT_PROFILES.brawler }).profile;
  check('E1 tune overrides single fields and keeps the rest of the profile',
    prof.dodge === false && prof.band === 123 && prof.stance === AGENT_PROFILES.brawler.stance
    && JSON.stringify(prof.weights) === JSON.stringify(AGENT_PROFILES.brawler.weights));
}

// === F. THE CAMERA =============================================================
{
  const keys: [number, number, 'inOut'?][] = [[0, 2], [2, 4, 'inOut']];
  check('F1 zoom keys hold at the ends and ease through the middle',
    sampleKeys(keys, -1) === 2 && sampleKeys(keys, 5) === 4 && Math.abs(sampleKeys(keys, 1) - 3) < 1e-6
    && sampleKeys(keys, 0.5) < 2.5);
  const cam = new CinematicCamera({ follow: 'hero', zoom: 2, damp: 0.25 }, { x: 0, y: 0 });
  cam.step(0, 0, { x: 0, y: 0 }, []);
  let t = 0;
  for (; t < 0.25; t += 1 / 60) cam.step(t, 1 / 60, { x: 100, y: 0 }, []);
  const half = cam.pos!.x;
  for (; t < 3; t += 1 / 60) cam.step(t, 1 / 60, { x: 100, y: 0 }, []);
  check('F2 the spring closes about half the gap in one half-life and settles on the subject',
    half > 25 && half < 80 && Math.abs(cam.pos!.x - 100) < 1, `after one half-life ${half.toFixed(1)}, settled ${cam.pos!.x.toFixed(2)}`);
}

console.log(`\n${failed ? 'FAILED' : 'ALL PASS'} — probe_agent (${failed} failing)`);
process.exit(failed ? 1 : 0);
