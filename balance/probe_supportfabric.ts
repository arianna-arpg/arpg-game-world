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
  SUPPORT_MECHANISMS, instanceUseCharges, makeSkillInstance, supportFitsInst,
  supportGlobalMods, supportRidesMinions, hostSockets,
} from '../src/engine/skills';
import { mod } from '../src/engine/stats';

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

  // The user's universal example, pinned: Cleave refuses Shatterrite bare
  // (no totem anywhere), and Spirit Totem's grantsTags opens the door —
  // the SAME composition law, tag form (mechanism form is A1–A3).
  const cleave = SKILLS.cleave;
  const shatterrite = SUPPORTS.shatterrite;
  const totemGem = SUPPORTS.spirit_totem;
  const cInst = makeSkillInstance(cleave, 1, 3);
  check('A5 cleave refuses shatterrite bare (no totem mechanism anywhere)',
    !supportFitsInst(shatterrite, cInst));
  cInst.sockets[0] = { def: totemGem, level: 1 };
  check('A6 Spirit Totem beside it grants \'totem\' and shatterrite fits — the composition law, tag form',
    supportFitsInst(shatterrite, cInst));
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
  // THE ENGAGEMENT GATE: the worn gem demands a STANDING host — a plain
  // strike refuses it, an aura/summon admits it (the lever is the
  // 'engagement' mechanism on the gem, droppable as data).
  const plainStrike = SKILLS.cleave;
  const standingHost = Object.values(SKILLS).find(s =>
    s.delivery.type === 'aura' || s.delivery.type === 'summon')!;
  check('B4 warding_flesh refuses a plain strike (the engagement gate)',
    !supportFitsInst(SUPPORTS.warding_flesh, makeSkillInstance(plainStrike, 1, 3)));
  check('B5 warding_flesh fits a standing working (aura/summon)',
    supportFitsInst(SUPPORTS.warding_flesh, makeSkillInstance(standingHost, 1, 3)),
    standingHost.id);
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

// === RIG F — the empower bank (the hybrid family) ==========================

{
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const host = hero.skills.find(s => s !== null && s.def.cooldown === 0)!;
  host.sockets[0] = { def: SUPPORTS.deep_reserves, level: 1 };
  const uc = instanceUseCharges(host);
  check('F1 a cooldown-less host with Deep Reserves wears an EMPOWER bank (fuel, not ammunition)',
    !!uc && uc.empower === 0.2 && uc.recharge === 4 && uc.magazine === undefined,
    JSON.stringify(uc));
  const bank = hero.skillChargeBank(host);
  bank.count = 0;
  check('F2 a DRY empower bank never refuses the press (canUse stands open)',
    hero.canUse(host));
  bank.count = 1;
  const target = world.createMonster('target_dummy', 7, 'enemy');
  target.pos = { x: hero.pos.x + 40, y: hero.pos.y };
  world.actors.push(target);
  const okCharged = world.useSkill(hero, host, target.pos);
  check('F3 a charged press CASTS and DRINKS the round (the beat rewarded)',
    okCharged && hero.skillChargeBank(host).count === 0,
    `cast ${okCharged}, bank ${hero.skillChargeBank(host).count}`);
  hero.casting = null; hero.useLock = 0; hero.cooldowns.clear();
  const okDry = world.useSkill(hero, host, target.pos);
  check('F4 the NEXT press casts plain off the empty pot (cadence untouched — no gate, no conversion)',
    okDry && hero.skillChargeBank(host).count === 0, `cast ${okDry}`);
  const cdHost = Object.values(SKILLS).find(s => s.cooldown > 0 && (s.tags.includes('attack') || s.tags.includes('spell')))!;
  const cdInst = makeSkillInstance(cdHost, 1, 3);
  cdInst.sockets[0] = { def: SUPPORTS.deep_reserves, level: 1 };
  const cdUc = instanceUseCharges(cdInst);
  check('F5 a cooldown host keeps the MAGAZINE shape (empower is the free skill\'s lane)',
    !!cdUc && cdUc.magazine === true && cdUc.empower === undefined, JSON.stringify(cdUc));
}

// === RIG G — apotheosis composition, the aftermath minter, the crit lanes ==

{
  // The Apotheosis answers, pinned: (a) beside Deep Reserves on a free
  // skill the EMPOWER bank stands (the graft reads the DEF's own clock;
  // the levy composes independently — every levy-paced press finds a
  // full pot, the user's synergy); (b) the levy arms the 'cooldown'
  // MECHANISM (alacrity fits beside apotheosis); (c) the gem RIDES
  // minions whole (mods-only): the court swings 90% harder on the 10s
  // clock — nothing missing.
  const fb = Object.values(SKILLS).find(s =>
    s.cooldown === 0 && s.useTime > 0 && s.tags.includes('spell') && s.delivery.type === 'projectile')!;
  const inst = makeSkillInstance(fb, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.apotheosis, level: 1 };
  inst.sockets[1] = { def: SUPPORTS.deep_reserves, level: 1 };
  const uc = instanceUseCharges(inst);
  check('G1 apotheosis beside Deep Reserves on a free skill keeps the EMPOWER bank (the levy composes independently)',
    !!uc && uc.empower !== undefined && uc.magazine === undefined,
    `host ${fb.id}: ${JSON.stringify(uc)}`);
  check('G2 the levy arms the cooldown MECHANISM (alacrity fits beside apotheosis)',
    SUPPORT_MECHANISMS.cooldown(inst));
  check('G3 apotheosis RIDES minions whole (mods-only — the court gets the 90% AND the clock)',
    supportRidesMinions(SUPPORTS.apotheosis));
}

{
  // THE AFTERMATH MINTER: the ground disciplines mint sequels off
  // instantaneous areas — buried_charge's armed second detonation on a
  // nova, the cascade's marching ripples out of a melee swing.
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const nova = Object.values(SKILLS).find(s =>
    s.delivery.type === 'nova' && s.tags.includes('aoe'))!;
  const nInst = makeSkillInstance(nova, 1, 3);
  nInst.sockets[0] = { def: SUPPORTS.buried_charge, level: 1 };
  const zBefore = world.zones.length;
  world.executeSkill(hero, nInst, { x: hero.pos.x, y: hero.pos.y });
  const pulseZones = world.zones.slice(zBefore).filter(z => z.pulse && z.pulse.left > 0);
  check('G4 buried_charge on a NOVA mints the armed second detonation (the aftermath pulse zone)',
    pulseZones.length === 1, `host ${nova.id}: ${pulseZones.length} armed`);
  const swing = Object.values(SKILLS).find(s =>
    s.delivery.type === 'melee' && s.tags.includes('aoe'))!;
  const mInst = makeSkillInstance(swing, 1, 3);
  mInst.sockets[0] = { def: SUPPORTS.seismic_march, level: 1 };
  const z2 = world.zones.length;
  world.executeSkill(hero, mInst, { x: hero.pos.x + 60, y: hero.pos.y });
  const ripples = world.zones.slice(z2).filter(z => !z.exploded && z.delay > 0);
  check('G5 seismic_march on a MELEE swing mints marching ripples (the quake walks out of the slam)',
    ripples.length >= 2, `host ${swing.id}: ${ripples.length} ripples`);
}

{
  // THE MALIGNANT LANE, deterministic at chance 1: with dotCrit 1 and
  // critChance 1, an applied burn's dps carries the FULL critical
  // multiplier vs an uninvested twin — rolled once, worn for life.
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  // A DIRECT-hit burn applier (melee/nova/target) — projectile flights
  // would need stepped frames to land their status.
  const burnSkill = Object.values(SKILLS).find(s =>
    ['melee', 'nova', 'target'].includes(s.delivery.type)
    && s.effects.some(e => e.type === 'status' && e.status === 'burn' && (e.magnitude ?? 0) > 0))!;
  const mk = (crit: boolean): number => {
    // The 0.95-capped roll: fresh dummies until the burn stands (the crit
    // run may whiff its 5%; the plain run applies on the first try).
    for (let attempt = 0; attempt < 8; attempt++) {
      const dummy = world.createMonster('target_dummy', 7, 'enemy');
      dummy.pos = { x: hero.pos.x + 40, y: hero.pos.y };
      world.actors.push(dummy);
      hero.sheet.setSource('probe_crit', crit
        ? [mod('dotCrit', 'flat', 1), mod('critChance', 'flat', 1)]
        : []);
      const inst = makeSkillInstance(burnSkill, 1, 0);
      for (let i = 0; i < 20 && !dummy.statuses.some(s => s.id === 'burn'); i++) {
        world.executeSkill(hero, inst, dummy.pos);
      }
      const dps = dummy.statuses.find(s => s.id === 'burn')?.dps ?? 0;
      world.actors.splice(world.actors.indexOf(dummy), 1);
      if (dps > 0 && !crit) return dps;
      if (crit && dps > 0) {
        // Keep only a CRITTED burn (the whiffed 5% re-rolls a fresh body).
        const plainRef = mkPlainRef;
        if (dps > plainRef * 1.15) return dps;
      }
    }
    return 0;
  };
  // Averaged over several bodies to settle the damage dice. THE DOUBLE
  // CRANK is the honest expectation at critChance 1: the applying HIT
  // itself crits (derived dps rides the dealt damage — the pre-existing
  // hit-crit carry) AND the affliction's own dotCrit roll multiplies
  // again — ratio ≈ critMulti², flagged for the balance sweep.
  let mkPlainRef = 0;
  const avg = (crit: boolean, n: number): number => {
    let s = 0, c = 0;
    for (let i = 0; i < n; i++) { const v = mk(crit); if (v > 0) { s += v; c++; } }
    return c ? s / c : 0;
  };
  mkPlainRef = avg(false, 3);
  const critted = avg(true, 3);
  const cm = hero.sheet.get('critMulti');
  check('G6 a critical affliction carries the crit crank for its whole life (double-crank at critChance 1: hit-crit carry × dotCrit, ≈critMulti²)',
    mkPlainRef > 0 && critted > mkPlainRef * (cm * 1.05)
    && critted < mkPlainRef * (cm * cm * 1.3),
    `host ${burnSkill.id}: ${mkPlainRef.toFixed(1)} -> ${critted.toFixed(1)} (×${(critted / Math.max(0.01, mkPlainRef)).toFixed(2)}, critMulti ${cm}, cm² ${(cm * cm).toFixed(2)})`);
}

// === RIG H — the septic bargain (hit-to-DoT conversion) ====================

{
  // Full conversion: the hit's bite goes to ~zero while the affliction
  // festers HARDER than the plain twin (dealt + forgone × yield). Gate:
  // the 'affliction' mechanism refuses a dot-less host and admits it the
  // moment an apply_ gem stands beside it.
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const burnSkill = Object.values(SKILLS).find(s =>
    ['melee', 'nova', 'target'].includes(s.delivery.type)
    && s.effects.some(e => e.type === 'status' && e.status === 'burn' && (e.magnitude ?? 0) > 0))!;
  const dotless = Object.values(SKILLS).find(s =>
    s.delivery.type === 'melee' && s.tags.includes('attack')
    && !s.effects.some(e => e.type === 'status'))!;
  check('H1 the affliction MECHANISM refuses a dot-less host',
    !supportFitsInst(SUPPORTS.septic_bargain, makeSkillInstance(dotless, 1, 3)),
    dotless.id);
  const dInst = makeSkillInstance(dotless, 1, 3);
  const applyGem = Object.values(SUPPORTS).find(s =>
    s.mods.some(m => m.stat.startsWith('apply_')))!;
  dInst.sockets[0] = { def: applyGem, level: 1 };
  check('H2 an apply_ gem beside it opens the door (the composition law, mechanism form)',
    supportFitsInst(SUPPORTS.septic_bargain, dInst), applyGem.id);
  const run = (bargain: boolean): { hit: number; dps: number } => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const dummy = world.createMonster('target_dummy', 7, 'enemy');
      dummy.pos = { x: hero.pos.x + 40, y: hero.pos.y };
      world.actors.push(dummy);
      const inst = makeSkillInstance(burnSkill, 1, 3);
      if (bargain) inst.sockets[0] = { def: SUPPORTS.septic_bargain, level: 1 };
      const lifeBefore = dummy.life;
      for (let i = 0; i < 20 && !dummy.statuses.some(s => s.id === 'burn'); i++) {
        world.executeSkill(hero, inst, dummy.pos);
      }
      const hit = lifeBefore - dummy.life;
      const dps = dummy.statuses.find(s => s.id === 'burn')?.dps ?? 0;
      world.actors.splice(world.actors.indexOf(dummy), 1);
      if (dps > 0) return { hit, dps };
    }
    return { hit: 0, dps: 0 };
  };
  const plain = run(false);
  const bargained = run(true);
  check('H3 the bargained hit BITES nothing (full conversion carves the packet)',
    plain.hit > 0 && bargained.hit < plain.hit * 0.1,
    `hit dmg ${plain.hit.toFixed(1)} -> ${bargained.hit.toFixed(1)}`);
  check('H4 the affliction festers HARDER than the plain twin (the forgone bite returns at yield)',
    bargained.dps > plain.dps * 1.1,
    `burn dps ${plain.dps.toFixed(1)} -> ${bargained.dps.toFixed(1)}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
