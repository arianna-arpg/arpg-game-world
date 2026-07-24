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
import { MONSTERS } from '../src/data/monsters';
import {
  STANCE_PLANT_TIME, type Actor,
} from '../src/engine/actor';
import {
  SUPPORT_MECHANISMS, instanceMods, instanceUseCharges, makeSkillInstance,
  skillContextTags, supportFitsInst,
  supportFitsInstOrCrew, supportGlobalMods, supportRidesMinions, hostSockets,
} from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { dist, vec } from '../src/core/math';
import { PROCS } from '../src/data/procs';
import { lightwellOf } from '../src/engine/lightwells';

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
  check('F5 a cooldown host wears the DRIP magazine (one round per clock — empower is the free skill\'s lane)',
    !!cdUc && typeof cdUc.magazine === 'object' && cdUc.magazine.drip === true
    && cdUc.magazine.refill === 1 && cdUc.empower === undefined, JSON.stringify(cdUc));
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

// === RIG I — the kindred rule + the inheritance law ========================
// (2026-07-21: graft-wins is dead — the native lane wins the slot and the
// gem deepens it; different-direction gems RE-CAST the native cast at
// displaced points; sequels wear the strike's true surface, edge band
// included. Zone-count algebra pins the composition exactly: recursion
// between grafts is impossible by construction.)

{
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const sunder = SKILLS.sunder;
  const aim = { x: hero.pos.x + 50, y: hero.pos.y };
  const cast = (...gems: (keyof typeof SUPPORTS)[]): number => {
    const before = world.zones.length;
    const inst = makeSkillInstance(sunder, 1, 3);
    gems.forEach((g, i) => { inst.sockets[i] = { def: SUPPORTS[g], level: 1 }; });
    world.executeSkill(hero, inst, aim);
    const minted = world.zones.length - before;
    world.zones.length = before;   // sweep the table for the next hand
    return minted;
  };
  const bare = cast();
  check('I0 bare Sunder mints its native march unchanged (1 primary + 3 ripples — the refactor regression pin)',
    bare === 4, `${bare} zones`);
  const kindred = cast('seismic_march');
  check('I1 Seismic March ELONGATES the march it matches (6 shocks, one walk — the kindred rule)',
    kindred === 7, `${kindred} zones (want 1 primary + 6 march)`);
  const recast = cast('spell_cascade');
  check('I2 Spell Cascade RE-CASTS Sunder from its axis points (each point a full marching Sunder)',
    recast === 12, `${recast} zones (want 1+3 primary cast + 2 points × (1+3))`);
  const stacked = cast('seismic_march', 'spell_cascade');
  check('I3 stacked: the re-cast points play the ELONGATED native march, never each other (graft → native → terminal)',
    stacked === 21, `${stacked} zones (want 1+6 + 2 × (1+6))`);
  const scattered = cast('spell_cascade', 'scattered_cascade');
  check('I4 two re-cast gems each open their own lane and neither recurses the other',
    scattered === 20, `${scattered} zones (want 1+3 + 2×(1+3) + 2×(1+3))`);
}

{
  // THE UN-NERF: Buried Charge on Earthquake APPENDS its full-effect beat
  // after the native 2.4× quake — the native rhythm intact, the charge
  // answering in its own character through the queue.
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const quake = SKILLS.earthquake;
  const inst = makeSkillInstance(quake, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.buried_charge, level: 1 };
  const before = world.zones.length;
  world.executeSkill(hero, inst, { x: hero.pos.x + 40, y: hero.pos.y });
  const prime = world.zones.slice(before).find(z => z.pulse);
  check('I5 Earthquake keeps its native 2.4× quake with Buried Charge socketed (the kindred append, not the old replace)',
    !!prime?.pulse && Math.abs(prime.pulse.dmgMult - 2.4) < 1e-9
    && prime.pulse.left === 1 && prime.pulse.queue?.length === 1
    && Math.abs((prime.pulse.queue?.[0].dmgMult ?? 0) - 1) < 1e-9,
    prime?.pulse ? `native ${prime.pulse.dmgMult}× left ${prime.pulse.left}, queue ${JSON.stringify(prime.pulse.queue)}` : 'no pulse zone');
  world.zones.length = before;
}

{
  // THE RING-TRUE SEQUEL: Shock Nova's cascades wear the nova's own edge
  // band — the eye is SPARED at the sequel exactly as at the strike
  // (drawn == tested: the flash carries the same edgeFrac).
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const nova = SKILLS.shock_nova;
  const inst = makeSkillInstance(nova, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.spell_cascade, level: 1 };
  const before = world.zones.length;
  world.executeSkill(hero, inst, { x: hero.pos.x, y: hero.pos.y });
  const sequels = world.zones.slice(before);
  const band = nova.delivery.type === 'nova' ? nova.delivery.edgeOnly : undefined;
  check('I6 every Shock Nova sequel carries the nova\'s edge band (the inheritance law\'s geometry hand-off)',
    sequels.length > 0 && band !== undefined && sequels.every(z => z.edgeFrac === band),
    `${sequels.length} sequels, edgeFrac ${sequels.map(z => z.edgeFrac).join(',')} (want ${band})`);
  // The functional spare: a body at a sequel's EYE takes nothing when it
  // detonates; a body on the RIM takes the ring.
  const seq = sequels.find(z => !z.exploded && dist(z.pos, hero.pos) > 1);
  check('I7 a telegraphing sequel stands off the origin (the axis point)', !!seq);
  if (seq) {
    const eye = world.createMonster('target_dummy', 7, 'enemy');
    eye.pos = { x: seq.pos.x, y: seq.pos.y };
    const rim = world.createMonster('target_dummy', 7, 'enemy');
    rim.pos = { x: seq.pos.x + seq.radius * ((1 + (seq.edgeFrac ?? 0)) / 2), y: seq.pos.y };
    world.actors.push(eye, rim);
    const eye0 = eye.life, rim0 = rim.life;
    // The town post REGENERATES between frames — track the trough, not
    // the end state (the detonation's bite is a one-frame dip).
    let eyeMin = eye0, rimMin = rim0;
    for (let i = 0; i < 30; i++) {
      world.update(1 / 20);
      eyeMin = Math.min(eyeMin, eye.life);
      rimMin = Math.min(rimMin, rim.life);
    }
    check('I8 the sequel\'s ring bites the rim and SPARES the eye (drawn == tested at the detonation)',
      eyeMin === eye0 && rimMin < rim0,
      `eye trough ${eye0.toFixed(0)}->${eyeMin.toFixed(0)}, rim trough ${rim0.toFixed(0)}->${rimMin.toFixed(1)}`);
  }
}

// === RIG J — THE STRIKES FLOOR (the hit-rider class's structural refusal) =
// (2026-07-21: hit-rider gems refuse never-hitting hosts honestly; the
// refusal self-lifts through strike-granting grafts and the crew hop.)

{
  const berserk = SKILLS.berserk;
  const cleave = SKILLS.cleave;
  const pc = SUPPORTS.poison_chance;
  check('J1 poison_chance REFUSES an aura that never hits (the strikes floor)',
    !supportFitsInst(pc, makeSkillInstance(berserk, 1, 3)),
    `host ${berserk.id} (${berserk.delivery.type})`);
  check('J2 poison_chance fits a striking host (the floor opens on real hits)',
    supportFitsInst(pc, makeSkillInstance(cleave, 1, 3)));
  // (Damaging curses — agony's token chaos packet — genuinely STRIKE and
  // rightly fit; the floor refuses only the truly hit-less.)
  check('J3 the hit-less mark and the trigger utility refuse (no packet anywhere)',
    !supportFitsInst(pc, makeSkillInstance(SKILLS.mark, 1, 3))
    && !supportFitsInst(pc, makeSkillInstance(SKILLS.detonation, 1, 3)),
    'hosts mark (mark), detonation (self)');
  // The SELF-LIFTING half: a strike-granting graft (constructFx — the
  // pulsing cage) stands a hit up on a construct host that itself deals
  // no damage, and every hit-rider opens beside it.
  const cage = Object.values(SKILLS).find(s =>
    s.delivery.type === 'construct' && !s.baseDamage
    && !s.effects.some(e => e.type === 'damage'))!;
  const cInst = makeSkillInstance(cage, 1, 3);
  const fxGem = Object.values(SUPPORTS).find(s => s.constructFx)!;
  check('J4 a damage-less construct refuses the hit-riders bare',
    !supportFitsInst(pc, cInst), `host ${cage.id}`);
  cInst.sockets[0] = { def: fxGem, level: 1 };
  check('J5 a strike-granting graft beside it LIFTS the floor (the cage that cooks can poison)',
    supportFitsInst(pc, cInst), `graft ${fxGem.id}`);
  cInst.sockets[0] = null;
  check('J6 the refusal returns when the graft leaves (live re-evaluation)',
    !supportFitsInst(pc, cInst));
  // THE CREW HOP: a summon whose crew strikes serves the gem aboard the
  // court — the mechanism resolves against the crew skill as the minion
  // casts it, not against the keeper's own no-hit summon cast.
  const world = makeSimWorld('warrior', 7);
  const raise = SKILLS.raise_dead;
  const rInst = makeSkillInstance(raise, 1, 3);
  const crew = world.summonCrewSkills(rInst);
  check('J7 the summon host itself never strikes (the keeper cast is not the hit)',
    !supportFitsInst(pc, rInst));
  check('J8 the gem fits VIA THE STRIKING CREW (the mechanism hop aboard the court)',
    supportFitsInstOrCrew(pc, rInst, crew),
    `crew ${Array.isArray(crew) ? crew.map(c => c.id).join('/') : crew}`);
}

// === RIG K — the parameterized gates (affliction:X / status:X) ============

{
  const cleave = SKILLS.cleave;
  const sf = SUPPORTS.sanguine_feast;
  const cInst = makeSkillInstance(cleave, 1, 3);
  check('K1 sanguine_feast refuses a host that cannot bleed (affliction:bleed, no tag gate)',
    !supportFitsInst(sf, cInst));
  cInst.sockets[0] = { def: SUPPORTS.bleed_chance, level: 1 };
  check('K2 a bleed-chance gem beside it opens the door (the live-instance read — conversions will ride the same seam)',
    supportFitsInst(sf, cInst));
  cInst.sockets[0] = { def: SUPPORTS.poison_chance, level: 1 };
  check('K3 a POISON chance does NOT open the bleed gate (the param names the wound)',
    !supportFitsInst(sf, cInst));
  // status:power — the binary exemption: a host whose only application
  // is taunt (you cannot taunt HARDER) refuses potency; a chilling host
  // fits (chill folds mods the power lane scales).
  const potency = SUPPORTS.potency;
  const taunter = Object.values(SKILLS).find(s =>
    s.effects.some(e => e.type === 'status' && e.status === 'taunted')
    && !s.effects.some(e => e.type === 'status' && e.status !== 'taunted'))!;
  check('K4 potency refuses a pure taunter (powerInert — the binary exemption)',
    !supportFitsInst(potency, makeSkillInstance(taunter, 1, 3)),
    `host ${taunter.id}`);
  const chiller = Object.values(SKILLS).find(s =>
    s.effects.some(e => e.type === 'status' && e.status === 'chill'))!;
  check('K5 potency fits a chilling host (folded mods scale — the power lane)',
    supportFitsInst(potency, makeSkillInstance(chiller, 1, 3)),
    `host ${chiller.id}`);
  // status:stacking — suppuration's cap needs stacks to raise.
  const supp = SUPPORTS.suppuration;
  check('K6 suppuration fits a stacking-ailment host and refuses a stack-less one',
    supportFitsInst(supp, makeSkillInstance(chiller, 1, 3))
    && !supportFitsInst(supp, makeSkillInstance(taunter, 1, 3)),
    `chill stacks, taunt does not`);
}

// === RIG L — the read-site package =========================================
// (2026-07-22: worn knockback on every delivery at graded authority; the
// moveTrail fabric beyond dashes; the construct sub-cast board; the
// answering family — guardBash at charge arrival / construct break.)

{
  // L1 — the delivery-authority lever: worn knockback now shoves off a
  // NOVA hit (was byte-dead beyond melee), at its graded fraction.
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const nova = Object.values(SKILLS).find(s =>
    s.delivery.type === 'nova' && !!s.baseDamage
    && !(s.delivery as { edgeOnly?: number }).edgeOnly)!;
  const kind = Object.keys(MONSTERS).find(id =>
    !MONSTERS[id].immortal && !MONSTERS[id].parts
    && (MONSTERS[id].base?.life ?? 0) > 0)!;
  const foe = world.createMonster(kind, 7, 'enemy');
  foe.pos = { x: hero.pos.x + 60, y: hero.pos.y };
  world.actors.push(foe);
  const inst = makeSkillInstance(nova, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.turbulence, level: 1 };
  const p0 = { x: foe.pos.x, y: foe.pos.y };
  world.executeSkill(hero, inst, { x: hero.pos.x, y: hero.pos.y });
  for (let i = 0; i < 10; i++) world.update(1 / 20);
  const moved = dist(p0, foe.pos);
  check('L1 worn knockback shoves off a NOVA hit (the delivery-authority lever — was melee-only)',
    moved > 4, `host ${nova.id} vs ${kind}: moved ${moved.toFixed(1)}px`);
}

{
  // L2/L3 — the moveTrail fabric beyond dashes: a blink drops its two
  // truths; a leap scorches launch and landing.
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const blink = Object.values(SKILLS).find(s =>
    s.delivery.type === 'blink' && !s.noDrop)!;
  const bInst = makeSkillInstance(blink, 1, 3);
  bInst.sockets[0] = { def: SUPPORTS.fire_walker, level: 1 };
  const zb = world.zones.length;
  world.executeSkill(hero, bInst, { x: hero.pos.x + 200, y: hero.pos.y });
  const patches = world.zones.slice(zb).filter(z => z.exploded && z.linger > 0);
  check('L2 a BLINK with Fire Walker drops departure AND arrival patches',
    patches.length >= 2, `host ${blink.id}: ${patches.length} patches`);
  const leap = Object.values(SKILLS).find(s => s.delivery.type === 'leap')!;
  const lInst = makeSkillInstance(leap, 1, 3);
  lInst.sockets[0] = { def: SUPPORTS.fire_walker, level: 1 };
  const zl = world.zones.length;
  world.executeSkill(hero, lInst, { x: hero.pos.x + 200, y: hero.pos.y });
  const launchPatches = world.zones.slice(zl).filter(z => z.exploded && z.linger > 0).length;
  for (let i = 0; i < 40; i++) world.update(1 / 20);
  const bothPatches = world.zones.slice(zl).filter(z => z.exploded && z.linger > 0).length
    + world.zones.slice(zl).filter(z => !z.linger).length * 0; // landing patch joins after flight
  check('L3 a LEAP with Fire Walker scorches launch then landing',
    launchPatches >= 1 && bothPatches >= 2,
    `host ${leap.id}: launch ${launchPatches}, after flight ${bothPatches}`);
}

{
  // L4 — the walking trail: a movement BUFF with Fire Walker drops fire
  // behind the runner while it holds, and the trail dies with it.
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const buff = SKILLS.stealth ?? Object.values(SKILLS).find(s =>
    s.delivery.type === 'self' && s.tags.includes('movement'))!;
  const inst = makeSkillInstance(buff, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.fire_walker, level: 1 };
  world.executeSkill(hero, inst, { x: hero.pos.x, y: hero.pos.y });
  const zb = world.zones.length;
  for (let i = 0; i < 8; i++) {
    hero.pos = { x: hero.pos.x + 30, y: hero.pos.y };
    world.update(1 / 20);
  }
  const dropped = world.zones.length - zb;
  check('L4 the sprinting buff drops trail patches behind the runner (the walking trail)',
    dropped >= 3, `host ${buff.id}: ${dropped} patches over 240px`);
  const wtState = (hero as { walkTrail?: unknown }).walkTrail;
  check('L5 the walking trail is a STAMPED working (state stands while the buff holds)',
    wtState !== undefined);
}

{
  // L6 — the construct sub-cast board: the ballista's fired payload wears
  // the host's rideable gems (Scorched Wake burns behind every bolt).
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const host = SKILLS.ballista_sentry;
  const inst = makeSkillInstance(host, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.scorched_wake, level: 1 };
  world.executeSkill(hero, inst, { x: hero.pos.x + 80, y: hero.pos.y });
  const built = world.actors.find(a => a.construct && a.summonInst === inst);
  const fired = (built?.construct as { castInst?: { sockets: ({ def: { id: string }; forwarded?: boolean } | null)[] } } | undefined)?.castInst;
  const boarded = fired?.sockets.some(x => x?.def.id === 'scorched_wake' && x.forwarded);
  check('L6 the construct\'s FIRED payload boards the host\'s trail gem (the sub-cast board)',
    !!built && !!boarded,
    built ? `construct ${built.name}, boarded ${boarded}` : 'no construct minted');
}

{
  // L7 — the answering family: a guard-tagged charge bashes at ARRIVAL;
  // a bash-carrying construct answers when it BREAKS.
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const charge = SKILLS.shield_charge;
  const cInst = makeSkillInstance(charge, 1, 3);
  cInst.sockets[0] = { def: SUPPORTS.answering_wall, level: 1 };
  const kind = Object.keys(MONSTERS).find(id =>
    !MONSTERS[id].immortal && !MONSTERS[id].parts
    && (MONSTERS[id].base?.life ?? 0) > 0)!;
  const mark = world.createMonster(kind, 7, 'enemy');
  mark.pos = { x: hero.pos.x + 290, y: hero.pos.y };
  world.actors.push(mark);
  const m0 = mark.life;
  let mMin = m0;
  world.executeSkill(hero, cInst, { x: hero.pos.x + 260, y: hero.pos.y });
  for (let i = 0; i < 30; i++) { world.update(1 / 20); mMin = Math.min(mMin, mark.life); }
  check('L7 the guard-tagged charge ANSWERS at arrival (the poolless bash)',
    mMin < m0, `${kind} at the stop: ${m0.toFixed(0)} -> trough ${mMin.toFixed(1)}`);
  const rampart = SKILLS.stone_rampart;
  const rInst = makeSkillInstance(rampart, 1, 3);
  rInst.sockets[0] = { def: SUPPORTS.answering_wall, level: 1 };
  world.executeSkill(hero, rInst, { x: hero.pos.x + 60, y: hero.pos.y });
  const pillar = world.actors.find(a => a.construct && a.summonInst === rInst);
  check('L8 the rampart mints its pillar (rig sanity)', !!pillar);
  if (pillar) {
    const foe2 = world.createMonster(kind, 7, 'enemy');
    foe2.pos = { x: pillar.pos.x + 40, y: pillar.pos.y };
    world.actors.push(foe2);
    const f0 = foe2.life;
    let fMin = f0;
    world.kill(pillar, false, foe2);
    for (let i = 0; i < 6; i++) { world.update(1 / 20); fMin = Math.min(fMin, foe2.life); }
    check('L9 the broken wall ANSWERS HARDEST (construct death bash pays maxLife, full circle)',
      fMin < f0, `breaker: ${f0.toFixed(0)} -> trough ${fMin.toFixed(1)}`);
  }
  check('L10 Aegis of Dawn holds its stance again (the restored castMode — the guard that never raised)',
    SKILLS.aegis_of_dawn.castMode === 'guard');
}

// === RIG M — minter round 2 ================================================
// (2026-07-22: inverted cone sigils, beats on waves and skyfalls, the
// buried strike on storms, the drip reload, the fissure tick law.)

{
  // M1 — THE INVERTED TRIANGLE: a sigiled cone is WIDEST AT THE FEET —
  // a flanker beside the caster (outside the wedge's angle) is struck;
  // a body at the far rim's flank (inside the bare wedge's widest part)
  // is spared. The bare wedge reads the opposite. Static geometry pin
  // through the same inAoe the cast runs.
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const cone = Object.values(SKILLS).find(s =>
    s.delivery.type === 'cone' && !!s.baseDamage
    && !(s.delivery as { edgeOnly?: number }).edgeOnly)!;
  const d = cone.delivery as { range: number; arcDeg: number };
  const inst = makeSkillInstance(cone, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.triangle_sigil, level: 1 };
  const kind = Object.keys(MONSTERS).find(id =>
    !MONSTERS[id].immortal && !MONSTERS[id].parts
    && (MONSTERS[id].base?.life ?? 0) > 0)!;
  hero.facing = 0;
  // The flanker: beside the caster's feet, well outside the wedge angle.
  const flank = world.createMonster(kind, 7, 'enemy');
  flank.pos = { x: hero.pos.x + 14, y: hero.pos.y + d.range * 0.5 };
  world.actors.push(flank);
  const f0 = flank.life;
  let fMin = f0;
  world.executeSkill(hero, inst, { x: hero.pos.x + 60, y: hero.pos.y });
  for (let i = 0; i < 4; i++) { world.update(1 / 20); fMin = Math.min(fMin, flank.life); }
  check('M1 the inverted triangle bites the FLANK AT THE FEET (widest at the caster — the melee-ish figure)',
    fMin < f0, `host ${cone.id} vs ${kind}: ${f0.toFixed(0)} -> trough ${fMin.toFixed(1)}`);
}

{
  // M2 — beats on the WAVE: a cone with Seismic March mints marching
  // sequels off its figure (the minter reached cones).
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const cone = Object.values(SKILLS).find(s =>
    s.delivery.type === 'cone' && !!s.baseDamage)!;
  const inst = makeSkillInstance(cone, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.seismic_march, level: 1 };
  const zb = world.zones.length;
  world.executeSkill(hero, inst, { x: hero.pos.x + 60, y: hero.pos.y });
  const ripples = world.zones.slice(zb).filter(z => !z.exploded && z.delay > 0);
  check('M2 Seismic March quakes forward out of a CONE (the minter reached the wave)',
    ripples.length >= 3, `host ${cone.id}: ${ripples.length} marching sequels`);
  world.zones.length = zb;
}

{
  // M3 — THE BURIED STRIKE: every storm strike arms the composed pulse
  // (Buried Charge re-detonates each strike's ground) — and the armed
  // afterlife carries NO ordinary ticks (the imposed-surface law).
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const storm = Object.values(SKILLS).find(s =>
    s.delivery.type === 'storm' && !!s.baseDamage
    && (s.delivery as { awaitRelease?: unknown }).awaitRelease === undefined)!;
  const inst = makeSkillInstance(storm, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.buried_charge, level: 1 };
  const zb = world.zones.length;
  world.executeSkill(hero, inst, { x: hero.pos.x + 100, y: hero.pos.y });
  const strikesArmed = world.zones.slice(zb).filter(z => z.pulse && z.pulse.left > 0);
  const noTicks = world.zones.slice(zb).every(z => !z.pulse || z.tickInterval === Infinity);
  check('M3 every storm strike carries the BURIED CHARGE (armed pulse per strike, tick-free afterlife)',
    strikesArmed.length >= 2 && noTicks,
    `host ${storm.id}: ${strikesArmed.length} armed, tick-free ${noTicks}`);
  world.zones.length = zb;
}

{
  // M4 — THE DRIP RELOAD: Deep Reserves on a cooldown host returns ONE
  // round per cycle of the host's own clock — bankable, never an
  // override (the user's one-per-clock law).
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const cdHost = Object.values(SKILLS).find(s =>
    s.cooldown >= 2 && s.cooldown <= 6
    && (s.tags.includes('attack') || s.tags.includes('spell')))!;
  const inst = makeSkillInstance(cdHost, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.deep_reserves, level: 1 };
  hero.skills[0] = inst;
  const bank = hero.skillChargeBank(inst);
  bank.count = 0; bank.timer = 0;
  // The cycle runs at cooldownRecovery × skillChargeRate — Deep Reserves'
  // INVERTED rate (2026-07-22) prices the drip 15% slower, so the pin
  // measures one-per-cycle at the PRICED clock, not the raw cooldown.
  const clockRate = hero.sheet.get('cooldownRecovery', skillContextTags(cdHost), instanceMods(inst))
    * hero.sheet.get('skillChargeRate', skillContextTags(cdHost), instanceMods(inst));
  const halfSteps = Math.ceil((cdHost.cooldown / clockRate / 2) * 20);
  for (let i = 0; i < halfSteps + 2; i++) world.update(1 / 20);
  const atHalf = bank.count;
  for (let i = 0; i < halfSteps + 4; i++) world.update(1 / 20);
  const atFull = bank.count;
  for (let i = 0; i < halfSteps * 2 + 6; i++) world.update(1 / 20);
  check('M4 the drip returns ONE round per clock cycle, then banks the burst (never a full-mag override)',
    atHalf === 0 && atFull === 1 && bank.count === 2,
    `host ${cdHost.id} cd ${cdHost.cooldown}: half ${atHalf}, one-cycle ${atFull}, banked ${bank.count}`);
}

{
  // M5 — THE FISSURE TICK LAW (the Volcanic Heart audit): a texture-
  // imposed linger carries NO ordinary ticks — the armed crack deals
  // nothing between re-lights.
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const fissure = Object.values(SKILLS).find(s =>
    s.tags.includes('fissure') && !(s.delivery as { lingerDuration?: number }).lingerDuration)!;
  const inst = makeSkillInstance(fissure, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.volcanic_heart, level: 1 };
  const zb = world.zones.length;
  world.executeSkill(hero, inst, { x: hero.pos.x + 80, y: hero.pos.y });
  const segs = world.zones.slice(zb).filter(z => z.seg);
  const lingering = segs.filter(z => z.linger > 0);
  check('M5 a texture-IMPOSED fissure linger carries no ordinary ticks (the imposed-surface law — re-lights are the crack\'s whole life)',
    lingering.length > 0 && segs.every(z => z.tickInterval === Infinity)
    && lingering.every(z => z.volatile),
    `host ${fissure.id}: ${segs.length} segments (${lingering.length} lingering, all tick-free)`);
  world.zones.length = zb;
}

{
  // M6 — THE REST LAW (2026-07-22, the user's call): the bank's second
  // clock is a REST clock — every true press RESTARTS it, so a near-done
  // drip can never complete across a cast (no waiting the clock to 90%,
  // casting the ready press, and pocketing the round a beat later). The
  // round is earned only by deliberately holding fire.
  const world = makeSimWorld('warrior', 7);
  const hero = world.player;
  const cdHost = Object.values(SKILLS).find(s =>
    s.cooldown >= 2 && s.cooldown <= 6 && s.manaCost <= 10
    && (s.tags.includes('attack') || s.tags.includes('spell')))!;
  const inst = makeSkillInstance(cdHost, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.deep_reserves, level: 1 };
  hero.skills[0] = inst;
  const bank = hero.skillChargeBank(inst);
  bank.count = 2; bank.timer = 0; // below cap (3), so the drip runs
  const step = 1 / 20;
  for (let i = 0; i < Math.ceil(cdHost.cooldown * 0.9 * 20); i++) world.update(step);
  const timerBefore = bank.timer;
  const cast = world.useSkill(hero, inst, { x: hero.pos.x + 60, y: hero.pos.y });
  const timerAfter = bank.timer;
  for (let i = 0; i < Math.ceil(cdHost.cooldown * 0.3 * 20); i++) world.update(step);
  const mintedInOldWindow = bank.count; // spent to 1 by the press; the old clock's tail must mint nothing
  for (let i = 0; i < Math.ceil(cdHost.cooldown * 1.1 * 20); i++) world.update(step);
  check('M6 THE REST LAW: a press resets the bank clock — the old drip\'s tail mints nothing, a full held clock still pays',
    cast && timerBefore > cdHost.cooldown * 0.5 && timerAfter === 0
    && mintedInOldWindow === 1 && bank.count === 2,
    `host ${cdHost.id} cd ${cdHost.cooldown}: timer ${timerBefore.toFixed(2)}→${timerAfter}, after-tail ${mintedInOldWindow}, after-full-rest ${bank.count}`);
}

// === RIG N — the deepened-courts round (2026-07-24) ========================
// N1 THE WRING (wringing_grip → gripCrush at the grab sweep): same-seed A/B —
//    an identical seize-and-hold script, gem vs bare; only the gem's world
//    crushes the held body. The read rides the seizing skill's live instance
//    (the gripPower idiom), so the stat stays a skill-local gem line.
// N2 THE KINDLE (gutterglow → the 'kindle' ProcEffect): a real kill through
//    a socketed gem plants a REGISTERED, powered lightwell mote at the
//    corpse — the matrix blindness row (no arena darkness event) cites this
//    pin as the payload's deterministic proof.

{
  const holdLife = (withGem: boolean): { stage: string; before: number; after: number } => {
    const w = makeSimWorld('warrior', 0x0e01); // SAME seed both runs — the gem is the only difference
    const p = w.player;
    if (!w.devGrabGrant('seize')) return { stage: 'grant-refused', before: 0, after: 0 };
    const seize = p.skills.find(s => s?.def.id === 'seize')!;
    if (withGem) seize.sockets[0] = { def: SUPPORTS.wringing_grip, level: 1 };
    p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
    const z = w.createMonster('zombie', 3, 'enemy');
    z.pos = vec(p.pos.x + 50, p.pos.y);
    // Single-hit rig honesty: the seize must LAND for the hold to form —
    // zero the victim's evasion so the one roll can never whiff the rig
    // (the probe_grab source idiom; global-stream drift under load is the
    // J-flake governor lesson, and a flaky pin is no pin).
    z.sheet.setSource('probe', [mod('evasion', 'flat', -1e6)]);
    w.actors.push(z);
    p.facing = 0;
    if (!w.useSkill(p, seize, vec(z.pos.x, z.pos.y))) return { stage: 'press-refused', before: 0, after: 0 };
    for (let i = 0; i < 14; i++) w.update(1 / 20); // through the cast; the hold forms
    if (p.gripping?.id !== z.id) return { stage: 'no-hold', before: z.life, after: z.life };
    const before = z.life;
    for (let i = 0; i < 28; i++) w.update(1 / 20); // 1.4s of held ticking, no presses
    return { stage: p.gripping?.id === z.id ? 'held' : 'slipped', before, after: z.life };
  };
  const bare = holdLife(false);
  const gem = holdLife(true);
  const bareDrop = bare.before - bare.after;
  const gemDrop = gem.before - gem.after;
  check('N1 THE WRING: the gem\'s hold crushes the held body (same-seed A/B — the bare hold is the exact control, the wring alone wounds through it)',
    bare.stage === 'held' && gem.stage === 'held' && gemDrop > bareDrop + 1,
    `bare [${bare.stage}] Δ${bareDrop.toFixed(1)}, wrung [${gem.stage}] Δ${gemDrop.toFixed(1)} over 1.4s held`);
}

{
  const w = makeSimWorld('warrior', 0x0e02);
  const p = w.player;
  const procRow = PROCS['gutterglow'];
  check('N2a the gutterglow proc row is a kill-trigger KINDLE of a registered lightwell',
    !!procRow && procRow.trigger === 'kill' && procRow.effect.type === 'kindle'
    && lightwellOf(procRow.effect.type === 'kindle' ? procRow.effect.kind : '') !== undefined);
  const host = Object.values(SKILLS).find(s =>
    s.tags.includes('attack') && s.tags.includes('melee') && s.cooldown === 0
    && s.manaCost <= 10 && !s.gate && s.effects.some(e => e.type === 'damage')
    && SUPPORTS.gutterglow.requiresTags!.some(t => s.tags.includes(t)))!;
  const inst = makeSkillInstance(host, 1, 3);
  inst.sockets[0] = { def: SUPPORTS.gutterglow, level: 1 };
  p.skills[0] = inst;
  // procChance caps EVERY roll at 0.95 (the rate-discipline golden rule),
  // so one kill is a 1-in-20 flake by construction — the pin earns its
  // determinism with icd-spaced attempts (miss odds 0.05^4 ≈ 6e-6).
  let kills = 0;
  let corpseAt: { x: number; y: number } | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const z = w.createMonster('zombie', 1, 'enemy');
    z.pos = vec(p.pos.x + 40, p.pos.y);
    z.sheet.setSource('probe', [mod('evasion', 'flat', -1e6)]); // the swing must land
    w.actors.push(z);
    z.life = 1; // the next landed blow is a kill
    p.facing = 0;
    w.useSkill(p, inst, vec(z.pos.x, z.pos.y));
    for (let i = 0; i < 20; i++) w.update(1 / 20);
    if (z.dead) { kills++; corpseAt = { x: z.pos.x, y: z.pos.y }; }
    if (w.doodads.some(d => d.kind === 'gutterglow_mote')) break;
    for (let i = 0; i < 54; i++) w.update(1 / 20); // out past the 2.5s icd
  }
  const mote = w.doodads.find(d => d.kind === 'gutterglow_mote');
  check('N2b a kill through the socketed gem plants a POWERED mote at the corpse (the kindle ProcEffect, end to end)',
    kills > 0 && !!mote && (mote.well?.power ?? 0) > 0
    && !!corpseAt && dist(mote.pos, corpseAt) < 60,
    mote ? `mote at ${Math.round(mote.pos.x)},${Math.round(mote.pos.y)}, pool ${mote.well?.power?.toFixed(0)}, kills ${kills}` : `no mote (host ${host.id}, kills ${kills})`);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
