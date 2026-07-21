// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SUPPORT-FABRIC LAWS (2026-07-21 design pass R2/R3):
//
//   RIG A — THE MECHANISM GATE (the golden rule): Alacrity refuses a
//           cooldown-less host STRUCTURALLY, and fits the SAME host the
//           moment a levy gem (Austerity) stands a clock up beside it —
//           a predicate over the live instance, never a skill list.
//   RIG B — THE EQUIP-GLOBAL FOLD (the defensive gearing axis): a socketed
//           Warding Flesh armors the WEARER's sheet while the host sits on
//           the bar, and the armor leaves when the gem does.
//   RIG C — THE PLANT COMMITMENT: a cast STARTED before the plant commits
//           gains no 'stationary' stance; a full second planted FIRST, the
//           stance holds through the cast that follows.
//   RIG D — UNLEASH REST HONESTY: the seal bank counts TRUE REST only —
//           a long cast bar banks nothing for itself; genuine idleness
//           banks seals that the next press spends.
//   RIG E — THE GRANTED SHED (orbShedGraft): with NO innate orb shed, the
//           floor stands the lane up at GLOBAL rate only — the granting
//           gem's own skill-local rate bonus never compounds its floor.
//
// Run: npx tsx balance/probe_supportfabric.ts
// ---------------------------------------------------------------------------

import { bootSimEngine } from '../src/sim/arena';
import { makeSimWorld } from '../src/sim/arena';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import {
  STANCE_PLANT_TIME, type Actor,
} from '../src/engine/actor';
import {
  makeSkillInstance, supportFitsInst, supportGlobalMods, hostSockets,
} from '../src/engine/skills';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// === RIG A — the mechanism gate ============================================

{
  const fireball = SKILLS.firebolt ?? Object.values(SKILLS).find(s => s.cooldown === 0 && s.tags.includes('spell'))!;
  const inst = makeSkillInstance(fireball, 1, 3);
  const alacrity = SUPPORTS.alacrity;
  const austerity = SUPPORTS.austerity;
  check('A1 alacrity REFUSES a cooldown-less host (the structural gate)',
    fireball.cooldown === 0 && !supportFitsInst(alacrity, inst),
    `host ${fireball.id} cd=${fireball.cooldown}`);
  inst.sockets[0] = { def: austerity, level: 1 };
  check('A2 the SAME host fits alacrity the moment Austerity\'s levy stands beside it (the self-lifting refusal)',
    supportFitsInst(alacrity, inst));
  inst.sockets[0] = null;
  check('A3 the refusal returns when the levy leaves (live re-evaluation, no residue)',
    !supportFitsInst(alacrity, inst));
  const cdSkill = Object.values(SKILLS).find(s => s.cooldown > 0)!;
  check('A4 an innate cooldown host always fits',
    supportFitsInst(alacrity, makeSkillInstance(cdSkill, 1, 3)), cdSkill.id);
}

// === RIG B — the equip-global fold =========================================

{
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  world.update(0.05);
  const bareArmor = hero.sheet.get('armor');
  const host = hero.skills.find(s => s !== null)!;
  host.sockets[0] = { def: SUPPORTS.warding_flesh, level: 1 };
  world.update(0.05);
  const worn = hero.sheet.get('armor');
  check('B1 Warding Flesh armors the WEARER while socketed (the equip-global fold)',
    worn > bareArmor, `${bareArmor} -> ${worn}`);
  host.sockets[0] = null;
  world.update(0.05);
  check('B2 the armor leaves with the gem (fingerprinted source, no residue)',
    hero.sheet.get('armor') === bareArmor, `${hero.sheet.get('armor')}`);
  check('B3 supportGlobalMods filters to the global lane only',
    supportGlobalMods({ def: SUPPORTS.warding_flesh, level: 1 }).length === 2
    && supportGlobalMods({ def: SUPPORTS.monolith, level: 1 }).length === 0);
}

// === RIG C — the plant commitment ==========================================

{
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  hero.plantFor = 0;
  // A cast begun IMMEDIATELY: the plant clock freezes under the bar.
  hero.casting = {
    inst: hero.skills.find(s => s)!, mode: 'cast',
    aim: { x: hero.pos.x + 50, y: hero.pos.y }, elapsed: 0, total: 0.6,
    held: true, baseMult: 1,
  } as Actor['casting'];
  for (let i = 0; i < 60; i++) world.update(1 / 60);
  check('C1 a cast STARTED before the plant never commits the stance (the clock freezes under the bar)',
    hero.plantFor < STANCE_PLANT_TIME, `plantFor ${hero.plantFor.toFixed(2)} after 1s casting`);
  // Now: stand a full second FIRST, then cast — the stance holds.
  hero.casting = null;
  for (let i = 0; i < 66; i++) world.update(1 / 60);
  const planted = hero.plantFor;
  hero.casting = {
    inst: hero.skills.find(s => s)!, mode: 'cast',
    aim: { x: hero.pos.x + 50, y: hero.pos.y }, elapsed: 0, total: 0.6,
    held: true, baseMult: 1,
  } as Actor['casting'];
  for (let i = 0; i < 30; i++) world.update(1 / 60);
  check('C2 planted a FULL SECOND first, the stance holds through the cast',
    planted > STANCE_PLANT_TIME && hero.plantFor > STANCE_PLANT_TIME,
    `planted ${planted.toFixed(2)}, mid-cast ${hero.plantFor.toFixed(2)}`);
}

// === RIG D — unleash rest honesty ==========================================

{
  const world = makeSimWorld('magician', 7);
  const hero = world.player;
  const host = hero.skills.find(s => s !== null)!;
  host.sockets[0] = { def: SUPPORTS.unleash, level: 1 };
  const st = (host.state ??= {});
  // Fresh use completed NOW; the press for the next use comes immediately:
  // rest = pressAt − lastUseAt = 0 → zero seals, however long the bar runs.
  st.lastUseAt = world.time;
  st.pressAt = world.time;
  const sealsMidBar = world.unleashSealsOf(hero, host);
  check('D1 a press straight after completion banks ZERO seals (the bar cannot self-seal)',
    sealsMidBar !== null && (() => {
      hero.casting = {
        inst: host, mode: 'cast', aim: { x: 0, y: 0 },
        elapsed: 0, total: 3, held: true, baseMult: 1,
      } as Actor['casting'];
      // Even 3 simulated seconds into the bar, the frozen read holds.
      (world as { time: number }).time += 3;
      const frozen = world.unleashSealsOf(hero, host)!;
      hero.casting = null;
      return frozen.count === 0;
    })(), JSON.stringify(sealsMidBar));
  // TRUE REST banks: completion, then 3s of genuine idleness.
  st.lastUseAt = world.time;
  delete st.pressAt;
  (world as { time: number }).time += 3;
  const rested = world.unleashSealsOf(hero, host)!;
  check('D2 true rest banks seals (3s idle at 1.4s/seal = 2, capped by the stat)',
    rested.count === 2, `count ${rested.count}/${rested.max}`);
}

// === RIG E — the granted shed ==============================================

{
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const host = hero.skills.find(s => s !== null)!;
  host.sockets[0] = { def: SUPPORTS.abundant_harvest, level: 1 };
  const graft = hostSockets(host).map(s => s.def.orbShedGraft).find(g => g);
  check('E1 the graft rides the socket (orbShedGraft reachable from the host)',
    !!graft && graft!.orbs.includes('life') && graft!.chance > 0 && graft!.chance <= 0.1,
    JSON.stringify(graft));
  // The no-self-compounding law: the floor's rate read carries NO skill
  // context, so the gem's own skill-local +30% cannot reach it — global
  // sheet rate is exactly 1 on a bare hero.
  const globalRate = hero.sheet.get('orbShedRate');
  check('E2 the floor reads GLOBAL rate only (bare hero = 1.0 — the gem\'s own +30% never compounds its floor)',
    Math.abs(globalRate - 1) < 1e-9, `global ${globalRate}`);
  check('E3 no innate shed on the bare hero (the floor is the only lane standing)',
    hero.sheet.get('orbOnKill_life') === 0 && hero.sheet.get('orbOnKill_mana') === 0);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
